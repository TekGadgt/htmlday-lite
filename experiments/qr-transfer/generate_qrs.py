from pathlib import Path
import base64
import gzip
import qrcode
from qrcode.constants import ERROR_CORRECT_L, ERROR_CORRECT_Q

root = Path(__file__).parent
html = (root / "bio-page.html").read_bytes()
compressed = gzip.compress(html, compresslevel=9)
standard_base64 = base64.b64encode(compressed).decode("ascii")
base64url = base64.urlsafe_b64encode(compressed).decode("ascii").rstrip("=")

itty_url = "https://itty.bitty.site/#/data:text/html;charset=utf-8;format=gz;base64," + standard_base64
direct_url = "data:text/html;base64," + base64.b64encode(html).decode("ascii")
receiver_url = "https://take.tekgadgt.dev/#1." + base64url

cases = [
    ("bio-itty-bitty-qr.png", itty_url, ERROR_CORRECT_Q),
    ("bio-direct-data-url-qr.png", direct_url, ERROR_CORRECT_L),
    ("bio-receiver-prototype-qr.png", receiver_url, ERROR_CORRECT_Q),
]
for name, value, correction in cases:
    qr = qrcode.QRCode(error_correction=correction, box_size=10, border=4)
    qr.add_data(value)
    qr.make(fit=True)
    qr.make_image(fill_color="black", back_color="white").save(root / name)
    print(f"{name}: version={qr.version}, modules={qr.modules_count}, image_px={(qr.modules_count + 8) * 10}")

(root / "itty-bitty-url.txt").write_text(itty_url)
(root / "direct-data-url.txt").write_text(direct_url)
(root / "receiver-url.txt").write_text(receiver_url)

print(f"html_bytes={len(html)}")
print(f"gzip_bytes={len(compressed)}")
print(f"itty_url_chars={len(itty_url)}")
print(f"direct_url_chars={len(direct_url)}")
print(f"receiver_url_chars={len(receiver_url)}")
