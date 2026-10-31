import json, uuid
from app.db import run,q,one,now
DEFAULTS=[('alpha-missense','AlphaMissense','baseline-missense','variant-effect','adapter','available'),('esm','ESM family','adapter','protein-representation','adapter','available'),('evo2','Evo 2','adapter','dna-model','adapter','available'),('enformer','Enformer-type','adapter','regulatory-effect','adapter','available'),('helix-acmg','Helix ACMG Rules','2.0','classification','local','validated-internal'),('helix-phenotype','Helix Phenotype Ranker','1.0','phenotype-ranking','local','available')]
def seed():
 for id,n,v,t,p,s in DEFAULTS:
  if not one('SELECT 1 FROM models WHERE id=?',(id,)): run('INSERT INTO models VALUES(?,?,?,?,?,?,?,?)',(id,n,v,t,s,p,json.dumps({}),now()))
def register(x):
 run('INSERT OR REPLACE INTO models VALUES(?,?,?,?,?,?,?,?)',(x.id,x.name,x.version,x.task,x.status,x.provider,json.dumps(x.metrics),now())); return one('SELECT * FROM models WHERE id=?',(x.id,))
def list_models(): return q('SELECT * FROM models ORDER BY name,version')
