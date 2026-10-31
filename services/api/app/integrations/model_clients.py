from __future__ import annotations

import os
from typing import Any
import httpx


class ModelProviderError(RuntimeError):
    pass


class ESMAtlasClient:
    """Optional ESM Atlas hosted folding/effect endpoint. No Helix secrets are stored in code."""
    endpoint = "https://api.esmatlas.com/foldSequence/v1/pdb/"

    def fold(self, sequence: str) -> bytes:
        r = httpx.post(self.endpoint, content=sequence.encode(), headers={"Content-Type":"text/plain"}, timeout=120)
        if r.status_code >= 400:
            raise ModelProviderError(f"ESM Atlas {r.status_code}: {r.text[:300]}")
        return r.content


class Evo2NVIDIAClient:
    """Optional NVIDIA-hosted Evo2 endpoint; requires NVCF_RUN_KEY."""
    def __init__(self, url: str | None = None):
        self.url = url or os.getenv("EVO2_NVIDIA_URL", "https://health.api.nvidia.com/v1/biology/arc/evo2-40b/generate")
        self.key = os.getenv("NVCF_RUN_KEY", "")

    def generate(self, sequence: str, num_tokens: int = 1) -> dict[str, Any]:
        if not self.key:
            raise ModelProviderError("NVCF_RUN_KEY is not configured")
        r = httpx.post(self.url, headers={"Authorization": f"Bearer {self.key}"}, json={"sequence": sequence, "num_tokens": num_tokens}, timeout=180)
        if r.status_code >= 400:
            raise ModelProviderError(f"Evo2 provider {r.status_code}: {r.text[:500]}")
        return r.json()
