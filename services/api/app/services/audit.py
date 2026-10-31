import json, uuid
from app.db import run, now, q
class Audit:
 def write(self,event_type,org_id='org-demo',user_id='user-demo',case_id=None,**payload):
  run('INSERT INTO audits VALUES(?,?,?,?,?,?,?)',(str(uuid.uuid4()),org_id,event_type,user_id,case_id,json.dumps(payload),now()))
 def list(self,org_id='org-demo',limit=100): return q('SELECT * FROM audits WHERE org_id=? ORDER BY created_at DESC LIMIT ?', (org_id,limit))
audit=Audit()
