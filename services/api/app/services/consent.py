import uuid
from app.db import run, one, q, now
class ConsentService:
 def grant(self,x):
  cid=str(uuid.uuid4()); run('INSERT INTO consents VALUES(?,?,?,?,?,?,?,?,?,?)',(cid,x.subject_id,x.agent,x.purpose,','.join(x.data_categories),'active',x.expires_at,x.version,now(),None)); return one('SELECT * FROM consents WHERE id=?',(cid,))
 def revoke(self,cid): run('UPDATE consents SET status="revoked",revoked_at=? WHERE id=?',(now(),cid)); return one('SELECT * FROM consents WHERE id=?',(cid,))
 def valid(self,subject,agent):
  r=one('SELECT * FROM consents WHERE subject_id=? AND agent=? AND status="active" ORDER BY created_at DESC LIMIT 1',(subject,agent)); return bool(r)
 def list(self): return q('SELECT * FROM consents ORDER BY created_at DESC')
