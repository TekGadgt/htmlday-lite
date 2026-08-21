import {
  canShareHtml,
  copyText,
  downloadHtml,
  shareHtml,
} from "./browser-actions.js";
import { initReceiver } from "./receiver-app.js";
import "./styles.css";

initReceiver({
  document,
  hash: window.location.hash,
  clipboard: { writeText: copyText },
  downloadHtml,
  shareHtml,
  canShareHtml,
});
