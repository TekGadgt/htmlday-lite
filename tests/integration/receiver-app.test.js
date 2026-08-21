// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeArtifact } from "../../src/artifact.js";
import { initReceiver } from "../../src/receiver-app.js";

function setFixture() {
  document.body.innerHTML = `
    <p id="receiver-status"></p>
    <p id="receiver-error"></p>
    <button id="download-html" disabled></button>
    <button id="share-html" hidden></button>
    <button id="copy-html" disabled></button>
    <button id="enable-interactions" disabled></button>
    <iframe id="preview"></iframe>
  `;
}

describe("receiver app", () => {
  beforeEach(setFixture);

  it("opens a valid page and enables local takeaway actions", async () => {
    const html = "<!doctype html><title>My page</title><h1>Hello 🌊</h1>";
    const { payload } = encodeArtifact(html);
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    const downloadHtml = vi.fn();
    const shareHtml = vi.fn().mockResolvedValue(undefined);

    initReceiver({
      document,
      hash: `#${payload}`,
      clipboard,
      downloadHtml,
      shareHtml,
      canShareHtml: () => true,
    });

    const preview = document.querySelector("#preview");
    expect(preview.srcdoc).toContain(html);
    expect(preview.srcdoc).toContain("script-src 'none'");
    expect(preview.getAttribute("sandbox")).toBe("");
    expect(document.querySelector("#enable-interactions").disabled).toBe(false);
    expect(document.querySelector("#receiver-status").textContent).toContain(
      "ready",
    );
    expect(document.querySelector("#download-html").disabled).toBe(false);
    expect(document.querySelector("#copy-html").disabled).toBe(false);
    expect(document.querySelector("#share-html").hidden).toBe(false);

    document.querySelector("#enable-interactions").click();
    expect(preview.getAttribute("sandbox")).toBe("allow-scripts");
    expect(preview.srcdoc).toContain("script-src 'unsafe-inline'");
    expect(document.querySelector("#enable-interactions").disabled).toBe(true);

    document.querySelector("#copy-html").click();
    await Promise.resolve();
    expect(clipboard.writeText).toHaveBeenCalledWith(html);

    document.querySelector("#download-html").click();
    expect(downloadHtml).toHaveBeenCalledWith(html);

    document.querySelector("#share-html").click();
    await Promise.resolve();
    expect(shareHtml).toHaveBeenCalledWith(html);
  });

  it("keeps actions disabled and explains an invalid fragment", () => {
    initReceiver({
      document,
      hash: "#not-a-site",
      clipboard: { writeText: vi.fn() },
      downloadHtml: vi.fn(),
      shareHtml: vi.fn(),
      canShareHtml: () => true,
    });

    expect(document.querySelector("#preview").srcdoc).toBe("");
    expect(document.querySelector("#download-html").disabled).toBe(true);
    expect(document.querySelector("#copy-html").disabled).toBe(true);
    expect(document.querySelector("#enable-interactions").disabled).toBe(true);
    expect(document.querySelector("#share-html").hidden).toBe(true);
    expect(document.querySelector("#receiver-error").textContent).toContain(
      "supported website payload",
    );
    expect(document.activeElement).toBe(
      document.querySelector("#receiver-error"),
    );
  });
});
