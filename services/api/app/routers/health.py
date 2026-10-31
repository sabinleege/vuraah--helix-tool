from fastapi import APIRouter
router=APIRouter(tags=["health"])
@router.get('/health')
def health(): return {'status':'ok','service':'helix-core','version':'1.0.0'}
