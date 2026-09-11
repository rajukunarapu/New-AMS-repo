from datetime import datetime


def contains(value, search):
    if value is None or search is None:
        return False
    v_str = str(value).strip().lower()
    s_str = str(search).strip().lower()
    if not v_str or not s_str or v_str in ["none", "null", "n/a", "—", "-"]:
        return False
    return s_str in v_str


def equals(value, search):
    if value is None or search is None:
        return False
    v_str = str(value).strip().lower()
    s_str = str(search).strip().lower()
    if not v_str or not s_str or v_str in ["none", "null", "n/a", "—", "-"]:
        return False
    return v_str == s_str


def filter_tickets(
    tickets,
    ticket_no=None,
    client_name=None,
    status=None,
    priority=None,
    assigntogroup=None,
    created_name=None,
    created_email=None,
    txn_id=None,
    search_text=None,
    module=None
):
    """
    Filter AMS tickets locally.
    """
    result = tickets

    if ticket_no:
        result = [
            t for t in result
            if equals(t.get("ticketNo"), ticket_no) or equals(t.get("ticketId"), ticket_no)
        ]

    if client_name:
        result = [
            t for t in result
            if contains(t.get("clientName"), client_name)
        ]

    if status:
        result = [
            t for t in result
            if equals(t.get("ticketStatus"), status)
        ]

    if priority:
        result = [
            t for t in result
            if equals(t.get("priority"), priority)
        ]

    target_group = assigntogroup or module
    if target_group:
        tg_clean = str(target_group).strip().lower()
        tg_nohyphen = tg_clean.replace("-", " ").replace("_", " ").strip()
        tg_sub = re.sub(r'^(?:sap|module)\s*[\-_]?\s*', '', tg_clean).strip()

        def matches_grp(val):
            if val is None:
                return False
            v_str = str(val).strip().lower()
            v_nohyphen = v_str.replace("-", " ").replace("_", " ").strip()
            if tg_clean == v_str or tg_nohyphen == v_nohyphen:
                return True
            pattern_full = r'\b' + re.escape(tg_clean) + r'\b'
            if re.search(pattern_full, v_str):
                return True
            pattern_nohyphen = r'\b' + re.escape(tg_nohyphen) + r'\b'
            if re.search(pattern_nohyphen, v_nohyphen):
                return True
            if tg_sub and len(tg_sub) >= 2:
                pattern_sub = r'\b' + re.escape(tg_sub) + r'\b'
                if re.search(pattern_sub, v_str) or re.search(pattern_sub, v_nohyphen):
                    return True
            return False

        result = [
            t for t in result
            if matches_grp(t.get("assigntogroup")) or matches_grp(t.get("module"))
        ]

    if created_name:
        result = [
            t for t in result
            if contains(t.get("createdname"), created_name)
        ]

    if created_email:
        result = [
            t for t in result
            if contains(t.get("createdEmails"), created_email)
        ]

    if txn_id:
        result = [
            t for t in result
            if equals(t.get("txnId"), txn_id)
        ]

    if search_text:
        searchable_fields = [
            "ticketNo",
            "ticketId",
            "clientName",
            "ticketStatus",
            "priority",
            "assigntogroup",
            "module",
            "createdname",
            "createdEmails",
            "name",
            "remarks"
        ]
        result = [
            t for t in result
            if any(
                contains(t.get(field), search_text)
                for field in searchable_fields
            )
        ]

    return result

