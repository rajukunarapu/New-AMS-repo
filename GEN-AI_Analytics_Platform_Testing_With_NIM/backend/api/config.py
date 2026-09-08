import os
import json
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables from root or local directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

def _get_hana_credentials_from_vcap():
    """Extract HANA credentials from VCAP_SERVICES (CF environment)."""
    vcap_services = os.getenv("VCAP_SERVICES")
    if not vcap_services:
        return {}
    try:
        services = json.loads(vcap_services)
        # HDI container credentials are under 'hana' key
        hana_services = services.get("hana", [])
        for svc in hana_services:
            creds = svc.get("credentials", {})
            if creds.get("host") and creds.get("user") and creds.get("password"):
                return {
                    "host": creds.get("host", ""),
                    "port": int(creds.get("port", 443)),
                    "user": creds.get("user", ""),
                    "password": creds.get("password", ""),
                    "schema": creds.get("schema", ""),
                }
    except Exception:
        pass
    return {}

_vcap_hana = _get_hana_credentials_from_vcap()

class Settings(BaseSettings):
    # SAP AI Core Configuration
    AICORE_AUTH_URL: str = os.getenv("AICORE_AUTH_URL", "")
    AICORE_CLIENT_ID: str = os.getenv("AICORE_CLIENT_ID", "")
    AICORE_CLIENT_SECRET: str = os.getenv("AICORE_CLIENT_SECRET", "")
    AICORE_RESOURCE_GROUP: str = os.getenv("AICORE_RESOURCE_GROUP", "default")
    AICORE_BASE_URL: str = os.getenv("AICORE_BASE_URL", "")

    # NVIDIA API Configuration
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    NVIDIA_EMBEDDING_MODEL: str = os.getenv("NVIDIA_EMBEDDING_MODEL", "nvidia/nemotron-3-embed-1b")
    NVIDIA_API_URL: str = os.getenv("NVIDIA_API_URL", "https://integrate.api.nvidia.com/v1/embeddings")
    NVIDIA_LLM_MODEL: str = os.getenv("NVIDIA_LLM_MODEL", "meta/llama-3.2-11b-vision-instruct")
    NVIDIA_LLM_URL: str = os.getenv("NVIDIA_LLM_URL", "https://integrate.api.nvidia.com/v1/chat/completions")


    # SAP HANA Cloud Configuration (VCAP_SERVICES takes precedence on CF)
    HANA_ADDRESS: str = _vcap_hana.get("host") or os.getenv("HANA_ADDRESS", "localhost")
    HANA_PORT: int = _vcap_hana.get("port") or int(os.getenv("HANA_PORT", "443"))
    HANA_USER: str = _vcap_hana.get("user") or os.getenv("HANA_USER", "DBADMIN")
    HANA_PASSWORD: str = _vcap_hana.get("password") or os.getenv("HANA_PASSWORD", "")
    HANA_SCHEMA: str = _vcap_hana.get("schema") or os.getenv("HANA_SCHEMA", "SALES_ANALYTICS")

    # Application Settings
    APP_ENV: str = os.getenv("APP_ENV", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    PORT: int = int(os.getenv("PORT", "8000"))

    class Config:
        case_sensitive = True

settings = Settings()

