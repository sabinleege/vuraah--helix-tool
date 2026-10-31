from fastapi import APIRouter
from app.services.biosecurity import screen
router=APIRouter(tags=['security'])
@router.post('/biosecurity/screen')
def bio(x:dict): return screen(x.get('sequence',''))
