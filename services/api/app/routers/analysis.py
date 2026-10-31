from fastapi import APIRouter
from pydantic import BaseModel
from uuid import uuid4
from app.services.orchestrator import run_analysis
router=APIRouter(tags=['analysis'])
class AnalysisIn(BaseModel): case_id:str; agent:str='diagnose'; variants:list[dict]=[]; phenotype:list[str]=[]; mode:str='research'
@router.post('/analysis/run')
def run(x:AnalysisIn): return run_analysis(x.model_dump())
