#!/usr/bin/env python3
import os
from services.api.app.integrations import ClinVarClient, EnsemblClient, ClinicalTrialsClient, ClinPGxClient

checks = [
    ("ensembl", lambda: EnsemblClient().variant("rs56116432", False, False)),
    ("clinvar", lambda: ClinVarClient().search_variant("rs56116432", 1)),
    ("clinicaltrials", lambda: ClinicalTrialsClient().version()),
    ("clinpgx", lambda: ClinPGxClient().query("clinicalAnnotation", {"limit": 1})),
]
for name, fn in checks:
    try:
        result = fn()
        print(f"OK {name}: {type(result).__name__}")
    except Exception as exc:
        print(f"UNAVAILABLE {name}: {exc}")
