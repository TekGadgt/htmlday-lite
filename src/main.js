import QRCode from "qrcode";
import { copyText, downloadHtml, downloadQr } from "./browser-actions.js";
import { initEditor } from "./editor-app.js";
import "./styles.css";

async function renderQr(canvas, value) {
  await QRCode.toCanvas(canvas, value, {
    errorCorrectionLevel: "Q",
    margin: 4,
    width: 420,
    color: {
      dark: "#17130f",
      light: "#ffffff",
    },
  });
}

await initEditor({
  document,
  location: window.location,
  storage: window.localStorage,
  clipboard: { writeText: copyText },
  renderQr,
  downloadHtml,
  downloadQr,
  confirmReset: () =>
    window.confirm(
      "Reset the editor and replace your current draft with the starter?",
    ),
});
