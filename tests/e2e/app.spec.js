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

  const editor = page.getByLabel("HTML source");
  await expect(page.locator("#save-status")).toBeHidden();
  await expect(
    page.getByText("Don’t open someone else’s HTML Day Lite link."),
  ).toBeVisible();
  await expect(editor).toHaveValue(/Your name/);
  await expect(
    page.frameLocator("#preview").getByRole("heading", { level: 1 }),
  ).toHaveText("Your name");

  await editor.fill(CUSTOM_HTML);
  await expect(
    page.frameLocator("#preview").getByRole("heading", { level: 1 }),
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
  await expect(editor).toHaveValue(CUSTOM_HTML);
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
      const overflow = {
        viewport: window.innerWidth,
        content: document.documentElement.scrollWidth,
      };

      if (!editorHeading || !previewHeading || !editorArea || !previewArea) {
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

test("shows focus-visible for the live preview iframe", async ({ page }) => {
  await page.goto("/");

  const viewport = page.viewportSize();
  if (!viewport || viewport.width <= 520) {
    test.skip();
  }

  let focused = false;
  for (let i = 0; i < 12; i++) {
    const isFocusedOnPreview = await page.evaluate(() => {
      const active = document.activeElement;
      return (
        active?.id === "preview" ||
        active?.classList?.contains("preview-frame-shell")
      );
    });

    if (isFocusedOnPreview) {
      focused = true;
      break;
    }

    await page.keyboard.press("Tab");
  }

  expect(focused).toBe(true);

  const focusState = await page
    .locator(".preview-frame-shell")
    .evaluate((shell) => {
      const shellStyle = window.getComputedStyle(shell);
      return {
        shellIsFocused:
          shell.matches(":focus-visible") || shell.matches(":focus"),
        shellOutlineWidth: shellStyle.outlineWidth,
        shellOutlineStyle: shellStyle.outlineStyle,
        shellOutlineColor: shellStyle.outlineColor,
        shellBoxShadow: shellStyle.boxShadow,
        activeId: document.activeElement?.id || "",
        activeClass: document.activeElement?.className || "",
      };
    });

  expect(focusState.shellIsFocused).toBe(true);
  expect(focusState.shellOutlineStyle).toBe("solid");
  expect(focusState.shellOutlineWidth).toBe("4px");
  expect(focusState.shellOutlineColor).not.toBe("rgba(0, 0, 0, 0)");
});
