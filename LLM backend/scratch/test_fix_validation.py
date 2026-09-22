import sys
import os
import re
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.ticket_creator_service import (
    clean_user_message_text,
    resolve_client_name,
    MASTER_CLIENTS
)

def proposed_clean_ticket_description(desc, client_name=None, screenshot_val=None):
    if not desc or not str(desc).strip():
        return None

    cleaned_msg = clean_user_message_text(desc, screenshot_val)
    if not cleaned_msg:
        return None
    d = cleaned_msg.strip().strip('"\'`')

    # Step 1: Remove leading ticket creation command verb phrases
    d = re.sub(
        r'^(?:please\s+)?(?:i\s+want\s+to\s+|i\s+need\s+to\s+|can\s+you\s+)?(?:create|raise|open|log|make|file|generate|submit)\s+(?:an?\s+)?(?:(?:very\s+high|critical|high|medium|low|med|p1|p2|p3|p4|new|priority|prio|proirity|prority)\s+)*(?:ticket|issue|request)\b\s*(?:for\s+me\s+)?',
        '', d, flags=re.IGNORECASE
    ).strip()

    # Trailing ticket creation commands ONLY if followed by ticket/issue/request or meta phrases
    d = re.sub(r'[\s,;\.]+(?:please\s+)?(?:raise|create|open|log|make|file|submit|register|report)\s+(?:an?\s+)?(?:ticket|issue|request)\b.*$', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'[\s,;\.]+(?:please\s+)?(?:help|fix|resolve|look\s+into)\s+(?:this|it)\b.*$', '', d, flags=re.IGNORECASE).strip()

    # Step 2: Remove client specifications
    if client_name:
        d = re.sub(r'\bfor\s+client\s+' + re.escape(client_name) + r'\b', '', d, flags=re.IGNORECASE).strip()
        d = re.sub(r'\bfor\s+' + re.escape(client_name) + r'\b', '', d, flags=re.IGNORECASE).strip()
        d = re.sub(r'\bclient\s+' + re.escape(client_name) + r'\b', '', d, flags=re.IGNORECASE).strip()
        d = re.sub(r'\b' + re.escape(client_name) + r'\b', '', d, flags=re.IGNORECASE).strip()
        
        corporate_stopwords = {"and", "for", "the", "with", "co", "pvt", "ltd", "private", "limited", "inc", "corp", "company", "plc", "llp", "industries", "india", "services", "technologies", "engineering", "group", "client", "ticket", "issue", "request"}
        c_words = [w for w in re.findall(r'[A-Za-z0-9]+', str(client_name)) if len(w) >= 3 and w.lower() not in corporate_stopwords]
        for cw in c_words:
            d = re.sub(r'\bfor\s+' + re.escape(cw) + r'\b', '', d, flags=re.IGNORECASE).strip()
            d = re.sub(r'\b' + re.escape(cw) + r'\b', '', d, flags=re.IGNORECASE).strip()

    d = re.sub(r'\bfor\s+(?:client\s+)?(?:aab|karamtara|atg|balaji|kims|dixon|hfcl|wavin|casagrand|rockman|uml|phonepe|chambal|electrosteel|heritage|himedia|bajaj|avon|ajax|acsen|ananth)\b', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'\b(?:client|company|customer)\s*[:=]?\s*(?:[A-Za-z0-9_\-\.]+\s*)?', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'\b(?:co\.|co|ltd|pvt|corp|inc)\b', '', d, flags=re.IGNORECASE).strip()

    # Step 3: Remove priority specifications & trailing meta priority instructions
    d = re.sub(r'\b(?:so\s+)?(?:please\s+)?consider\s+(?:this|it)\s+as\s+(?:a\s+)?(?:very\s+high|critical|high|medium|low|med|moderate|p1|p2|p3|p4|minor|trivial)?\s*(?:priority|prio|proirity|prority)?\b.*$', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'\bconsider\s+(?:this|it)\s+as\s+.*$', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'\b(?:on|with|in|at)?\s*(?:very\s+high|critical|high|medium|low|med|moderate|p1|p2|p3|p4|minor|trivial)\s+(?:priority|prio|proirity|prority|prioriti|prioity|prioriy|proity)\b', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'\b(?:priority|prio|proirity|prority|prioriti|prioity|prioriy|proity)\s*[:=]?\s*(?:is\s+)?(?:very\s+high|critical|high|medium|low|med|moderate|p1|p2|p3|p4|minor|trivial)\b', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'\b(?:priority|prio|proirity|prority|prioriti|prioity)\b', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'\bkeep\s+it\s+(?:p1|p2|p3|p4|very\s+high|high|medium|low)\b', '', d, flags=re.IGNORECASE).strip()

    # Step 4: Remove ticket type & category specifications
    d = re.sub(r'\b(?:type\s*(?:category|of\s*ticket)?|category)\s*[:=]?\s*(?:is\s+)?(?:change\s+request|s\s*po|incident|service\s+request)\b', '', d, flags=re.IGNORECASE).strip()

    # Step 5: Remove leading/dangling standalone keywords & clauses
    d = re.sub(r'^[\s,;\.\-]+', '', d).strip()
    d = re.sub(r'^(?:and|or|with|for|regarding|about|because)\b\s*', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^(?:where\s+)?(?:i\s+)?(?:can\'t|cannot|am\s+not)\s+(?:able\s+to\s+)?', 'Unable to ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^(?:where\s+)?(?:i\s+)?unable\s+to\s+', 'Unable to ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^where\s+i\s+', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^(?:and\s+)?(?:the\s+)?(?:issue|problem)\s+(?:of|with|about|is)\s+', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^(?:and\s+)?(?:the\s+)?(?:issue|problem)\s+', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^(?:and\s+)?is\s+', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'\b(?:and|or|with|for|co)\b(?=\s*[\.,;:]|$)', '', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^[\s,;\.\-]+', '', d).strip()

    # Step 6: Clean dangling punctuation & spaces
    d = re.sub(r'[,:\-\s]+', ' ', d).strip()
    d = re.sub(r'^[,:\-\s]+', '', d).strip()
    d = re.sub(r'[,:\-\s\.]+$', '', d).strip()

    # Step 7: Normalize leading phrases
    d = re.sub(r'^can\'t able to\s+', 'Unable to ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^cannot able to\s+', 'Unable to ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^am facing severe\s+', 'Facing severe ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^am facing\s+', 'Facing ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^facing severe\s+', 'Facing severe ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^facing\s+', 'Facing ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^am encountering issue with\s+', 'Encountering issue with ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^am encountering problem with\s+', 'Encountering problem with ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^am encountering\s+', 'Encountering ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^am experiencing\s+', 'Experiencing ', d, flags=re.IGNORECASE).strip()
    d = re.sub(r'^is\s+', '', d, flags=re.IGNORECASE).strip()

    # Step 8: Proper casing for Joule & acronyms
    d = re.sub(r'\bjoule\b', 'Joule', d, flags=re.IGNORECASE)
    d = re.sub(r'\bsap\b', 'SAP', d, flags=re.IGNORECASE)
    d = re.sub(r'\bkpis\b', 'KPIs', d, flags=re.IGNORECASE)
    d = re.sub(r'\bmiro\b', 'MIRO', d, flags=re.IGNORECASE)

    # Step 9: Capitalize first letter and append period
    if d:
        d = d[0].upper() + d[1:]
        if not d.endswith('.'):
            d += '.'

    if re.match(r'^[\w\s-]+\.(?:png|jpg|jpeg|gif|webp|bmp)\.?$', d, re.IGNORECASE):
        return None

    return d if d else None


def proposed_heuristic_field_extractor(prompt, current_draft, known_clients):
    p = prompt.strip()
    p_lower = p.lower()
    draft = dict(current_draft)

    all_clients = list(MASTER_CLIENTS)
    if known_clients:
        for kc in known_clients:
            if kc and str(kc).strip() and str(kc).strip() not in all_clients:
                all_clients.append(str(kc).strip())

    # 1. Client Name Extraction & Entity Resolution
    explicit_client = re.search(
        r'\b(?:for\s+client|client\s+is|client|for)\s*[:=]?\s*([A-Za-z0-9_\-\s]+?)(?=[,;.\n]|\s+(?:priority|prio|proirity|prority|prioriti|prioity|regarding|about|with|having|for|group|module|status|type|ticket|issue|and|is|where|that|which|when|unable|cannot|can\'t|so|please|consider|as|to)|$)',
        p,
        re.IGNORECASE
    )
    if explicit_client:
        c_cand = explicit_client.group(1).strip()
        c_cand = re.split(r'\b(?:where|that|which|when|where\s+i|that\s+i|cannot|can\'t|unable|so|please|consider|issue|problem|in)\b', c_cand, flags=re.IGNORECASE)[0].strip()
        c_clean_cand = re.sub(r'\b(?:co\.|co|corp|inc|ltd|pvt|company|client)\b', '', c_cand, flags=re.IGNORECASE).strip()
        if c_clean_cand and c_clean_cand.lower() not in ["a", "an", "the", "me", "new", "ticket", "issue", "request", "is", "name"]:
            resolved = resolve_client_name(c_clean_cand, all_clients)
            if resolved:
                draft["clientName"] = resolved
            else:
                draft["clientName"] = c_clean_cand

    if not draft.get("clientName"):
        corporate_stopwords = {"and", "for", "the", "with", "co", "pvt", "ltd", "private", "limited", "inc", "corp", "company", "plc", "llp", "industries", "india", "services", "technologies", "engineering", "group", "client", "ticket", "issue", "request"}
        for client in all_clients:
            c_clean = str(client).strip()
            if not c_clean or c_clean.lower() in ["none", "null", "n/a", "—", "-"]:
                continue
            if len(c_clean) <= 4:
                if re.search(r'\b' + re.escape(c_clean) + r'\b', p, re.IGNORECASE):
                    draft["clientName"] = client
                    break
            else:
                if c_clean.lower() in p_lower:
                    draft["clientName"] = client
                    break
                else:
                    words = [w.lower() for w in re.findall(r'[A-Za-z0-9]+', c_clean) if len(w) >= 3 and w.lower() not in corporate_stopwords]
                    for w in words:
                        if re.search(r'\b' + re.escape(w) + r'\b', p_lower):
                            draft["clientName"] = client
                            break
                    if draft.get("clientName"):
                        break

    # 2. Priority
    prio_patterns = [
        (r'\b(?:very\s+high|critical|p1)\b', "Very High"),
        (r'\b(?:high|p2)\b', "High"),
        (r'\b(?:medium|med|moderate|p3)\b', "Medium"),
        (r'\b(?:low|minor|trivial|p4)\b', "Low")
    ]
    m_prio_before = re.search(r'\b(?:very\s+high|critical|high|medium|med|moderate|low|minor|trivial|p1|p2|p3|p4)\s+(?:priority|prio|proirity|prority|prioriti|prioity)\b', p, re.IGNORECASE)
    m_prio_label = re.search(r'\b(?:priority|prio|proirity|prority|prioriti|prioity)\s*[:=]?\s*(?:is\s+)?([A-Za-z0-9\s]+)', p, re.IGNORECASE)
    
    if m_prio_before:
        val = m_prio_before.group(0).lower()
        if "crit" in val or "very high" in val or "p1" in val:
            draft["priority"] = "Very High"
        elif "high" in val or "p2" in val:
            draft["priority"] = "High"
        elif "med" in val or "p3" in val:
            draft["priority"] = "Medium"
        elif "low" in val or "p4" in val:
            draft["priority"] = "Low"
    elif m_prio_label:
        val = m_prio_label.group(1).strip().lower()
        if "crit" in val or "very high" in val or "p1" in val:
            draft["priority"] = "Very High"
        elif "high" in val or "p2" in val:
            draft["priority"] = "High"
        elif "med" in val or "p3" in val:
            draft["priority"] = "Medium"
        elif "low" in val or "p4" in val:
            draft["priority"] = "Low"
    
    if not draft.get("priority"):
        for pat, norm in prio_patterns:
            if re.search(pat, p_lower):
                draft["priority"] = norm
                break

    # 3. Description cleaning
    clean_p = proposed_clean_ticket_description(p, draft.get("clientName"), draft.get("screenshort"))
    draft["descriptionofTicket"] = clean_p

    return draft


p1 = "i can't able to create dashboards and kpis for client AAB in sap analytics cloud . so please consider this as low priority"
p2 = "create a ticket for client Alekya homes where i cannot able to process purchase order in MIRO. consider it as low priority."

res1 = proposed_heuristic_field_extractor(p1, {}, MASTER_CLIENTS)
print("P1 Proposed Extractor Result:", res1)

res2 = proposed_heuristic_field_extractor(p2, {}, MASTER_CLIENTS)
print("P2 Proposed Extractor Result:", res2)
