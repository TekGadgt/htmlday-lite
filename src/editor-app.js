import { createTakeaway } from "./artifact.js";
import { createCodeEditor } from "./code-editor.js";
import { createPreviewDocument } from "./preview.js";
import { STARTER_HTML } from "./starter.js";
import { clearDraft, loadDraft, saveDraft } from "./storage.js";
import { initPreviewFocusIndicator } from "./preview-focus.js";
import { createStatusController } from "./status.js";

function required(document, selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

export async function initEditor({
  document,
  location,
  storage,
  clipboard,
  renderQr,
  downloadHtml,
  downloadQr,
  confirmReset,
  creatorQr,
  createEditor = createCodeEditor,
}) {
  const editorMount = required(document, "#editor");
  const reset = required(document, "#reset");
  const preview = required(document, "#preview");
  initPreviewFocusIndicator(preview);
  const saveStatus = required(document, "#save-status");
  const status = createStatusController({ element: saveStatus });
  const budgetValue = required(document, "#budget-value");
  const budgetProgress = required(document, "#budget-progress");
  const budgetMessage = required(document, "#budget-message");
  const copyLink = required(document, "#copy-link");
  const downloadHtmlButton = required(document, "#download-html");
  const downloadQrButton = required(document, "#download-qr");
  const canvas = required(document, "#qr");

  if (creatorQr) await renderQr(creatorQr, "https://ryanmcgovern.dev");

  const receiverUrl = new URL("/take/", location.href).href;
  let renderGeneration = 0;
  let currentHtml = "";
  let currentTakeaway;
  let editor;

  async function update(html, { persist = false, syncEditor = true } = {}) {
    const takeaway = createTakeaway(html, receiverUrl);
    const generation = ++renderGeneration;
    currentHtml = html;
    currentTakeaway = takeaway;

    if (syncEditor) editor.setValue(html);
    preview.srcdoc = createPreviewDocument(html, { allowScripts: true });
    budgetValue.textContent = `${takeaway.urlCharacters} / ${takeaway.budget}`;
    budgetProgress.max = takeaway.budget;
    budgetProgress.value = Math.min(takeaway.urlCharacters, takeaway.budget);
    copyLink.disabled = !takeaway.withinBudget;
    downloadQrButton.disabled = !takeaway.withinBudget;
    canvas.hidden = !takeaway.withinBudget;
    budgetMessage.textContent = takeaway.withinBudget
      ? `${takeaway.sourceBytes} HTML bytes · ${takeaway.compressedBytes} compressed bytes`
      : "This page is too large for the event QR. Download the HTML instead.";

    if (persist) {
      status.setStatus(
        saveDraft(storage, html)
          ? "Saved on this device."
          : "Preview updated, but this browser could not save the draft.",
      );
    }

    if (takeaway.withinBudget) {
      await renderQr(canvas, takeaway.url);
      if (generation !== renderGeneration) return;
    }
  }

  const html = loadDraft(storage, STARTER_HTML);
  editor = createEditor({
    parent: editorMount,
    initialValue: html,
    onChange: (value) =>
      void update(value, { persist: true, syncEditor: false }),
  });
  await update(html, { syncEditor: false });

  copyLink.addEventListener("click", async () => {
    try {
      await clipboard.writeText(currentTakeaway.url);
      status.setStatus("QR link copied.");
    } catch {
      status.setStatus(
        "Could not copy the link. Try downloading the HTML instead.",
      );
    }
  });

  downloadHtmlButton.addEventListener("click", () => downloadHtml(currentHtml));
  downloadQrButton.addEventListener("click", () => downloadQr(canvas));

  reset.addEventListener("click", () => {
    if (!confirmReset()) return;
    clearDraft(storage);
    status.setStatus("Starter restored.");
    void update(STARTER_HTML);
  });
}
