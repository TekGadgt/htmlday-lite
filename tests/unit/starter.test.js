import { describe, expect, it } from "vitest";
import { createTakeaway, decodeArtifact } from "../../src/artifact.js";
import { STARTER_HTML } from "../../src/starter.js";

describe("starter website", () => {
  it("fits the event QR budget and survives an exact round trip", () => {
    const result = createTakeaway(STARTER_HTML, "https://example.test/take/");

    expect(STARTER_HTML).toContain("<!doctype html>");
    expect(STARTER_HTML).toContain("<style>");
    expect(STARTER_HTML).toContain("<button");
    expect(result.withinBudget).toBe(true);
    expect(result.urlCharacters).toBeLessThanOrEqual(800);
    expect(decodeArtifact(new URL(result.url).hash)).toBe(STARTER_HTML);
  });
});
