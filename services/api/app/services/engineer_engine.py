import hashlib
from .biosecurity import screen
def score_guides(target:str, guides:list[str]):
    safety=screen(target)
    if safety['status']=='blocked': return {'status':'blocked','safety':safety,'candidates':[]}
    out=[]
    for g in guides:
        gc=(g.upper().count('G')+g.upper().count('C'))/max(1,len(g))
        seed=int(hashlib.sha256(g.encode()).hexdigest()[:8],16)/0xffffffff
        out.append({'guide':g,'gc_fraction':round(gc,3),'heuristic_on_target':round(0.5+0.45*gc,'3f'),'deterministic_tiebreak':round(seed,6)})
    return {'status':'completed','safety':safety,'research_only':True,'candidates':sorted(out,key=lambda x:(x['heuristic_on_target'],x['deterministic_tiebreak']),reverse=True)}
