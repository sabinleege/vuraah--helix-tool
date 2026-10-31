from fastapi import APIRouter
from app.services.evidence import EvidenceEngine
router=APIRouter(tags=['evidence']); engine=EvidenceEngine()
@router.post('/evidence/search')
def search(q:dict): return engine.search(q)
