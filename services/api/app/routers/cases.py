from fastapi import APIRouter
from pydantic import BaseModel,Field
from uuid import uuid4
from datetime import datetime,timezone
router=APIRouter(tags=['cases']); CASES={}
class CaseIn(BaseModel): name:str; agent:str='diagnose'; phenotype:list[str]=[]; consent:dict={}
@router.post('/cases')
def create(c:CaseIn):
 i=str(uuid4()); CASES[i]={'id':i,**c.model_dump(),'status':'created','created_at':datetime.now(timezone.utc).isoformat()}; return CASES[i]
@router.get('/cases')
def list_cases(): return list(CASES.values())
@router.get('/cases/{case_id}')
def get_case(case_id:str): return CASES.get(case_id,{'error':'not_found'})
