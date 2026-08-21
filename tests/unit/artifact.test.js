import { describe, expect, it } from "vitest";
import {
  createTakeaway,
  decodeArtifact,
  encodeArtifact,
  MAX_PAYLOAD_CHARACTERS,
  MAX_SOURCE_BYTES,
  QR_URL_BUDGET,
} from "../../src/artifact.js";

describe("artifact codec", () => {
  it("round-trips UTF-8 HTML through the version 1 payload", () => {
    const html = "<!doctype html><title>Héllo 🌊</title><h1>Tiny site</h1>";

    const encoded = encodeArtifact(html);

    expect(encoded.payload).toMatch(/^1\.[A-Za-z0-9_-]+$/);
    expect(encoded.sourceBytes).toBe(new TextEncoder().encode(html).byteLength);
    expect(encoded.compressedBytes).toBeGreaterThan(0);
    expect(decodeArtifact(`#${encoded.payload}`)).toBe(html);
  });

  it("measures the complete receiver URL against the event QR budget", () => {
    const result = createTakeaway(
      "<h1>Hello</h1>",
      "https://example.test/take/",
    );

    expect(result.url).toBe(`https://example.test/take/#${result.payload}`);
    expect(result.urlCharacters).toBe(result.url.length);
    expect(result.budget).toBe(QR_URL_BUDGET);
    expect(result.withinBudget).toBe(true);

    let state = 0x12345678;
    const highEntropyText = Array.from({ length: 2_000 }, () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return String.fromCharCode(33 + ((state >>> 0) % 90));
    }).join("");
    const oversized = createTakeaway(
      `<p>${highEntropyText}</p>`,
      "https://example.test/take/",
    );
    expect(oversized.urlCharacters).toBeGreaterThan(QR_URL_BUDGET);
    expect(oversized.withinBudget).toBe(false);
  });

  it("rejects a compressed payload that expands beyond the source limit", () => {
    const oversizedHtml = `<p>${"a".repeat(MAX_SOURCE_BYTES)}</p>`;
    const { payload } = encodeArtifact(oversizedHtml);

    expect(() => decodeArtifact(`#${payload}`)).toThrow(
      "This website is too large to open safely.",
    );
  });

  it("rejects an oversized encoded fragment before decompression", () => {
    expect(MAX_PAYLOAD_CHARACTERS).toBe(4_096);
    const payload = `#1.${"a".repeat(4_097)}`;

    expect(() => decodeArtifact(payload)).toThrow(
      "This website link is too large to open safely.",
    );
  });

  it("reports a stable error for a damaged payload", () => {
    expect(() => decodeArtifact("#1.not-valid-gzip")).toThrow(
      "This website link is damaged or incomplete.",
    );
  });
});
