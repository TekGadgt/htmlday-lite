from pathlib import Path
import base64
import gzip
from PIL import Image
import zxingcpp

root = Path(__file__).parent
html = (root / "bio-page.html").read_bytes()

def decode_b64url(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))

itty = (root / "itty-bitty-url.txt").read_text()
direct = (root / "direct-data-url.txt").read_text()
receiver = (root / "receiver-url.txt").read_text()

itty_encoded = itty.split(";base64,", 1)[1]
direct_encoded = direct.split(",", 1)[1]
receiver_encoded = receiver.split("#1.", 1)[1]

assert gzip.decompress(base64.b64decode(itty_encoded)) == html
assert base64.b64decode(direct_encoded) == html
assert gzip.decompress(decode_b64url(receiver_encoded)) == html

for image_name, expected in [
    ("bio-itty-bitty-qr.png", itty),
    ("bio-direct-data-url-qr.png", direct),
    ("bio-receiver-prototype-qr.png", receiver),
]:
    result = zxingcpp.read_barcode(Image.open(root / image_name))
    assert result is not None
    assert result.text == expected

print("PASS: all 3 text payloads reconstruct bio-page.html byte-for-byte")
print("PASS: all 3 rendered PNGs independently decode to their exact expected payload")
print(f"PASS: bio-page.html is {len(html)} UTF-8 bytes")
