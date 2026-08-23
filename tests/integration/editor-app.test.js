// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { initEditor } from "../../src/editor-app.js";
import { STARTER_HTML } from "../../src/starter.js";
import { createStatusController } from "../../src/status.js";

function setFixture() {
  document.body.innerHTML = `
    <div id="editor"></div>
    <iframe id="preview"></iframe>
    <p id="save-status"></p>
    <button id="reset"></button>
    <strong id="budget-value"></strong>
    <progress id="budget-progress" max="900"></progress>
    <p id="budget-message"></p>
    <button id="copy-link"></button>
    <button id="download-html"></button>
    <button id="download-qr"></button>
    <canvas id="qr"></canvas>
  `;
}

let testEditor;

function createTestEditor({ initialValue, onChange }) {
  let value = initialValue;
  testEditor = {
    getValue: () => value,
    setValue: (next) => {
      value = next;
    },
    focus: vi.fn(),
    destroy: vi.fn(),
    input: (next) => {
      value = next;
      onChange(next);
    },
  };
  return testEditor;
}

function initForTest(options) {
  return initEditor({ ...options, createEditor: createTestEditor });
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values,
  };
}

describe("editor app", () => {
  beforeEach(setFixture);

  it("loads the starter, previews it, and renders an in-budget QR", async () => {
    const renderQr = vi.fn().mockResolvedValue(undefined);

    await initForTest({
      document,
      location: new URL("https://example.test/"),
      storage: memoryStorage(),
      clipboard: { writeText: vi.fn() },
      renderQr,
      confirmReset: () => true,
    });

    expect(testEditor.getValue()).toBe(STARTER_HTML);
    expect(document.querySelector("#preview").srcdoc).toContain(
      "<h1>Your name</h1>",
    );
    expect(document.querySelector("#preview").srcdoc).toContain(
      "script-src 'unsafe-inline'",
    );
    expect(
      document.querySelector("#budget-progress").value,
    ).toBeLessThanOrEqual(900);
    expect(document.querySelector("#budget-value").textContent).toMatch(
      /\d+ \/ 900/,
    );
    expect(document.querySelector("#copy-link").disabled).toBe(false);
    expect(renderQr).toHaveBeenCalledOnce();
    expect(renderQr.mock.calls[0][1]).toMatch(
      /^https:\/\/example\.test\/take\/#1\./,
    );
  });

  it("updates the preview and storage, then blocks an oversized QR", async () => {
    const storage = memoryStorage();
    const renderQr = vi.fn().mockResolvedValue(undefined);
    await initForTest({
      document,
      location: new URL("https://example.test/"),
      storage,
      clipboard: { writeText: vi.fn() },
      renderQr,
      confirmReset: () => true,
    });

    let state = 0x12345678;
    const highEntropyText = Array.from({ length: 2_000 }, () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return String.fromCharCode(33 + ((state >>> 0) % 90));
    }).join("");
    const html = `<h1>${highEntropyText}</h1>`;
    testEditor.input(html);
    await Promise.resolve();

    expect(document.querySelector("#preview").srcdoc).toContain(html);
    expect(JSON.parse(storage.getItem("htmlday-lite:draft")).html).toBe(html);
    expect(document.querySelector("#copy-link").disabled).toBe(true);
    expect(document.querySelector("#download-qr").disabled).toBe(true);
    expect(document.querySelector("#budget-message").textContent).toContain(
      "too large",
    );
    expect(renderQr).toHaveBeenCalledOnce();
  });

  it("copies the current link, downloads the page, and confirms before reset", async () => {
    const storage = memoryStorage();
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    const downloadHtml = vi.fn();
    const downloadQr = vi.fn();
    const confirmReset = vi.fn(() => true);
    await initForTest({
      document,
      location: new URL("https://example.test/"),
      storage,
      clipboard,
      renderQr: vi.fn().mockResolvedValue(undefined),
      downloadHtml,
      downloadQr,
      confirmReset,
    });

    document.querySelector("#copy-link").click();
    await Promise.resolve();
    expect(clipboard.writeText).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/example\.test\/take\/#1\./),
    );

    document.querySelector("#download-html").click();
    expect(downloadHtml).toHaveBeenCalledWith(STARTER_HTML);

    document.querySelector("#download-qr").click();
    expect(downloadQr).toHaveBeenCalledWith(document.querySelector("#qr"));

    testEditor.input("<h1>Changed</h1>");
    document.querySelector("#reset").click();
    await Promise.resolve();

    expect(confirmReset).toHaveBeenCalledOnce();
    expect(testEditor.getValue()).toBe(STARTER_HTML);
    expect(storage.getItem("htmlday-lite:draft")).toBeNull();
  });

  it("replaces a reset status timer and cancels it when newer status arrives", () => {
    vi.useFakeTimers();
    const element = document.querySelector("#save-status");
    const status = createStatusController({ element });

    status.setTemporaryStatus("Starter restored.");
    vi.advanceTimersByTime(900);
    status.setTemporaryStatus("Starter restored.");
    vi.advanceTimersByTime(900);
    expect(element.textContent).toBe("Starter restored.");

    status.setStatus("Saved on this device.");
    vi.advanceTimersByTime(500);
    expect(element.textContent).toBe("Saved on this device.");
    vi.useRealTimers();
  });

  it("clears the reset message after 1200ms", async () => {
    vi.useFakeTimers();
    await initForTest({
      document,
      location: new URL("https://example.test/"),
      storage: memoryStorage(),
      clipboard: { writeText: vi.fn() },
      renderQr: vi.fn().mockResolvedValue(undefined),
      confirmReset: () => true,
    });

    document.querySelector("#reset").click();
    expect(document.querySelector("#save-status").textContent).toBe(
      "Starter restored.",
    );
    vi.advanceTimersByTime(1199);
    expect(document.querySelector("#save-status").textContent).toBe(
      "Starter restored.",
    );
    vi.advanceTimersByTime(1);
    expect(document.querySelector("#save-status").textContent).toBe("");
    vi.useRealTimers();
  });
});
