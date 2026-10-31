from dataclasses import dataclass
ROLES={'admin':{'*'},'clinician':{'case:read','case:write','analysis:run','report:review','evidence:read'},'researcher':{'case:read','analysis:run','evidence:read','research:aggregate'},'counselor':{'case:read','case:write','report:review'},'viewer':{'case:read','evidence:read'}}
@dataclass
class Principal: user_id:str='user-demo'; org_id:str='org-demo'; role:str='clinician'
def allowed(p,action): return action in ROLES.get(p.role,set()) or '*' in ROLES.get(p.role,set())
def require(p,action):
    if not allowed(p,action): raise PermissionError(f'permission_denied:{action}')
