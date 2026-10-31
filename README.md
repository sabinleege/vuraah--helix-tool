# Helix Core

Helix Core is a genomic reasoning platform with shared evidence, model, governance and agent layers.

## Release status

The application code and internal workflow layer are implemented. The external dependency layer is also implemented: the repository now contains real clients/adapters for NCBI/ClinVar/PubMed, Ensembl/VEP, gnomAD, HPO, ClinPGx, ClinicalTrials.gov, ESM Atlas and NVIDIA Evo2, plus a manifest and health-check tooling for the remaining third-party datasets/tools.

The only material items intentionally outside this ZIP are third-party data/model artifacts, credentials, licensed resources and institution-specific integrations. See `docs/THIRD_PARTY_IMPLEMENTATION.md`.

## Run API

```bash
pip install -r requirements.txt
PYTHONPATH=. uvicorn services.api.app.main:app --reload
```

## Test

```bash
PYTHONPATH=. pytest -q
```

## External resources

```bash
python scripts/bootstrap_third_party.py --download-public --only hpo-obo hpo-json
PYTHONPATH=. python scripts/check_integrations.py
python scripts/check_tools.py
```

See `config/data/resources.json` and `config/data/third_party_tools.json` for the external dependency registry.
