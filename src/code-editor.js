import { basicSetup } from "codemirror";
import { EditorState, Annotation } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { html } from "@codemirror/lang-html";
import {
  colorPicker,
  colorPickerTheme,
  wrapperClassName,
} from "@replit/codemirror-css-color-picker";

const programmaticChange = Annotation.define();

const syntaxTheme = HighlightStyle.define([
  { tag: tags.angleBracket, color: "#075985" },
  { tag: tags.tagName, color: "#075985", fontWeight: "700" },
  { tag: tags.attributeName, color: "#6b21a8" },
  { tag: tags.string, color: "#166534" },
  { tag: tags.comment, color: "#57534e", fontStyle: "italic" },
  { tag: tags.number, color: "#9f1239" },
  {
    tag: [tags.keyword, tags.atom, tags.bool],
    color: "#9f1239",
    fontWeight: "700",
  },
  { tag: [tags.propertyName, tags.variableName], color: "#075985" },
  {
    tag: [tags.typeName, tags.className, tags.definition(tags.typeName)],
    color: "#6b21a8",
  },
  { tag: [tags.operator, tags.punctuation], color: "#17130f" },
]);

const editorTheme = EditorView.theme(
  {
    "&": {
      color: "#17130f",
      backgroundColor: "#fffdf5",
      fontSize: "0.95rem",
    },
    ".cm-content": {
      caretColor: "#ff5c8a",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      padding: "1rem",
      tabSize: "2",
    },
    ".cm-gutters": {
      color: "#17130f",
      backgroundColor: "#ffd84d",
      borderRight: "3px solid #17130f",
      paddingLeft: "0",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      minWidth: "2rem",
      padding: "0 0.35rem 0 0.25rem",
      textAlign: "right",
    },
    ".cm-foldGutter .cm-gutterElement": {
      minWidth: "1.25rem",
      padding: "0 0.2rem",
    },
    ".cm-activeLine": {
      backgroundColor: "#e0f2fe",
      borderLeft: "4px solid #075985",
      boxShadow: "inset 4px 0 0 #075985",
    },
    ".cm-activeLineGutter": {
      color: "#17130f",
      backgroundColor: "#ffd84d",
      fontWeight: "900",
      borderLeft: "3px solid #ff5c8a",
    },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: "#ff5c8a",
      color: "#17130f",
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#ff5c8a" },
    ".cm-matchingBracket": {
      color: "#17130f !important",
      backgroundColor: "#ffd84d",
      outline: "2px solid #ffd84d",
    },
    ".cm-nonmatchingBracket": { color: "#17130f", backgroundColor: "#ff5c8a" },
    ".cm-foldPlaceholder": {
      color: "#17130f",
      backgroundColor: "#c7a4ff",
      border: "2px solid #17130f",
      borderRadius: "0",
      padding: "0 0.35rem",
    },
    [`.${wrapperClassName}`]: {
      outlineColor: "#ffd84d",
      borderRadius: "0",
      backgroundColor: "#ffd84d",
      border: "2px solid #17130f",
    },
    [`.${wrapperClassName} input[type="color"]`]: {
      outline: "2px solid #211d19",
      outlineOffset: "-2px",
      border: "2px solid #17130f",
      borderRadius: "0",
    },
    "@media (forced-colors: active)": {
      ".cm-activeLine, .cm-activeLineGutter": {
        backgroundColor: "Highlight",
        color: "HighlightText",
        borderLeft: "4px solid Highlight",
        boxShadow: "inset 4px 0 0 Highlight",
      },
      ".cm-selectionBackground": { backgroundColor: "Highlight" },
      ".cm-matchingBracket, .cm-foldPlaceholder": {
        border: "2px solid ButtonText",
      },
    },
  },
  { dark: false },
);

export function createCodeEditor({ parent, initialValue = "", onChange }) {
  if (!parent) throw new Error("A parent element is required");

  const labelColorPickers = () => {
    parent
      .querySelectorAll(`.${wrapperClassName} input[type="color"]`)
      .forEach((input, index) => {
        input.setAttribute("aria-label", `CSS color picker ${index + 1}`);
      });
  };

  const view = new EditorView({
    state: EditorState.create({
      doc: initialValue,
      extensions: [
        basicSetup,
        html(),
        syntaxHighlighting(syntaxTheme),
        colorPicker,
        colorPickerTheme,
        editorTheme,
        EditorView.contentAttributes.of({
          "aria-label": "HTML source",
          spellcheck: "false",
          autocapitalize: "off",
        }),
        EditorView.updateListener.of((update) => {
          if (
            update.docChanged &&
            !update.transactions.some((transaction) =>
              transaction.annotation(programmaticChange),
            )
          ) {
            onChange?.(update.state.doc.toString());
            update.view.focus();
          }
        }),
      ],
    }),
    parent,
  });

  labelColorPickers();
  const colorPickerObserver = new globalThis.MutationObserver(
    labelColorPickers,
  );
  colorPickerObserver.observe(parent, { childList: true, subtree: true });

  parent.tabIndex = -1;
  const focusEditor = () => view.focus();
  parent.addEventListener("focus", focusEditor);

  return {
    getValue: () => view.state.doc.toString(),
    setValue: (value) => {
      if (value === view.state.doc.toString()) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
        annotations: programmaticChange.of(true),
      });
    },
    focus: () => view.focus(),
    destroy: () => {
      colorPickerObserver.disconnect();
      parent.removeEventListener("focus", focusEditor);
      view.destroy();
    },
  };
}
