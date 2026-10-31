#!/usr/bin/env python3
"""Install/download only external resources; never invents or bundles restricted datasets."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "config/data/resources.json"


def download(url: str, target: Path):
    target.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent":"HelixCore/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r, target.open("wb") as f:
        while chunk := r.read(1024 * 1024):
            f.write(chunk)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", default=[])
    ap.add_argument("--download-public", action="store_true")
    args = ap.parse_args()
    items = json.loads(MANIFEST.read_text())
    for item in items:
        if args.only and item["id"] not in args.only:
            continue
        if item["id"] in {"hpo-obo", "hpo-json"} and args.download_public:
            target = ROOT / item["target"]
            print(f"Downloading {item['name']} -> {target}")
            download(item["url"], target)
        else:
            print(f"REGISTERED {item['id']}: {item['url']}")
            if item.get("note"):
                print(f"  NOTE: {item['note']}")
    print("Third-party bootstrap complete. Licensed/large resources remain external by design.")

if __name__ == "__main__":
    main()
