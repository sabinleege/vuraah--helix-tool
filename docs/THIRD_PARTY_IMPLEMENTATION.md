# Helix Core — Third-Party Integration Completion

This release moves the previously stubbed external layer from **adapter-ready** to **implemented integration clients/configuration**.

## Implemented now

- NCBI E-utilities client for PubMed and ClinVar search/summary/fetch.
- Ensembl REST client for GRCh38 and GRCh37, variant lookup, variant recoding, VEP by ID/HGVS, and batch VEP.
- gnomAD GraphQL client with configurable endpoint and query payloads.
- HPO release registration and reproducible static-release URLs.
- ClinPGx client for clinical annotations, guideline annotations, drug labels and variant annotations. CPIC/PharmGKB content is treated as ClinPGx-managed external data.
- ClinicalTrials.gov API v2 client for version, search and individual-study retrieval.
- ESM Atlas hosted client adapter.
- NVIDIA-hosted Evo2 client adapter.
- External-tool inventory for bcftools, tabix, samtools, VEP, minimap2, SnpEff, MLflow, MinIO, Redis, Temporal, Prometheus and Grafana.
- Third-party resource registry with access/terms/status metadata.
- Public-resource bootstrap script for HPO and a manifest-driven registry for large/licensed resources.
- API endpoints under `/api/integrations/*` for external resource discovery and live calls.
- Automated tests for the integration routes and resource registry.

## Deliberately not bundled

The ZIP does **not** silently copy or redistribute large, restricted, licensed or institution-specific resources. The following remain external by design:

1. Current ClinVar release files.
2. Current gnomAD release/API access.
3. Reference genomes and indexes (GRCh37/GRCh38 FASTA, dictionaries, indexes).
4. Ensembl/VEP cache data for high-throughput offline annotation.
5. ClinPGx/CPIC/PharmGKB production data subject to their current access/terms.
6. AlphaMissense prediction files; the AlphaMissense repository states that trained weights are not released.
7. ESM checkpoints/API credentials.
8. Evo2 checkpoints/API credentials and GPU runtime.
9. Enformer model/runtime resources.
10. ClinicalTrials.gov live data, although the API client is implemented.
11. PubMed/PMC live data, although E-utilities access is implemented.
12. Hospital/EHR, wearable, biosensor, sequencing-lab and institutional credentials.

## Environment

Copy `.env.example` to the deployment environment and supply the required values. No secrets are committed.

Important production variables include:

- `NCBI_EMAIL`, optional `NCBI_API_KEY`
- `GNOMAD_ENDPOINT`
- `CLINPGX_ENDPOINT`, optional `CLINPGX_API_KEY`
- `TRIALS_ENDPOINT`
- `NVCF_RUN_KEY` for NVIDIA-hosted Evo2 if selected
- model/provider keys already defined by the platform

## External resource bootstrap

```bash
python scripts/bootstrap_third_party.py --download-public --only hpo-obo hpo-json
```

The script registers all other resources instead of pretending they are locally installed.

## Integration checks

```bash
PYTHONPATH=. python scripts/check_integrations.py
python scripts/check_tools.py
PYTHONPATH=. pytest -q
```

A provider can be unavailable during development without breaking the core platform. Production workflows should fail closed for clinical tasks when a required external evidence source is unavailable, rather than silently substituting fabricated evidence.
