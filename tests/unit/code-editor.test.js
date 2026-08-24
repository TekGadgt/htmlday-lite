// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createCodeEditor } from "../../src/code-editor.js";

describe("code editor adapter", () => {
  it("exposes the document value and reports user changes", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const changes = [];
    const editor = createCodeEditor({
      parent,
      initialValue: "<h1>Hello</h1>",
      onChange: (value) => changes.push(value),
    });

    expect(editor.getValue()).toBe("<h1>Hello</h1>");
    expect(parent.querySelector(".cm-content")).not.toBeNull();
    expect(parent.querySelector(".cm-line span")).not.toBeNull();
    expect(parent.querySelector(".cm-content").getAttribute("aria-label")).toBe(
      "HTML source",
    );

    editor.setValue("<h1>Updated</h1>");
    expect(editor.getValue()).toBe("<h1>Updated</h1>");
    expect(changes).toEqual([]);

    editor.destroy();
  });

  it("renders color pickers for CSS in style blocks and inline styles", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const editor = createCodeEditor({
      parent,
      initialValue:
        '<style>body { color: #bdefff; }</style><p style="background: #132238">Hello</p>',
    });

    expect(parent.querySelectorAll('input[type="color"]')).toHaveLength(2);
    expect(
      [...parent.querySelectorAll('input[type="color"]')].map((input) =>
        input.getAttribute("aria-label"),
      ),
    ).toEqual(["CSS color picker 1", "CSS color picker 2"]);

    editor.destroy();
  });

  it("returns focus to the HTML source after a picker changes the document", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const editor = createCodeEditor({
      parent,
      initialValue: "<style>body { color: #bdefff; }</style>",
    });
    const picker = parent.querySelector('input[type="color"]');

    picker.value = "#ff5c8a";
    picker.dispatchEvent(new globalThis.Event("change", { bubbles: true }));

    expect(parent.querySelector(".cm-content")).toBe(document.activeElement);
    editor.destroy();
  });
});
