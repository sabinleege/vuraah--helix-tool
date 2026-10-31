from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

import httpx


@dataclass
class HTTPConfig:
    timeout: float = 30.0
    user_agent: str = "HelixCore/1.0 (genomics research platform)"


class ExternalAPIError(RuntimeError):
    pass


class JSONClient:
    def __init__(self, base_url: str, config: HTTPConfig | None = None, api_key: str | None = None):
        self.base_url = base_url.rstrip('/')
        self.config = config or HTTPConfig()
        self.api_key = api_key

    def _headers(self) -> dict[str, str]:
        h = {"Accept": "application/json", "User-Agent": self.config.user_agent}
        if self.api_key:
            h["Authorization"] = f"Bearer {self.api_key}"
        return h

    def _send(self, send: Any, url: str, **kwargs: Any) -> Any:
        # One retry on 5xx: public endpoints such as Ensembl REST return intermittent 500s.
        for attempt in range(2):
            try:
                r = send(url, headers=self._headers(), timeout=self.config.timeout, **kwargs)
            except httpx.HTTPError as e:
                raise ExternalAPIError(f"External request failed: {url}: {e}") from e
            if r.status_code < 500 or attempt:
                break
        if r.status_code >= 400:
            raise ExternalAPIError(f"External API {r.status_code}: {url}: {r.text[:500]}")
        return r.json()

    def get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        return self._send(httpx.get, f"{self.base_url}/{path.lstrip('/')}", params=params)

    def post(self, path: str, payload: dict[str, Any]) -> Any:
        return self._send(httpx.post, f"{self.base_url}/{path.lstrip('/')}", json=payload)


class NCBIClient(JSONClient):
    """NCBI E-utilities client. API key is optional; email/tool are recommended."""
    def __init__(self, api_key: str | None = None, email: str | None = None, tool: str = "helix-core"):
        super().__init__(os.getenv("NCBI_EUTILS_BASE", "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"), api_key=api_key)
        self.email = email or os.getenv("NCBI_EMAIL", "")
        self.tool = tool

    def _params(self, params: dict[str, Any] | None = None) -> dict[str, Any]:
        p = dict(params or {})
        p.update({"tool": self.tool})
        if self.email:
            p["email"] = self.email
        if self.api_key:
            p["api_key"] = self.api_key
        return p

    def esearch(self, db: str, term: str, retmax: int = 20) -> dict[str, Any]:
        return self.get("esearch.fcgi", self._params({"db": db, "term": term, "retmax": retmax, "retmode": "json"}))

    def esummary(self, db: str, ids: list[str]) -> dict[str, Any]:
        return self.get("esummary.fcgi", self._params({"db": db, "id": ",".join(ids), "retmode": "json"}))

    def efetch(self, db: str, ids: list[str], rettype: str | None = None, retmode: str = "json") -> Any:
        p = {"db": db, "id": ",".join(ids), "retmode": retmode}
        if rettype:
            p["rettype"] = rettype
        return self.get("efetch.fcgi", self._params(p))

    def pubmed_search(self, term: str, retmax: int = 20) -> dict[str, Any]:
        return self.esearch("pubmed", term, retmax)


class ClinVarClient(NCBIClient):
    def search_variant(self, query: str, retmax: int = 20) -> dict[str, Any]:
        return self.esearch("clinvar", query, retmax)

    def summarize(self, ids: list[str]) -> dict[str, Any]:
        return self.esummary("clinvar", ids)

    def fetch(self, ids: list[str]) -> Any:
        return self.efetch("clinvar", ids, retmode="xml")


class EnsemblClient(JSONClient):
    def __init__(self, assembly: str = "GRCh38"):
        base = "https://grch37.rest.ensembl.org" if assembly == "GRCh37" else "https://rest.ensembl.org"
        super().__init__(base)
        self.assembly = assembly

    def variant(self, identifier: str, phenotypes: bool = True, populations: bool = True) -> dict[str, Any]:
        return self.get(f"variation/human/{quote(identifier, safe='')}", {
            "phenotypes": int(phenotypes), "pops": int(populations)
        })

    def variant_recoder(self, identifier: str) -> dict[str, Any]:
        return self.get(f"variant_recoder/human/{quote(identifier, safe='')}")

    def vep_id(self, identifier: str, alpha_missense: bool = True, enformer: bool = True) -> list[dict[str, Any]]:
        data = self.get(f"vep/human/id/{quote(identifier, safe='')}", {
            "AlphaMissense": int(alpha_missense), "Enformer": int(enformer)
        })
        return data if isinstance(data, list) else [data]

    def vep_hgvs(self, hgvs: str, alpha_missense: bool = True, enformer: bool = True) -> list[dict[str, Any]]:
        data = self.get(f"vep/human/hgvs/{quote(hgvs, safe='')}", {
            "AlphaMissense": int(alpha_missense), "Enformer": int(enformer)
        })
        return data if isinstance(data, list) else [data]

    def batch_vep_ids(self, ids: list[str]) -> list[dict[str, Any]]:
        return self.post("vep/human/id", {"ids": ids})

    def vep_annotate(self, hgvs: str | None = None, vcf_line: str | None = None) -> list[dict[str, Any]]:
        """VEP with HGVS notation and canonical/MANE flags; accepts an HGVS string or a VCF-style line."""
        opts = {"AlphaMissense": 1, "hgvs": 1, "canonical": 1, "mane": 1, "vcf_string": 1}
        if vcf_line:
            data = self.post("vep/human/region", {"variants": [vcf_line], **opts})
        elif (hgvs or "").lower().startswith("rs"):
            data = self.get(f"vep/human/id/{quote(hgvs or '', safe='')}", opts)
        else:
            data = self.get(f"vep/human/hgvs/{quote(hgvs or '', safe='')}", opts)
        return data if isinstance(data, list) else [data]


class GnomADClient:
    """Minimal gnomAD GraphQL client. The GraphQL schema can vary by release, so queries are supplied by config."""
    def __init__(self, endpoint: str | None = None):
        self.endpoint = endpoint or os.getenv("GNOMAD_ENDPOINT", "https://gnomad.broadinstitute.org/api")

    def query(self, query: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
        try:
            r = httpx.post(self.endpoint, json={"query": query, "variables": variables or {}},
                           headers={"Accept": "application/json", "Content-Type": "application/json",
                                    "User-Agent": "HelixCore/1.0"}, timeout=30)
        except httpx.HTTPError as e:
            raise ExternalAPIError(f"gnomAD request failed: {e}") from e
        if r.status_code >= 400:
            raise ExternalAPIError(f"gnomAD API {r.status_code}: {r.text[:500]}")
        data = r.json()
        if data.get("errors"):
            raise ExternalAPIError(f"gnomAD GraphQL errors: {data['errors']}")
        return data.get("data", {})


class HPOClient:
    """HPO static releases are preferred for reproducibility; API use is optional."""
    RELEASE_URL = "https://purl.obolibrary.org/obo/hp.json"
    ANNOTATION_URL = "https://purl.obolibrary.org/obo/hp/hp-full.json"

    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or os.getenv("HPO_ENDPOINT", self.RELEASE_URL)

    def fetch_release(self) -> dict[str, Any]:
        return JSONClient(self.base_url).get("")


class ClinPGxClient(JSONClient):
    """ClinPGx now hosts the CPIC/PharmGKB knowledgebase API."""
    def __init__(self, base_url: str | None = None, api_key: str | None = None):
        super().__init__(base_url or os.getenv("CLINPGX_ENDPOINT", "https://api.pharmgkb.org"), api_key=api_key or os.getenv("CLINPGX_API_KEY"))

    def query(self, resource: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        return self.get(f"data/{resource}", params)

    def get_variant_annotation(self, identifier: str) -> dict[str, Any]:
        return self.get(f"data/variantAnnotation/{quote(identifier, safe='')}")

    def clinical_annotations(self, params: dict[str, Any] | None = None) -> dict[str, Any]:
        return self.query("clinicalAnnotation", params)

    def guideline_annotations(self, params: dict[str, Any] | None = None) -> dict[str, Any]:
        return self.query("guidelineAnnotation", params)

    def labels(self, params: dict[str, Any] | None = None) -> dict[str, Any]:
        return self.query("label", params)


class ClinicalTrialsClient(JSONClient):
    def __init__(self, base_url: str | None = None):
        super().__init__(base_url or os.getenv("TRIALS_ENDPOINT", "https://clinicaltrials.gov/api/v2"))

    def version(self) -> dict[str, Any]:
        return self.get("version")

    def studies(self, query_term: str | None = None, page_size: int = 100, page_token: str | None = None,
                status: str | None = None) -> dict[str, Any]:
        params: dict[str, Any] = {"pageSize": min(page_size, 1000), "format": "json"}
        if query_term:
            params["query.term"] = query_term
        if status:
            params["filter.overallStatus"] = status
        if page_token:
            params["pageToken"] = page_token
        return self.get("studies", params)

    def study(self, nct_id: str) -> dict[str, Any]:
        return self.get(f"studies/{quote(nct_id, safe='')}")
