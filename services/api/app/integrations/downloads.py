from __future__ import annotations

import hashlib
import json
import os
import shutil
import urllib.request
from pathlib import Path

MANIFEST = Path(__file__).resolve().parents[4] / "config" / "data" / "resources.json"


def load_manifest() -> list[dict]:
    return json.loads(MANIFEST.read_text())


def download(url: str, destination: str, sha256: str | None = None) -> dict:
    path = Path(destination)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".part")
    req = urllib.request.Request(url, headers={"User-Agent": "HelixCore/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r, tmp.open("wb") as f:
        shutil.copyfileobj(r, f)
    if sha256:
        h = hashlib.sha256()
        with tmp.open("rb") as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b""):
                h.update(chunk)
        if h.hexdigest().lower() != sha256.lower():
            tmp.unlink(missing_ok=True)
            raise ValueError(f"SHA256 mismatch for {url}")
    tmp.replace(path)
    return {"url": url, "path": str(path), "sha256": sha256}
