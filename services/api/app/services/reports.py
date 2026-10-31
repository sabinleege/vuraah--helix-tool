import json,uuid
from app.db import run,one,now
def create(case_id,analysis_id,result):
 rid=str(uuid.uuid4()); content={'title':'Helix Analysis Report','case_id':case_id,'analysis_id':analysis_id,'result':result,'disclaimer':'Decision support; qualified human review is required where applicable.','provenance_required':True}; run('INSERT INTO reports VALUES(?,?,?,?,?,?,?,?)',(rid,case_id,analysis_id,'pending_review',json.dumps(content),None,now(),now())); return one('SELECT * FROM reports WHERE id=?',(rid,))
def review(rid,reviewer,decision,notes):
 r=one('SELECT * FROM reports WHERE id=?',(rid,));
 if not r:return None
 status='approved' if decision=='approve' else ('rejected' if decision=='reject' else 'changes_requested'); c=json.loads(r['content_json']); c['review']={'reviewer':reviewer,'decision':decision,'notes':notes}; run('UPDATE reports SET status=?,reviewer_id=?,content_json=?,updated_at=? WHERE id=?',(status,reviewer,json.dumps(c),now(),rid)); return one('SELECT * FROM reports WHERE id=?',(rid,))
