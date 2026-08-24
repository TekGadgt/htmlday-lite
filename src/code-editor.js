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
  { tag: tags.angleBracket, color: "#ffd84d" },
  { tag: tags.tagName, color: "#55c7ff", fontWeight: "700" },
  { tag: tags.attributeName, color: "#c7a4ff" },
  { tag: tags.string, color: "#7de2a8" },
  { tag: tags.comment, color: "#a9a096", fontStyle: "italic" },
  { tag: tags.number, color: "#ff5c8a" },
  {
    tag: [tags.keyword, tags.atom, tags.bool],
    color: "#ff5c8a",
    fontWeight: "700",
  },
  { tag: [tags.propertyName, tags.variableName], color: "#55c7ff" },
  {
    tag: [tags.typeName, tags.className, tags.definition(tags.typeName)],
    color: "#c7a4ff",
  },
  { tag: [tags.operator, tags.punctuation], color: "#fffdf5" },
]);

const editorTheme = EditorView.theme(
  {
    "&": {
      color: "#f8f5e8",
      backgroundColor: "#211d19",
      fontSize: "0.95rem",
    },
    ".cm-content": {
      caretColor: "#ffd84d",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      padding: "1rem",
      tabSize: "2",
    },
    ".cm-gutters": {
      color: "#a9a096",
      backgroundColor: "#211d19",
      borderRight: "3px solid #17130f",
      paddingLeft: "0.5rem",
    },
    ".cm-gutterElement": { minWidth: "2.5rem", padding: "0 0.5rem" },
    ".cm-activeLine": {
      backgroundColor: "#302a24",
      textDecoration: "underline 2px #ffd84d",
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
    ".cm-nonmatchingBracket": { color: "#fffdf5", backgroundColor: "#ff5c8a" },
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
        textDecoration: "underline",
      },
      ".cm-selectionBackground": { backgroundColor: "Highlight" },
      ".cm-matchingBracket, .cm-foldPlaceholder": {
        border: "2px solid ButtonText",
      },
    },
  },
  { dark: true },
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
