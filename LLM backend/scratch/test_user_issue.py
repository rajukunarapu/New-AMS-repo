import re
p1 = "create ticket for client AAB, prority is low and issue is purchase order not processing"
explicit_client = re.search(
    r'\b(?:for\s+client|client|for)\s*[:=]?\s*([A-Za-z0-9_\-\s]+?)(?:\s+(?:priority|prio|proirity|regarding|about|with|having|for|group|module|status|type|ticket|issue)|$)',
    p1,
    re.IGNORECASE
)
print("explicit_client match:", explicit_client)
if explicit_client:
    print("group 1:", explicit_client.group(1))
