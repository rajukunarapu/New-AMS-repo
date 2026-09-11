import os
import sys
import json
import requests

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ams_api import AMSApi

def test_screenshot_upload():
    ams = AMSApi()
    ams.authenticate()
    headers_form = {
        "Authorization": f"Bearer {ams.token}",
        "Accept": "*/*"
    }

    form_data = {
        "ClientName": "ATG",
        "AMS": "AMS",
        "Typeofticket": "Incident",
        "Priority": "High (Business Impacted)",
        "Reportedon": "2026-09-10",
        "Reportedontime": "12:15:00",
        "Reportedby": "jaswanth.b@neovatic.com",
        "DescriptionofTicket": "Testing IFormFile Screenshot binary upload",
        "Remarks": "Screenshot database verification",
        "Assigntogroup": "RPA"
    }

    # Attach file binary in files dictionary under key 'Screenshot' (matching Swagger string($binary))
    filename = "image (30).png"
    file_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82" # Valid 1x1 PNG image bytes

    files = {
        "Screenshot": (filename, file_bytes, "image/png"),
        "screenshort": (filename, file_bytes, "image/png")
    }

    print("--- Posting Ticket with IFormFile 'Screenshot' ---")
    res = requests.post(ams.ticket_create_url, data=form_data, files=files, headers=headers_form, timeout=15)
    print(f"Status Code: {res.status_code}")
    print(f"Response Body: {res.text}")

if __name__ == "__main__":
    test_screenshot_upload()
