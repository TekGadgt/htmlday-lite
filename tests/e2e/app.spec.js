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

test("edits, previews, saves, and downloads the QR", async ({ page }) => {
  await page.goto("/");

  const editor = page.getByLabel("HTML source");
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

test("fits the current viewport without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});
