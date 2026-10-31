from __future__ import annotations
import json, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MANIFEST = ROOT / "config/data/third_party_tools.json"

def tool_manifest():
    return json.loads(MANIFEST.read_text())

def availability():
    out=[]
    for item in tool_manifest():
        binary=item["id"]
        path=shutil.which(binary)
        out.append({**item,"available":bool(path),"path":path})
    return out
