import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createTakeaway } from "../../src/artifact.js";

const CUSTOM_HTML = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ocean page</title>
<style>body{font:24px system-ui;background:#bdefff;color:#132238;padding:2rem}h1{font-size:4rem}</style>
<h1>Hello, ocean!</h1>
<p>I made this tiny website.</p>
<button onclick="document.body.dataset.changed='yes'">Change it</button>`;

function visibleHeight({ top, bottom }, viewportHeight) {
  const start = Math.max(top, 0);
  const end = Math.min(bottom, viewportHeight);
  return Math.max(0, end - start);
}

test("edits, previews, saves, and downloads the QR", async ({ page }) => {
  await page.goto("/");

  const editor = page.getByRole("textbox", { name: "HTML source" });
  await expect(page.locator("#save-status")).toBeHidden();
  await expect(
    page.getByText("Don’t open someone else’s HTML Day Lite link."),
  ).toBeVisible();
  await expect(editor).toContainText(/Your name/);
  await expect(
    page.frameLocator("#preview").getByRole("heading", { level: 1 }),
  ).toHaveText("Your name");

  await editor.fill(CUSTOM_HTML);
  await expect(page.locator("#preview")).toHaveCount(1);
  await expect(
    page
      .frameLocator("#preview")
      .getByRole("heading", { level: 1, name: "Hello, ocean!" }),
  ).toHaveText("Hello, ocean!");
  const editorPreview = page.frameLocator("#preview");
  await editorPreview.getByRole("button", { name: "Change it" }).click();
  await expect(editorPreview.locator("body")).toHaveAttribute(
    "data-changed",
    "yes",
  );
  await expect(page.getByText("Saved on this device.")).toBeVisible();
  await expect(page.locator("#copy-link")).toBeEnabled();
  await expect(page.locator("#download-qr")).toBeEnabled();

  await expect
    .poll(() =>
      page.locator("#qr").evaluate((canvas) => canvas.toDataURL().length),
    )
    .toBeGreaterThan(1_000);

  const qrDownloadPromise = page.waitForEvent("download");
  await page.locator("#download-qr").click();
  const qrDownload = await qrDownloadPromise;
  expect(qrDownload.suggestedFilename()).toBe("my-tiny-website-qr.png");
  const qrPath = await qrDownload.path();
  const qrBytes = await readFile(qrPath);
  expect(qrBytes.subarray(1, 4).toString()).toBe("PNG");

  await page.reload();
  await expect(editor).toContainText("Hello, ocean!");
});

test("renders highlighted HTML and keeps skip-link keyboard focus", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("#editor .cm-line span").first()).toBeVisible();
  const skipLink = page.getByRole("link", { name: "Skip to the HTML editor" });
  await skipLink.focus();
  await skipLink.press("Enter");
  await expect(
    page.getByRole("textbox", { name: "HTML source" }),
  ).toBeFocused();

  const editor = page.getByRole("textbox", { name: "HTML source" });
  await editor.press("ControlOrMeta+A");
  await editor.fill("<h1>First edit</h1>");
  await editor.press("ControlOrMeta+A");
  await editor.fill("<h1>Changed</h1>");
  await expect(page.locator("#preview")).toHaveCount(1);
  const changedPreview = page.frameLocator("#preview");
  await expect(changedPreview.getByRole("heading", { level: 1 })).toHaveText(
    "Changed",
  );
  await expect(page.locator("#budget-value")).toContainText("/ 900");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset starter" }).click();
  await expect(
    page.getByRole("textbox", { name: "HTML source" }),
  ).toContainText("Your name");
});

test("shows the neobrutalist editor palette and structural markers", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "HTML source" });
  await editor.fill(
    '<!-- note --><style>body { color: #ff5c8a; }</style><h1 class="title">Hello</h1>',
  );

  const styles = await page.locator("#editor").evaluate((root) => {
    const colors = [...root.querySelectorAll(".cm-line span")].map(
      (node) => window.getComputedStyle(node).color,
    );
    const activeLine = window.getComputedStyle(
      root.querySelector(".cm-activeLine"),
    );
    const activeGutter = window.getComputedStyle(
      root.querySelector(".cm-activeLineGutter"),
    );
    const activeNumber = root.querySelector(
      ".cm-lineNumbers .cm-activeLineGutter",
    );
    const activeFold = root.querySelector(
      ".cm-foldGutter .cm-activeLineGutter",
    );
    const activeNumberRect = activeNumber?.getBoundingClientRect();
    const activeFoldRect = activeFold?.getBoundingClientRect();
    const chevronRect = root
      .querySelector(".cm-foldGutter span")
      ?.getBoundingClientRect();
    const activeFoldStyle = activeFold && window.getComputedStyle(activeFold);
    return {
      colors,
      background: window.getComputedStyle(root.querySelector(".cm-editor"))
        .backgroundColor,
      foreground: window.getComputedStyle(root.querySelector(".cm-editor"))
        .color,
      gutterBorder: window.getComputedStyle(root.querySelector(".cm-gutters"))
        .borderRightColor,
      activeLine: {
        textDecoration:
          activeLine.textDecoration || activeLine.textDecorationLine || "",
        backgroundColor: activeLine.backgroundColor,
        borderLeftColor: activeLine.borderLeftColor,
        borderLeftWidth: activeLine.borderLeftWidth,
      },
      activeGutter: { backgroundColor: activeGutter.backgroundColor },
      activeNumber: {
        right: activeNumberRect?.right ?? 0,
        borderLeftWidth: activeNumber
          ? window.getComputedStyle(activeNumber).borderLeftWidth
          : "",
      },
      activeFold: {
        left: activeFoldRect?.left ?? 0,
        right: activeFoldRect?.right ?? 0,
        chevronLeft: chevronRect?.left ?? 0,
        boxShadow: activeFoldStyle?.boxShadow ?? "",
      },
      pickerRadius: window.getComputedStyle(
        root.querySelector('input[type="color"]'),
      ).borderTopLeftRadius,
    };
  });

  expect(styles.colors).toEqual(
    expect.arrayContaining([
      "rgb(7, 89, 133)",
      "rgb(22, 101, 52)",
      "rgb(87, 83, 78)",
    ]),
  );
  expect(styles.background).toBe("rgb(255, 253, 245)");
  expect(styles.foreground).toBe("rgb(23, 19, 15)");
  expect(styles.gutterBorder).toBe("rgb(23, 19, 15)");
  expect(styles.activeLine.textDecoration || "").not.toContain("underline");
  expect(styles.activeLine.backgroundColor).toBe("rgba(7, 89, 133, 0.12)");
  expect(styles.activeLine.borderLeftColor).toBe("rgb(7, 89, 133)");
  expect(styles.activeLine.borderLeftWidth).toBe("4px");
  expect(styles.activeGutter.backgroundColor).toBe("rgb(255, 216, 77)");
  expect(styles.activeNumber.borderLeftWidth).toBe("0px");
  expect(styles.activeNumber.right).toBeLessThan(styles.activeFold.chevronLeft);
  expect(styles.activeFold.right).toBeGreaterThan(styles.activeFold.left);
  expect(styles.activeFold.boxShadow).toContain("rgb(255, 92, 138)");
  expect(styles.pickerRadius).toBe("0px");
});

test("keeps a single-line active selection visibly highlighted", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "HTML source" });
  await editor.fill("<p>Selected line</p>\n<p>Second line</p>");
  await editor.press("ControlOrMeta+Home");
  await editor.press("Shift+End");
  await expect
    .poll(() => page.locator("#editor .cm-selectionBackground").count())
    .toBeGreaterThan(0);

  const selection = await page.locator("#editor").evaluate((root) => {
    const range = window.getSelection();
    const marker = root.querySelector(".cm-selectionBackground");
    const markerStyle = marker && window.getComputedStyle(marker);
    const markerRect = marker?.getBoundingClientRect();
    return {
      text: range?.toString(),
      markerCount: root.querySelectorAll(".cm-selectionBackground").length,
      markerWidth: markerRect?.width ?? 0,
      markerHeight: markerRect?.height ?? 0,
      markerBackground: markerStyle?.backgroundColor,
    };
  });

  expect(selection.text).toContain("<p>Selected line</p>");
  expect(selection.markerCount).toBeGreaterThan(0);
  expect(selection.markerWidth).toBeGreaterThan(0);
  expect(selection.markerHeight).toBeGreaterThan(0);
  expect(selection.markerBackground).toBe("rgb(255, 92, 138)");

  await editor.press("Shift+ArrowDown");
  await expect
    .poll(() => page.locator("#editor .cm-selectionBackground").count())
    .toBeGreaterThan(1);
});

test("keeps the compact gutter readable for long documents", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "HTML source" });
  const twentyFiveLines = Array.from(
    { length: 25 },
    (_, index) => `<p>Line ${index + 1}</p>`,
  ).join("\n");
  await editor.fill(twentyFiveLines);

  const metrics = await page.locator("#editor").evaluate((root) => {
    const gutter = root.querySelector(".cm-gutters");
    const lineNumbers = [
      ...root.querySelectorAll(".cm-lineNumbers .cm-gutterElement"),
    ];
    const foldElements = [
      ...root.querySelectorAll(".cm-foldGutter .cm-gutterElement"),
    ];
    const lastNumber = lineNumbers.at(-1);
    const gutterRect = gutter.getBoundingClientRect();
    const numberRects = lineNumbers.map((element) =>
      element.getBoundingClientRect(),
    );
    const foldRects = foldElements.map((element) =>
      element.getBoundingClientRect(),
    );
    return {
      gutterWidth: gutterRect.width,
      lineNumberVisible: lastNumber?.getBoundingClientRect().width > 0,
      lineNumberRight: numberRects.at(-1)?.right,
      foldLeft: foldRects[0]?.left,
      editorWidth: root.getBoundingClientRect().width,
      scrollWidth: root.scrollWidth,
    };
  });

  expect(metrics.gutterWidth).toBeLessThanOrEqual(60);
  expect(metrics.lineNumberVisible).toBe(true);
  expect(metrics.lineNumberRight).toBeLessThanOrEqual(
    metrics.foldLeft ?? Infinity,
  );
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.editorWidth);

  const oneHundredTwentyFiveLines = Array.from(
    { length: 125 },
    (_, index) => `<p>Line ${index + 1}</p>`,
  ).join("\n");
  await editor.fill(oneHundredTwentyFiveLines);
  await page.locator("#editor .cm-scroller").evaluate((scroller) => {
    scroller.scrollTop = scroller.scrollHeight;
  });

  const threeDigitMetrics = await page.locator("#editor").evaluate((root) => {
    const numberElements = [
      ...root.querySelectorAll(".cm-lineNumbers .cm-gutterElement"),
    ];
    const last = numberElements.at(-1);
    return {
      text: last?.textContent,
      width: last?.getBoundingClientRect().width,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
    };
  });
  expect(threeDigitMetrics.text).toBe("125");
  expect(threeDigitMetrics.width).toBeGreaterThan(0);
  expect(threeDigitMetrics.scrollWidth).toBeLessThanOrEqual(
    threeDigitMetrics.clientWidth,
  );
});

test("keeps the active-line marker structural in forced colors", async ({
  page,
}) => {
  await page.goto("/");
  await page.emulateMedia({ forcedColors: "active" });
  const styles = await page.locator("#editor").evaluate((root) => {
    const activeLine = window.getComputedStyle(
      root.querySelector(".cm-activeLine"),
    );
    return {
      decoration:
        activeLine.textDecoration || activeLine.textDecorationLine || "",
      border: activeLine.borderLeftStyle,
      borderWidth: activeLine.borderLeftWidth,
    };
  });

  expect(styles.decoration).not.toContain("underline");
  expect(styles.border).toBe("solid");
  expect(styles.borderWidth).toBe("4px");
});

test("opens the exact receiver fragment and downloads identical HTML", async ({
  page,
}) => {
  const receiver = new URL("/take/", "http://127.0.0.1:4173");
  const { url } = createTakeaway(CUSTOM_HTML, receiver.href);

  await page.goto(url);

  await expect(
    page.getByText("Your website is ready to preview and keep."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "If you didn’t make this link, close it and don’t enable interactions.",
    ),
  ).toBeVisible();
  await expect(
    page.frameLocator("#preview").getByRole("heading", { level: 1 }),
  ).toHaveText("Hello, ocean!");

  const receiverPreview = page.frameLocator("#preview");
  await receiverPreview.getByRole("button", { name: "Change it" }).click();
  await expect(receiverPreview.locator("body")).not.toHaveAttribute(
    "data-changed",
    "yes",
  );

  await page.getByRole("button", { name: "Enable interactions" }).click();
  await receiverPreview.getByRole("button", { name: "Change it" }).click();
  await expect(receiverPreview.locator("body")).toHaveAttribute(
    "data-changed",
    "yes",
  );

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my website" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("my-tiny-website.html");
  const path = await download.path();
  expect(await readFile(path, "utf8")).toBe(CUSTOM_HTML);
});

test("shows CSS color pickers and sends picker edits through the editor", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "HTML source" });
  const replacement =
    '<style>body { color: #bdefff; }</style><p style="background: #132238">Hello</p>';
  await editor.fill(replacement);

  await expect(editor).toHaveText(replacement);
  const pickers = page.locator('#editor input[type="color"]');
  await expect(pickers).toHaveCount(2);
  await pickers.first().fill("#ff5c8a");
  await expect(editor).toContainText("#ff5c8a");
  await expect(page.frameLocator("#preview").locator("body")).toHaveCSS(
    "color",
    "rgb(255, 92, 138)",
  );
  await expect(page.getByText("Saved on this device.")).toBeVisible();
});

test("explains invalid receiver links without enabling actions", async ({
  page,
}) => {
  await page.goto("/take/#not-a-site");

  await expect(page.getByRole("alert")).toContainText(
    "supported website payload",
  );
  await expect(
    page.getByRole("button", { name: "Download my website" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Copy source" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Enable interactions" }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toBeFocused();
});

test("keeps editor and preview first-viewport usable on desktop", async ({
  page,
}) => {
  await page.goto("/");

  const desktopFrames = [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ];

  for (const frame of desktopFrames) {
    await page.setViewportSize(frame);
    await page.reload();

    const metrics = await page.evaluate(() => {
      const editorHeading = document
        .querySelector(".editor-panel .panel-heading h2")
        ?.getBoundingClientRect();
      const previewHeading = document
        .querySelector(".preview-panel .panel-heading h2")
        ?.getBoundingClientRect();
      const editorArea = document
        .querySelector("#editor")
        ?.getBoundingClientRect();
      const previewArea = document
        .querySelector("#preview")
        ?.getBoundingClientRect();
      const editorPanel = document
        .querySelector(".editor-panel")
        ?.getBoundingClientRect();
      const previewPanel = document
        .querySelector(".preview-panel")
        ?.getBoundingClientRect();
      const overflow = {
        viewport: window.innerWidth,
        content: document.documentElement.scrollWidth,
      };

      if (
        !editorHeading ||
        !previewHeading ||
        !editorArea ||
        !previewArea ||
        !editorPanel ||
        !previewPanel
      ) {
        return { error: "missing elements" };
      }

      return {
        overflow,
        editorHeading: { top: editorHeading.top, bottom: editorHeading.bottom },
        previewHeading: {
          top: previewHeading.top,
          bottom: previewHeading.bottom,
        },
        editorArea,
        previewArea,
        editorPanel,
        previewPanel,
        viewportSize: { width: window.innerWidth, height: window.innerHeight },
      };
    });

    expect(metrics.error).toBeUndefined();
    expect(metrics.overflow.content).toBeLessThanOrEqual(
      metrics.overflow.viewport,
    );
    const editorHeadingRect = {
      top: metrics.editorHeading.top,
      bottom: metrics.editorHeading.bottom,
    };
    const previewHeadingRect = {
      top: metrics.previewHeading.top,
      bottom: metrics.previewHeading.bottom,
    };

    expect(editorHeadingRect.top).toBeGreaterThan(-5);
    expect(editorHeadingRect.bottom).toBeLessThanOrEqual(
      metrics.viewportSize.height,
    );
    expect(previewHeadingRect.top).toBeGreaterThan(-5);
    expect(previewHeadingRect.bottom).toBeLessThanOrEqual(
      metrics.viewportSize.height,
    );

    const editorVisible = visibleHeight(
      metrics.editorArea,
      metrics.viewportSize.height,
    );
    const previewVisible = visibleHeight(
      metrics.previewArea,
      metrics.viewportSize.height,
    );

    expect(editorVisible).toBeGreaterThanOrEqual(240);
    expect(previewVisible).toBeGreaterThanOrEqual(240);
    expect(editorVisible).toBeGreaterThanOrEqual(previewVisible);
    expect(metrics.editorPanel.height).toBeCloseTo(
      metrics.previewPanel.height,
      0,
    );
    expect(metrics.previewArea.height).toBeCloseTo(
      metrics.editorArea.height,
      0,
    );
  }
});

test("keeps an entry-point on mobile without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");

  const info = await page.evaluate(() => ({
    width: window.innerWidth,
    content: document.documentElement.scrollWidth,
    height: window.innerHeight,
  }));

  if (info.width > 520) {
    test.skip();
  }

  const metrics = await page.evaluate(() => {
    const editorHeading = document
      .querySelector(".editor-panel .panel-heading h2")
      ?.getBoundingClientRect();
    const editorArea = document
      .querySelector("#editor")
      ?.getBoundingClientRect();

    if (!editorHeading || !editorArea) {
      return { error: "missing elements" };
    }

    return {
      overflow: {
        viewport: window.innerWidth,
        content: document.documentElement.scrollWidth,
      },
      editorHeading: { top: editorHeading.top, bottom: editorHeading.bottom },
      editorArea,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });

  expect(metrics.error).toBeUndefined();
  expect(metrics.overflow.content).toBeLessThanOrEqual(
    metrics.overflow.viewport,
  );

  const editorHeadingRect = {
    top: metrics.editorHeading.top,
    bottom: metrics.editorHeading.bottom,
  };
  expect(editorHeadingRect.top).toBeGreaterThan(-5);
  expect(editorHeadingRect.bottom).toBeLessThanOrEqual(metrics.viewport.height);

  const editorVisible = visibleHeight(
    metrics.editorArea,
    metrics.viewport.height,
  );
  expect(editorVisible).toBeGreaterThan(96);
});

test("keeps one orientation slogan and the approved responsive order", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    page.getByText("Change the code.", { exact: false }),
  ).toHaveCount(1);
  await expect(page.locator(".intro")).toHaveCount(0);
  await expect(page.locator(".workspace-intro h1")).toHaveText(
    /Change the code\.\s*Watch the page change\./,
  );

  await expect(page.locator(".creator-card")).toHaveCSS(
    "background-color",
    "rgb(199, 164, 255)",
  );
  await expect(page.locator(".creator-card a").first()).toHaveAttribute(
    "href",
    "https://ryanmcgovern.dev",
  );
  await expect(page.locator("#creator-qr")).toHaveAttribute(
    "aria-label",
    "QR code linking to ryanmcgovern.dev",
  );

  const creatorLinkHeight = await page
    .locator(".creator-card a:not(.creator-qr-link)")
    .evaluate((link) => link.getBoundingClientRect().height);
  expect(creatorLinkHeight).toBeGreaterThanOrEqual(44);

  const order = await page
    .locator(".workspace > *")
    .evaluateAll((nodes) => nodes.map((node) => node.className));
  expect(order).toEqual([
    "workspace-intro",
    "panel editor-panel",
    "panel preview-panel",
    "creator-card",
  ]);

  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 850) {
    const visualOrder = await page
      .locator(".workspace > *")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          className: node.className,
          top: node.getBoundingClientRect().top,
        })),
      );
    const editorTop = visualOrder.find(({ className }) =>
      className.includes("editor-panel"),
    ).top;
    const previewTop = visualOrder.find(({ className }) =>
      className.includes("preview-panel"),
    ).top;
    const creatorTop = visualOrder.find(({ className }) =>
      className.includes("creator-card"),
    ).top;
    expect(previewTop).toBeGreaterThan(editorTop);
    expect(creatorTop).toBeGreaterThan(previewTop);
  } else {
    const desktopOrder = await page
      .locator(".workspace > *")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return { className: node.className, top: rect.top, left: rect.left };
        }),
      );
    const box = (name) =>
      desktopOrder.find(({ className }) => className.includes(name));
    expect(box("workspace-intro").top).toBeLessThan(box("editor-panel").top);
    expect(box("creator-card").top).toBeLessThan(box("preview-panel").top);
    expect(box("workspace-intro").left).toBeLessThan(box("creator-card").left);
    expect(box("editor-panel").left).toBeLessThan(box("preview-panel").left);
  }
});

test("keeps receiver copy and preview aligned across desktop and mobile", async ({
  page,
}) => {
  const receiver = new URL("/take/", "http://127.0.0.1:4173");
  const { url } = createTakeaway(CUSTOM_HTML, receiver.href);
  await page.goto(url);

  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Playwright viewport is required");

  const desktopFrames = [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1859, height: 981 },
  ];

  if (viewport.width > 850) {
    for (const frame of desktopFrames) {
      await page.setViewportSize(frame);
      await page.reload();
      const metrics = await page.evaluate(() => {
        const copy = document
          .querySelector(".receiver-copy")
          ?.getBoundingClientRect();
        const preview = document
          .querySelector(".receiver-preview")
          ?.getBoundingClientRect();
        const heading = document
          .querySelector(".receiver-preview .panel-heading h2")
          ?.getBoundingClientRect();
        const content = document
          .querySelector("#preview")
          ?.getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth <= window.innerWidth,
          copy,
          preview,
          heading,
          content,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        };
      });

      expect(metrics.overflow).toBe(true);
      expect(metrics.copy).not.toBeNull();
      expect(metrics.preview).not.toBeNull();
      expect(metrics.heading).not.toBeNull();
      expect(metrics.content).not.toBeNull();
      expect(metrics.preview.left).toBeGreaterThan(metrics.copy.right);
      expect(
        Math.abs(metrics.copy.top - metrics.preview.top),
      ).toBeLessThanOrEqual(2);
      expect(metrics.heading.top).toBeGreaterThanOrEqual(0);
      expect(metrics.heading.bottom).toBeLessThanOrEqual(
        metrics.viewport.height,
      );
      expect(metrics.content.top).toBeLessThan(metrics.viewport.height);
    }
  } else {
    const metrics = await page.evaluate(() => {
      const copy = document
        .querySelector(".receiver-copy")
        ?.getBoundingClientRect();
      const preview = document
        .querySelector(".receiver-preview")
        ?.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth <= window.innerWidth,
        copy,
        preview,
      };
    });
    expect(metrics.overflow).toBe(true);
    expect(metrics.copy).not.toBeNull();
    expect(metrics.preview).not.toBeNull();
    expect(metrics.preview.top).toBeGreaterThan(metrics.copy.bottom);
  }
});

test("fills the stretched receiver preview panel on desktop", async ({
  page,
}) => {
  const receiver = new URL("/take/", "http://127.0.0.1:4173");
  const { url } = createTakeaway(CUSTOM_HTML, receiver.href);
  await page.goto(url);

  const viewport = page.viewportSize();
  if (!viewport || viewport.width <= 850) test.skip();

  for (const frame of [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1859, height: 981 },
  ]) {
    await page.setViewportSize(frame);
    await page.reload();
    const metrics = await page.evaluate(() => {
      const panel = document
        .querySelector(".receiver-preview")
        ?.getBoundingClientRect();
      const heading = document
        .querySelector(".receiver-preview .panel-heading")
        ?.getBoundingClientRect();
      const shell = document
        .querySelector(".receiver-preview .preview-frame-shell")
        ?.getBoundingClientRect();
      const iframe = document
        .querySelector(".receiver-preview iframe")
        ?.getBoundingClientRect();
      return { panel, heading, shell, iframe };
    });

    expect(metrics.panel).not.toBeNull();
    expect(metrics.heading).not.toBeNull();
    expect(metrics.shell).not.toBeNull();
    expect(metrics.iframe).not.toBeNull();
    expect(metrics.shell.top).toBeGreaterThanOrEqual(
      metrics.heading.bottom - 1,
    );
    expect(metrics.shell.bottom).toBeGreaterThanOrEqual(
      metrics.panel.bottom - 4,
    );
    expect(metrics.iframe.bottom).toBeGreaterThanOrEqual(
      metrics.panel.bottom - 4,
    );
  }
});

test("shows focus-visible for the live preview iframe", async ({ page }) => {
  await page.goto("/");

  const viewport = page.viewportSize();
  if (!viewport || viewport.width <= 520) {
    test.skip();
  }

  let focused = false;
  for (let i = 0; i < 12; i++) {
    const activeId = await page.evaluate(
      () => document.activeElement?.id || "",
    );
    if (activeId === "preview") {
      focused = true;
      break;
    }
    await page.keyboard.press("Tab");
  }

  expect(focused).toBe(true);

  const previewLocator = page.locator("#preview");
  await expect(previewLocator).toHaveClass(/preview-focus-visible/, {
    timeout: 1000,
  });

  const focusState = await previewLocator.evaluate((preview) => {
    const previewStyle = window.getComputedStyle(preview);
    return {
      activeId: document.activeElement?.id || "",
      hasIndicator: preview.classList.contains("preview-focus-visible"),
      shellFocused: document
        .querySelector(".preview-frame-shell")
        .matches(":focus"),
      previewOutlineColor: previewStyle.outlineColor,
      previewOutlineStyle: previewStyle.outlineStyle,
      previewClassList: Array.from(preview.classList),
    };
  });

  expect(focusState.activeId).toBe("preview");
  expect(focusState.hasIndicator, JSON.stringify(focusState)).toBe(true);
  expect(focusState.previewOutlineColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(focusState.shellFocused).toBe(false);
});
