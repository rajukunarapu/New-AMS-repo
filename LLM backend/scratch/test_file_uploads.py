import os
import io
import sys

# Add root project path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ams_api import AMSApi

def test_file_upload_handling():
    print("==================================================")
    print("Testing Direct File Uploads (No Base64 / No Base64 Decoding)")
    print("==================================================")

    test_files = [
        ("sample_invoice.pdf", b"%PDF-1.4 test content", "application/pdf"),
        ("sample_report.docx", b"PK\x03\x04 Word document content", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        ("legacy_doc.doc", b"\xd0\xcf\x11\xe0 Legacy Word doc content", "application/msword"),
        ("data_sheet.xlsx", b"PK\x03\x04 Excel spreadsheet content", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ("data_sheet.xls", b"\xd0\xcf\x11\xe0 Legacy Excel sheet", "application/vnd.ms-excel"),
        ("records.csv", b"ID,Name,Status\n1,Test,Active", "text/csv"),
        ("screenshot.png", b"\x89PNG\r\n\x1a\n\x00\x00\x00 PNG image content", "image/png"),
        ("photo.jpg", b"\xff\xd8\xff\xe0 JPG image content", "image/jpeg"),
    ]

    all_passed = True

    for filename, raw_bytes, expected_mime in test_files:
        print(f"\n--- Testing File: {filename} ---")
        
        # 1. Test get_mime_type
        detected_mime = AMSApi.get_mime_type(filename)
        print(f"  [1] MIME Detection: Detected='{detected_mime}', Expected='{expected_mime}'")
        if detected_mime != expected_mime:
            print("  [FAIL]: MIME type mismatch")
            all_passed = False
        else:
            print("  [PASS]: MIME type correct")

        # 2. Test File-like object (BytesIO) binary stream (No Base64)
        file_stream = io.BytesIO(raw_bytes)
        file_stream.name = filename
        
        built_file = AMSApi.build_screenshot_file(file_stream)
        if built_file and len(built_file) == 3:
            b_filename, b_content, b_mime = built_file
            print(f"  [2] Binary Stream Build: Filename='{b_filename}', Size={len(b_content)} bytes, ContentType='{b_mime}'")
            if b_filename == filename and b_content == raw_bytes and b_mime == expected_mime:
                print("  [PASS]: Direct binary stream file tuple correctly built without Base64")
            else:
                print("  [FAIL]: Binary stream content or metadata mismatch")
                all_passed = False
        else:
            print("  [FAIL]: build_screenshot_file returned invalid result")
            all_passed = False

    print("\n==================================================")
    if all_passed:
        print("SUCCESS: ALL DIRECT FILE UPLOAD TESTS PASSED SUCCESSFULLY!")
    else:
        print("FAILED: SOME TESTS FAILED.")
    print("==================================================")

if __name__ == "__main__":
    test_file_upload_handling()
