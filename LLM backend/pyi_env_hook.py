# Runtime hook to load environment variables directly from web.config into the process
import os
import sys
import xml.etree.ElementTree as ET

def load_from_web_config(override: bool = True):
    """
    Reads environment variables directly from web.config into os.environ.
    Finds web.config in:
    1. Directory of executable / script
    2. Current working directory
    3. Parent directories
    4. dist_LLM directory if present
    """
    candidate_dirs = [
        os.path.dirname(sys.executable) if getattr(sys, "frozen", False) else os.path.dirname(os.path.abspath(__file__)),
        os.getcwd(),
        os.path.dirname(os.getcwd()),
        os.path.join(os.getcwd(), "LLM backend"),
        os.path.join(os.getcwd(), "LLM backend", "dist_LLM"),
        os.path.join(os.getcwd(), "dist_LLM"),
    ]

    config_path = None
    for d in candidate_dirs:
        p = os.path.join(d, "web.config")
        if os.path.isfile(p):
            config_path = p
            break

    if config_path and os.path.isfile(config_path):
        try:
            tree = ET.parse(config_path)
            root = tree.getroot()
            for env_elem in root.iter("environmentVariable"):
                name = env_elem.get("name")
                value = env_elem.get("value")
                if name and value is not None:
                    # Avoid setting unexpanded IIS macro string
                    if name == "HTTP_PLATFORM_PORT" and value == "%HTTP_PLATFORM_PORT%":
                        continue
                    if override or name not in os.environ:
                        os.environ[name] = value
        except Exception:
            pass

load_from_web_config(override=True)