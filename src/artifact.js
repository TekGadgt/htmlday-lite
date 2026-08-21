import { gzipSync, gunzipSync } from "fflate";

const VERSION = "1";
export const QR_URL_BUDGET = 900;
export const MAX_PAYLOAD_CHARACTERS = 4_096;
export const MAX_SOURCE_BYTES = 50_000;

function bytesToBase64Url(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }

  return globalThis
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = globalThis.atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function encodeArtifact(html) {
  const source = new TextEncoder().encode(html);
  const compressed = gzipSync(source, { level: 9 });

  return {
    payload: `${VERSION}.${bytesToBase64Url(compressed)}`,
    sourceBytes: source.byteLength,
    compressedBytes: compressed.byteLength,
  };
}

export function createTakeaway(html, receiverUrl) {
  const encoded = encodeArtifact(html);
  const url = new URL(receiverUrl);
  url.hash = encoded.payload;
  const value = url.href;

  return {
    ...encoded,
    url: value,
    urlCharacters: value.length,
    budget: QR_URL_BUDGET,
    withinBudget: value.length <= QR_URL_BUDGET,
  };
}

export function decodeArtifact(fragment) {
  const payload = fragment.replace(/^#/u, "");
  const [version, encoded] = payload.split(".", 2);

  if (version !== VERSION || !encoded) {
    throw new Error("This link does not contain a supported website payload.");
  }

  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw new Error("This website link is damaged or incomplete.");
  }

  if (encoded.length > MAX_PAYLOAD_CHARACTERS) {
    throw new Error("This website link is too large to open safely.");
  }

  let compressed;
  try {
    compressed = base64UrlToBytes(encoded);
  } catch {
    throw new Error("This website link is damaged or incomplete.");
  }

  if (compressed.byteLength < 18) {
    throw new Error("This website link is damaged or incomplete.");
  }

  const footer = compressed.byteLength - 4;
  const declaredSize =
    (compressed[footer] |
      (compressed[footer + 1] << 8) |
      (compressed[footer + 2] << 16) |
      (compressed[footer + 3] << 24)) >>>
    0;

  if (declaredSize > MAX_SOURCE_BYTES) {
    throw new Error("This website is too large to open safely.");
  }

  let decompressed;
  try {
    decompressed = gunzipSync(compressed);
  } catch {
    throw new Error("This website link is damaged or incomplete.");
  }

  if (decompressed.byteLength > MAX_SOURCE_BYTES) {
    throw new Error("This website is too large to open safely.");
  }

  return new TextDecoder("utf-8", { fatal: true }).decode(decompressed);
}
