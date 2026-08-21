import { decodeArtifact } from "./artifact.js";

function required(document, selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

export function initReceiver({
  document,
  hash,
  clipboard,
  downloadHtml,
  shareHtml,
  canShareHtml,
}) {
  const status = required(document, "#receiver-status");
  const error = required(document, "#receiver-error");
  const preview = required(document, "#preview");
  const downloadButton = required(document, "#download-html");
  const copyButton = required(document, "#copy-html");
  const shareButton = required(document, "#share-html");

  try {
    const html = decodeArtifact(hash);
    preview.srcdoc = html;
    downloadButton.disabled = false;
    copyButton.disabled = false;
    shareButton.hidden = !canShareHtml(html);
    status.textContent = "Your website is ready to preview and keep.";

    downloadButton.addEventListener("click", () => downloadHtml(html));
    copyButton.addEventListener("click", async () => {
      try {
        await clipboard.writeText(html);
        status.textContent = "HTML source copied.";
      } catch {
        status.textContent =
          "Could not copy the source. Try downloading the file instead.";
      }
    });
    shareButton.addEventListener("click", async () => {
      try {
        await shareHtml(html);
      } catch (cause) {
        if (cause?.name !== "AbortError") {
          status.textContent =
            "This device could not share the file. You can still download it.";
        }
      }
    });
  } catch (cause) {
    status.textContent = "";
    error.textContent =
      cause instanceof Error
        ? cause.message
        : "This website link could not be opened.";
  }
}
