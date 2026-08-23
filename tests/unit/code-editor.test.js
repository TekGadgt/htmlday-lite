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
});
