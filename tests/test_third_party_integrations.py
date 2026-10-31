import json
from pathlib import Path

from services.api.app.integrations.clients import EnsemblClient, ClinVarClient, ClinicalTrialsClient, ClinPGxClient
from services.api.app.integrations.registry import all_resources


class Resp:
    status_code = 200
    text = '{}'
    def json(self):
        return {"ok": True}


def test_registry_contains_required_external_resources():
    ids = {x["id"] for x in all_resources()}
    assert {"clinvar", "ensembl", "gnomad", "hpo", "clinpgx", "clinicaltrials", "alphamissense", "evo2", "esm", "enformer"} <= ids


def test_ensembl_client_uses_documented_routes(monkeypatch):
    calls=[]
    monkeypatch.setattr("httpx.get", lambda url, **kwargs: calls.append((url, kwargs)) or Resp())
    EnsemblClient().vep_id("rs56116432")
    assert "/vep/human/id/rs56116432" in calls[0][0]


def test_clinvar_uses_entrez(monkeypatch):
    calls=[]
    monkeypatch.setattr("httpx.get", lambda url, **kwargs: calls.append((url, kwargs)) or Resp())
    ClinVarClient().search_variant("rs56116432", 1)
    assert calls[0][0].endswith("/esearch.fcgi")
    assert calls[0][1]["params"]["db"] == "clinvar"


def test_clinpgx_routes_to_data_endpoint(monkeypatch):
    calls=[]
    monkeypatch.setattr("httpx.get", lambda url, **kwargs: calls.append(url) or Resp())
    ClinPGxClient().guideline_annotations({"limit": 1})
    assert calls[0].endswith("/data/guidelineAnnotation")


def test_trials_v2_endpoint(monkeypatch):
    calls=[]
    monkeypatch.setattr("httpx.get", lambda url, **kwargs: calls.append(url) or Resp())
    ClinicalTrialsClient().version()
    assert calls[0].endswith("/version")
