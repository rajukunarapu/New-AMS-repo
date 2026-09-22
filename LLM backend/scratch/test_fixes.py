import re

def clean_ticket_description(desc: str, client_name: str = None, screenshot_val: str = None) -> str:
    if not desc or not str(desc).strip():
        return None

    t = str(desc).strip().strip('"\'`')

    # Step 1: Remove leading creation verbs
    t = re.sub(
        r'^(?:please\s+)?(?:i\s+want\s+to\s+|i\s+need\s+to\s+|can\s+you\s+)?(?:create|raise|open|log|make|file|generate|submit)\s+(?:an?\s+)?(?:(?:very\s+high|critical|high|medium|low|med|p1|p2|p3|p4|new|priority|prio)\s+)*(?:ticket|issue|request)\b\s*(?:for\s+me\s+)?',
        '', t, flags=re.IGNORECASE
    ).strip()
    t = re.sub(r'[\s,;\.]+(?:please\s+)?(?:raise|create|open|log|make|file|submit|register|report|help|fix|resolve)\b.*$', '', t, flags=re.IGNORECASE).strip()

    # Step 2: Remove client mentions
    if client_name:
        t = re.sub(r'\bfor\s+client\s+' + re.escape(client_name) + r'\b', '', t, flags=re.IGNORECASE).strip()
        t = re.sub(r'\bfor\s+' + re.escape(client_name) + r'\b', '', t, flags=re.IGNORECASE).strip()
        t = re.sub(r'\bclient\s+' + re.escape(client_name) + r'\b', '', t, flags=re.IGNORECASE).strip()
        t = re.sub(r'\b' + re.escape(client_name) + r'\b', '', t, flags=re.IGNORECASE).strip()

    t = re.sub(r'\bfor\s+(?:client\s+)?(?:aab|karamtara|atg|balaji|kims|dixon|hfcl|wavin|casagrand|rockman|uml|phonepe|chambal|electrosteel|heritage|himedia|bajaj|avon|ajax|acsen|ananth)\b', '', t, flags=re.IGNORECASE).strip()
    t = re.sub(r'\b(?:client|company|customer)\s*[:=]?\s*(?:[A-Za-z0-9_\-\.]+\s*)?', '', t, flags=re.IGNORECASE).strip()

    # Step 3: Remove priority mentions (including typos like prority, proirity, etc.)
    t = re.sub(r'\b(?:priority|prio|proirity|prority|prioriti|prioity|prioriy|proity)\s*[:=]?\s*(?:is\s+)?(?:very\s+high|critical|high|medium|low|med|moderate|p1|p2|p3|p4|minor|trivial)\b', '', t, flags=re.IGNORECASE).strip()
    t = re.sub(r'\bkeep\s+it\s+(?:p1|p2|p3|p4|very\s+high|high|medium|low)\b', '', t, flags=re.IGNORECASE).strip()

    # Step 4: Remove ticket type mentions
    t = re.sub(r'\b(?:type\s*(?:category|of\s*ticket)?|category)\s*[:=]?\s*(?:is\s+)?(?:change\s+request|s\s*po|incident|service\s+request)\b', '', t, flags=re.IGNORECASE).strip()

    # Step 5: Remove leading/dangling standalone keywords like "for", "regarding", "about", "issue is", "because", "and", commas
    t = re.sub(r'^[\s,;\.\-]+', '', t).strip()
    t = re.sub(r'^(?:and|or|with|for|regarding|about|because)\b\s*', '', t, flags=re.IGNORECASE).strip()
    t = re.sub(r'^(?:the\s+)?(?:issue|problem)\s+(?:of|with|about|is)\s+', '', t, flags=re.IGNORECASE).strip()
    t = re.sub(r'^(?:the\s+)?(?:issue|problem)\s+', '', t, flags=re.IGNORECASE).strip()
    t = re.sub(r'^(?:is\s+)', '', t, flags=re.IGNORECASE).strip()
    t = re.sub(r'^[\s,;\.\-]+', '', t).strip()

    # Step 6: Clean dangling punctuation & extra spaces
    t = re.sub(r'[,:\-\s]+', ' ', t).strip()
    t = re.sub(r'^[,:\-\s]+', '', t).strip()
    t = re.sub(r'[,:\-\s\.]+$', '', t).strip()

    # Step 7: Capitalize first letter and append period
    if t:
        t = t[0].upper() + t[1:]
        if not t.endswith('.'):
            t += '.'

    return t

p = "create ticket for client AAB, prority is low and issue is purchase order not processing"
print("Cleaned description:", clean_ticket_description(p, client_name="AAB"))
