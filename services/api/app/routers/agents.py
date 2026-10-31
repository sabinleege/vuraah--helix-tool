from fastapi import APIRouter
router=APIRouter(tags=['agents'])
AGENTS=['diagnose','manage','engineer','pharmacogenomics','oncology','reproductive','trial-match']
@router.get('/agents')
def agents(): return [{'id':a,'status':'ready'} for a in AGENTS]
