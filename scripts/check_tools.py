#!/usr/bin/env python3
from services.api.app.integrations.tools import availability
for item in availability():
    print(("OK" if item["available"] else "MISSING"), item["id"], item.get("path") or "")
