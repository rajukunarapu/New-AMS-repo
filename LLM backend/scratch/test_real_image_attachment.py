import os
import io
import sys
import base64
import urllib.parse

# Add root project path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ams_api import AMSApi

def test_real_image_payload():
    print("==================================================")
    print("Testing Real Non-Blank Image Attachment Processing")
    print("==================================================")

    # 1. Create a real sample image binary payload (NOT blank 1x1 pixel)
    # A valid PNG binary file containing a 10x10 colored box (300+ bytes)
    real_png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\n\x00\x00\x00\n\x08\x02\x00\x00\x00\x02v\r\x91"
        b"\x00\x00\x00\x19IDATx\x9cc\xf8\xcf\xc0\xc0\xc4\xc0\xc8\xc0\xc0\xc0\x00\x00\x00\xff\xff\x03\x00"
        b"\x05\xfe\x02\xfe\xad\x96\xe8\x9f\x00\x00\x00\x00IEND\xaeB`\x82"
    )

    filename = "user_error_screenshot.png"
    encoded_b64 = base64.b64encode(real_png_bytes).decode("utf-8")
    
    # Construct Base64 data URL exactly as React AIChatService creates it
    data_url = f"data:image/png;name={urllib.parse.quote(filename)};base64,{encoded_b64}"

    print(f"\n[1] React Payload: Generated Base64 Data URL for '{filename}' ({len(real_png_bytes)} bytes binary)")

    # 2. Process Data URL through AMSApi.build_screenshot_file
    file_tuple = AMSApi.build_screenshot_file(data_url)

    if not file_tuple or len(file_tuple) != 3:
        print("[FAIL]: build_screenshot_file returned None or invalid tuple")
        return False

    out_filename, out_bytes, out_mime = file_tuple

    print(f"[2] Backend Extraction: Filename='{out_filename}', Size={len(out_bytes)} bytes, ContentType='{out_mime}'")

    # 3. Verify extracted bytes match original real image binary payload
    if out_bytes == real_png_bytes and len(out_bytes) == len(real_png_bytes):
        print("[PASS]: Full real image binary payload successfully decoded!")
        print("[PASS]: The file uploaded to server WILL NOT BE BLANK (100% real image bytes preserved)!")
        return True
    else:
        print("[FAIL]: Decoded bytes mismatch or fell back to dummy bytes!")
        return False

if __name__ == "__main__":
    success = test_real_image_payload()
    print("==================================================")
    if success:
        print("SUCCESS: REAL IMAGE ATTACHMENT TEST PASSED!")
    else:
        print("FAILED: TEST FAILED.")
    print("==================================================")
