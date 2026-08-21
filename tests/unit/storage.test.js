import { describe, expect, it } from "vitest";
import { loadDraft, saveDraft, STORAGE_KEY } from "../../src/storage.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("draft storage", () => {
  it("saves and restores a versioned HTML draft", () => {
    const storage = memoryStorage();

    expect(saveDraft(storage, "<h1>Mine</h1>")).toBe(true);
    expect(JSON.parse(storage.getItem(STORAGE_KEY))).toEqual({
      version: 1,
      html: "<h1>Mine</h1>",
    });
    expect(loadDraft(storage, "starter")).toBe("<h1>Mine</h1>");
  });
});
