import json
from app.db import q
def match(profile):
 rows=q('SELECT * FROM trials WHERE status="recruiting"'); out=[]
 for r in rows:
  c=json.loads(r['criteria_json']); hard=True; reasons=[]
  if c.get('disease') and profile.get('disease') not in c['disease']: hard=False; reasons.append('disease')
  if c.get('min_age') and profile.get('age',0)<c['min_age']: hard=False; reasons.append('age')
  if c.get('required_gene') and profile.get('gene') not in c['required_gene']: hard=False; reasons.append('biomarker')
  if hard: out.append({'trial':r,'match_score':1.0,'hard_eligible':True})
 return out
