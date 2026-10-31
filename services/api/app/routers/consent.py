from fastapi import APIRouter
from app.services.consent import ConsentEngine
router=APIRouter(tags=['consent']); engine=ConsentEngine()
@router.post('/consent')
def grant(x:dict): return engine.grant(x)
@router.get('/consent/{subject_id}')
def get(subject_id:str): return engine.list(subject_id)
