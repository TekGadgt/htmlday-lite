# HTML Day Lite

A client-only tiny website maker for drop-in events. Visitors edit one HTML file, watch it change in a sandboxed preview, and scan a QR code that carries the compressed page to their phone.

No account, email address, database, or content upload is required.

## Current experience

### Editor — `/`

1. Start with a compact, readable HTML page.
2. Edit the source in a plain textarea.
3. See the page update in a sandboxed iframe.
4. Watch the complete receiver URL against a 900-character event target.
5. Scan, copy, or download the QR while the page is within budget.
6. Download the HTML at any size.
7. Recover the latest draft from versioned browser storage after a refresh.

### Receiver — `/take/`

1. Read the versioned payload from the URL fragment.
2. decode Base64URL and decompress gzip locally.
3. Reject unsupported, damaged, oversized, or over-expanded payloads.
4. Preview the HTML in a sandboxed iframe.
5. Download `my-tiny-website.html` or copy its source.
6. Offer native file sharing only when `navigator.canShare({ files })` confirms support.

The page content lives after `#` and is not sent in the HTTP request. A production host can still observe ordinary request metadata such as IP address and user agent. This project includes no analytics, cookies, accounts, third-party scripts, or server-side content storage.

## Architecture

```text
index.html                 editor document
  └─ src/main.js           browser wiring + bundled QR renderer
     └─ src/editor-app.js  editor state and interactions

/take/index.html           receiver document
  └─ src/take.js           browser wiring
     └─ src/receiver-app.js

src/artifact.js            gzip/Base64URL protocol + safety limits
src/starter.js             tested starter website
src/storage.js             versioned local draft persistence
src/browser-actions.js     download, copy, and Web Share boundaries
src/styles.css             shared responsive visual system
```

Vite builds the editor and receiver as two static HTML entry points. `qrcode` and `fflate` are bundled at build time; the deployed site does not fetch them from a CDN.

## Fragment protocol

```text
https://host.example/take/#1.<base64url-gzip-payload>
```

- `1` is the protocol version.
- The payload is UTF-8 HTML compressed with gzip level 9.
- The compressed bytes use unpadded Base64URL.
- The receiver validates the version and encoded length before decoding.
- The gzip footer's declared source size is checked before inflation.
- The reconstructed source is capped at 50,000 bytes.
- gzip CRC validation detects damaged content.

## QR limits

The product-level target is **900 complete URL characters**, including the receiver origin, path, protocol marker, and payload. This is not the QR format's theoretical maximum.

The current starter measured on the local test origin:

```text
HTML source:       890 UTF-8 bytes
Gzip:              558 bytes
Complete URL:      774 characters
Error correction:  Q
QR version:        27
Modules:           125 × 125
Quiet zone:        4 modules
```

The browser-rendered QR was independently decoded with ZXing, and its fragment reconstructed `src/starter.js` byte-for-byte.

The editor blocks QR generation above the target but preserves HTML download. This prevents a technically valid but impractically dense maximum-size QR from becoming the only way to keep a page.

## Commands

Requirements:

- Node.js `>=22.13.0`
- pnpm `11.22.0` (pinned exactly in `packageManager`)

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm lint
pnpm format:check
pnpm build
pnpm test:e2e
pnpm audit --prod
```

The Playwright matrix includes:

- Chromium desktop
- Firefox desktop
- WebKit desktop
- Pixel 7 emulation
- iPhone 15 emulation

## Testing

```text
tests/unit/artifact.test.js        protocol, budget, and safety limits
tests/unit/starter.test.js         starter headroom and exact round trip
tests/unit/storage.test.js         versioned draft persistence
tests/integration/editor-app.test.js
tests/integration/receiver-app.test.js
tests/e2e/app.spec.js              edit → preview → QR/download → receiver
```

Automated verification covers:

- UTF-8 payload round trips;
- exact complete-URL accounting;
- realistic incompressible oversize content;
- source and encoded payload limits;
- malformed fragment handling;
- starter QR headroom;
- live preview and browser persistence;
- QR-disabled/HTML-download fallback;
- receiver preview and byte-identical download;
- invalid receiver state;
- desktop/mobile horizontal overflow;
- independent decoding of the rendered QR image.

## Deployment

`netlify.toml` builds with pinned Node and pnpm versions and publishes `dist/`.

For another static host:

1. run `pnpm build`;
2. publish `dist/` at the site root;
3. preserve `take/index.html` at `/take/`;
4. use HTTPS so clipboard and Web Share features can work where supported;
5. avoid request logging or set a short retention policy if making a data-minimal claim.

The editor derives the receiver URL from `window.location`, so no production hostname is hard-coded.

## Security and privacy boundaries

- Decoded HTML is never inserted into the receiver's own DOM.
- Both previews use `sandbox="allow-scripts"` without `allow-same-origin`.
- User scripts can run inside the isolated preview but cannot access the parent app's storage or DOM.
- Direct messages, accounts, uploads, analytics, and third-party runtime scripts do not exist in this app.
- QR payload and reconstructed source sizes are bounded.
- Download and share require explicit user action.
- The receiver has `noindex, nofollow` metadata.

## Remaining event-readiness checks

Automation does not reproduce camera focus, glare, screen brightness, viewing distance, cracked screens, or camera-app URL policy. Before calling the activation event-ready:

- scan representative starter and edited pages with physical iPhones and Android phones;
- test from the intended laptop display size and attendee distance;
- test under venue lighting and at different screen brightness levels;
- confirm the deployed HTTPS origin opens from camera apps;
- test native download/share behavior on physical devices;
- adjust the 900-character budget downward if acquisition is slow.

## Prior experiment

`experiments/qr-transfer/` preserves the original Python proof of concept, including direct `data:` and itty.bitty comparisons. It is evidence and protocol history, not production runtime code.
