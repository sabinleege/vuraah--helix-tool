from fastapi import APIRouter
from app.services.model_registry import registry
router=APIRouter(tags=['models'])
@router.get('/models')
def models(): return registry.list()
@router.post('/models/register')
def register(x:dict): return registry.register(x)
