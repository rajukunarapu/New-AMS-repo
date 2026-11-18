# Runtime hook to load environment variables directly from web.config into the executable process
import os
import sys
import xml.etree.ElementTree as ET

def load_from_web_config(override: bool = False, file_path: str = None) -> bool:
    """Reads environment variables from web.config into os.environ."""
    candidates = []
    if file_path:
        candidates.append(file_path)
    if getattr(sys, "frozen", False):
        candidates.append(os.path.join(os.path.dirname(sys.executable), "web.config"))
    try:
        candidates.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "web.config"))
    except Exception:
        pass
    candidates.append(os.path.join(os.getcwd(), "web.config"))
    try:
        candidates.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web.config"))
    except Exception:
        pass

    for config_path in candidates:
        if config_path and os.path.isfile(config_path):
            try:
                tree = ET.parse(config_path)
                root = tree.getroot()
                for env_elem in root.iter("environmentVariable"):
                    name = env_elem.get("name")
                    value = env_elem.get("value")
                    if name and value is not None:
                        # Avoid setting unexpanded IIS macro string
                        if value.startswith("%") and value.endswith("%"):
                            continue
                        if override or name not in os.environ:
                            os.environ[name] = value
                return True
            except Exception:
                pass
    return False

load_from_web_config()
