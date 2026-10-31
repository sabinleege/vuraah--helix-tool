from fastapi import APIRouter
from app.services.audit import audit_log
router=APIRouter(tags=['audit'])
@router.get('/audit')
def audit(): return audit_log.events
