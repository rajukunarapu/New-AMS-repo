"""
query_engine.py - Dynamic AMS Ticket Intelligence Engine

Provides a dynamic, LLM-driven query understanding layer for AMS ticket management.
Interprets natural-language queries dynamically against ticket datasets and schemas
without relying on static keyword-based filtering.
"""

import os
import time
import json
import re
import warnings
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone
import pandas as pd
import httpx
try:
    from pyi_env_hook import load_from_web_config
    load_from_web_config(override=True)
except Exception:
    pass
from models.schemas import normalize_ticket_type
from services.classification_config import extract_requested_priorities, normalize_priority_string

try:
    from Module_Router import GROUPS, GROUP_KEYWORDS, SAP_AI_NAME, _match_group_from_text
except Exception:
    GROUPS = [
        "RPA", "SAP-FICO", "SAP-SD", "SAP ABAP", "SAP-BASIS", "SAP-PM", "SAP-MM",
        "SAP-PP", "SAP-DBM", "SAP-SF", "SAP-PS", "SAP-CPI", "SAP-PMO", "AWS",
        "SAP-Analytics", "SAP-BW", "SAP-Delivery", "SAP-HCM", "SAP-QM", "SAP-PI",
        "Dot Net Technologies", "SAP", "Infra Cloud", "Freelancer", "SAP-EWM",
        "SAP EHS", "SAP-SOLUTION MANAGER", "SAP-DMS", "SAP-PPQM", "Support",
        "SAP-VIM", "Siemens", "SAP-VSS", "Linux Admin", "SAP SAC", "SAP ARIBA",
        "Mendix", "HRBP", "Inside Sales", "SAP-AI", "SAP-BTP", "Data Analytics & AI",
        "SAP PPVC", "SAP SDM", "UI / UX"
    ]
    GROUP_KEYWORDS = {}
    _match_group_from_text = None
    SAP_AI_NAME = r"(?<!\w)sap[\s_/-]*ai(?!\w)"

GROUP_ALIASES = {
    # SAP Modules
    "fico": "SAP-FICO",
    "sap fico": "SAP-FICO",
    "sap-fico": "SAP-FICO",
    "finance": "SAP-FICO",
    "mm": "SAP-MM",
    "sap mm": "SAP-MM",
    "sap-mm": "SAP-MM",
    "materials": "SAP-MM",
    "material management": "SAP-MM",
    "sd": "SAP-SD",
    "sap sd": "SAP-SD",
    "sap-sd": "SAP-SD",
    "sales": "SAP-SD",
    "basis": "SAP-BASIS",
    "sap basis": "SAP-BASIS",
    "sap-basis": "SAP-BASIS",
    "abap": "SAP ABAP",
    "sap abap": "SAP ABAP",
    "sap-abap": "SAP ABAP",
    "pm": "SAP-PM",
    "sap pm": "SAP-PM",
    "sap-pm": "SAP-PM",
    "pp": "SAP-PP",
    "sap pp": "SAP-PP",
    "sap-pp": "SAP-PP",
    "qm": "SAP-QM",
    "sap qm": "SAP-QM",
    "sap-qm": "SAP-QM",
    "bw": "SAP-BW",
    "sap bw": "SAP-BW",
    "sap-bw": "SAP-BW",
    "cpi": "SAP-CPI",
    "sap cpi": "SAP-CPI",
    "sap-cpi": "SAP-CPI",
    "pi": "SAP-PI",
    "sap pi": "SAP-PI",
    "sap-pi": "SAP-PI",
    "sf": "SAP-SF",
    "sap sf": "SAP-SF",
    "sap-sf": "SAP-SF",
    "successfactors": "SAP-SF",
    "ps": "SAP-PS",
    "sap ps": "SAP-PS",
    "sap-ps": "SAP-PS",
    "pmo": "SAP-PMO",
    "sap pmo": "SAP-PMO",
    "sap-pmo": "SAP-PMO",
    "dbm": "SAP-DBM",
    "sap dbm": "SAP-DBM",
    "sap-dbm": "SAP-DBM",
    "ewm": "SAP-EWM",
    "sap ewm": "SAP-EWM",
    "sap-ewm": "SAP-EWM",
    "ehs": "SAP EHS",
    "sap ehs": "SAP EHS",
    "sap-ehs": "SAP EHS",
    "dms": "SAP-DMS",
    "sap dms": "SAP-DMS",
    "sap-dms": "SAP-DMS",
    "ppqm": "SAP-PPQM",
    "sap ppqm": "SAP-PPQM",
    "sap-ppqm": "SAP-PPQM",
    "vim": "SAP-VIM",
    "sap vim": "SAP-VIM",
    "sap-vim": "SAP-VIM",
    "vss": "SAP-VSS",
    "sap vss": "SAP-VSS",
    "sap-vss": "SAP-VSS",
    "sac": "SAP SAC",
    "sap sac": "SAP SAC",
    "ariba": "SAP ARIBA",
    "sap ariba": "SAP ARIBA",
    "sap ai": "SAP-AI",
    "sap-ai": "SAP-AI",
    "sap_ai": "SAP-AI",
    "sap/ai": "SAP-AI",
    "sapai": "SAP-AI",
    "btp": "SAP-BTP",
    "sap btp": "SAP-BTP",
    "sap-btp": "SAP-BTP",
    "analytics": "SAP-Analytics",
    "sap analytics": "SAP-Analytics",
    "sap-analytics": "SAP-Analytics",
    "delivery": "SAP-Delivery",
    "sap delivery": "SAP-Delivery",
    "sap-delivery": "SAP-Delivery",
    "hcm": "SAP-HCM",
    "sap hcm": "SAP-HCM",
    "sap-hcm": "SAP-HCM",
    "solution manager": "SAP-SOLUTION MANAGER",
    "sap solution manager": "SAP-SOLUTION MANAGER",
    "sap-solution manager": "SAP-SOLUTION MANAGER",
    "ppvc": "SAP PPVC",
    "sap ppvc": "SAP PPVC",
    "sdm": "SAP SDM",
    "sap sdm": "SAP SDM",
    # Non-SAP Groups
    "rpa": "RPA",
    "bot": "RPA",
    "uipath": "RPA",
    "dotnet": "Dot Net Technologies",
    "dot net": "Dot Net Technologies",
    ".net": "Dot Net Technologies",
    "c#": "Dot Net Technologies",
    "ui/ux": "UI / UX",
    "ui ux": "UI / UX",
    "ui": "UI / UX",
    "ux": "UI / UX",
    "aws": "AWS",
    "amazon": "AWS",
    "cloud": "Infra Cloud",
    "infra": "Infra Cloud",
    "infra cloud": "Infra Cloud",
    "linux": "Linux Admin",
    "linux admin": "Linux Admin",
    "support": "Support",
    "helpdesk": "Support",
    "hrbp": "HRBP",
    "hr": "HRBP",
    "inside sales": "Inside Sales",
    "sales team": "Inside Sales",
    "siemens": "Siemens",
    "mendix": "Mendix",
    "freelancer": "Freelancer",
    "data analytics": "Data Analytics & AI",
    "data analytics & ai": "Data Analytics & AI"
}


def normalize_group_name(group_input: Optional[str]) -> Optional[str]:
    """
    Normalizes a group/module input string into a standard GROUPS name if possible.
    """
    if not group_input or not str(group_input).strip():
        return None
    g_clean = str(group_input).strip()
    g_lower = g_clean.lower()

    if re.fullmatch(SAP_AI_NAME, g_lower):
        return "SAP-AI"

    if g_lower in GROUP_ALIASES:
        return GROUP_ALIASES[g_lower]

    for g in GROUPS:
        if g.lower() == g_lower:
            return g

    g_nohyphen = g_lower.replace("-", " ").replace("_", " ").strip()
    for g in GROUPS:
        g_cand_nohyphen = g.lower().replace("-", " ").replace("_", " ").strip()
        if g_cand_nohyphen == g_nohyphen:
            return g

    if _match_group_from_text and g_lower != "ai":
        matched = _match_group_from_text(g_clean)
        if matched:
            return matched

    return g_clean

warnings.filterwarnings("ignore")


def normalize_ticket_record(row: dict) -> dict:
    """
    Normalizes raw ticket dictionary from AMS API to ensure all standard schema keys exist and are populated:
    - Maps AMS API 'description' -> 'descriptionofTicket'
    - Maps AMS API 'createdname' -> 'reportedby'
    - Maps AMS API 'createddate' -> 'reportedon' & 'reportedontime'
    - Maps AMS API 'module' -> 'assigntogroup'
    - Normalizes & infers 'typeofticket' and 'type' so Type field is never blank
    """
    if not isinstance(row, dict):
        return row
    r = dict(row)

    # 1. Description mapping
    desc_val = r.get("descriptionofTicket") or r.get("description") or r.get("name") or ""
    r["descriptionofTicket"] = desc_val
    r["description"] = desc_val

    # 2. Reported By mapping
    rep_val = r.get("reportedby") or r.get("createdname") or r.get("createdEmails") or ""
    r["reportedby"] = rep_val
    r["createdname"] = r.get("createdname") or rep_val

    # 3. Reported Date & Time mapping
    created_dt = r.get("createddate") or r.get("reportedon")
    if created_dt:
        s_dt = str(created_dt).strip()
        r["reportedon"] = s_dt
        r["createddate"] = s_dt
        if "T" in s_dt:
            parts = s_dt.split("T", 1)
            r["reportedontime"] = r.get("reportedontime") or parts[1]
        elif " " in s_dt:
            parts = s_dt.split(" ", 1)
            r["reportedontime"] = r.get("reportedontime") or parts[1]
    
    if not r.get("reportedontime"):
        r["reportedontime"] = "00:00:00"

    # 4. Group / Module mapping
    grp_val = r.get("assigntogroup") or r.get("module") or ""
    r["assigntogroup"] = grp_val
    r["module"] = r.get("module") or grp_val

    r["ticketStatus"] = r.get("ticketStatus") or r.get("status") or r.get("ticketStaus")

    # 5. Type of Ticket normalization & inference
    raw_type = (
        r.get("typeofticket")
        or r.get("typeOfTicket")
        or r.get("type")
        or r.get("ticketType")
        or r.get("ticket_type")
        or r.get("category")
        or r.get("ticketCategory")
        or r.get("issueType")
    )
    if not raw_type or not str(raw_type).strip():
        try:
            from services.ticket_creator_service import infer_ticket_type_from_text
            raw_type = infer_ticket_type_from_text(desc_val) or "Incident"
        except Exception:
            raw_type = "Incident"

    norm_type = normalize_ticket_type(raw_type)
    r["typeofticket"] = norm_type
    r["typeOfTicket"] = norm_type
    r["type"] = norm_type
    r["ticketType"] = norm_type

    # 6. Default AMS instance
    if not r.get("ams"):
        r["ams"] = "AMS"

    # 7. Resolution & Remarks mapping
    res_val = r.get("resolution") or r.get("remarks") or r.get("solution") or r.get("resolutionNotes") or r.get("closingRemarks") or r.get("resolutionDetails") or ""
    r["resolution"] = res_val
    r["remarks"] = r.get("remarks") or res_val

    # 8. Assignee mapping
    ass_val = r.get("assignee") or r.get("assignedTo") or r.get("assignedtoName") or r.get("technician") or ""
    r["assignee"] = ass_val

    return r

# Support both new google.genai and deprecated google.generativeai as fallback
GENAI_CLIENT = None
LEGACY_GENAI = None

try:
    from google import genai
    from google.genai import types
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if api_key:
        GENAI_CLIENT = genai.Client(api_key=api_key)
except Exception:
    pass

if not GENAI_CLIENT:
    try:
        import google.generativeai as legacy_genai
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if api_key:
            legacy_genai.configure(api_key=api_key)
            LEGACY_GENAI = legacy_genai
    except Exception:
        pass


SYSTEM_PROMPT = """# Dynamic AMS Ticket Intelligence Assistant
You are an intelligent AI assistant for an enterprise AMS Ticket Management System.
Answer user questions accurately based strictly on the provided AMS ticket dataset.

CORE RULES:
1. Direct Answer First: ALWAYS answer the user's question directly in the very first sentence.
2. Dynamic Understanding: Infer concepts (statuses, dates, priorities, clients) semantically from actual dataset values without rigid keyword matching.
3. Specific Group/Module Queries:
   - When a group/module is queried (e.g. SAP-FICO, SAP-MM, RPA), report matching ticket details directly.
   - DO NOT generate system-wide group breakdown tables when a specific group or module was requested.
   - If 0 tickets match the requested group or module, state 'Group Not Found' or 'Module Not Found'.
4. Resolutions & Past Occurrences: When previous tickets or fixes are queried, cite matching Ticket Number, Client, Status, Date, and Resolution/Remarks notes.
5. Factual Accuracy: Never invent ticket IDs, counts, or fake data. Base answers strictly on execution metrics.
"""


DEFAULT_FALLBACK_MODELS = [
    "nvidia/nemotron-3-super-120b-a12b",
    "meta-llama/llama-3.1-70b-instruct",
    "google/gemma-2-27b-it"
]


async def _call_model_by_name(model_name: str, prompt_text: str, system_instruction=None, json_response=False, temperature: Optional[float] = None, max_tokens: Optional[int] = None) -> Optional[str]:
    """
    Calls a specific model by name via OpenAI-compatible REST API (NVIDIA NIM / OpenRouter)
    or Google Gemini fallback if model_name starts with gemini.
    """
    if not model_name:
        return None

    if model_name.startswith("gemini"):
        return await _call_gemini(prompt_text, system_instruction=system_instruction, json_response=json_response)

    api_key = os.getenv("NVIDIA_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("OPENROUTER_API_KEY")
    base_url = os.getenv("NVIDIA_BASE_URL") or os.getenv("OPENROUTER_BASE_URL") or "https://integrate.api.nvidia.com/v1"

    if not api_key or api_key == "your_nvidia_api_key":
        return None

    clean_base = base_url.rstrip("/")
    if clean_base.endswith("/chat/completions"):
        url = clean_base
    else:
        url = f"{clean_base}/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    messages = []
    if system_instruction:
        sys_msg = system_instruction
        if json_response:
            sys_msg += "\n\nCRITICAL: Respond ONLY with a valid JSON object. Do not include markdown code block formatting or additional commentary."
        messages.append({"role": "system", "content": sys_msg})
    elif json_response:
        messages.append({"role": "system", "content": "You are a JSON query engine. Output only a single valid JSON object."})

    messages.append({"role": "user", "content": prompt_text})

    eff_temp = 0.1 if temperature is None else float(temperature)
    eff_tokens = (512 if json_response else 1024) if max_tokens is None else int(max_tokens)

    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": eff_temp,
        "max_tokens": eff_tokens
    }

    llm_timeout = int(os.getenv("LLM_TIMEOUT", "60"))
    try:
        async with httpx.AsyncClient(timeout=float(llm_timeout)) as client:
            res = await client.post(url, json=payload, headers=headers)
            if res.is_success:
                data = res.json()
                if "choices" in data and len(data["choices"]) > 0:
                    msg = data["choices"][0].get("message", {})
                    content = msg.get("content")
                    if content and isinstance(content, str) and content.strip():
                        return content.strip()
            else:
                print(f"[LLM] Model '{model_name}' returned status {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[LLM] Model '{model_name}' request failed: {e}")

    return None


async def _call_nvidia(prompt_text, system_instruction=None, json_response=False, temperature: Optional[float] = None, max_tokens: Optional[int] = None):
    """
    Backward-compatible wrapper for primary model configured via MAIN_MODEL or NVIDIA_MODEL.
    """
    model = os.getenv("MAIN_MODEL") or os.getenv("NVIDIA_MODEL") or "nvidia/nemotron-3-super-120b-a12b"
    return await _call_model_by_name(model, prompt_text, system_instruction=system_instruction, json_response=json_response, temperature=temperature, max_tokens=max_tokens)


async def _call_gemini(prompt_text, system_instruction=None, json_response=False):
    """
    Fallback LLM handler using Google Gemini API with native async support
    and automatic model fallback on quota limits.
    """
    global GENAI_CLIENT
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if api_key and api_key != "your_gemini_api_key":
        try:
            from google import genai
            from google.genai import types

            if not GENAI_CLIENT:
                GENAI_CLIENT = genai.Client(api_key=api_key)

            config = {}
            if json_response:
                config["response_mime_type"] = "application/json"
            if system_instruction:
                config["system_instruction"] = system_instruction

            gen_config = types.GenerateContentConfig(**config) if config else None

            candidate_models = ["gemini-2.5-flash", "gemini-3.6-flash"]
            for m in candidate_models:
                try:
                    import asyncio
                    llm_timeout = int(os.getenv("LLM_TIMEOUT", "60"))
                    response = await asyncio.wait_for(
                        GENAI_CLIENT.aio.models.generate_content(
                            model=m,
                            contents=prompt_text,
                            config=gen_config
                        ),
                        timeout=llm_timeout
                    )
                    if response and response.text:
                        return response.text
                except Exception as ex_m:
                    if "429" in str(ex_m) or "RESOURCE_EXHAUSTED" in str(ex_m):
                        print(f"[LLM] Gemini model '{m}' rate limited. Trying next candidate...")
                        continue
                    else:
                        print(f"[LLM] Gemini call failed for model '{m}': {ex_m}")
                        break
        except Exception as ex:
            print(f"[LLM] Gemini initialization failed: {ex}")

    return None


async def _call_llm(prompt_text, system_instruction=None, json_response=False, temperature: Optional[float] = None, max_tokens: Optional[int] = None):
    """
    Unified async LLM call handler with multi-tiered fallback:
    1. Primary Model (MAIN_MODEL or NVIDIA_MODEL)
    2. Sequential Fallback Models in exact required sequence:
       - nvidia/nemotron-3-super-120b-a12b
       - nvidia/llama-3.1-nemotron-70b-instruct
       - google/gemma-2-27b-it
    3. Final Safety Net: Google Gemini API / Heuristic Query Engine
    """
    main_model = os.getenv("MAIN_MODEL") or os.getenv("NVIDIA_MODEL") or "nvidia/nemotron-3-super-120b-a12b"

    fallback_env = os.getenv("FALLBACK_MODELS")
    if fallback_env and fallback_env.strip():
        fallback_models = [m.strip() for m in fallback_env.split(",") if m.strip()]
    else:
        fallback_models = DEFAULT_FALLBACK_MODELS

    # Exclude main_model from fallback list to avoid redundant retry of already failed model
    fallback_models = [m for m in fallback_models if m != main_model]

    # 1. Try Main Model
    print(f"[LLM] Calling primary model '{main_model}'...")
    try:
        res = await _call_model_by_name(main_model, prompt_text, system_instruction=system_instruction, json_response=json_response, temperature=temperature, max_tokens=max_tokens)
        if res:
            print(f"[LLM] Primary model '{main_model}' responded successfully.")
            return res
    except Exception as e:
        print(f"[LLM] Primary model '{main_model}' request exception: {e}")

    # 2. Sequential Fallback Chain
    previous_model = main_model
    for fb_model in fallback_models:
        if previous_model == main_model:
            print(f"Primary model failed. Trying fallback model: {fb_model}")
        else:
            print(f"Fallback model failed. Trying: {fb_model}")

        try:
            fb_res = await _call_model_by_name(fb_model, prompt_text, system_instruction=system_instruction, json_response=json_response, temperature=temperature, max_tokens=max_tokens)
            if fb_res:
                print(f"[LLM] Fallback model '{fb_model}' responded successfully.")
                return fb_res
        except Exception as e:
            print(f"[LLM] Fallback model '{fb_model}' request exception: {e}")

        previous_model = fb_model

    # 3. Final Safety Net: Google Gemini API
    print("[LLM] All primary and fallback models failed. Trying Google Gemini safety net...")
    try:
        gemini_res = await _call_gemini(prompt_text, system_instruction=system_instruction, json_response=json_response)
        if gemini_res:
            print("[LLM] Google Gemini safety net responded successfully.")
            return gemini_res
    except Exception as e:
        print(f"[LLM] Google Gemini safety net exception: {e}")

    return None


def get_dataset_metadata(tickets):
    """
    Dynamically inspects dataset schema, column names, unique categorical values,
    and date bounds to assist LLM NLU reasoning.
    """
    if not tickets:
        return {
            "columns": [],
            "total_count": 0,
            "unique_clients": [],
            "unique_statuses": [],
            "unique_priorities": [],
            "unique_groups": GROUPS,
            "all_known_groups": GROUPS,
            "sample_rows": []
        }

    df = pd.DataFrame(tickets)
    cols = list(df.columns)

    unique_clients = sorted(list({str(x).strip() for x in df.get("clientName", pd.Series()).dropna().unique() if str(x).strip()}))
    unique_statuses = sorted(list({str(x).strip() for x in df.get("ticketStatus", pd.Series()).dropna().unique() if str(x).strip()}))
    unique_priorities = sorted(list({str(x).strip() for x in df.get("priority", pd.Series()).dropna().unique() if str(x).strip()}))
    
    group_series = df.get("assigntogroup", pd.Series())
    if "module" in df.columns:
        group_series = pd.concat([group_series, df.get("module", pd.Series())])
    unique_groups = sorted(list({str(x).strip() for x in group_series.dropna().unique() if str(x).strip()}))

    # Select sample rows (up to 3) for schema context
    sample_rows = df.head(3).to_dict(orient="records")

    return {
        "columns": cols,
        "total_count": len(df),
        "unique_clients": unique_clients,
        "unique_statuses": unique_statuses,
        "unique_priorities": unique_priorities,
        "unique_groups": unique_groups,
        "all_known_groups": GROUPS,
        "sample_rows": sample_rows
    }


_STATUS_ALIASES = {
    "open": ("open", "unresolved", "active", "pending"),
    "closed": ("closed", "close", "shut", "technically closed"),
    "resolved": ("resolved", "fixed", "solved"),
    "completed": ("completed", "complete", "finished", "done"),
    "cancelled": ("cancel", "cancelled", "canceled", "discarded"),
    "created": ("created", "new"),
    "allocated": ("allocated", "assigned", "allocation"),
    "triage": ("triage", "under triage"),
    "in_progress": ("in progress", "inprocess", "in process", "working", "wip"),
    "reopened": ("reopened", "re opened"),
    "on_hold": ("on hold",),
    "in_quality": ("in quality",),
    "ready_for_production": ("ready for production",),
    "approved_for_production": ("approved for production",),
    "in_production": ("in production",),
    "waiting_for_customer": ("waiting for customer",),
}
_STATUS_BY_ALIAS = {
    alias: status for status, aliases in _STATUS_ALIASES.items() for alias in aliases
}
_OPEN_STATUSES = set(_STATUS_ALIASES) - {"closed", "resolved", "completed", "cancelled"}
_OPEN_TEXT = r"(?:(?:not|yet to be)\s+(?:closed|resolved|completed)|not yet\s+(?:closed|resolved|completed))"
_GROUP_BY_FIELDS = {
    "status": "ticketStatus", "ticketstatus": "ticketStatus",
    "priority": "priority", "client": "clientName", "clientname": "clientName",
    "group": "assigntogroup", "module": "assigntogroup", "assigntogroup": "assigntogroup",
    "type": "typeofticket", "ticket type": "typeofticket", "typeofticket": "typeofticket",
}


def normalize_ticket_status(value):
    if value is None or pd.isna(value):
        return None
    label = re.sub(r"[\s_-]+", " ", str(value).strip().lower())
    if re.fullmatch(_OPEN_TEXT, label):
        return "open"
    if label.startswith("wca:"):
        return "waiting_for_customer"
    if label.startswith("in proc:"):
        return "on_hold" if label.split(":", 1)[1].strip() == "on hold" else "in_progress"
    return _STATUS_BY_ALIAS.get(label, label or None)


_STATUS_TERMS = "|".join(re.escape(alias) for alias in sorted(_STATUS_BY_ALIAS, key=len, reverse=True))
_STATUS_IN_REQUEST = re.compile(
    rf"\b(?:{_OPEN_TEXT}|assigned(?!\s+(?:to|group|module|by|user|person|tech|technician)\b)|"
    rf"{'|'.join(re.escape(alias) for alias in sorted(_STATUS_BY_ALIAS, key=len, reverse=True) if alias not in {'assigned', 'created', 'close', 'complete', 'cancel', 'working'})})\b"
)


def requested_ticket_status(question):
    text = re.sub(r"[\s_-]+", " ", question.strip().lower())
    if re.search(rf"\b{_OPEN_TEXT}\b", text):
        return "open"
    if re.search(r"\b(?:status(?: is)?[: ]+created|created status)\b", text):
        return "created"
    match = _STATUS_IN_REQUEST.search(text)
    return normalize_ticket_status(match.group()) if match else None


def _query_issue_phrase(question):
    match = re.search(r"\btickets?\s+(?:about|with|related to)\s+(.+?)[?.!]*$", question, re.IGNORECASE)
    if match and not re.match(r"(?:priority|status|type)\s*(?:is\s+|[:=]\s*|\s)", match.group(1), re.IGNORECASE):
        return match.group(1).strip()
    return None


def sanitize_and_enforce_intent(plan, user_question, meta):
    """
    Universal post-processing rule engine that guarantees intent disambiguation,
    group/module extraction precedence, and limit handling across both LLM and heuristic plans.
    """
    if not isinstance(plan, dict):
        plan = {}

    q_lower = user_question.lower().strip()

    # 1. Dynamic group / module entity extraction if missed by LLM
    issue = _query_issue_phrase(user_question)
    if issue and re.fullmatch(SAP_AI_NAME, issue, re.IGNORECASE):
        issue = None
    group_question = user_question[:user_question.rfind(issue)] if issue else user_question
    group_val = plan.get("detected_group_or_module")
    if re.search(SAP_AI_NAME, group_question, re.IGNORECASE) and normalize_group_name(group_val) in {None, "SAP", "SAP-AI", "Data Analytics & AI"}:
        group_val = "SAP-AI"
    if not group_val:
        grp_match = re.search(
            r'\b(?:assigned\s+to\s+group|assigned\s+to|group\s*name|assigned\s*group|module\s*name|module|group)\s*(?:is|:|=|\b)?\s*([A-Za-z0-9_\-\s/&\.]+)',
            group_question,
            re.IGNORECASE
        )
        if grp_match:
            cand = grp_match.group(1).strip()
            cand = re.sub(r'^(?:to|for|is|in|of|by|the|a|an)\s+', '', cand, flags=re.IGNORECASE).strip()
            cand = re.sub(r'\s+(?:tickets?|issues?|records?|details?|only|and|or|for|with|in|having|status).*$', '', cand, flags=re.IGNORECASE).strip()
            if cand.lower() not in ["name", "is", "of", "for", "in", "by", "with", "the", "a", "an"]:
                group_val = normalize_group_name(cand) or cand

    if not group_val:
        all_cands = list(meta.get("unique_groups", [])) + list(meta.get("all_known_groups", GROUPS)) + list(GROUP_ALIASES.keys())
        sorted_cands = sorted(set(all_cands), key=lambda x: len(x), reverse=True)
        for g in sorted_cands:
            if len(g) <= 4:
                if re.search(r'\b' + re.escape(g) + r'\b', group_question, re.IGNORECASE):
                    group_val = normalize_group_name(g) or g
                    break
            else:
                pattern = r'\b' + re.escape(g.lower()) + r'\b'
                if re.search(pattern, group_question.lower()):
                    group_val = normalize_group_name(g) or g
                    break

    # 2. Apply assignment independently of issue text and aggregation.
    if group_val:
        norm_cand = normalize_group_name(group_val)
        dataset_groups = meta.get("unique_groups", [])
        is_known_group = bool(norm_cand and (norm_cand in GROUPS or norm_cand in meta.get("all_known_groups", []) or group_val.lower() in GROUP_ALIASES or norm_cand in dataset_groups))

        mention_requested = re.search(
            r"\b(?:mention(?:s|ed|ing)?|descriptions?\s+(?:contain(?:s|ing)?|include(?:s)?))\b",
            q_lower,
        )
        if is_known_group and mention_requested:
            plan["detected_group_or_module"] = None
            plan["description_mention_group"] = norm_cand
            plan["semantic_text_search"] = None
            plan["semantic_keywords"] = []
            if plan.get("detected_assignee") and normalize_group_name(plan["detected_assignee"]) == norm_cand:
                plan["detected_assignee"] = None
        elif is_known_group:
            plan["detected_group_or_module"] = norm_cand
            if plan.get("detected_assignee") and normalize_group_name(plan["detected_assignee"]) == norm_cand:
                plan["detected_assignee"] = None

        else:
            plan["detected_group_or_module"] = None
            if not plan.get("detected_assignee") and group_val.lower() not in ["name", "is", "of", "for", "in", "by", "with", "the", "a", "an"]:
                plan["detected_assignee"] = group_val

    explicit_status = requested_ticket_status(user_question)
    if re.search(rf"\b{_OPEN_TEXT}\b", q_lower):
        plan["detected_status_semantic"] = explicit_status
    elif plan.get("detected_status_semantic"):
        plan["detected_status_semantic"] = normalize_ticket_status(plan["detected_status_semantic"])

    breakdown = re.search(r"\bby\s+(status|priority|client|group|module|ticket type|type)\s*[?.!]*$", q_lower)
    if re.search(r"\b(?:sort|filter|order)\s+by\b", q_lower):
        breakdown = None
    group_by = breakdown.group(1) if breakdown else plan.get("group_by_field")
    if group_by:
        plan["group_by_field"] = _GROUP_BY_FIELDS.get(str(group_by).lower(), group_by)

    search = str(plan.get("semantic_text_search") or "").strip()
    if not plan.get("description_mention_group") and (
        search.lower() == q_lower or (issue and not search)
    ):
        # The fallback can pass the entire request as search text. Retain the issue
        # clause, and drop a purely structural list, count or breakdown request.
        if issue:
            plan["semantic_text_search"] = issue
            plan["semantic_keywords"] = []
        elif search:
            noise = re.sub(rf"\b(?:{_OPEN_TEXT}|{_STATUS_TERMS})\b", "", q_lower)
            noise = re.sub(r"\bp[1-4]\b", "", noise)
            if plan.get("detected_group_or_module") == "SAP-AI":
                noise = re.sub(SAP_AI_NAME, "", noise)
            if plan.get("detected_priority"):
                noise = re.sub(r"\b(?:very high|high|medium|low|critical)\b", "", noise)
            for value in (group_val, plan.get("detected_client")):
                if value:
                    noise = re.sub(r"(?<!\w)" + re.escape(str(value).lower()) + r"(?!\w)", "", noise)
            structural = {
                "show", "list", "find", "get", "give", "me", "the", "all", "tickets", "ticket",
                "issues", "issue", "count", "how", "many", "break", "down", "breakdown", "by",
                "status", "priority", "client", "group", "module", "type", "for", "of", "in",
                "only", "assigned", "to", "please", "summarize", "summary", "recent", "latest", "with", "is",
            }
            if set(re.findall(r"[a-z]+", noise)).issubset(structural):
                plan["semantic_text_search"] = None
                plan["semantic_keywords"] = []
    elif group_val and search:
        canonical_group = normalize_group_name(group_val).lower()
        names = [canonical_group, *(alias for alias, group in GROUP_ALIASES.items() if group.lower() == canonical_group)]
        normalized_search = re.sub(r"[\s_-]+", " ", search.lower())
        if (
            canonical_group == "sap-ai" and re.fullmatch(SAP_AI_NAME, search.lower())
        ) or any(normalized_search == re.sub(r"[\s_-]+", " ", name) for name in names):
            plan["semantic_text_search"] = None
            plan["semantic_keywords"] = []

    # 3. Limit extraction ("top 10", "top 5", "last 5", "latest 10", "recent 5", "limit 10", "first 5")
    lim_match = re.search(r'\b(?:top|first|last|latest|recent|most\s+recent|limit)\s*(\d{1,3})\b', q_lower)
    if not lim_match:
        lim_match = re.search(r'\b(\d{1,3})\s*(?:latest|recent|last|top|first)?\s*tickets?\b', q_lower)
    if lim_match:
        plan["limit"] = int(lim_match.group(1))

    # 4. If user asked for recent / last / latest, sort descending by creation date
    if any(w in q_lower for w in ["last", "latest", "recent"]):
        plan["sort"] = {"field": "createddate", "direction": "desc"}

    # 5. If user asked to summarize / summary, set aggregation and clear structural words from semantic search
    if any(w in q_lower for w in ["summarize", "summary"]):
        plan["aggregation"] = "summary"
        if plan.get("semantic_text_search"):
            st = str(plan["semantic_text_search"]).lower()
            structural = {"summarize", "summary", "summaries", "can", "you", "please", "the", "last", "latest", "recent", "top", "first", "tickets", "ticket", "give", "me"}
            remaining = [w for w in re.findall(r'\w+', st) if len(w) >= 2 and w not in structural and not w.isdigit()]
            if not remaining:
                plan["semantic_text_search"] = None

    return plan


async def parse_query_plan_with_llm(user_question, meta, history=None):
    """
    Uses Gemini LLM to interpret user question and return a structured query plan.
    """
    history_context = ""
    if history and len(history) > 0:
        recent = history[-4:] # Last 2 turns
        formatted_h = []
        for msg in recent:
            if isinstance(msg, dict):
                r = msg.get("role") or msg.get("sender") or "USER"
                c = msg.get("content") or msg.get("text") or msg.get("query") or ""
                c_str = re.sub(r'<img[^>]*src="data:image[^>]*>', '[Image]', str(c), flags=re.IGNORECASE)
                c_str = re.sub(r'data:image\/[^;]+;base64,[A-Za-z0-9+/=]+', '[Attached Image]', c_str)
                if len(c_str) > 200:
                    c_str = c_str[:200] + "..."
                formatted_h.append(f"{str(r).upper()}: {c_str}")
        history_context = "\n".join(formatted_h)

    # Token optimization: Compact metadata representation
    clients_summary = json.dumps(meta['unique_clients'][:25]) if meta.get('unique_clients') else "[]"
    groups_summary = json.dumps(meta.get('all_known_groups', GROUPS)[:25])

    prompt = f"""You are a dynamic query planner for an AMS Ticket dataset.
Analyze the user's question, dataset metadata, and conversation context to produce a JSON query plan.

### AVAILABLE DATASET METADATA:
- Total tickets: {meta['total_count']}
- Columns: {json.dumps(meta['columns'])}
- Known Clients: {clients_summary}
- Known Statuses: {json.dumps(meta['unique_statuses'])}
- Known Priorities: {json.dumps(meta['unique_priorities'])}
- Standard Groups/Modules: {groups_summary}

### CONVERSATION HISTORY:
{history_context if history_context else 'None'}

### USER QUESTION:
"{user_question}"

### CRITICAL FILTER REPLACEMENT & FOLLOW-UP RULES:
1. If the user specifies a NEW value for an attribute (e.g. client 'ATG' after previous turn had client 'Karamtara', or status 'Closed' after 'Open'), the NEW value MUST REPLACE the old value in detected fields. Do NOT include the old value.
2. If the user's question is a standalone new query (e.g., 'Show all closed tickets'), CLEAR non-mentioned filters from previous turns.
3. If the user's question is a follow-up refinement (e.g. 'only High priority ones', 'filter by FICO module', 'show resolutions'), PRESERVE active client/status/semantic filters from history and ADD the new filter.
4. DYNAMIC FIELD UNDERSTANDING: The user may filter by ANY field available in the ticket data (Client, Ticket ID, Description, Resolution, Status, Priority, Ticket type, Reported by, Assigned group, Assignee, Created date, Updated date, Closed date, etc.). Set standard fields or place arbitrary field conditions into `field_filters` dict (e.g. {{"assignee": "John"}}).
5. SEMANTIC DESCRIPTION SEARCH: A request for tickets mentioning a group searches the description. A request for that group's tickets filters by assignment, including when no tickets are assigned. Search fields like Description and Resolution for conceptual meaning, error codes (e.g., 'FB60'), transaction codes, symptoms, and business problems without requiring exact keyword matches. Place the main query concept into `semantic_text_search` and related terms into `semantic_keywords`.
6. DYNAMIC DATE EXPRESSIONS: Map natural-language date expressions dynamically:
   - Relative: today, yesterday, tomorrow, this_week, last_week, this_month, last_month, this_year, last_year, last_7_days, last_30_days
   - Offset: '15 days ago' -> type='days_ago', days_offset=15. 'last 10 days' -> type='last_n_days', days_offset=10.
   - Weekdays: 'last Thursday' -> type='specific_weekday', day_name='thursday'. 'since Monday' -> type='since_weekday', day_name='monday'.
   - Bounds: 'before 10 Sep 2026' -> type='before_date', target_date='2026-09-10'. 'after 1 Sep 2026' -> type='after_date', target_date='2026-09-01'. 'on 5 Sep 2026' -> type='on_date', target_date='2026-09-05'.
   - Date range: 'between 1 Sep 2026 and 10 Sep 2026' -> type='date_range', start_date='2026-09-01', end_date='2026-09-10'.
   - Month/Year: 'in August 2026' -> type='month_year', target_month=8, target_year=2026. 'in 2025' -> type='year_only', target_year=2025.

---
Generate a valid JSON object matching this exact structure:
{{
  "intent": "retrieval" | "filtering" | "counting" | "aggregation" | "ranking" | "comparison" | "trend_analysis" | "distribution" | "semantic_search" | "summarization" | "root_cause_analysis" | "general_inquiry" | "greeting" | "ticket_creation",
  "detected_client": string or null,
  "detected_status_semantic": "cancelled" | "closed" | "resolved" | "completed" | "created" | "in_progress" | "triage" | "allocated" | "unresolved" | "all" | null,
  "detected_priority": "High" | "Very High" | "Medium" | "Low" | null,
  "detected_type": "Incident" | "Change Request" | "S PO" | "Service Request" | null,
  "detected_group_or_module": string or null,
  "detected_reporter": string or null,
  "detected_assignee": string or null,
  "detected_ticket_no": string or null,
  "detected_resolution": string or null,
  "field_filters": dict or null,
  "date_range": {{
    "type": "today" | "yesterday" | "tomorrow" | "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "last_year" | "last_7_days" | "last_30_days" | "days_ago" | "last_n_days" | "specific_weekday" | "since_weekday" | "date_range" | "before_date" | "after_date" | "on_date" | "month_year" | "year_only" | null,
    "days_offset": integer or null,
    "day_name": string or null,
    "start_date": "YYYY-MM-DD" or null,
    "end_date": "YYYY-MM-DD" or null,
    "target_date": "YYYY-MM-DD" or null,
    "target_month": integer or null,
    "target_year": integer or null,
    "date_field": "createddate" | "reportedon" | "closeddate" | "updateddate" | null
  }},
  "semantic_text_search": string or null,
  "semantic_keywords": [string] or [],
  "conversational_intent": "find_previous" | "show_resolutions" | "count_only" | "find_unresolved" | "find_most_recent" | "normal" | null,
  "is_follow_up": boolean,
  "group_by_field": string or null,
  "aggregation": {{
    "function": "count" | "sum",
    "field": string or null
  }},
  "comparison_clients": [string] or [],
  "sort": {{
    "field": string or null,
    "direction": "asc" | "desc"
  }},
  "limit": integer or null,
  "ambiguous_client_match": boolean,
  "clarification_question": string or null
}}

Respond ONLY with the JSON object. Do not include markdown code block syntax unless required.
"""

    raw_response = await _call_llm(prompt, system_instruction=SYSTEM_PROMPT, json_response=True)
    plan = None
    if raw_response:
        try:
            cleaned = raw_response.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
                cleaned = re.sub(r"\n?```$", "", cleaned)
            plan = json.loads(cleaned)
        except Exception:
            plan = None

    if not plan or not isinstance(plan, dict):
        plan = heuristic_query_plan(user_question, meta, history=history)

    return sanitize_and_enforce_intent(plan, user_question, meta)


def heuristic_query_plan(user_question, meta, history=None):
    """
    Smart dynamic heuristic parser used as fallback when LLM is unavailable.
    """
    q_lower = user_question.lower().strip()

    # Greetings & General Inquiries
    greetings = ["hi", "hello", "hey", "hola", "namaste", "good morning", "good afternoon", "good evening", "greetings", "help", "who are you", "what can you do"]
    if q_lower in greetings or any(q_lower == g0 for g0 in greetings):
        return {
            "intent": "greeting",
            "detected_client": None,
            "detected_status_semantic": None,
            "detected_priority": None,
            "detected_group_or_module": None,
            "detected_reporter": None,
            "detected_ticket_no": None,
            "date_range": {"type": None, "start_date": None, "end_date": None},
            "semantic_text_search": None,
            "group_by_field": None,
            "aggregation": {"function": None, "field": None},
            "comparison_clients": [],
            "sort": {"field": None, "direction": None},
            "limit": None,
            "ambiguous_client_match": False,
            "clarification_question": None
        }

    # Ticket creation detection (including typos like tickate, tikit, etc.)
    if re.search(r'\b(create|raise|open|log|make|generate|want to create|need a?)\b.*\b(ticket|tickate|tikit|tickt|tikket|tikate)\b', q_lower) or re.search(r'\b(tickate|tikit|tickt|tikket|tikate)\b', q_lower):
        detected_client = None
        for c in meta.get("unique_clients", []):
            if len(c) <= 4:
                if re.search(r'\b' + re.escape(c) + r'\b', user_question, re.IGNORECASE):
                    detected_client = c
                    break
            else:
                if c.lower() in q_lower:
                    detected_client = c
                    break

        return {
            "intent": "ticket_creation",
            "detected_client": detected_client,
            "detected_status_semantic": None,
            "detected_priority": None,
            "detected_group_or_module": None,
            "detected_reporter": None,
            "detected_ticket_no": None,
            "date_range": {"type": None, "start_date": None, "end_date": None},
            "semantic_text_search": None,
            "group_by_field": None,
            "aggregation": {"function": None, "field": None},
            "comparison_clients": [],
            "sort": {"field": None, "direction": None},
            "limit": None,
            "ambiguous_client_match": False,
            "clarification_question": None
        }

    # Limit detection (e.g. "top 10", "first 5", "last 5", "latest 10", "recent 5", "limit 10")
    limit_val = None
    lim_match = re.search(r'\b(?:top|first|last|latest|recent|most\s+recent|limit)\s*(\d{1,3})\b', q_lower)
    if not lim_match:
        lim_match = re.search(r'\b(\d{1,3})\s*(?:latest|recent|last|top|first)?\s*tickets?\b', q_lower)
    if lim_match:
        limit_val = int(lim_match.group(1))

    # Intent detection
    intent = "filtering"
    if any(k in q_lower for k in ["how many", "count"]):
        intent = "counting"
    elif any(k in q_lower for k in ["most tickets", "highest tickets", "rank groups", "worst client", "top clients", "top groups"]):
        intent = "ranking"
    elif "compare" in q_lower:
        intent = "comparison"
    elif any(k in q_lower for k in ["summarize", "summary", "overview", "situation", "happening"]):
        intent = "summarization"
    elif any(k in q_lower for k in ["why", "root cause", "reason"]):
        intent = "root_cause_analysis"

    # Ticket number detection
    t_no = None
    t_match = re.search(r'\b([A-Za-z]{2,8}\d{4,10})\b', user_question)
    if t_match:
        t_no = t_match.group(1).strip()

    # Client detection against meta
    detected_client = None
    matched_clients = []

    # 1. Check explicit "client <name>" or "for client <name>" pattern in user prompt
    explicit_client_match = re.search(
        r'\b(?:client|for client|of client)\s*[:=]?\s*([A-Za-z0-9_\-\s]+?)(?:\s+(?:of|in|with|having|for|group|module|status|priority|tickets?|issues?)|$)',
        user_question,
        re.IGNORECASE
    )
    if explicit_client_match:
        c_target = explicit_client_match.group(1).strip().lower()
        if c_target and c_target not in ["is", "name", "the", "a", "an"]:
            for c in meta["unique_clients"]:
                c_clean = str(c).strip()
                if not c_clean or c_clean.lower() in ["none", "null", "n/a", "—", "-"]:
                    continue
                if c_target == c_clean.lower() or c_target in c_clean.lower():
                    matched_clients.append(c_clean)

    if not matched_clients:
        corporate_stopwords = {
            "pvt", "ltd", "private", "limited", "inc", "corp", "co", "plc", "llp", "industries",
            "india", "services", "technologies", "engineering", "group", "client", "ticket", "tickets",
            "and", "for", "the", "of", "in", "with", "on", "at", "to", "from", "by", "or", "a", "an",
            "is", "are", "this", "that", "month", "year", "week", "all", "open", "closed", "p1", "p2",
            "p3", "p4", "high", "low", "medium", "critical", "incident", "incidents"
        }
        for c in meta["unique_clients"]:
            c_clean = str(c).strip()
            if not c_clean or c_clean.lower() in ["none", "null", "n/a", "—", "-"]:
                continue
            if len(c_clean) <= 4:
                if re.search(r'\b' + re.escape(c_clean) + r'\b', user_question, re.IGNORECASE):
                    matched_clients.append(c_clean)
            else:
                if c_clean.lower() in q_lower:
                    matched_clients.append(c_clean)
                else:
                    words = [w.lower() for w in re.findall(r'[A-Za-z0-9]+', c_clean) if len(w) >= 3 and w.lower() not in corporate_stopwords]
                    for w in words:
                        if re.search(r'\b' + re.escape(w) + r'\b', q_lower):
                            matched_clients.append(c_clean)
                            break

    if len(matched_clients) >= 1:
        detected_client = matched_clients[0]

    status_sem = requested_ticket_status(user_question)
    priorities = sorted(extract_requested_priorities(user_question, query_filter=True))
    priority = priorities[0] if len(priorities) == 1 else priorities or None

    # Ticket type detection (support plurals)
    detected_type = None
    if re.search(r'\b(change\s*requests?|cr)\b', q_lower):
        detected_type = "Change Request"
    elif re.search(r'\b(s\s*po|spo)\b', q_lower) or (re.search(r'\bpurchase\s*orders?\b', q_lower) and not any(k in q_lower for k in ["tolerance", "limit", "issue", "error", "problem", "posting", "miro", "crash", "fail"])):
        detected_type = "S PO"
    elif re.search(r'\b(service\s*requests?|sr)\b', q_lower):
        detected_type = "Service Request"
    elif re.search(r'\b(incidents?|bugs?|faults?)\b', q_lower):
        detected_type = "Incident"

    # Assignment group / module match
    detected_group = None
    grp_match = re.search(
        r'\b(?:assigned\s+to\s+group|assigned\s+to|group\s*name|assigned\s*group|module\s*name|module|group)\s*(?:is|:|=|\b)?\s*([A-Za-z0-9_\-\s/&\.]+)',
        user_question,
        re.IGNORECASE
    )
    if grp_match:
        cand_grp = grp_match.group(1).strip()
        cand_grp = re.sub(r'^(?:to|for|is|in|of|by|the|a|an)\s+', '', cand_grp, flags=re.IGNORECASE).strip()
        cand_grp = re.sub(r'\s+(?:tickets?|issues?|records?|details?|only|and|or|for|with|in|having|status).*$', '', cand_grp, flags=re.IGNORECASE).strip()
        if cand_grp.lower() not in ["name", "is", "of", "for", "in", "by", "with", "the", "a", "an"]:
            norm_g = normalize_group_name(cand_grp)
            if norm_g and (norm_g in GROUPS or norm_g in meta.get("all_known_groups", []) or cand_grp.lower() in GROUP_ALIASES or norm_g in meta.get("unique_groups", [])):
                detected_group = norm_g

    if not detected_group:
        all_cands = list(meta.get("unique_groups", [])) + list(meta.get("all_known_groups", GROUPS)) + list(GROUP_ALIASES.keys())
        sorted_cands = sorted(set(all_cands), key=lambda x: len(x), reverse=True)
        for g in sorted_cands:
            if len(g) <= 4:
                if re.search(r'\b' + re.escape(g) + r'\b', user_question, re.IGNORECASE):
                    detected_group = normalize_group_name(g) or g
                    break
            else:
                pattern = r'\b' + re.escape(g.lower()) + r'\b'
                if re.search(pattern, q_lower):
                    detected_group = normalize_group_name(g) or g
                    break

    # Comprehensive Dynamic Date Range Detection
    date_info = {"type": None, "days_offset": None, "day_name": None, "start_date": None, "end_date": None}

    # 1. N days ago / back (e.g. "15 days ago", "10 days back", "30 days ago")
    ago_match = re.search(r'\b(\d{1,3})\s*days?\s*(?:ago|back)\b', q_lower)
    if ago_match:
        date_info["type"] = "days_ago"
        date_info["days_offset"] = int(ago_match.group(1))

    # 2. Last N days / past N days (e.g. "last 10 days", "past 15 days", "in the past 7 days")
    elif re.search(r'\b(?:last|past|within\s+the\s+last|in\s+the\s+past)\s*(\d{1,3})\s*days?\b', q_lower):
        m = re.search(r'\b(?:last|past|within\s+the\s+last|in\s+the\s+past)\s*(\d{1,3})\s*days?\b', q_lower)
        date_info["type"] = "last_n_days"
        date_info["days_offset"] = int(m.group(1))

    # 3. Last month / previous month / earlier this month
    elif "last month" in q_lower or "previous month" in q_lower:
        date_info["type"] = "last_month"
    elif "this month" in q_lower or "earlier this month" in q_lower:
        date_info["type"] = "this_month"

    # 4. Last week / previous week / this week / last 7 days / last 30 days / year
    elif "last week" in q_lower or "previous week" in q_lower:
        date_info["type"] = "last_week"
    elif "this week" in q_lower:
        date_info["type"] = "this_week"
    elif "today" in q_lower:
        date_info["type"] = "today"
    elif "yesterday" in q_lower:
        date_info["type"] = "yesterday"
    elif "tomorrow" in q_lower:
        date_info["type"] = "tomorrow"
    elif "last year" in q_lower or "previous year" in q_lower:
        date_info["type"] = "last_year"
    elif "this year" in q_lower:
        date_info["type"] = "this_year"

    # 5. Weekday references (e.g. "last Thursday", "this Thursday", "since Monday", "since last Thursday")
    elif re.search(r'\b(?:since\s+)?(?:last|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b', q_lower):
        w_match = re.search(r'\b(since\s+)?(?:last|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b', q_lower)
        is_since = bool(w_match.group(1))
        d_name = w_match.group(2)
        date_info["type"] = "since_weekday" if is_since else "specific_weekday"
        date_info["day_name"] = d_name

    # 6. Explicit date range & bounds (e.g. "between 1 September 2026 and 10 September 2026", "before 10 September 2026", "after 1 September 2026", "on 5 September 2026")
    elif re.search(r'\b(?:between|from)\s+([A-Za-z0-9\s/,-]+?)\s+(?:and|to)\s+([A-Za-z0-9\s/,-]+)\b', user_question, re.IGNORECASE):
        r_match = re.search(r'\b(?:between|from)\s+([A-Za-z0-9\s/,-]+?)\s+(?:and|to)\s+([A-Za-z0-9\s/,-]+)\b', user_question, re.IGNORECASE)
        s_str = r_match.group(1).strip()
        e_str = r_match.group(2).strip()
        dt_s = parse_date_string(s_str)
        dt_e = parse_date_string(e_str)
        if dt_s or dt_e:
            date_info["type"] = "date_range"
            date_info["start_date"] = dt_s.strftime("%Y-%m-%d") if dt_s else None
            date_info["end_date"] = dt_e.strftime("%Y-%m-%d") if dt_e else None

    elif re.search(r'\b(?:before|prior\s+to|earlier\s+than)\s+([A-Za-z0-9\s/,-]+)\b', user_question, re.IGNORECASE):
        b_match = re.search(r'\b(?:before|prior\s+to|earlier\s+than)\s+([A-Za-z0-9\s/,-]+)\b', user_question, re.IGNORECASE)
        dt_b = parse_date_string(b_match.group(1).strip())
        if dt_b:
            date_info["type"] = "before_date"
            date_info["target_date"] = dt_b.strftime("%Y-%m-%d")

    elif re.search(r'\b(?:after|since|later\s+than)\s+([A-Za-z0-9\s/,-]+)\b', user_question, re.IGNORECASE):
        a_match = re.search(r'\b(?:after|since|later\s+than)\s+([A-Za-z0-9\s/,-]+)\b', user_question, re.IGNORECASE)
        dt_a = parse_date_string(a_match.group(1).strip())
        if dt_a:
            date_info["type"] = "after_date"
            date_info["target_date"] = dt_a.strftime("%Y-%m-%d")

    elif re.search(r'\b(?:on|created\s+on|dated)\s+([A-Za-z0-9\s/,-]+)\b', user_question, re.IGNORECASE):
        o_match = re.search(r'\b(?:on|created\s+on|dated)\s+([A-Za-z0-9\s/,-]+)\b', user_question, re.IGNORECASE)
        dt_o = parse_date_string(o_match.group(1).strip())
        if dt_o:
            date_info["type"] = "on_date"
            date_info["target_date"] = dt_o.strftime("%Y-%m-%d")

    elif re.search(r'\b(?:in|during|for)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b', q_lower):
        m_match = re.search(r'\b(?:in|during|for)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b', q_lower)
        month_names = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
        date_info["type"] = "month_year"
        date_info["target_month"] = month_names.index(m_match.group(1).lower()) + 1
        date_info["target_year"] = int(m_match.group(2))

    elif re.search(r'\b(?:in|during|for)\s+(20\d{2})\b', q_lower):
        y_match = re.search(r'\b(?:in|during|for)\s+(20\d{2})\b', q_lower)
        date_info["type"] = "year_only"
        date_info["target_year"] = int(y_match.group(1))    # Reporter / Assignee / Group detection
    detected_reporter = None
    rep_match = re.search(r'\b(?:reported\s+by|created\s+by|reporter)\s*[:=]?\s*([A-Za-z0-9_\-\s\.]+)', user_question, re.IGNORECASE)
    if rep_match:
        detected_reporter = rep_match.group(1).strip()

    detected_assignee = None
    ass_match = re.search(r'\b(?:assigned\s+to|assignee)\s*[:=]?\s*([A-Za-z0-9_\-\s\.]+)', user_question, re.IGNORECASE)
    if ass_match:
        cand_ass = ass_match.group(1).strip()
        cand_ass = re.sub(r'^(?:group|module|the|a|an)\s+', '', cand_ass, flags=re.IGNORECASE).strip()
        cand_ass = re.sub(r'\s+(?:tickets?|issues?|records?|details?|only|and|or|for|with|in|having|status).*$', '', cand_ass, flags=re.IGNORECASE).strip()
        norm_group_cand = normalize_group_name(cand_ass)
        if norm_group_cand and (norm_group_cand in GROUPS or norm_group_cand in meta.get("all_known_groups", []) or cand_ass.lower() in GROUP_ALIASES):
            detected_group = norm_group_cand
            detected_assignee = None
        else:
            detected_assignee = cand_ass

    # Conversational intent detection
    conversational_intent = "normal"
    if any(k in q_lower for k in ["previous tickets", "resolutions", "seen this issue before", "have we seen"]):
        conversational_intent = "show_resolutions"
    elif any(k in q_lower for k in ["how many"]):
        conversational_intent = "count_only"
    elif "most recent" in q_lower:
        conversational_intent = "find_most_recent"
    elif "unresolved" in q_lower:
        conversational_intent = "find_unresolved"

    # Semantic text search extraction (transaction codes like FB60, error codes, business problems)
    semantic_text = None
    code_cands = [w for w in re.findall(r'\b[A-Za-z0-9_-]{3,15}\b', user_question) if (any(c.isdigit() for c in w) and not re.match(r'^\d{1,4}$', w)) or w.lower() in ["fb60", "miro", "me21n", "smartform", "uipath"]]
    issue_phrase = _query_issue_phrase(user_question)
    if issue_phrase:
        semantic_text = issue_phrase
    elif code_cands:
        semantic_text = " ".join(code_cands)
    else:
        prob_terms = [w for w in re.findall(r'\w+', q_lower) if w in ["invoice", "posting", "tolerance", "purchase", "order", "login", "password", "smartform", "dump", "selector", "bot", "print", "payment"]]
        if prob_terms:
            semantic_text = " ".join(prob_terms)
        elif not (t_no or detected_client or priority or status_sem or detected_group or detected_type or date_info["type"]):
            semantic_text = user_question

    # Multi-turn Follow-Up Context Preservation
    if history and isinstance(history, list) and len(history) > 0:
        is_follow_up = any(kw in q_lower for kw in [
            "only", "just", "show me the ones", "what about", "unresolved ones", "closed ones",
            "from last month", "have we seen", "previous tickets", "resolutions"
        ])
        if is_follow_up or not detected_client or not semantic_text:
            for h_msg in reversed(history[-4:]):
                if isinstance(h_msg, dict):
                    h_text = str(h_msg.get("content") or h_msg.get("text") or h_msg.get("message") or "")
                    if not detected_client:
                        for c in meta.get("unique_clients", []):
                            if c.lower() in h_text.lower():
                                detected_client = c
                                break
                    if not semantic_text:
                        code_m = re.findall(r'\b[A-Za-z0-9_-]{3,15}\b', h_text)
                        code_m = [w for w in code_m if any(c.isdigit() for c in w) or w.lower() in ["fb60", "miro", "me21n", "smartform"]]
                        if code_m:
                            semantic_text = " ".join(code_m)

    return {
        "intent": intent,
        "detected_client": detected_client,
        "detected_status_semantic": status_sem,
        "detected_priority": priority,
        "detected_type": detected_type,
        "detected_group_or_module": detected_group,
        "detected_reporter": detected_reporter,
        "detected_assignee": detected_assignee,
        "detected_ticket_no": t_no,
        "date_range": date_info,
        "semantic_text_search": semantic_text,
        "semantic_keywords": [w for w in re.findall(r'\w+', semantic_text.lower())] if semantic_text else [],
        "conversational_intent": conversational_intent,
        "is_follow_up": bool(history and len(history) > 0),
        "group_by_field": "clientName" if ("client" in q_lower and intent in ["ranking", "counting", "aggregation"] and not detected_client) else ("assigntogroup" if ("group" in q_lower or "module" in q_lower) and intent in ["ranking", "counting", "aggregation"] and not detected_group else None),
        "aggregation": {"function": "count", "field": "ticketNo"},
        "comparison_clients": [c for c in meta["unique_clients"] if c.lower() in q_lower],
        "sort": {"field": "createddate", "direction": "desc"},
        "limit": limit_val if limit_val else (5 if "top 5" in q_lower else (10 if "top 10" in q_lower else None)),
        "ambiguous_client_match": False,
        "clarification_question": None
    }


def parse_date_string(date_str):
    if not date_str or not str(date_str).strip():
        return None
    d_clean = str(date_str).strip()
    for fmt in [
        "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y",
        "%d %B %Y", "%d %b %Y", "%B %d, %Y", "%b %d, %Y", "%B %d %Y", "%b %d %Y"
    ]:
        try:
            dt = datetime.strptime(d_clean, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def parse_date_range(date_info):
    """
    Parses dynamic date conditions into concrete start and end datetime bounds in UTC.
    Supports relative dates, N days ago/back, last month/year, weekdays, explicit ranges, before/after bounds, etc.
    """
    if not date_info or not isinstance(date_info, dict):
        return None, None

    date_type = date_info.get("type")
    days_offset = date_info.get("days_offset")
    day_name = date_info.get("day_name")
    now = datetime.now(timezone.utc)
    end_of_today = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    if date_type == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = end_of_today
        return start, end

    elif date_type == "yesterday":
        y = now - timedelta(days=1)
        start = y.replace(hour=0, minute=0, second=0, microsecond=0)
        end = y.replace(hour=23, minute=59, second=59, microsecond=999999)
        return start, end

    elif date_type == "tomorrow":
        t = now + timedelta(days=1)
        start = t.replace(hour=0, minute=0, second=0, microsecond=0)
        end = t.replace(hour=23, minute=59, second=59, microsecond=999999)
        return start, end

    elif date_type == "this_week":
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        end = end_of_today
        return start, end

    elif date_type in ["last_week", "previous_week"]:
        end_lw = (now - timedelta(days=now.weekday() + 1)).replace(hour=23, minute=59, second=59, microsecond=999999)
        start_lw = (end_lw - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
        return start_lw, end_lw

    elif date_type == "this_month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = end_of_today
        return start, end

    elif date_type in ["last_month", "previous_month"]:
        first_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_prev_month = first_this_month - timedelta(days=1)
        first_prev_month = last_prev_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_prev_month = last_prev_month.replace(hour=23, minute=59, second=59, microsecond=999999)
        return first_prev_month, end_prev_month

    elif date_type == "this_year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = end_of_today
        return start, end

    elif date_type in ["last_year", "previous_year"]:
        start = now.replace(year=now.year - 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now.replace(year=now.year - 1, month=12, day=31, hour=23, minute=59, second=59, microsecond=999999)
        return start, end

    elif date_type == "last_7_days":
        start = now - timedelta(days=7)
        return start, end_of_today

    elif date_type == "last_30_days":
        start = now - timedelta(days=30)
        return start, end_of_today

    elif date_type == "days_ago" and days_offset is not None:
        target_day = now - timedelta(days=int(days_offset))
        start = target_day.replace(hour=0, minute=0, second=0, microsecond=0)
        end = target_day.replace(hour=23, minute=59, second=59, microsecond=999999)
        return start, end

    elif date_type in ["last_n_days", "past_n_days"] and days_offset is not None:
        start = now - timedelta(days=int(days_offset))
        return start, end_of_today

    elif date_type == "specific_weekday" and day_name:
        weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        d_lower = str(day_name).lower().strip()
        target_idx = weekdays.index(d_lower) if d_lower in weekdays else None
        if target_idx is not None:
            current_idx = now.weekday()
            days_back = (current_idx - target_idx) % 7
            if days_back == 0:
                days_back = 7  # Last Thursday means previous Thursday
            target_day = now - timedelta(days=days_back)
            start = target_day.replace(hour=0, minute=0, second=0, microsecond=0)
            end = target_day.replace(hour=23, minute=59, second=59, microsecond=999999)
            return start, end

    elif date_type == "since_weekday" and day_name:
        weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        d_lower = str(day_name).lower().strip()
        target_idx = weekdays.index(d_lower) if d_lower in weekdays else None
        if target_idx is not None:
            current_idx = now.weekday()
            days_back = (current_idx - target_idx) % 7
            if days_back == 0:
                days_back = 7
            target_day = now - timedelta(days=days_back)
            start = target_day.replace(hour=0, minute=0, second=0, microsecond=0)
            return start, end_of_today

    elif date_type == "before_date":
        target_str = date_info.get("target_date") or date_info.get("end_date")
        dt_end = parse_date_string(target_str)
        if dt_end:
            return None, dt_end.replace(hour=23, minute=59, second=59, microsecond=999999)

    elif date_type == "after_date":
        target_str = date_info.get("target_date") or date_info.get("start_date")
        dt_start = parse_date_string(target_str)
        if dt_start:
            return dt_start.replace(hour=0, minute=0, second=0, microsecond=0), end_of_today

    elif date_type == "on_date":
        target_str = date_info.get("target_date") or date_info.get("start_date") or date_info.get("end_date")
        dt_target = parse_date_string(target_str)
        if dt_target:
            s_t = dt_target.replace(hour=0, minute=0, second=0, microsecond=0)
            e_t = dt_target.replace(hour=23, minute=59, second=59, microsecond=999999)
            return s_t, e_t

    elif date_type == "month_year":
        m_num = date_info.get("target_month")
        y_num = date_info.get("target_year")
        if m_num and y_num:
            try:
                s_t = datetime(year=int(y_num), month=int(m_num), day=1, tzinfo=timezone.utc)
                if int(m_num) == 12:
                    e_t = datetime(year=int(y_num)+1, month=1, day=1, tzinfo=timezone.utc) - timedelta(microseconds=1)
                else:
                    e_t = datetime(year=int(y_num), month=int(m_num)+1, day=1, tzinfo=timezone.utc) - timedelta(microseconds=1)
                return s_t, e_t
            except Exception:
                pass

    elif date_type == "year_only":
        y_num = date_info.get("target_year")
        if y_num:
            try:
                s_t = datetime(year=int(y_num), month=1, day=1, tzinfo=timezone.utc)
                e_t = datetime(year=int(y_num), month=12, day=31, hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
                return s_t, e_t
            except Exception:
                pass

    elif date_info.get("start_date") or date_info.get("end_date"):
        start = parse_date_string(date_info.get("start_date"))
        end = parse_date_string(date_info.get("end_date"))
        if start and end and end < start:
            start, end = end, start
        if end:
            end = end.replace(hour=23, minute=59, second=59, microsecond=999999)
        return start, end

    return None, None


def safe_parse_datetime(val):
    """
    Parses various date string formats present in AMS datasets safely.
    """
    if not val or pd.isna(val):
        return None
    s = str(val).strip()
    for fmt in [
        "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y %H:%M:%S", "%d/%m/%Y", "%d-%m-%Y"
    ]:
        try:
            dt = datetime.strptime(s, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


def execute_query_plan(tickets_data, plan):
    """
    Executes the JSON query plan dynamically against the ticket DataFrame.
    Returns: (df_filtered, summary_stats)
    """
    if not tickets_data:
        return pd.DataFrame(), {"count": 0, "initial_total": 0, "filtered_count": 0}

    df = pd.DataFrame(tickets_data)
    initial_count = len(df)

    intent = plan.get("intent")
    if intent in ["greeting", "general_inquiry", "ticket_creation"]:
        return pd.DataFrame(), {"count": 0, "initial_total": initial_count, "filtered_count": 0}

    result = df.copy()

    # 1. Filter by specific Ticket Number if present
    t_no = plan.get("detected_ticket_no")
    if t_no:
        mask = result.apply(
            lambda r: str(r.get("ticketNo", "")).lower() == str(t_no).lower()
            or str(r.get("ticketId", "")).lower() == str(t_no).lower()
            or str(r.get("txnId", "")).lower() == str(t_no).lower(),
            axis=1
        )
        result = result[mask]

    # 2. Filter by Client Name (Entity Resolution - Strict AND Matching)
    client = plan.get("detected_client")
    if client and "clientName" in result.columns and not t_no:
        c_clean = str(client).strip().lower()

        def matches_client(val):
            if val is None or pd.isna(val):
                return False
            v_str = str(val).strip().lower()
            if not v_str or v_str in ["none", "null", "n/a", "—", "-"] or len(v_str) < 2:
                return False

            if v_str == c_clean:
                return True

            if len(c_clean) <= 4:
                pattern = r'\b' + re.escape(c_clean) + r'\b'
                return bool(re.search(pattern, v_str))
            else:
                return c_clean in v_str or (len(v_str) >= 3 and v_str in c_clean)

        result = result[result["clientName"].apply(matches_client)]

    # 3. Normalize the requested status and the AMS status before matching.
    status = normalize_ticket_status(plan.get("detected_status_semantic"))
    if status and status != "all" and "ticketStatus" in result.columns and not t_no:
        statuses = result["ticketStatus"].map(normalize_ticket_status)
        result = result.loc[statuses.isin(_OPEN_STATUSES) if status == "open" else statuses.eq(status)]

    # 4. Normalize priority labels and codes on both sides of the filter.
    priority_input = plan.get("detected_priorities") or plan.get("detected_priority")
    if priority_input and "priority" in result.columns and not t_no:
        priorities = priority_input if isinstance(priority_input, list) else [priority_input]
        wanted = {normalize_priority_string(value) for value in priorities} - {None}
        result = result.loc[result["priority"].map(normalize_priority_string).isin(wanted)]

    # 4.5 Filter by Ticket Type - Strict distinct value matching
    t_type = plan.get("detected_type") or plan.get("detected_ticket_type")
    if t_type and ("typeofticket" in result.columns or "type" in result.columns) and not t_no:
        t_type_clean = normalize_ticket_type(t_type)
        mask = result.apply(
            lambda r: str(r.get("typeofticket", "")).lower() == t_type_clean.lower()
            or str(r.get("type", "")).lower() == t_type_clean.lower(),
            axis=1
        )
        result = result[mask]

    # 5. Filter by Assignment Group (fall back to Module for legacy records)
    group = plan.get("detected_group_or_module")
    if group and not t_no:
        norm_grp = normalize_group_name(group) or group
        target_std = normalize_group_name(norm_grp) or norm_grp

        def matches_group(row):
            ass_grp = str(row.get("assigntogroup", "")).strip()
            mod_grp = str(row.get("module", "")).strip()
            if ass_grp.lower() not in {"", "none", "null", "nan", "n/a", "-"}:
                mod_grp = ""

            norm_ass = normalize_group_name(ass_grp) if ass_grp else None
            norm_mod = normalize_group_name(mod_grp) if mod_grp else None

            # Strict equality between recognized standard groups
            if target_std:
                if norm_ass and norm_ass.lower() == target_std.lower():
                    return True
                if norm_mod and norm_mod.lower() == target_std.lower():
                    return True
                # If row has a known standard group distinct from target_std, do not match across groups
                if norm_ass and norm_ass in GROUPS and norm_ass.lower() != target_std.lower():
                    return False
                if norm_mod and norm_mod in GROUPS and norm_mod.lower() != target_std.lower():
                    return False

            g_clean = str(norm_grp).lower().strip()
            if not g_clean or g_clean in ["none", "null", "n/a", "—", "-"]:
                return False

            g_nohyphen = g_clean.replace("-", " ").replace("_", " ").strip()

            for target in [ass_grp, mod_grp]:
                if not target or not str(target).strip() or str(target).strip().lower() in ["none", "null", "n/a", "—", "-"]:
                    continue
                target_clean = target.lower().strip()
                target_nohyphen = target_clean.replace("-", " ").replace("_", " ").strip()

                if g_clean == target_clean or g_nohyphen == target_nohyphen:
                    return True

                pattern_full = r'(?<![A-Za-z0-9\-])' + re.escape(g_clean) + r'(?![A-Za-z0-9\-])'
                if re.search(pattern_full, target_clean):
                    return True

                pattern_nohyphen = r'(?<![A-Za-z0-9\-])' + re.escape(g_nohyphen) + r'(?![A-Za-z0-9\-])'
                if re.search(pattern_nohyphen, target_nohyphen):
                    return True

            return False

        mask = result.apply(matches_group, axis=1)
        result = result[mask]

    # 6. Filter by Reporter
    reporter = plan.get("detected_reporter")
    if reporter and not t_no:
        r_lower = str(reporter).lower()
        mask = result.apply(
            lambda r: r_lower in str(r.get("createdname", "")).lower()
            or r_lower in str(r.get("createdEmails", "")).lower()
            or r_lower in str(r.get("reportedby", "")).lower(),
            axis=1
        )
        result = result[mask]

    # 6.5 Filter by Assignee
    assignee = plan.get("detected_assignee")
    if assignee and not t_no:
        a_lower = str(assignee).lower()
        mask = result.apply(
            lambda r: a_lower in str(r.get("assignee", "")).lower()
            or a_lower in str(r.get("assignedTo", "")).lower()
            or a_lower in str(r.get("assignedtoName", "")).lower(),
            axis=1
        )
        result = result[mask]

    # 6.6 Filter by dynamic field_filters dictionary
    field_filters = plan.get("field_filters")
    if field_filters and isinstance(field_filters, dict) and not t_no:
        for f_name, f_val in field_filters.items():
            if f_val is None or not str(f_val).strip():
                continue
            f_val_clean = str(f_val).strip().lower()
            target_col = None
            for c in result.columns:
                if c.lower() == str(f_name).lower():
                    target_col = c
                    break
            if target_col:
                mask = result[target_col].apply(
                    lambda v: f_val_clean in str(v).lower() if pd.notna(v) else False
                )
                result = result[mask]

    # 7. Filter by Date Range
    date_info = plan.get("date_range")
    if date_info and date_info.get("type") and not t_no:
        start_bound, end_bound = parse_date_range(date_info)
        if start_bound or end_bound:
            requested_field = date_info.get("date_field")
            date_col = None
            if requested_field:
                for c in result.columns:
                    if c.lower() == str(requested_field).lower():
                        date_col = c
                        break
            if not date_col:
                date_col = "createddate" if "createddate" in result.columns else ("reportedon" if "reportedon" in result.columns else None)

            if date_col:
                def date_filter(row_val):
                    dt = safe_parse_datetime(row_val)
                    if not dt:
                        return True
                    if start_bound and dt < start_bound:
                        return False
                    if end_bound and dt > end_bound:
                        return False
                    return True

                result = result[result[date_col].apply(date_filter)]

    # Explicit group mentions search descriptions independently of assignment.
    mention_group = plan.get("description_mention_group")
    if mention_group and not t_no and not result.empty:
        names = [mention_group, *(alias for alias, group in GROUP_ALIASES.items() if group == mention_group)]
        variants = [
            r"[\s_-]+".join(re.escape(part) for part in re.split(r"[\s_-]+", name))
            for name in names
        ]
        pattern = SAP_AI_NAME if mention_group == "SAP-AI" else r"(?<!\w)(?:" + "|".join(variants) + r")(?!\w)"
        descriptions = result.get("descriptionofTicket", pd.Series("", index=result.index))
        result = result.loc[descriptions.fillna("").astype(str).str.contains(pattern, case=False, regex=True)]

    # 8. Semantic Text Search on Description / Remarks / Resolutions / Fields
    search_text = plan.get("semantic_text_search")
    semantic_kws = plan.get("semantic_keywords") or []
    if (search_text or semantic_kws) and not t_no:
        st_lower = str(search_text or "").lower().strip()
        search_stop_words = {
            "show", "find", "tickets", "ticket", "list", "get", "fetch", "search", "filter",
            "group", "groups", "module", "modules", "assigned", "name", "names", "details",
            "record", "records", "issue", "issues", "with", "where", "about", "for", "the",
            "and", "are", "have", "through", "under", "please", "into", "from", "that", "this",
            "you", "neoai", "can", "could", "would", "tell", "display", "what", "which", "how",
            "many", "were", "was", "been", "seen", "previous", "historical", "occurred", "happened",
            "summarize", "summary", "summaries", "last", "latest", "recent", "top", "first",
            "give", "provide", "all", "any"
        }
        extracted_kws = [w for w in re.findall(r'\w+', st_lower) if len(w) >= 2 and w not in search_stop_words]
        all_keywords = list(set(extracted_kws + [str(k).lower() for k in semantic_kws if str(k).lower() not in search_stop_words]))

        # High priority error/transaction codes (e.g., FB60, MIRO, ME21N, HTTP 500, etc.)
        code_tokens = re.findall(r'\b[A-Za-z0-9_-]{3,15}\b', st_lower)
        code_tokens = [c for c in code_tokens if any(char.isdigit() for char in c) or c in ["fb60", "miro", "me21n", "abap"]]

        if all_keywords or code_tokens:
            def matches_text(row):
                text_blob = " ".join([
                    str(row.get("ticketNo", "")),
                    str(row.get("ticketId", "")),
                    str(row.get("txnId", "")),
                    str(row.get("descriptionofTicket", "")),
                    str(row.get("description", "")),
                    str(row.get("remarks", "")),
                    str(row.get("resolution", "")),
                    str(row.get("solution", "")),
                    str(row.get("name", "")),
                    str(row.get("clientName", "")),
                    str(row.get("assigntogroup", "")),
                    str(row.get("module", "")),
                    str(row.get("reportedby", "")),
                    str(row.get("assignee", ""))
                ]).lower()

                if st_lower and st_lower in text_blob:
                    return True

                if code_tokens:
                    for ct in code_tokens:
                        if ct in text_blob:
                            return True

                if len(all_keywords) >= 3:
                    matches_count = sum(1 for kw in all_keywords if kw in text_blob)
                    return matches_count >= 2
                else:
                    return any(kw in text_blob for kw in all_keywords)

            mask = result.apply(matches_text, axis=1)
            result = result[mask]

    # Aggregation / Grouping statistics calculation
    group_by = plan.get("group_by_field")
    group_stats = None
    if group_by and group_by in result.columns:
        values = result[group_by]
        if group_by == "ticketStatus":
            values = values.map(normalize_ticket_status).map(
                lambda status: status.replace("_", " ").title() if status else "Unknown"
            )
        elif group_by == "priority":
            values = values.map(normalize_priority_string).fillna("Unknown")
        group_stats = result.groupby(values).size().reset_index(name="ticket_count")
        group_stats = group_stats.sort_values(by="ticket_count", ascending=False)

    # Sorting & Limit
    sort_info = plan.get("sort") or {}
    sort_field = sort_info.get("field")
    if not sort_field or sort_field not in result.columns:
        for c in ["createddate", "reportedon", "reportedDate"]:
            if c in result.columns:
                sort_field = c
                break
    if sort_field and sort_field in result.columns:
        ascending = (sort_info.get("direction") == "asc")
        result = result.sort_values(by=sort_field, ascending=ascending)

    limit = plan.get("limit")
    if limit and isinstance(limit, int) and limit > 0:
        result = result.head(limit)

    summary_stats = {
        "initial_total": initial_count,
        "filtered_count": len(result),
        "group_stats": group_stats.to_dict(orient="records") if group_stats is not None else None,
        "unique_clients_in_result": list(result["clientName"].dropna().unique()) if "clientName" in result.columns else [],
        "unique_statuses_in_result": list(result["ticketStatus"].dropna().unique()) if "ticketStatus" in result.columns else []
    }

    return result, summary_stats


def _render_query_breakdown(summary_stats, group_by):
    groups = summary_stats.get("group_stats")
    if groups is None:
        return None
    if not groups:
        return "No matching tickets were found in AMS."
    rows = [f"- **{row.get(group_by) or 'Other'}**: {row['ticket_count']}" for row in groups]
    return "### Ticket breakdown\n\n" + "\n".join(rows)


async def generate_natural_response(user_question, plan, summary_stats, df_filtered, history=None):
    """
    Synthesizes a natural-language answer incorporating actual ticket data and query statistics.
    Follows rule #24: Answer the user's question directly first.
    """
    count = summary_stats["filtered_count"]
    intent = plan.get("intent")
    client = plan.get("detected_client")
    priority = plan.get("detected_priority")
    status_sem = plan.get("detected_status_semantic")
    t_no = plan.get("detected_ticket_no")
    group_req = plan.get("detected_group_or_module")
    conv_intent = plan.get("conversational_intent") or ""

    # Fast-Path 1: Greetings & general inquiry (0 Tokens)
    if intent in ["greeting", "general_inquiry"]:
        return (
            "**Hello! I am your Dynamic AMS Ticket Intelligence Assistant.**\n\n"
            "I can help you dynamically query, search, and manage your AMS tickets. Here is what you can do:\n\n"
            "- **Search & Filter**: *'Show unresolved P2 tickets for ATG'* or *'Tickets reported this week'*\n"
            "- **Analyze Metrics**: *'Which client has the most tickets?'* or *'Count of open SAP-MM tickets'*\n"
            "- **Ticket Details**: Enter any Ticket No (e.g. `ATG2608234` or `Kar2608133`)\n"
            "- **Create Tickets**: *'Create ticket for Karamtara: SAP login error, priority High'*\n\n"
            "How can I assist you today?"
        )

    # Fast-Path 2: Ticket creation guidance (0 Tokens)
    if intent == "ticket_creation":
        client_str = f" for **{client}**" if client else ""
        return (
            f"### Create AMS Ticket{client_str}\n\n"
            "I can help you create this ticket! Please specify details such as:\n"
            "- **Client Name** (e.g. `client: Karamtara` or `ATG`)\n"
            "- **Priority** (`Low`, `Medium`, `High`, `Critical`)\n"
            "- **Description** (e.g. `issue: SAP login authentication failed`)\n"
            "- **Reported By** (e.g. `reported by: Jaswanth`)\n\n"
            "Or reply with the missing fields to complete your ticket draft."
        )

    # Fast-Path 3: Group Not Found (0 Tokens)
    if count == 0 and group_req:
        is_module_query = "module" in user_question.lower()
        label = "Module" if is_module_query else "Group"
        target_str = f" for client **{client}**" if client else ""
        return (
            f"### {label} Not Found\n\n"
            f"No tickets were found matching {label.lower()} **'{group_req}'**{target_str} in the current database."
        )

    # Fast-Path 4: General zero matches (0 Tokens)
    if count == 0 and intent not in ["root_cause_analysis", "summarization", "comparison"]:
        target_str = f" for client **{client}**" if client else ""
        return f"I couldn't find any tickets matching your request (**'{user_question}'**){target_str} in the current dataset."

    if plan.get("group_by_field") and intent != "ranking":
        breakdown = _render_query_breakdown(summary_stats, plan["group_by_field"])
        if breakdown:
            return breakdown

    # Fast-Path 5: Simple Count / "How many" Queries (0 Tokens)
    if (intent == "counting" or conv_intent == "count_only" or "how many" in user_question.lower() or "count" in user_question.lower()) and not any(k in user_question.lower() for k in ["why", "compare", "breakdown", "summarize", "situation"]):
        target_desc = []
        if client: target_desc.append(f"client **{client}**")
        if group_req: target_desc.append(f"group/module **{group_req}**")
        if status_sem: target_desc.append(f"status **{status_sem}**")
        if priority:
            p_val = " / ".join(priority) if isinstance(priority, list) else priority
            target_desc.append(f"priority **{p_val}**")
        match_str = f" for {', '.join(target_desc)}" if target_desc else ""
        return f"There are **{count}** ticket(s) matching your request{match_str}."

    # Fast-Path 6: Single Ticket Details Inspection (0 Tokens)
    if count == 1 and (t_no or "detail" in user_question.lower() or "show ticket" in user_question.lower()):
        row = df_filtered.iloc[0].to_dict()
        t_id = row.get("ticketNo") or row.get("ticketId") or row.get("txnId") or t_no or "N/A"
        lines = [f"### Ticket Details: **{t_id}**\n"]
        label_fields = [
            ("Ticket Number / Ref", row.get("ticketNo") or row.get("ticketId")),
            ("Client Name", row.get("clientName")),
            ("Ticket Status", row.get("ticketStatus") or row.get("status")),
            ("Priority", row.get("priority")),
            ("Type of Ticket", row.get("typeofticket") or row.get("type")),
            ("Assigned Group", row.get("assigntogroup")),
            ("Module", row.get("module")),
            ("Reported By", row.get("reportedby") or row.get("createdname")),
            ("Reporter Email", row.get("createdEmails")),
            ("Reported Date", row.get("reportedon") or row.get("createddate")),
            ("Reported Time", row.get("reportedontime")),
            ("Description", row.get("descriptionofTicket") or row.get("name")),
            ("Transaction ID", row.get("txnId")),
            ("AMS System", row.get("ams")),
            ("Remarks / Notes", row.get("remarks")),
            ("Screenshot / Attachment", row.get("screenshort")),
        ]
        for label, val in label_fields:
            if val is not None and str(val).strip() != "":
                if label in ["Ticket Number / Ref", "Client Name", "Ticket Status", "Priority", "Type of Ticket", "Assigned Group", "Module", "Reported Date", "Reported Time", "Transaction ID", "AMS System"]:
                    lines.append(f"- **{label}**: `{val}`")
                else:
                    lines.append(f"- **{label}**: {val}")
        return "\n".join(lines)

    # Token optimization: Slim record projection with only essential display fields
    sample_records = [
        {
            "ticketNo": r.get("ticketNo") or r.get("ticketId"),
            "clientName": r.get("clientName"),
            "status": r.get("ticketStatus") or r.get("status"),
            "priority": r.get("priority"),
            "module": r.get("assigntogroup") or r.get("module"),
            "reportedon": r.get("reportedon"),
            "description": str(r.get("descriptionofTicket") or r.get("description") or "")[:120],
            "resolution": str(r.get("resolution") or r.get("remarks") or "")[:120] if (r.get("resolution") or r.get("remarks")) else None
        }
        for r in df_filtered.head(3).to_dict(orient="records")
    ] if not df_filtered.empty else []

    # Prompt LLM to synthesize natural response based on concrete data results
    prompt = f"""You are the Dynamic AMS Ticket Intelligence Assistant.
Formulate a clear, business-friendly natural language response to the user's question based strictly on the actual execution results below.

RULES:
1. ALWAYS answer the user's question directly in the FIRST sentence.
2. If counts or statistics were requested, summarize them clearly with bullet points.
3. If the request was analytical (e.g. "which client has the most tickets?"), state the conclusion clearly first.
4. If previous occurrences or resolutions are requested, list tickets with Number, Client, Status, Date, Description, and Resolution.

USER QUESTION:
"{user_question}"

EXECUTED PLAN:
{json.dumps(plan)}

METRICS:
- Total matching records: {count}
- Initial total: {summary_stats['initial_total']}
- Group breakdown: {json.dumps(summary_stats.get('group_stats'))}
- Top matching sample: {json.dumps(sample_records)}

Write the natural language response:
"""

    natural_res = await _call_llm(prompt, system_instruction=SYSTEM_PROMPT)

    if natural_res:
        return natural_res.strip()

    # Heuristic fallback response generation if LLM is unavailable
    intent = plan.get("intent")
    client = plan.get("detected_client")
    priority = plan.get("detected_priority")
    status_sem = plan.get("detected_status_semantic")
    t_no = plan.get("detected_ticket_no")
    group_req = plan.get("detected_group_or_module")
    conv_intent = plan.get("conversational_intent") or ""

    if intent in ["greeting", "general_inquiry"]:
        return (
            "**Hello! I am your Dynamic AMS Ticket Intelligence Assistant.**\n\n"
            "I can help you dynamically query, search, and manage your AMS tickets. Here is what you can do:\n\n"
            "- **Search & Filter**: *'Show unresolved P2 tickets for ATG'* or *'Tickets reported this week'*\n"
            "- **Analyze Metrics**: *'Which client has the most tickets?'* or *'Count of open SAP-MM tickets'*\n"
            "- **Ticket Details**: Enter any Ticket No (e.g. `ATG2608234` or `Kar2608133`)\n"
            "- **Create Tickets**: *'Create ticket for Karamtara: SAP login error, priority High'*\n\n"
            "How can I assist you today?"
        )

    if intent == "ticket_creation":
        client_str = f" for **{client}**" if client else ""
        return (
            f"### Create AMS Ticket{client_str}\n\n"
            "I can help you create this ticket! Please specify details such as:\n"
            "- **Client Name** (e.g. `client: Karamtara` or `ATG`)\n"
            "- **Priority** (`Low`, `Medium`, `High`, `Critical`)\n"
            "- **Description** (e.g. `issue: SAP login authentication failed`)\n"
            "- **Reported By** (e.g. `reported by: Jaswanth`)\n\n"
            "Or reply with the missing fields to complete your ticket draft."
        )

    if conv_intent == "show_resolutions" or "resolution" in user_question.lower() or "previous tickets" in user_question.lower() or "seen this issue before" in user_question.lower():
        if count == 0:
            target_str = f" for client **{client}**" if client else ""
            return f"No previous tickets matching your request (**'{user_question}'**){target_str} were found in the database."
        lines = [f"### Matching Tickets & Resolutions ({count} ticket{'s' if count > 1 else ''})\n"]
        for _, row in df_filtered.iterrows():
            t_id = row.get("ticketNo") or row.get("ticketId") or row.get("txnId") or "N/A"
            c_name = row.get("clientName") or "N/A"
            st_val = row.get("ticketStatus") or row.get("status") or "N/A"
            desc_val = row.get("descriptionofTicket") or row.get("name") or "N/A"
            res_val = row.get("resolution") or row.get("remarks") or "No resolution notes recorded."
            dt_val = row.get("reportedon") or row.get("createddate") or "N/A"
            lines.append(
                f"- **Ticket `{t_id}`** ({c_name} | Status: `{st_val}` | Date: `{dt_val}`)\n"
                f"  - **Description**: {desc_val}\n"
                f"  - **Resolution / Notes**: {res_val}\n"
            )
        return "\n".join(lines)

    if conv_intent == "count_only" or "how many" in user_question.lower():
        target_str = f" for client **{client}**" if client else ""
        return f"A total of **{count}** ticket(s) were raised matching your request{target_str}."

    if conv_intent == "find_most_recent" or "most recent" in user_question.lower():
        if count == 0:
            return "No matching tickets found."
        top_row = df_filtered.iloc[0].to_dict()
        c_name = top_row.get("clientName") or "N/A"
        dt_val = top_row.get("reportedon") or top_row.get("createddate") or "N/A"
        t_id = top_row.get("ticketNo") or top_row.get("ticketId") or top_row.get("txnId") or "N/A"
        return f"Client **{c_name}** had this issue most recently on `{dt_val}` (Ticket: `{t_id}`)."

    if count == 1:
        row = df_filtered.iloc[0].to_dict()
        t_id = row.get("ticketNo") or row.get("ticketId") or row.get("txnId") or t_no or "N/A"
        lines = [f"### Ticket Details: **{t_id}**\n"]
        label_fields = [
            ("Ticket Number / Ref", row.get("ticketNo") or row.get("ticketId")),
            ("Client Name", row.get("clientName")),
            ("Ticket Status", row.get("ticketStatus") or row.get("status")),
            ("Priority", row.get("priority")),
            ("Type of Ticket", row.get("typeofticket") or row.get("type")),
            ("Assigned Group", row.get("assigntogroup")),
            ("Module", row.get("module")),
            ("Reported By", row.get("reportedby") or row.get("createdname")),
            ("Reporter Email", row.get("createdEmails")),
            ("Reported Date", row.get("reportedon") or row.get("createddate")),
            ("Reported Time", row.get("reportedontime")),
            ("Description", row.get("descriptionofTicket") or row.get("name")),
            ("Transaction ID", row.get("txnId")),
            ("AMS System", row.get("ams")),
            ("Remarks / Notes", row.get("remarks")),
            ("Screenshot / Attachment", row.get("screenshort")),
        ]
        for label, val in label_fields:
            if val is not None and str(val).strip() != "":
                if label in ["Ticket Number / Ref", "Client Name", "Ticket Status", "Priority", "Type of Ticket", "Assigned Group", "Module", "Reported Date", "Reported Time", "Transaction ID", "AMS System"]:
                    lines.append(f"- **{label}**: `{val}`")
                else:
                    lines.append(f"- **{label}**: {val}")
        return "\n".join(lines)

    if count == 0:
        if group_req:
            is_module_query = "module" in user_question.lower()
            label = "Module" if is_module_query else "Group"
            target_str = f" for client **{client}**" if client else ""
            return (
                f"### {label} Not Found\n\n"
                f"No tickets were found matching {label.lower()} **'{group_req}'**{target_str} in the current database."
            )
        target_str = f" for client **{client}**" if client else ""
        return f"I couldn't find any tickets matching your request (**'{user_question}'**){target_str} in the current dataset."

    if intent in ["ranking", "counting", "aggregation"] and summary_stats.get("group_stats"):
        top_group = summary_stats["group_stats"][0]
        field_name = plan.get("group_by_field") or "category"
        top_name = top_group.get(field_name) or top_group.get("clientName") or top_group.get("assigntogroup")
        top_val = top_group.get("ticket_count", 0)
        
        res = f"**{top_name}** has the highest ticket count with **{top_val}** ticket(s).\n\n"
        res += "### Breakdown:\n"
        for g in summary_stats["group_stats"][:5]:
            name = g.get(field_name) or g.get("clientName") or g.get("assigntogroup") or "Other"
            res += f"- **{name}**: {g.get('ticket_count')} tickets\n"
        return res

    filter_desc = []
    if client: filter_desc.append(f"client **{client}**")
    if group_req: filter_desc.append(f"group **{group_req}**")
    if status_sem: filter_desc.append(f"status **{status_sem}**")
    if priority:
        p_str = " / ".join(priority) if isinstance(priority, list) else priority
        filter_desc.append(f"priority **{p_str}**")

    matching_desc = " (" + ", ".join(filter_desc) + ")" if filter_desc else ""
    return f"There are **{count}** ticket(s) matching your request{matching_desc}."


async def execute_planned_ticket_query(tickets_data, query_plan, user_question, history=None):
    """
    Executes a query directly using a pre-formulated query plan from the single-pass orchestrator,
    bypassing parse_query_plan_with_llm (saving an entire LLM call).
    Generates a fresh, dynamic narrative response using generate_dynamic_query_narrative.
    Returns: (answer_markdown_text, filtered_tickets_list_or_df)
    """
    if not tickets_data:
        return "No ticket data is currently loaded. Please check AMS connection and refresh.", None

    norm_tickets = [normalize_ticket_record(t) for t in tickets_data]
    meta = get_dataset_metadata(norm_tickets)

    if not isinstance(query_plan, dict):
        query_plan = {}

    agg = query_plan.get("aggregation")
    is_count = (agg == "count")
    sem_search = query_plan.get("semantic_search") or query_plan.get("semantic_text_search")

    full_plan = {
        "intent": "counting" if is_count else (query_plan.get("intent") or "filtering"),
        "detected_client": query_plan.get("client") or query_plan.get("detected_client"),
        "detected_status_semantic": query_plan.get("status") or query_plan.get("detected_status_semantic"),
        "detected_priority": query_plan.get("priority") or query_plan.get("detected_priority"),
        "detected_type": query_plan.get("type") or query_plan.get("detected_type"),
        "detected_group_or_module": query_plan.get("group_or_module") or query_plan.get("detected_group_or_module"),
        "detected_reporter": query_plan.get("reporter") or query_plan.get("detected_reporter"),
        "detected_assignee": query_plan.get("assignee") or query_plan.get("detected_assignee"),
        "detected_ticket_no": query_plan.get("ticket_no") or query_plan.get("detected_ticket_no"),
        "date_range": query_plan.get("date_range") or {"type": None, "start_date": None, "end_date": None},
        "semantic_text_search": sem_search,
        "semantic_keywords": [w for w in re.findall(r'\w+', str(sem_search).lower())] if sem_search else [],
        "conversational_intent": "normal",
        "is_follow_up": bool(history and len(history) > 0),
        "group_by_field": query_plan.get("group_by_field"),
        "aggregation": agg if isinstance(agg, dict) else ({"function": "count", "field": "ticketNo"} if is_count else {"function": None, "field": None}),
        "comparison_clients": [c for c in meta.get("unique_clients", []) if c.lower() in user_question.lower()],
        "sort": {"field": "createddate", "direction": "desc"},
        "limit": query_plan.get("limit"),
        "ambiguous_client_match": False,
        "clarification_question": None
    }

    plan = sanitize_and_enforce_intent(full_plan, user_question, meta)

    if plan.get("ambiguous_client_match") and plan.get("clarification_question"):
        return plan["clarification_question"], None

    df_filtered, summary_stats = execute_query_plan(norm_tickets, plan)
    count = len(df_filtered)

    if plan.get("group_by_field"):
        breakdown = _render_query_breakdown(summary_stats, plan["group_by_field"])
        if breakdown:
            return breakdown, df_filtered.to_dict(orient="records") if count else None

    # Use lightweight dynamic narrative generator to ensure varied, fresh, non-repetitive responses
    sample_records = df_filtered.head(5).to_dict(orient="records") if not df_filtered.empty else []
    try:
        from services.chat_orchestrator import generate_dynamic_query_narrative
        natural_answer = await generate_dynamic_query_narrative(user_question, query_plan, count, summary_stats, sample_records)
    except Exception as synth_err:
        print(f"[QueryEngine] Dynamic narrative synthesis fallback: {synth_err}")
        natural_answer = await generate_natural_response(user_question, plan, summary_stats, df_filtered, history=history)

    # Post-generation fact-checking & grounding guardrail
    from services.guardrails import verify_and_ground_ticket_narrative
    natural_answer = verify_and_ground_ticket_narrative(natural_answer, count, sample_records, query_plan)

    records_out = df_filtered.to_dict(orient="records") if not df_filtered.empty else None
    return natural_answer, records_out


async def process_ticket_query(tickets_data, user_question, history=None):
    """
    Main entry point for processing conversational ticket queries dynamically (async).
    Returns: (answer_markdown_text, filtered_tickets_list_or_df)
    """
    if not tickets_data:
        return "No ticket data is currently loaded. Please ensure credentials are correct and refresh ticket data.", None

    # Step 0: Normalize every ticket record so Type field is never blank
    norm_tickets = [normalize_ticket_record(t) for t in tickets_data]

    # Step 1: Inspect schema & dataset metadata dynamically
    meta = get_dataset_metadata(norm_tickets)

    # Step 2: Formulate dynamic Query Plan using LLM / NLU
    plan = await parse_query_plan_with_llm(user_question, meta, history=history)

    # Check for clarification request if client is ambiguous
    if plan.get("ambiguous_client_match") and plan.get("clarification_question"):
        return plan["clarification_question"], None

    # Step 3: Execute query plan dynamically against pandas DataFrame
    df_filtered, summary_stats = execute_query_plan(norm_tickets, plan)

    # Step 4: Generate natural language response backed by concrete results
    natural_answer = await generate_natural_response(user_question, plan, summary_stats, df_filtered, history=history)

    sample_records = df_filtered.head(5).to_dict(orient="records") if not df_filtered.empty else []
    from services.guardrails import verify_and_ground_ticket_narrative
    natural_answer = verify_and_ground_ticket_narrative(natural_answer, len(df_filtered), sample_records, plan)

    # Return records as list of dicts for frontend response
    records_out = df_filtered.to_dict(orient="records") if not df_filtered.empty else None

    return natural_answer, records_out
