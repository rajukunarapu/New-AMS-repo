import sys
import os
import base64
import urllib.parse
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ams_api import AMSApi
from services.ticket_creator_service import format_preview_markdown, clean_user_message_text, clean_ticket_description

# Sample base64 payload with custom name parameter
sample_filename = "image (30).jpg"
sample_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"

base64_encoded = base64.b64encode(sample_bytes).decode('utf-8')
data_url = f"data:image/jpeg;name={urllib.parse.quote(sample_filename)};base64,{base64_encoded}"

print("=== Testing Base64 File Extraction in AMSApi ===")
res_tuple = AMSApi.build_screenshot_file(data_url)
print("Extracted Tuple:", res_tuple[0], f"{len(res_tuple[1])} bytes", res_tuple[2])

assert res_tuple[0] == "image (30).jpg", f"Expected filename 'image (30).jpg', got '{res_tuple[0]}'"
assert res_tuple[1] == sample_bytes, "Decoded bytes do not match original binary bytes!"
assert res_tuple[2] == "image/jpeg", f"Expected MIME 'image/jpeg', got '{res_tuple[2]}'"

print("\n--- AMSApi Base64 Decoding Test Passed! ---")

print("\n=== Testing Markdown Preview Image HTML Generation ===")
draft = {
    "clientName": "AAB",
    "ams": "AMS",
    "typeofticket": "S PO",
    "priority": "Low",
    "reportedon": "2026-09-15T17:00:00",
    "reportedontime": "17:00:00",
    "reportedby": "veera.pasya@neovatic.com",
    "descriptionofTicket": "Purchase order not processing.",
    "screenshort": data_url,
    "remarks": None,
    "assigntogroup": "SAP-MM"
}

preview_md = format_preview_markdown(draft, [])
print("Markdown Output Sample:")
for line in preview_md.split("\n"):
    if "screenshort" in line or "<img" in line:
        print(line)

assert 'src="data:image/jpeg;base64,' in preview_md, "Image src tag did not contain cleaned base64 URL!"
assert ';name=' not in preview_md.split('src="')[1].split('"')[0], "Image src tag still contained invalid ;name= parameter!"

print("\n--- Markdown Preview Test Passed! ---")
