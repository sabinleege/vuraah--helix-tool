from fastapi import FastAPI,HTTPException,UploadFile,File
from fastapi.middleware.cors import CORSMiddleware
import json,uuid
from .db import init_db,run,one,q,now
from .schemas import *
from .services.audit import audit
from .services.consent import ConsentService
from .services.model_registry import seed as seed_models,register,list_models
from .services.workflows import run as run_agent
from .services.reports import create as create_report,review as review_report
from .services.evidence import EvidenceEngine
from .services.parser import parse_vcf
from .services.security import Principal,require
from .services.population import aggregate
from .services.trials import match as match_trials
from .routers.integrations import router as integrations_router

app=FastAPI(title='Helix Core API',version='2.1.0')
app.include_router(integrations_router)
app.add_middleware(CORSMiddleware,allow_origins=['*'],allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
@app.on_event('startup')
def startup(): init_db(); seed_models()
@app.get('/api/health')
def health(): return {'status':'ok','service':'helix-core-api','version':app.version}
@app.get('/api/ready')
def ready(): init_db(); return {'ready':True}
@app.get('/api/agents')
def agents(): return [{'id':x,'name':n,'description':d} for x,n,d in [('diagnose','Diagnose','Rare disease variant interpretation'),('manage','Manage','Genomic + wearable longitudinal insights'),('engineer','Engineer','Research CRISPR analysis'),('pharmacogenomics','Pharmacogenomics','Drug-gene interpretation'),('oncology','Oncology','Somatic tumor interpretation'),('reproductive','Reproductive & Family','Carrier and cascade workflows'),('trial_match','Trial Match','Structured trial eligibility matching')]]
@app.post('/api/cases')
def create_case(x:CaseCreate):
 p=Principal(); require(p,'case:write'); cid=str(uuid.uuid4()); t=now(); run('INSERT INTO cases VALUES(?,?,?,?,?,?,?,?,?,?)',(cid,p.org_id,x.title,x.mode,json.dumps(x.subject),json.dumps(x.phenotypes),json.dumps([v.model_dump() for v in x.variants]),'ready',t,t)); audit.write('case.created',case_id=cid,title=x.title); return one('SELECT * FROM cases WHERE id=?',(cid,))
@app.get('/api/cases')
def cases(): return q('SELECT * FROM cases ORDER BY updated_at DESC')
@app.get('/api/cases/{cid}')
def case(cid:str):
 r=one('SELECT * FROM cases WHERE id=?',(cid,));
 if not r: raise HTTPException(404,'case_not_found')
 r['subject']=json.loads(r['subject']); r['phenotypes']=json.loads(r['phenotypes']); r['variants']=json.loads(r['variants']); r['analyses']=q('SELECT * FROM analyses WHERE case_id=? ORDER BY created_at DESC',(cid,)); r['reports']=q('SELECT * FROM reports WHERE case_id=? ORDER BY created_at DESC',(cid,)); return r
@app.post('/api/analysis')
def analysis(x:AnalysisCreate):
 p=Principal(user_id=x.user_id); require(p,'analysis:run'); c=one('SELECT * FROM cases WHERE id=?',(x.case_id,));
 if not c: raise HTTPException(404,'case_not_found')
 payload=x.input|{'case_id':x.case_id,'mode':c['mode'],'phenotypes':json.loads(c['phenotypes']),'variants':json.loads(c['variants'])}
 aid=str(uuid.uuid4()); run('INSERT INTO analyses VALUES(?,?,?,?,?,?,?,?)',(aid,x.case_id,x.agent,'running',json.dumps(payload),json.dumps({}),now(),now()))
 result=run_agent(x.agent,payload); run('UPDATE analyses SET status=?,result_json=?,updated_at=? WHERE id=?',('completed' if result.get('status')!='blocked' else 'blocked',json.dumps(result),now(),aid)); audit.write('analysis.completed',case_id=x.case_id,agent=x.agent,analysis_id=aid,status=result.get('status')); result['analysis_id']=aid
 if result.get('status')=='completed': result['report']=create_report(x.case_id,aid,result)
 return result
@app.post('/api/upload/vcf')
async def upload_vcf(file:UploadFile=File(...)):
 text=(await file.read()).decode('utf-8','replace'); variants=parse_vcf(text); return {'filename':file.filename,'variants':variants,'count':len(variants)}
@app.get('/api/analyses/{cid}')
def analyses(cid): return q('SELECT * FROM analyses WHERE case_id=? ORDER BY created_at DESC',(cid,))
@app.get('/api/evidence')
def evidence(qry:str='',entity_type:str|None=None): return EvidenceEngine().search(qry,entity_type)
@app.post('/api/evidence')
def add_evidence(x:EvidenceCreate): return EvidenceEngine().add(x)
@app.get('/api/evidence/{entity_id}/graph')
def graph(entity_id): return EvidenceEngine().graph(entity_id)
@app.get('/api/consents')
def consents(): return ConsentService().list()
@app.post('/api/consents')
def grant(x:ConsentCreate):
 r=ConsentService().grant(x); audit.write('consent.granted',subject_id=x.subject_id,agent=x.agent); return r
@app.post('/api/consents/{cid}/revoke')
def revoke(cid): r=ConsentService().revoke(cid); audit.write('consent.revoked',consent_id=cid); return r
@app.get('/api/audit')
def audit_events(): return audit.list()
@app.get('/api/models')
def models(): return list_models()
@app.post('/api/models')
def add_model(x:ModelCreate): return register(x)
@app.get('/api/reports/{cid}')
def reports(cid): return q('SELECT * FROM reports WHERE case_id=? ORDER BY created_at DESC',(cid,))
@app.post('/api/reports/{rid}/review')
def review(rid,x:ReviewCreate):
 p=Principal(); require(p,'report:review'); r=review_report(rid,x.reviewer_id,x.decision,x.notes); audit.write('report.reviewed',case_id=r['case_id'] if r else None,decision=x.decision); return r
@app.get('/api/population/insights')
def population(): return {'minimum_cell_count':10,'results':aggregate(),'individual_outputs':False}
@app.post('/api/trials/match')
def trials(profile:dict): return {'matches':match_trials(profile),'informational_only':True}
@app.post('/api/biosecurity/screen')
def bioscreen(payload:dict):
 from .services.biosecurity import screen; return screen(str(payload))
@app.post('/api/manage/trends')
def manage_trends(events:list[dict]):
 from .services.wearables import ingest,trends; e=ingest(events); return {'events':e,'trends':trends(e),'non_diagnostic':True,'non_prescriptive':True}

@app.post('/api/auth/dev-token')
def dev_token(user_id:str='user-demo'):
    u=one('SELECT * FROM users WHERE id=?',(user_id,));
    if not u: raise HTTPException(404,'user_not_found')
    from .services.auth import issue; return {'access_token':issue(u['id'],u['org_id'],u['role']),'token_type':'bearer'}
@app.get('/api/notifications')
def notifications(): return q('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100')
@app.post('/api/notifications/{nid}/read')
def notification_read(nid): run('UPDATE notifications SET read=1 WHERE id=?',(nid,)); return one('SELECT * FROM notifications WHERE id=?',(nid,))
@app.post('/api/engineer/score')
def engineer_score(payload:dict):
    from .services.engineer_engine import score_guides; return score_guides(payload.get('target',''),payload.get('guides',[]))
@app.post('/api/pgx/interpret')
def pgx_interpret(payload:dict):
    from .services.pgx_engine import interpret; return interpret(payload.get('gene','CYP2C19'),payload.get('diplotype','*1/*1'),payload.get('drug',''))
@app.post('/api/oncology/analyze')
def oncology_endpoint(payload:dict):
    from .services.oncology_engine import analyze; return analyze(payload.get('variants',[]),payload.get('cancer_type',''))
@app.post('/api/reproductive/pedigree')
def reproductive_endpoint(payload:dict):
    from .services.reproductive_engine import pedigree; return pedigree(payload)
@app.post('/api/mlops/benchmark')
def mlops_benchmark(payload:dict):
    from .services.mlops import benchmark; return benchmark(payload.get('predictions',[]),payload.get('truths',[]))
@app.post('/api/mlops/drift')
def mlops_drift(payload:dict):
    from .services.mlops import drift; return drift(payload.get('reference',[]),payload.get('current',[]))
@app.get('/api/users')
def users(): return q('SELECT id,org_id,display_name,email,role,created_at FROM users ORDER BY created_at DESC')
@app.post('/api/users')
def create_user(payload:dict):
    uid=str(uuid.uuid4()); run('INSERT INTO users VALUES(?,?,?,?,?,?)',(uid,payload.get('org_id','org-demo'),payload.get('display_name','New User'),payload.get('email',''),payload.get('role','viewer'),now())); audit.write('user.created',user_id=uid); return one('SELECT id,org_id,display_name,email,role,created_at FROM users WHERE id=?',(uid,))
@app.get('/api/system/metrics')
def metrics():
    return {'cases':len(q('SELECT id FROM cases')),'analyses':len(q('SELECT id FROM analyses')),'reports':len(q('SELECT id FROM reports')),'evidence':len(q('SELECT id FROM evidence')),'audit_events':len(q('SELECT id FROM audits')),'models':len(q('SELECT id FROM models'))}
