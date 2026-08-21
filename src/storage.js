export const STORAGE_KEY = "htmlday-lite:draft";
const STORAGE_VERSION = 1;

export function saveDraft(storage, html) {
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, html }),
    );
    return true;
  } catch {
    return false;
  }
}

export function loadDraft(storage, fallback) {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY));
    if (value?.version === STORAGE_VERSION && typeof value.html === "string") {
      return value.html;
    }
  } catch {
    // Ignore unavailable or malformed browser storage.
  }

  return fallback;
}

export function clearDraft(storage) {
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
