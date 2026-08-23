import { basicSetup } from "codemirror";
import { EditorState, Annotation } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { html } from "@codemirror/lang-html";

const programmaticChange = Annotation.define();

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
      border: "0",
      paddingLeft: "0.5rem",
    },
    ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#302a24" },
    ".cm-selectionBackground, ::selection": { backgroundColor: "#5a3a49" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#ff5c8a" },
  },
  { dark: true },
);

export function createCodeEditor({ parent, initialValue = "", onChange }) {
  if (!parent) throw new Error("A parent element is required");

  const view = new EditorView({
    state: EditorState.create({
      doc: initialValue,
      extensions: [
        basicSetup,
        html(),
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
          }
        }),
      ],
    }),
    parent,
  });

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
      parent.removeEventListener("focus", focusEditor);
      view.destroy();
    },
  };
}
