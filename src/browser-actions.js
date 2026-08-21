const HTML_FILENAME = "my-tiny-website.html";

function makeHtmlFile(html) {
  return new File([html], HTML_FILENAME, { type: "text/html" });
}

function clickDownload(href, filename) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
}

export function downloadHtml(html) {
  const url = URL.createObjectURL(makeHtmlFile(html));
  clickDownload(url, HTML_FILENAME);
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function downloadQr(canvas) {
  clickDownload(canvas.toDataURL("image/png"), "my-tiny-website-qr.png");
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Copy was not available.");
}

export function canShareHtml(html) {
  if (!navigator.canShare) return false;
  return navigator.canShare({ files: [makeHtmlFile(html)] });
}

export function shareHtml(html) {
  return navigator.share({
    files: [makeHtmlFile(html)],
    title: "My tiny website",
  });
}
