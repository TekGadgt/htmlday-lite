import { describe, expect, it } from "vitest";
import { createPreviewDocument } from "../../src/preview.js";

const html =
  '<!doctype html><html><head><title>Test</title></head><body><script>document.body.dataset.ready = "yes"</script></body></html>';

describe("preview document policy", () => {
  it("blocks scripts and automatic network-capable resources by default", () => {
    const preview = createPreviewDocument(html);

    expect(preview).toContain("default-src 'none'");
    expect(preview).toContain("script-src 'none'");
    expect(preview).toContain("style-src 'unsafe-inline'");
    expect(preview).toContain("document.body.dataset.ready");
  });

  it("allows inline scripts only after an explicit interaction choice", () => {
    const preview = createPreviewDocument(html, { allowScripts: true });

    expect(preview).toContain("script-src 'unsafe-inline'");
    expect(preview).toContain("connect-src 'none'");
  });
});
