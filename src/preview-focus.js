function handlePreviewFocus(previewElement) {
  const applyFocus = () => {
    previewElement.classList.add("preview-focus-visible");
    previewElement.style.outline = "4px solid var(--pink)";
    previewElement.style.outlineOffset = "3px";
  };

  const clearFocus = () => {
    previewElement.classList.remove("preview-focus-visible");
    previewElement.style.outline = "";
    previewElement.style.outlineOffset = "";
  };

  const syncIndicator = () => {
    if (previewElement.ownerDocument.activeElement === previewElement) {
      applyFocus();
    } else {
      clearFocus();
    }
  };

  previewElement.addEventListener("focus", syncIndicator);
  previewElement.addEventListener("focusin", syncIndicator);
  previewElement.addEventListener("blur", syncIndicator);
  previewElement.addEventListener("focusout", syncIndicator);
  previewElement.ownerDocument.addEventListener("focusin", syncIndicator);
  previewElement.ownerDocument.addEventListener("focusout", syncIndicator);

  const raf = previewElement.ownerDocument.defaultView?.requestAnimationFrame;
  if (raf) {
    const tick = () => {
      syncIndicator();
      raf.call(previewElement.ownerDocument.defaultView, tick);
    };
    raf.call(previewElement.ownerDocument.defaultView, tick);
  }
  syncIndicator();
}

export function initPreviewFocusIndicator(previewElement) {
  if (!previewElement || previewElement.tagName !== "IFRAME") {
    return;
  }

  handlePreviewFocus(previewElement);
}
