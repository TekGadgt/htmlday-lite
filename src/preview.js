const STATIC_POLICY = [
  "default-src 'none'",
  "img-src data: blob:",
  "media-src data: blob:",
  "font-src data:",
  "style-src 'unsafe-inline'",
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "child-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
];

export function createPreviewDocument(html, { allowScripts = false } = {}) {
  const policy = [
    ...STATIC_POLICY,
    allowScripts ? "script-src 'unsafe-inline'" : "script-src 'none'",
  ].join("; ");
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;

  if (/<head(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}${meta}`);
  }

  if (/<html(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(
      /<html(?:\s[^>]*)?>/i,
      (root) => `${root}<head>${meta}</head>`,
    );
  }

  return `${meta}${html}`;
}
