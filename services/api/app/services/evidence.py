import re, uuid, json
from app.db import run,q,now
class EvidenceEngine:
 def add(self,x,org_id='org-demo'):
  eid=str(uuid.uuid4()); run('INSERT INTO evidence VALUES(?,?,?,?,?,?,?,?,?,?)',(eid,org_id,x.source,x.title,x.content,x.entity_type,x.entity_id,float(x.quality),json.dumps(x.metadata),now())); return self.get(eid)
 def get(self,eid): return next(iter(q('SELECT * FROM evidence WHERE id=?',(eid,))),None)
 def search(self,query,entity_type=None,limit=20):
  terms=re.findall(r'[A-Za-z0-9_:-]+',query.lower()); rows=q('SELECT * FROM evidence ORDER BY quality DESC,created_at DESC LIMIT 500'); scored=[]
  for r in rows:
   if entity_type and r['entity_type']!=entity_type: continue
   txt=(r['title']+' '+r['content']+' '+r['entity_id']).lower(); score=sum(txt.count(t) for t in terms)
   if score: scored.append((score,r))
  return [r|{'score':s,'provenance':{'source':r['source'],'created_at':r['created_at']}} for s,r in sorted(scored,key=lambda x:(x[0],x[1]['quality']),reverse=True)[:limit]]
 def graph(self,entity_id):
  rows=q('SELECT * FROM evidence WHERE entity_id=?',(entity_id,)); nodes=[{'id':entity_id,'type':'variant'}]; edges=[]
  for r in rows: nodes.append({'id':r['id'],'type':'evidence','label':r['title']}); edges.append({'from':entity_id,'to':r['id'],'type':'supported_by'})
  return {'nodes':nodes,'edges':edges}
