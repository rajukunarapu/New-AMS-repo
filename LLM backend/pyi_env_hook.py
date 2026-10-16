# Runtime hook to load environment variables directly from web.config into the executable process
import os
import sys
import xml.etree.ElementTree as ET

def load_from_web_config():
    """Reads environment variables from web.config into os.environ if not already set."""
    base_dir = os.path.dirname(sys.executable) if getattr(sys, "frozen", False) else os.getcwd()
    config_path = os.path.join(base_dir, "web.config")
    if not os.path.isfile(config_path):
        config_path = os.path.join(os.getcwd(), "web.config")

    if os.path.isfile(config_path):
        try:
            tree = ET.parse(config_path)
            root = tree.getroot()
            for env_elem in root.iter("environmentVariable"):
                name = env_elem.get("name")
                value = env_elem.get("value")
                if name and value is not None and name not in os.environ:
                    # Avoid setting unexpanded IIS macro string
                    if name == "HTTP_PLATFORM_PORT" and value == "%HTTP_PLATFORM_PORT%":
                        continue
                    os.environ[name] = value
        except Exception:
            pass

load_from_web_config()
