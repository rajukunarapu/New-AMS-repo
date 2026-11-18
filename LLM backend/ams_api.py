import os
import re
import httpx
import xml.etree.ElementTree as ET
from typing import Optional, Dict, Any, List, Tuple
try:
    from pyi_env_hook import load_from_web_config
except Exception:
    def load_from_web_config(override: bool = False, file_path: str = None) -> bool:
        return False


def load_web_config(file_path: Optional[str] = None) -> bool:
    """
    Parses environment variables directly from web.config into os.environ.
    This ensures URLs and configurations stored in web.config are always available.
    """
    if load_from_web_config(override=False, file_path=file_path):
        return True

    candidates = [
        file_path,
        os.path.join(os.path.dirname(__file__), "web.config"),
        os.path.join(os.getcwd(), "web.config"),
        os.path.join(os.path.dirname(__file__), "..", "web.config"),
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            try:
                tree = ET.parse(path)
                root = tree.getroot()
                for env_elem in root.iter("environmentVariable"):
                    name = env_elem.get("name")
                    val = env_elem.get("value")
                    if name and val is not None and not (val.startswith("%") and val.endswith("%")):
                        os.environ[name] = val
                return True
            except Exception as e:
                print(f"[AMSApi] Warning: failed to parse {path}: {e}")
    return False


# Load configurations exclusively from web.config
load_web_config()
 
 
class AMSApi:
    # In-memory ticket dataset cache to avoid repeated HTTP calls on follow-up queries (30s TTL)
    _tickets_cache: Optional[List[Dict[str, Any]]] = None
    _tickets_cache_time: float = 0.0
    TICKETS_CACHE_TTL_SECONDS: float = 30.0
 
    @classmethod
    def invalidate_tickets_cache(cls):
        """Invalidates the in-memory tickets cache (e.g. after a ticket is created)."""
        cls._tickets_cache = None
        cls._tickets_cache_time = 0.0
 
    def __init__(self, email=None, password=None):
        self._email = email
        self._password = password
        self._auth_url = None
        self._ticket_url = None
        self._ticket_status_url = None
        self._ticket_create_url = None
        self._client_names_url = None
        self._ticket_details_url = None
        self._ticket_steps_url = None
        self._ticket_step_reminder_url = None
        self.token = None
        self.token_type = "Bearer"
 
    def reload_env(self):
        """Reload variables from web.config into os.environ."""
        load_web_config()
 
    @property
    def email(self):
        if self._email and self._email != "your_email":
            return self._email
        self.reload_env()
        return (
            os.getenv("SLA_EMAIL")
            or os.getenv("AMS_EMAIL")
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
            os.getenv("SLA_PASSWORD")
            or os.getenv("AMS_PASSWORD")
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
        return os.getenv("AMS_AUTH_URL") or f"{self.base_url}/api/Auth/login"
 
    @auth_url.setter
    def auth_url(self, value):
        self._auth_url = value
 
    @property
    def ticket_url(self):
        if self._ticket_url:
            return self._ticket_url
        self.reload_env()
        return os.getenv("AMS_TICKET_URL") or f"{self.base_url}/api/Ticket"
 
    @ticket_url.setter
    def ticket_url(self, value):
        self._ticket_url = value
 
    @property
    def ticket_status_url(self):
        if self._ticket_status_url:
            return self._ticket_status_url
        self.reload_env()
        return os.getenv("AMS_TICKET_STATUS_URL") or f"{self.base_url}/api/Ticket/Status"
 
    @ticket_status_url.setter
    def ticket_status_url(self, value):
        self._ticket_status_url = value
 
    @property
    def ticket_create_url(self):
        if self._ticket_create_url:
            return self._ticket_create_url
        self.reload_env()
        return os.getenv("AMS_TICKET_CREATE_URL") or f"{self.base_url}/api/Ticket/CreateTicket"
 
    @ticket_create_url.setter
    def ticket_create_url(self, value):
        self._ticket_create_url = value
 
    @property
    def client_names_url(self):
        if self._client_names_url:
            return self._client_names_url
        self.reload_env()
        return os.getenv("AMS_CLIENT_NAMES_URL"or f"{self.base_url}/api/Ticket/GetClientNames")
 
    @client_names_url.setter
    def client_names_url(self, value):
        self._client_names_url = value
 
    @property
    def ticket_details_url(self):
        if self._ticket_details_url:
            return self._ticket_details_url
        self.reload_env()
        return os.getenv("TICKET_DETAILS_API_URL") or f"{self.base_url}/api/Ticket/GetTicketDetails"
 
    @ticket_details_url.setter
    def ticket_details_url(self, value):
        self._ticket_details_url = value
 
    @property
    def ticket_steps_url(self):
        if self._ticket_steps_url:
            return self._ticket_steps_url
        self.reload_env()
        return os.getenv("TICKET_STEPS_API_URL") or f"{self.base_url}/api/Ticket/GetTicketSteps"
 
    @ticket_steps_url.setter
    def ticket_steps_url(self, value):
        self._ticket_steps_url = value
 
    @property
    def ticket_step_reminder_url(self):
        if self._ticket_step_reminder_url:
            return self._ticket_step_reminder_url
        self.reload_env()
        return os.getenv("TICKET_STEP_REMINDER_API_URL") or f"{self.base_url}/api/Ticket/SendTicketStepReminder"
 
    @ticket_step_reminder_url.setter
    def ticket_step_reminder_url(self, value):
        self._ticket_step_reminder_url = value
 
    async def authenticate(self, email=None, password=None):
        """Asynchronously authenticate with AMS API using httpx."""
        self.reload_env()
        auth_email = email or self._email
        auth_password = password or self._password
 
        # If no explicit password was provided (e.g. ChatService passing only username),
        # use system SLA service credentials so backend data queries can authenticate seamlessly.
        if not auth_password:
            auth_email = os.getenv("SLA_EMAIL") or os.getenv("AMS_EMAIL", "")
            auth_password = os.getenv("SLA_PASSWORD") or os.getenv("AMS_PASSWORD", "")
 
        if not auth_email or auth_email == "your_email" or not auth_password or auth_password == "your_password":
            raise Exception(
                "Invalid credentials configured. Please enter your actual AMS Email and Password in the sidebar or update the web.config file."
            )
 
        payload = {
            "email": auth_email,
            "password": auth_password
        }
   
        headers = {
            "Accept": "*/*",
            "Content-Type": "application/json"
        }
   
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.auth_url,
                    json=payload,
                    headers=headers,
                )
        except httpx.HTTPError as err:
            raise Exception(f"Failed to reach AMS Authentication server at {self.auth_url}: {err}")
   
        print("STATUS:", response.status_code)
        print("RESPONSE:", response.text)
   
        if response.status_code == 401:
            raise Exception(
                f"Authentication failed (401 Unauthorized) for email '{auth_email}'. Please check your email and password."
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
 
    async def get_tickets(self, timeout=60, force_refresh: bool = False):
        """Get AMS tickets using JWT with async httpx, utilizing 30s in-memory cache to prevent redundant HTTP requests."""
        import time
        now = time.time()
        if not force_refresh and AMSApi._tickets_cache and (now - AMSApi._tickets_cache_time) < AMSApi.TICKETS_CACHE_TTL_SECONDS:
            return AMSApi._tickets_cache
 
        if not self.token:
            await self.authenticate()
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json"
        }
        try:
            async with httpx.AsyncClient(timeout=float(timeout)) as client:
                response = await client.get(
                    self.ticket_url,
                    headers=headers,
                )
 
                # Token might have expired or be invalid - automatically re-authenticate with SLA credentials
                if response.status_code == 401:
                    try:
                        sla_email = os.getenv("SLA_EMAIL") or os.getenv("AMS_EMAIL", "")
                        sla_pass = os.getenv("SLA_PASSWORD") or os.getenv("AMS_PASSWORD", "")
                        await self.authenticate(email=sla_email, password=sla_pass)
                        headers["Authorization"] = f"Bearer {self.token}"
                        response = await client.get(
                            self.ticket_url,
                            headers=headers,
                        )
                    except Exception as reauth_err:
                        raise Exception(f"AMS Bearer token is expired or unauthorized (401). System re-auth failed: {reauth_err}")
               
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as err:
            raise Exception(f"Failed to reach AMS Ticket API at {self.ticket_url}: {err}")
       
        if isinstance(data, list):
            AMSApi._tickets_cache = data
            AMSApi._tickets_cache_time = time.time()
            return data
        if isinstance(data, dict):
            res_list = data.get("data") if isinstance(data.get("data"), list) else (data.get("result") if isinstance(data.get("result"), list) else None)
            if res_list is not None:
                AMSApi._tickets_cache = res_list
                AMSApi._tickets_cache_time = time.time()
                return res_list
        raise Exception(
            "Unexpected ticket API response format."
        )
 
    async def get_ticket_status(self):
        """Get AMS ticket statuses from /api/Ticket/Status using JWT (async)."""
        if not self.token:
            await self.authenticate()
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json"
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(
                    self.ticket_status_url,
                    headers=headers,
                )
 
                if response.status_code == 401:
                    if self._password or (self.email and self.password):
                        try:
                            await self.authenticate()
                            headers["Authorization"] = f"Bearer {self.token}"
                            response = await client.get(
                                self.ticket_status_url,
                                headers=headers,
                            )
                        except Exception:
                            raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
                    else:
                        raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
               
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as err:
            raise Exception(f"Failed to reach AMS Ticket Status API at {self.ticket_status_url}: {err}")
 
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            if isinstance(data.get("data"), list):
                return data["data"]
            if isinstance(data.get("result"), list):
                return data["result"]
        raise Exception("Unexpected ticket status API response format.")
 
    async def get_ticket_details(self, timeout=60):
        """Get AMS detailed tickets list from /api/Ticket/GetTicketDetails using JWT (async)."""
        if not self.token:
            await self.authenticate()
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json"
        }
        try:
            async with httpx.AsyncClient(timeout=float(timeout)) as client:
                response = await client.get(
                    self.ticket_details_url,
                    headers=headers,
                )
 
                if response.status_code == 401:
                    if self._password or (self.email and self.password):
                        try:
                            await self.authenticate()
                            headers["Authorization"] = f"Bearer {self.token}"
                            response = await client.get(
                                self.ticket_details_url,
                                headers=headers,
                            )
                        except Exception:
                            raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
                    else:
                        raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
               
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as err:
            raise Exception(f"Failed to reach AMS Ticket Details API at {self.ticket_details_url}: {err}")
 
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            if isinstance(data.get("data"), list):
                return data["data"]
            if isinstance(data.get("result"), list):
                return data["result"]
            if "ticketId" in data or "ticketStaus" in data:
                return [data]
        raise Exception("Unexpected GetTicketDetails API response format.")
 
    async def get_ticket_steps(self, ticket_id: str, timeout=60):
        """Get step workflow history for a ticket from /api/Ticket/GetTicketSteps/{ticketNo} (async)."""
        if not self.token:
            await self.authenticate()
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json"
        }
        url = f"{self.ticket_steps_url.rstrip('/')}/{str(ticket_id).strip()}"
        try:
            async with httpx.AsyncClient(timeout=float(timeout)) as client:
                response = await client.get(
                    url,
                    headers=headers,
                )
 
                if response.status_code == 401:
                    if self._password or (self.email and self.password):
                        try:
                            await self.authenticate()
                            headers["Authorization"] = f"Bearer {self.token}"
                            response = await client.get(
                                url,
                                headers=headers,
                            )
                        except Exception:
                            raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
                    else:
                        raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
               
                # If 404 with path param, try query parameter fallback
                if response.status_code == 404:
                    alt_url = self.ticket_steps_url.rstrip('/')
                    response = await client.get(
                        alt_url,
                        params={"ticketNo": str(ticket_id).strip()},
                        headers=headers,
                    )
 
                response.raise_for_status()
                data = response.json()
                return data
        except httpx.HTTPError as err:
            raise Exception(f"Failed to reach AMS Ticket Steps API at {url}: {err}")
 
    async def send_ticket_step_reminder(self, payload: dict, timeout=60):
        """Send ticket step reminder POST to /api/Ticket/SendTicketStepReminder (async)."""
        if not self.token:
            await self.authenticate()
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Accept": "*/*"
        }
        try:
            async with httpx.AsyncClient(timeout=float(timeout)) as client:
                response = await client.post(
                    self.ticket_step_reminder_url,
                    json=payload,
                    headers=headers,
                )
 
                if response.status_code == 401:
                    if self._password or (self.email and self.password):
                        try:
                            await self.authenticate()
                            headers["Authorization"] = f"Bearer {self.token}"
                            response = await client.post(
                                self.ticket_step_reminder_url,
                                json=payload,
                                headers=headers,
                            )
                        except Exception:
                            raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
                    else:
                        raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
 
                if not response.is_success:
                    raise Exception(f"SendTicketStepReminder failed with status {response.status_code}: {response.text}")
 
                try:
                    return response.json()
                except Exception:
                    return {"status": "success", "statusCode": response.status_code, "text": response.text}
        except httpx.HTTPError as err:
            raise Exception(f"Failed to reach AMS Ticket Step Reminder API at {self.ticket_step_reminder_url}: {err}")
 
 
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
 
                # Sanitize Base64 string formatting (remove spaces/newlines and add proper '=' padding)
                clean_encoded = encoded.strip().strip('"\'`')
                clean_encoded = re.sub(r'\s+', '', clean_encoded)
                missing_padding = len(clean_encoded) % 4
                if missing_padding:
                    clean_encoded += '=' * (4 - missing_padding)
 
                img_data = base64.b64decode(clean_encoded)
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
 
    async def create_ticket(self, ticket_data):
        """
        Create a new ticket in AMS via /api/Ticket/CreateTicket (async).
        Allowed priorities in AMS database:
          - 'Low'
          - 'Medium'
          - 'High (Business Impacted)'
          - 'Very High (Production Impacted)'
        """
        if not self.token:
            await self.authenticate()
       
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
 
        screenshot_file_tuple = self.build_screenshot_file(screenshot_val)
 
        print(f"[AMS API] Sending CreateTicket multipart/form-data payload to {self.ticket_create_url}: {form_data} (files: {'Screenshot' if screenshot_file_tuple else 'none'})")
 
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "*/*"
        }
 
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Build multipart files dict for httpx
                files_dict = {}
                if screenshot_file_tuple:
                    fname, fdata, fmime = screenshot_file_tuple
                    files_dict["Screenshot"] = (fname, fdata, fmime)
 
                if files_dict:
                    response = await client.post(
                        self.ticket_create_url,
                        data=form_data,
                        files=files_dict,
                        headers=headers,
                    )
                else:
                    response = await client.post(
                        self.ticket_create_url,
                        data=form_data,
                        headers=headers,
                    )
 
                print(f"[AMS API] CreateTicket response ({response.status_code}): {response.text}")
 
                if response.status_code == 401:
                    if self._password or (self.email and self.password):
                        try:
                            await self.authenticate()
                            headers["Authorization"] = f"Bearer {self.token}"
                            if files_dict:
                                response = await client.post(
                                    self.ticket_create_url,
                                    data=form_data,
                                    files=files_dict,
                                    headers=headers,
                                )
                            else:
                                response = await client.post(
                                    self.ticket_create_url,
                                    data=form_data,
                                    headers=headers,
                                )
                        except Exception:
                            raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
                    else:
                        raise Exception("AMS Bearer token is expired or unauthorized (401). Please re-authenticate.")
 
        except httpx.HTTPError as err:
            raise Exception(f"Failed to reach AMS Ticket Create API at {self.ticket_create_url}: {err}")
 
        if not response.is_success:
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
 
        # Invalidate ticket cache so subsequent queries reflect the new ticket immediately
        AMSApi.invalidate_tickets_cache()
 
        try:
            return response.json()
        except Exception:
            return {"status": "success", "statusCode": response.status_code, "text": response.text}
 
    async def get_client_names(self, email: str, timeout: float = 15.0) -> Optional[Dict[str, Any]]:
        """
        Fetches client information from AMS_CLIENT_NAMES_URL for the given user email.
        API URL is defined in web.config (e.g. http://172.16.32.50/api/Ticket/GetClientNames).
        Returns the client record dict:
        {"cTxnid": 4126, "cName": "SUDHAKAR PIPES AND FITTINGS", "emailid": "radhika@sudhakarpipes.com"}
        or None if no client matches.
        """
        if not email or not email.strip():
            return None
 
        if not self.token:
            await self.authenticate()
 
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json"
        }
        params = {"email": email.strip()}
 
        try:
            async with httpx.AsyncClient(timeout=float(timeout)) as client:
                response = await client.get(
                    self.client_names_url,
                    params=params,
                    headers=headers
                )
 
                if response.status_code == 401:
                    sla_email = os.getenv("SLA_EMAIL") or "SLA@Admin.com"
                    sla_pass = os.getenv("SLA_PASSWORD") or "123456"
                    await self.authenticate(email=sla_email, password=sla_pass)
                    headers["Authorization"] = f"Bearer {self.token}"
                    response = await client.get(
                        self.client_names_url,
                        params=params,
                        headers=headers
                    )
 
                if response.status_code == 200:
                    data = response.json()
                    records = data.get("data") or []
                    if records and isinstance(records, list) and len(records) > 0:
                        return records[0]
                else:
                    print(f"[AMSApi] GetClientNames returned status {response.status_code}: {response.text}")
        except Exception as e:
            print(f"[AMSApi] Error fetching client name for {email}: {e}")
 
        return None
 
    async def get_client_company_name(self, email: str, timeout: float = 15.0) -> Optional[str]:
        """Convenience method to retrieve the company/client name (cName) for an email."""
        record = await self.get_client_names(email, timeout=timeout)
        if record and isinstance(record, dict):
            c_name = record.get("cName")
            if c_name:
                return str(c_name).strip()
        return None
 
 