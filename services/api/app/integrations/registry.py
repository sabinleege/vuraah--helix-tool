from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class ThirdPartyResource:
    id: str
    name: str
    kind: str
    role: str
    access: str
    endpoint: str
    license_or_terms: str
    status: str = "adapter_implemented"
    notes: str = ""


RESOURCES = [
    ThirdPartyResource("clinvar", "NCBI ClinVar", "dataset/api", "clinical variant assertions", "public", "https://www.ncbi.nlm.nih.gov/clinvar/", "NCBI data-use terms", notes="Weekly release; E-utilities and downloads."),
    ThirdPartyResource("ensembl", "Ensembl REST/VEP", "api", "normalization and consequence annotation", "public", "https://rest.ensembl.org/", "Ensembl terms", notes="GRCh37 endpoint is separate."),
    ThirdPartyResource("gnomad", "gnomAD", "dataset/api", "population frequency", "public", "https://gnomad.broadinstitute.org/", "Broad/gnomAD terms", notes="GraphQL endpoint configured by environment."),
    ThirdPartyResource("hpo", "Human Phenotype Ontology", "dataset", "phenotype ontology and annotations", "public", "https://purl.obolibrary.org/obo/hp.obo", "HPO/OBO terms", notes="Pin release versions for reproducibility."),
    ThirdPartyResource("clinpgx", "ClinPGx / CPIC / PharmGKB", "api/dataset", "pharmacogenomics annotations and guidelines", "terms_required", "https://api.pharmgkb.org/", "ClinPGx/CPIC/PharmGKB terms", notes="Access/redistribution rules must be reviewed before production."),
    ThirdPartyResource("clinicaltrials", "ClinicalTrials.gov", "api/dataset", "trial discovery and eligibility data", "public", "https://clinicaltrials.gov/api/v2/", "ClinicalTrials.gov terms", notes="API data refreshed daily on weekdays."),
    ThirdPartyResource("pubmed", "NCBI PubMed/PMC", "api/dataset", "biomedical literature", "public", "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/", "NCBI terms", notes="Respect NCBI rate limits and identify tool/email."),
    ThirdPartyResource("alphamissense", "AlphaMissense", "dataset/model", "missense pathogenicity scores", "license_required", "https://github.com/google-deepmind/alphamissense", "CC BY 4.0 for predictions; code Apache-2.0", notes="Weights are not released; use precomputed predictions/VEP integration."),
    ThirdPartyResource("esm", "EvolutionaryScale ESM", "model", "protein representation/effect modeling", "license_required", "https://github.com/evolutionaryscale/esm", "Model-specific license", notes="Weights/API access depend on selected checkpoint/service."),
    ThirdPartyResource("evo2", "Arc Institute Evo 2", "model/dataset", "DNA sequence modeling", "license_required", "https://github.com/ArcInstitute/evo2", "Repository/model-specific terms", notes="GPU-heavy; hosted NVIDIA API or self-hosted checkpoints."),
    ThirdPartyResource("enformer", "Enformer", "model", "regulatory effect prediction", "license_required", "https://github.com/deepmind/deepmind-research", "Repository/model-specific terms", notes="Can also be accessed through Ensembl VEP where enabled."),
]


def all_resources() -> list[dict]:
    return [asdict(x) for x in RESOURCES]
