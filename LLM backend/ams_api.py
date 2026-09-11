import os
import requests
from dotenv import load_dotenv

load_dotenv(override=True)


class AMSApi:
    def __init__(self, email=None, password=None):
        self._email = email
        self._password = password
        self._auth_url = None
        self._ticket_url = None
        self._ticket_status_url = None
        self._ticket_create_url = None
        self.token = None
        self.token_type = "Bearer"

    def reload_env(self):
        """Reload variables from .env file into os.environ."""
        load_dotenv(override=True)

    @property
    def email(self):
        if self._email and self._email != "your_email":
            return self._email
        self.reload_env()
        return (
            os.getenv("AMS_EMAIL")
            or os.getenv("EMAIL")
            or ""
        )

    @email.setter
    def email(self, value):
        if self._email != value:
            self._email = value
            self.token = None

    @property
    def password(self):
        if self._password and self._password != "your_password":
            return self._password
        self.reload_env()
        return (
            os.getenv("AMS_PASSWORD")
            or os.getenv("AMS_PASS")
            or os.getenv("PASSWORD")
            or ""
        )

    @password.setter
    def password(self, value):
        if self._password != value:
            self._password = value
            self.token = None

    @property
    def auth_url(self):
        if self._auth_url:
            return self._auth_url
        self.reload_env()
        return os.getenv("AMS_AUTH_URL", "http://172.16.32.50/api/Auth/login")

    @auth_url.setter
    def auth_url(self, value):
        self._auth_url = value

    @property
    def ticket_url(self):
        if self._ticket_url:
            return self._ticket_url
        self.reload_env()
        return os.getenv("AMS_TICKET_URL", "http://172.16.32.50/api/Ticket")

    @ticket_url.setter
    def ticket_url(self, value):
        self._ticket_url = value

    @property
    def ticket_status_url(self):
        if self._ticket_status_url:
            return self._ticket_status_url
        self.reload_env()
        return os.getenv("AMS_TICKET_STATUS_URL", "http://172.16.32.50/api/Ticket/Status")

    @ticket_status_url.setter
    def ticket_status_url(self, value):
        self._ticket_status_url = value

    @property
    def ticket_create_url(self):
        if self._ticket_create_url:
            return self._ticket_create_url
        self.reload_env()
        return os.getenv("AMS_TICKET_CREATE_URL", "http://172.16.32.50/api/Ticket/CreateTicket")

    @ticket_create_url.setter
    def ticket_create_url(self, value):
        self._ticket_create_url = value

    def authenticate(self, email=None, password=None):
        if email is not None:
            self.email = email
        if password is not None:
            self.password = password

        if not self.email or self.email == "your_email" or not self.password or self.password == "your_password":
            raise Exception(
                "Invalid credentials configured. Please enter your actual AMS Email and Password in the sidebar or update the .env file."
            )

        payload = {
            "email": self.email,
            "password": self.password
        }
    
        headers = {
            "Accept": "*/*",
            "Content-Type": "application/json"
        }
    
        try:
            response = requests.post(
                self.auth_url,
                json=payload,
                headers=headers,
                timeout=30
            )
        except requests.exceptions.RequestException as err:
            raise Exception(f"Failed to reach AMS Authentication server at {self.auth_url}: {err}")
    
        print("STATUS:", response.status_code)
        print("RESPONSE:", response.text)
    
        if response.status_code == 401:
            raise Exception(
                f"Authentication failed (401 Unauthorized) for email '{self.email}'. Please check your email and password."
            )
        
        response.raise_for_status()
    
        data = response.json()
        token = data.get("token")
        self.token_type = data.get("tokenType", "Bearer")
        success = data.get("success")
        msg = data.get("message")
        
        if success is False:
            raise Exception(f"Authentication failed: {msg or 'Unknown error'}")

        if not token:
            raise Exception(
                f"Token not found in authentication response: {data}"
            )
    
        self.token = token
        return token

    def get_tickets(self, timeout=5):
        """Get AMS tickets using JWT with strict timeout to prevent backend hanging."""
        if not self.token:
            self.authenticate()
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json"
        }
        try:
            response = requests.get(
                self.ticket_url,
                headers=headers,
                timeout=timeout
            )
        except requests.exceptions.RequestException as err:
            raise Exception(f"Failed to reach AMS Ticket API at {self.ticket_url}: {err}")

        # Token might have expired
        if response.status_code == 401:
            if self._password or (self.email and self.password):
                try:
                    self.authenticate()
                    headers["Authorization"] = f"Bearer {self.token}"
                    response = requests.get(
                        self.ticket_url,
                        headers=headers,
                        timeout=timeout
                    )
                except Exception:
                    raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
            else:
                raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
        response.raise_for_status()
        data = response.json()
        
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            if isinstance(data.get("data"), list):
                return data["data"]
            if isinstance(data.get("result"), list):
                return data["result"]
        raise Exception(
            "Unexpected ticket API response format."
        )

    def get_ticket_status(self):
        """Get AMS ticket statuses from /api/Ticket/Status using JWT."""
        if not self.token:
            self.authenticate()
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json"
        }
        try:
            response = requests.get(
                self.ticket_status_url,
                headers=headers,
                timeout=60
            )
        except requests.exceptions.RequestException as err:
            raise Exception(f"Failed to reach AMS Ticket Status API at {self.ticket_status_url}: {err}")

        if response.status_code == 401:
            if self._password or (self.email and self.password):
                try:
                    self.authenticate()
                    headers["Authorization"] = f"Bearer {self.token}"
                    response = requests.get(
                        self.ticket_status_url,
                        headers=headers,
                        timeout=60
                    )
                except Exception:
                    raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
            else:
                raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
        response.raise_for_status()
        data = response.json()

        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            if isinstance(data.get("data"), list):
                return data["data"]
            if isinstance(data.get("result"), list):
                return data["result"]
        raise Exception("Unexpected ticket status API response format.")

    @staticmethod
    def get_mime_type(filename: str) -> str:
        """Determines proper MIME type for uploaded files without base64 encoding."""
        fn = (filename or "").lower()
        if fn.endswith(".pdf"):
            return "application/pdf"
        elif fn.endswith(".docx"):
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif fn.endswith(".doc"):
            return "application/msword"
        elif fn.endswith(".xlsx"):
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif fn.endswith(".xls"):
            return "application/vnd.ms-excel"
        elif fn.endswith(".csv"):
            return "text/csv"
        elif fn.endswith((".jpg", ".jpeg")):
            return "image/jpeg"
        elif fn.endswith(".png"):
            return "image/png"
        elif fn.endswith(".gif"):
            return "image/gif"
        elif fn.endswith(".webp"):
            return "image/webp"
        return "application/octet-stream"

    @staticmethod
    def build_screenshot_file(screenshot_val):
        """
        Constructs a valid multipart file tuple (filename, bytes, content_type)
        for ASP.NET IFormFile Screenshot parameter without Base64 encoding/decoding.
        Supports JPG, PNG, PDF, Excel (.xls/.xlsx/.csv), and Word (.doc/.docx) files.
        """
        if not screenshot_val or str(screenshot_val).strip().lower() in ["none", "null", "*none*", "*not provided*", ""]:
            return None

        # 1. Already a tuple or list (filename, bytes/stream, content_type)
        if isinstance(screenshot_val, (tuple, list)) and len(screenshot_val) >= 2:
            return screenshot_val

        # 2. Direct binary file-like object with read() method
        if hasattr(screenshot_val, "read"):
            filename = getattr(screenshot_val, "filename", getattr(screenshot_val, "name", "attachment.bin"))
            mime = AMSApi.get_mime_type(filename)
            try:
                content = screenshot_val.read()
                if hasattr(screenshot_val, "seek"):
                    screenshot_val.seek(0)
                return (filename, content, mime)
            except Exception:
                pass

        # 3. Base64 data URL string or Base64 encoded file content (real binary payload)
        if isinstance(screenshot_val, str) and ("base64," in screenshot_val or screenshot_val.startswith("data:")):
            import base64
            import urllib.parse
            try:
                if "," in screenshot_val:
                    header, encoded = screenshot_val.split(",", 1)
                else:
                    header, encoded = "", screenshot_val

                filename = "attachment.png"
                if "name=" in header:
                    raw_name = header.split("name=")[1].split(";")[0].strip('"\'')
                    filename = urllib.parse.unquote(raw_name)
                elif "image/jpeg" in header or "image/jpg" in header:
                    filename = "attachment.jpg"
                elif "application/pdf" in header:
                    filename = "attachment.pdf"
                elif "spreadsheetml" in header or "excel" in header:
                    filename = "attachment.xlsx"
                elif "wordprocessingml" in header or "msword" in header:
                    filename = "attachment.docx"

                mime = AMSApi.get_mime_type(filename)
                img_data = base64.b64decode(encoded)
                return (filename, img_data, mime)
            except Exception as err:
                print(f"[AMS API] Error decoding Base64 file payload: {err}")

        # 4. Direct file path on disk (reads binary content directly)
        if isinstance(screenshot_val, str) and os.path.isfile(screenshot_val):
            try:
                filename = os.path.basename(screenshot_val)
                mime = AMSApi.get_mime_type(filename)
                with open(screenshot_val, "rb") as f:
                    return (filename, f.read(), mime)
            except Exception:
                pass

        # 4. String filename or attachment name
        if isinstance(screenshot_val, str) and len(screenshot_val.strip()) > 0:
            filename = screenshot_val.strip()
            mime = AMSApi.get_mime_type(filename)
            dummy_bytes = b"Attachment payload"
            if mime == "image/png":
                dummy_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
            return (filename, dummy_bytes, mime)

        # 5. Object with .name property
        if hasattr(screenshot_val, "name"):
            filename = str(screenshot_val.name)
            mime = AMSApi.get_mime_type(filename)
            return (filename, b"Attachment payload", mime)

        return None

    def create_ticket(self, ticket_data):
        """
        Create a new ticket in AMS via /api/Ticket/CreateTicket.
        Allowed priorities in AMS database:
          - 'Low'
          - 'Medium'
          - 'High (Business Impacted)'
          - 'Very High (Production Impacted)'
        """
        if not self.token:
            self.authenticate()
        
        payload = dict(ticket_data or {})

        # Extract values using either PascalCase or camelCase/lowercase key names
        client_name = payload.get("ClientName") or payload.get("clientName") or ""
        ams_name = payload.get("AMS") or payload.get("ams") or "AMS"
        type_of_ticket = payload.get("Typeofticket") or payload.get("typeofticket") or "Incident"
        
        # Priority normalization to match strict AMS database values
        raw_prio = str(payload.get("Priority") or payload.get("priority") or "Low").strip().lower()
        if "very high" in raw_prio or "critical" in raw_prio or raw_prio in ["p1", "1"]:
            priority_val = "Very High (Production Impacted)"
        elif "high" in raw_prio or raw_prio in ["p2", "2"]:
            priority_val = "High (Business Impacted)"
        elif "med" in raw_prio or raw_prio in ["p3", "3"]:
            priority_val = "Medium"
        elif "low" in raw_prio or raw_prio in ["p4", "4"]:
            priority_val = "Low"
        else:
            priority_val = "High (Business Impacted)" if "high" in raw_prio else "Low"

        reported_on = payload.get("Reportedon") or payload.get("reportedon") or ""
        reported_on_time = payload.get("Reportedontime") or payload.get("reportedontime") or ""
        reported_by = payload.get("Reportedby") or payload.get("reportedby") or ""
        desc_of_ticket = payload.get("DescriptionofTicket") or payload.get("descriptionofTicket") or ""
        screenshot_val = payload.get("Screenshot") or payload.get("screenshort") or payload.get("screenshot") or ""
        remarks_val = payload.get("Remarks") or payload.get("remarks") or ""
        assign_group = payload.get("Assigntogroup") or payload.get("assigntogroup") or ""

        if client_name:
            client_name = str(client_name).strip()

        from datetime import datetime
        now = datetime.now()

        # Format Reportedon as YYYY-MM-DD (string($date) matching Swagger schema)
        if reported_on:
            if "T" in str(reported_on):
                reported_on = str(reported_on).split("T")[0]
        else:
            reported_on = now.strftime("%Y-%m-%d")

        if not reported_on_time:
            reported_on_time = now.strftime("%H:%M:%S")

        # Build clean exact 11-field multipart form payload matching Swagger schema
        form_data = {
            "ClientName": str(client_name),
            "AMS": str(ams_name) if ams_name else "AMS",
            "Typeofticket": str(type_of_ticket) if type_of_ticket else "Incident",
            "Priority": str(priority_val) if priority_val else "Low",
            "Reportedon": str(reported_on),
            "Reportedontime": str(reported_on_time),
            "Reportedby": str(reported_by),
            "DescriptionofTicket": str(desc_of_ticket),
            "Remarks": str(remarks_val) if remarks_val else "",
            "Assigntogroup": str(assign_group)
        }

        files = {}
        screenshot_file_tuple = self.build_screenshot_file(screenshot_val)
        if screenshot_file_tuple:
            files["Screenshot"] = screenshot_file_tuple
            files["screenshort"] = screenshot_file_tuple

        print(f"[AMS API] Sending CreateTicket multipart/form-data payload to {self.ticket_create_url}: {form_data} (files: {list(files.keys())})")

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "*/*"
        }
        try:
            response = requests.post(
                self.ticket_create_url,
                data=form_data,
                files=files if files else None,
                headers=headers,
                timeout=15
            )
            print(f"[AMS API] CreateTicket response ({response.status_code}): {response.text}")
        except requests.exceptions.RequestException as err:
            raise Exception(f"Failed to reach AMS Ticket Create API at {self.ticket_create_url}: {err}")

        if response.status_code == 401:
            if self._password or (self.email and self.password):
                try:
                    self.authenticate()
                    headers["Authorization"] = f"Bearer {self.token}"
                    response = requests.post(
                        self.ticket_create_url,
                        data=form_data,
                        files=files if files else None,
                        headers=headers,
                        timeout=15
                    )
                except Exception:
                    raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
            else:
                raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")

        if not response.ok:
            error_msg = response.text.strip()
            try:
                err_json = response.json()
                error_msg = err_json.get("message") or err_json.get("title") or response.text.strip()
            except Exception:
                pass
            
            if response.status_code == 500:
                hint = (
                    " (Hint: Server Error 500 is typically caused by an unrecognized 'priority' value (use 'Low', 'Medium', 'High', 'Critical') "
                    "or an unregistered 'clientName' in the database.)"
                )
                raise Exception(f"Ticket creation failed (500): {error_msg if error_msg else 'Internal Server Error'}{hint}")
            
            raise Exception(f"Ticket creation failed ({response.status_code}): {error_msg}")

        try:
            return response.json()
        except Exception:
            return {"status": "success", "statusCode": response.status_code, "text": response.text}

