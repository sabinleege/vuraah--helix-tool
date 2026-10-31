from app.services.audit import audit_log
from app.services.biosecurity import screen
from app.services.rules import acmg_classify

def run_analysis(x):
 if x.get('mode')=='clinical' and not x.get('consent'): return {'status':'blocked','reason':'consent_required'}
 findings=[]
 for v in x.get('variants',[]):
  findings.append({'variant':v,'acmg':acmg_classify(v),'evidence':[],'models':[]})
 result={'case_id':x['case_id'],'agent':x['agent'],'status':'completed','findings':findings,'human_review_required':x.get('mode')=='clinical','evidence_provenance_required':True}
 audit_log.write('analysis.completed',case_id=x['case_id'],agent=x['agent']); return result
