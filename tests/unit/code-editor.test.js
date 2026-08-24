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

  it("installs the HTML Day syntax palette and editor chrome", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const editor = createCodeEditor({
      parent,
      initialValue:
        '<style>body { color: #ff5c8a; }</style><h1 class="title">Hello</h1>',
    });

    const themeCss = [...document.head.querySelectorAll("style")]
      .map((style) => style.textContent)
      .join("\n");
    expect(themeCss).toContain(".cm-matchingBracket");
    expect(themeCss).toContain(".cm-nonmatchingBracket");
    expect(themeCss).toContain("background-color: #fffdf5");
    expect(themeCss).toContain("color: #17130f");

    expect(themeCss).not.toMatch(/cm-activeLine[^}]*text-decoration/);
    expect(themeCss).toMatch(
      /\.cm-nonmatchingBracket[^}]*color:\s*#17130f[^}]*background-color:\s*#ff5c8a/,
    );
    expect(themeCss).toContain("#ff5c8a");
    expect(themeCss).toContain(".cm-foldPlaceholder");
    expect(themeCss).toContain("border-left: 4px solid #075985");
    expect(parent.querySelector(".cm-line span")).not.toBeNull();

    editor.destroy();
  });

  it("scopes compact sizing to line-number and fold gutters", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const editor = createCodeEditor({ parent, initialValue: "<p>Hello</p>" });

    const themeCss = [...document.head.querySelectorAll("style")]
      .map((style) => style.textContent)
      .join("\n");
    expect(themeCss).toContain("padding-left: 0");
    expect(themeCss).toContain(".cm-lineNumbers .cm-gutterElement");
    expect(themeCss).toContain("min-width: 2rem");
    expect(themeCss).toContain("padding: 0 0.35rem 0 0.25rem");
    expect(themeCss).toContain(".cm-foldGutter .cm-gutterElement");
    expect(themeCss).toContain("min-width: 1.25rem");
    expect(themeCss).toContain("padding: 0 0.2rem");

    editor.destroy();
  });
});
