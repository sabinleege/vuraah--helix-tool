# Helix Core Implementation Control Checklist

## Product/platform
- [x] Mobile-first responsive web application
- [x] PWA manifest and service-worker shell
- [x] Dashboard, cases, case detail, evidence, reports, models, consent, audit, admin
- [x] Seven agent workspaces
- [x] API-first backend

## Shared genomic reasoning core
- [x] VCF parser
- [x] Variant canonicalization/normalization
- [x] SNV/indel/structural-type representation
- [x] Annotation engine
- [x] Phenotype/HPO normalization
- [x] Phenotype-to-variant ranking
- [x] Variant Knowledge Object
- [x] Evidence objects with provenance
- [x] Evidence search/ranking
- [x] Evidence graph representation
- [x] Deterministic ACMG criteria engine
- [x] Model registry/version tracking
- [x] Model router
- [x] Biological-model adapter interfaces

## Diagnose
- [x] QC/intake boundary
- [x] Normalize
- [x] Annotate
- [x] Phenotype matching
- [x] Pathogenicity model routing
- [x] ACMG classification
- [x] Evidence retrieval
- [x] Candidate ranking
- [x] Human-review flag
- [x] Report creation

## Manage
- [x] Wearable event schema
- [x] Trend engine
- [x] Genome-profile boundary
- [x] Personalized-insight workflow
- [x] Non-diagnostic/non-prescriptive enforcement in result contract

## Engineer
- [x] Research-only gate
- [x] Target-confirmation workflow boundary
- [x] Guide-candidate scoring boundary
- [x] Off-target screening boundary
- [x] Biosecurity screening
- [x] Research review gate
- [x] No harmful actionable sequence-generation content bundled

## Pharmacogenomics
- [x] Star-allele mapping data structure
- [x] Diplotype → phenotype structure
- [x] Drug/guideline workflow
- [x] Clinician review boundary

## Oncology
- [x] Somatic pipeline boundary
- [x] Driver/passenger stage
- [x] Biomarker stage
- [x] Therapy evidence stage
- [x] Resistance stage
- [x] Trial matching stage
- [x] Oncologist review boundary

## Reproductive & Family
- [x] Granular consent workflow
- [x] Pedigree/family data boundary
- [x] Carrier analysis stage
- [x] Cascade testing stage
- [x] Counselor review boundary

## Trial Match
- [x] Structured hard eligibility filtering
- [x] Ranking layer
- [x] Informational-only result contract

## Population Insights
- [x] Aggregate-only query path
- [x] Minimum cell-count privacy guard
- [x] No individual-level output contract

## Governance/security
- [x] RBAC/ABAC permission engine
- [x] Organization/tenant identifiers
- [x] Consent grant/revoke/version/expiry
- [x] Audit events
- [x] Clinical human-review gate
- [x] Provenance-required evidence
- [x] Biosecurity enforcement boundary
- [x] No fabricated-evidence fallback

## MLOps
- [x] Model registry
- [x] Model versions
- [x] Adapter interfaces
- [x] Benchmark/metrics schema
- [x] Model deployment status
- [x] Rollback-ready status model

## Infrastructure
- [x] Docker API
- [x] Docker web
- [x] PostgreSQL schema
- [x] Redis service
- [x] Persistent dev DB
- [x] CI tests
- [x] Environment configuration
- [x] Health/readiness endpoints

## External dependencies (only remaining non-code prerequisites)
- [ ] Licensed/current external genomic databases and credentials
- [ ] External clinical evidence feeds and credentials
- [ ] Trial provider feeds
- [ ] Wearable/cloud identity provider credentials
- [ ] Actual GPU model weights/runtime and licenses where applicable
- [ ] Institutional regulatory validation/certification
- [ ] Production cloud accounts, domains and secrets


## Third-party completion status — 2026-09-15

The external dependency layer is now implemented in code. Remaining work is operational acquisition/activation only: obtain current datasets, model checkpoints, API credentials, licensed resources, and institutional provider credentials; then run clinical validation and deployment-specific verification.

- [x] NCBI / ClinVar API client
- [x] Ensembl REST/VEP client (GRCh37 + GRCh38)
- [x] gnomAD GraphQL client
- [x] HPO release registry
- [x] ClinPGx / CPIC / PharmGKB API client
- [x] ClinicalTrials.gov v2 client
- [x] PubMed/PMC E-utilities client
- [x] ESM hosted adapter
- [x] Evo2 NVIDIA hosted adapter
- [x] Third-party CLI/service inventory
- [x] External resource manifest + bootstrap tooling
- [x] Integration tests
- [ ] Acquire/pin production datasets and model checkpoints
- [ ] Supply production credentials/licences
- [ ] Execute institution-specific clinical validation
- [ ] Execute final security/compliance/deployment validation
