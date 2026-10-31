import re
import time
from concurrent.futures import ThreadPoolExecutor

import httpx
from fastapi import APIRouter, HTTPException

from ..integrations import ClinVarClient, EnsemblClient, NCBIClient, ClinPGxClient, ClinicalTrialsClient, GnomADClient, HPOClient
from ..integrations.clients import ExternalAPIError
from ..integrations.registry import all_resources

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


@router.get("/resources")
def resources():
    return {"resources": all_resources()}


@router.get("/variant/{identifier}")
def variant(identifier: str, assembly: str = "GRCh38"):
    try:
        ens = EnsemblClient(assembly)
        return {
            "assembly": assembly,
            "variation": ens.variant(identifier),
            "recoding": ens.variant_recoder(identifier),
            "vep": ens.vep_id(identifier),
        }
    except Exception as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get("/clinvar/search")
def clinvar_search(term: str, retmax: int = 20):
    try:
        return ClinVarClient().search_variant(term, min(retmax, 100))
    except Exception as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get("/pubmed/search")
def pubmed_search(term: str, retmax: int = 20):
    try:
        return NCBIClient().pubmed_search(term, min(retmax, 100))
    except Exception as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get("/pgx/clinical")
def pgx_clinical(gene: str | None = None, drug: str | None = None, limit: int = 20):
    params = {"limit": min(limit, 100)}
    if gene: params["gene"] = gene
    if drug: params["drug"] = drug
    try:
        return ClinPGxClient().clinical_annotations(params)
    except Exception as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get("/pgx/guidelines")
def pgx_guidelines(gene: str | None = None, drug: str | None = None, limit: int = 20):
    params = {"limit": min(limit, 100)}
    if gene: params["gene"] = gene
    if drug: params["drug"] = drug
    try:
        return ClinPGxClient().guideline_annotations(params)
    except Exception as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get("/trials")
def trials(query: str | None = None, page_size: int = 100, status: str | None = None):
    try:
        return ClinicalTrialsClient().studies(query, min(page_size, 1000), status=status)
    except Exception as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get("/trials/{nct_id}")
def trial(nct_id: str):
    try:
        return ClinicalTrialsClient().study(nct_id)
    except Exception as exc:
        raise HTTPException(502, str(exc)) from exc

@router.get("/tools")
def tools():
    from ..integrations.tools import availability
    return {"tools": availability()}


# --- Compact lookups used by the web dashboard -------------------------------------------

def _clinvar_hgvs(hgvs: str) -> str:
    """ClinVar names deletions/duplications without the deleted bases (c.68_69delAG -> c.68_69del)."""
    return re.sub(r"(del|dup)[ACGT]+$", r"\1", hgvs.strip(), flags=re.I)


@router.get("/clinvar/variant")
def clinvar_variant(hgvs: str, gene: str | None = None):
    name = _clinvar_hgvs(hgvs)
    term = f'{gene}[gene] AND "{name}"[varname]' if gene else f'"{name}"'
    try:
        client = ClinVarClient()
        ids = client.search_variant(term, 10)["esearchresult"]["idlist"]
        if not ids:
            return {"found": False, "term": term}
        summary = client.summarize(ids)["result"]
    except Exception as exc:
        raise HTTPException(502, str(exc)) from exc
    docs = [summary[i] for i in ids if i in summary]
    doc = next((d for d in docs if name.lower() in d.get("title", "").lower()), docs[0])
    gc = doc.get("germline_classification") or {}
    vs = (doc.get("variation_set") or [{}])[0]
    xrefs = vs.get("variation_xrefs") or []
    freqs = [f for f in vs.get("allele_freq_set") or [] if "gnomAD" in f.get("source", "")]
    return {
        "found": True,
        "uid": doc.get("uid"),
        "accession": doc.get("accession"),
        "title": doc.get("title"),
        "genes": [g.get("symbol") for g in doc.get("genes") or []],
        "protein_change": doc.get("protein_change"),
        "variant_type": doc.get("obj_type"),
        "classification": gc.get("description"),
        "review_status": gc.get("review_status"),
        "last_evaluated": gc.get("last_evaluated"),
        "traits": [t.get("trait_name") for t in gc.get("trait_set") or []],
        "dbsnp": next((f"rs{x['db_id']}" for x in xrefs if x.get("db_source") == "dbSNP"), None),
        "gnomad_frequency": freqs[0]["value"] if freqs else None,
        "url": f"https://www.ncbi.nlm.nih.gov/clinvar/variation/{doc.get('uid')}/",
    }


@router.get("/vep")
def vep(hgvs: str | None = None, chrom: str | None = None, pos: int | None = None, ref: str | None = None,
        alt: str | None = None, assembly: str = "GRCh38"):
    if not hgvs and not (chrom and pos and ref and alt):
        raise HTTPException(400, "hgvs_or_vcf_coordinates_required")
    line = f"{chrom.replace('chr', '')} {pos} . {ref} {alt} . . ." if not hgvs else None
    try:
        rec = EnsemblClient(assembly).vep_annotate(hgvs=hgvs, vcf_line=line)[0]
    except Exception as exc:
        raise HTTPException(502, str(exc)) from exc
    tcs = rec.get("transcript_consequences") or []
    tc = next((t for t in tcs if t.get("mane_select")), None) or next((t for t in tcs if t.get("canonical")), None) or (tcs[0] if tcs else {})
    am = tc.get("alphamissense") or {}
    vcf = rec.get("vcf_string")
    return {
        "input": rec.get("input"),
        "assembly": rec.get("assembly_name"),
        "most_severe_consequence": rec.get("most_severe_consequence"),
        "vcf_string": vcf[0] if isinstance(vcf, list) else vcf,
        "rsids": [c["id"] for c in rec.get("colocated_variants") or [] if str(c.get("id", "")).startswith("rs")],
        "gene": tc.get("gene_symbol"),
        "transcript": tc.get("transcript_id"),
        "mane": tc.get("mane_select"),
        "impact": tc.get("impact"),
        "consequences": tc.get("consequence_terms") or [],
        "hgvsc": tc.get("hgvsc"),
        "hgvsp": tc.get("hgvsp"),
        "protein_start": tc.get("protein_start"),
        "amino_acids": tc.get("amino_acids"),
        "alphamissense": {"score": am.get("am_pathogenicity"), "class": am.get("am_class")} if am else None,
    }


@router.get("/gnomad/variant")
def gnomad_variant(variant_id: str, dataset: str = "gnomad_r4"):
    query = "query($id:String!,$ds:DatasetId!){variant(variantId:$id,dataset:$ds){variant_id rsids exome{ac an af} genome{ac an af}}}"
    try:
        data = GnomADClient().query(query, {"id": variant_id, "ds": dataset})
    except ExternalAPIError as exc:
        if "not found" in str(exc).lower():
            return {"found": False, "variant_id": variant_id, "dataset": dataset}
        raise HTTPException(502, str(exc)) from exc
    v = data.get("variant")
    return {"found": bool(v), "dataset": dataset, **(v or {"variant_id": variant_id})}


@router.get("/pubmed/articles")
def pubmed_articles(term: str, retmax: int = 10):
    try:
        client = NCBIClient()
        found = client.pubmed_search(term, min(retmax, 50))["esearchresult"]
        ids = found.get("idlist", [])
        summary = client.esummary("pubmed", ids)["result"] if ids else {}
    except Exception as exc:
        raise HTTPException(502, str(exc)) from exc
    articles = [{"pmid": i, "title": summary[i].get("title"), "journal": summary[i].get("source"),
                 "year": (summary[i].get("pubdate") or "")[:4], "url": f"https://pubmed.ncbi.nlm.nih.gov/{i}/"}
                for i in ids if i in summary]
    return {"term": term, "count": int(found.get("count", 0)), "articles": articles}


_STATUS_CACHE: dict = {}


def _ping(resource: dict) -> dict:
    checks = {
        "clinvar": lambda: NCBIClient().esearch("clinvar", "BRCA1[gene]", 0),
        "pubmed": lambda: NCBIClient().pubmed_search("BRCA1", 0),
        "ensembl": lambda: EnsemblClient().get("info/ping"),
        "gnomad": lambda: GnomADClient().query("{__typename}"),
        "clinicaltrials": lambda: ClinicalTrialsClient().version(),
        "hpo": lambda: httpx.head(HPOClient().base_url, follow_redirects=True, timeout=8).raise_for_status(),
    }
    out = {**resource, "connected": False, "latency_ms": None, "error": None}
    check = checks.get(resource["id"])
    if not check:
        out["error"] = resource["access"]
        return out
    start = time.perf_counter()
    try:
        check()
        out["connected"] = True
    except Exception as exc:
        out["error"] = str(exc)[:200]
    out["latency_ms"] = round((time.perf_counter() - start) * 1000)
    return out


@router.get("/status")
def status(refresh: bool = False):
    """Live reachability of each registered resource; licensed resources report their access requirement."""
    if not refresh and _STATUS_CACHE.get("at", 0) > time.time() - 60:
        return _STATUS_CACHE["data"]
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(_ping, all_resources()))
    data = {"checked_at": time.time(), "resources": results}
    _STATUS_CACHE.update(at=time.time(), data=data)
    return data
