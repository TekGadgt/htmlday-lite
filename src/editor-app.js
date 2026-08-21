import { createTakeaway } from "./artifact.js";
import { createPreviewDocument } from "./preview.js";
import { STARTER_HTML } from "./starter.js";
import { clearDraft, loadDraft, saveDraft } from "./storage.js";
import { initPreviewFocusIndicator } from "./preview-focus.js";

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
}) {
  const editor = required(document, "#editor");
  const reset = required(document, "#reset");
  const preview = required(document, "#preview");
  initPreviewFocusIndicator(preview);
  const saveStatus = required(document, "#save-status");
  const budgetValue = required(document, "#budget-value");
  const budgetProgress = required(document, "#budget-progress");
  const budgetMessage = required(document, "#budget-message");
  const copyLink = required(document, "#copy-link");
  const downloadHtmlButton = required(document, "#download-html");
  const downloadQrButton = required(document, "#download-qr");
  const canvas = required(document, "#qr");

  const receiverUrl = new URL("/take/", location.href).href;
  let renderGeneration = 0;
  let currentHtml = "";
  let currentTakeaway;

  async function update(html, { persist = false } = {}) {
    const takeaway = createTakeaway(html, receiverUrl);
    const generation = ++renderGeneration;
    currentHtml = html;
    currentTakeaway = takeaway;

    editor.value = html;
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
      saveStatus.textContent = saveDraft(storage, html)
        ? "Saved on this device."
        : "Preview updated, but this browser could not save the draft.";
    }

    if (takeaway.withinBudget) {
      await renderQr(canvas, takeaway.url);
      if (generation !== renderGeneration) return;
    }
  }

  const html = loadDraft(storage, STARTER_HTML);
  await update(html);

  editor.addEventListener("input", () => {
    void update(editor.value, { persist: true });
  });

  copyLink.addEventListener("click", async () => {
    try {
      await clipboard.writeText(currentTakeaway.url);
      saveStatus.textContent = "QR link copied.";
    } catch {
      saveStatus.textContent =
        "Could not copy the link. Try downloading the HTML instead.";
    }
  });

  downloadHtmlButton.addEventListener("click", () => downloadHtml(currentHtml));
  downloadQrButton.addEventListener("click", () => downloadQr(canvas));

  reset.addEventListener("click", () => {
    if (!confirmReset()) return;
    clearDraft(storage);
    saveStatus.textContent = "Starter restored.";
    void update(STARTER_HTML);
  });
}
