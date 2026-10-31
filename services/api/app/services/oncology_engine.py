def classify(variants):
 out=[]
 for v in variants:
  consequence=v.get('consequence','').lower(); impact='high' if consequence in {'nonsense','frameshift','splice'} else ('moderate' if consequence in {'missense','inframe'} else 'unknown')
  out.append(v|{'somatic_impact':impact,'driver_status':'requires_validated_cancer_database'})
 return out
def analyze(variants,cancer_type=''):
 return {'cancer_type':cancer_type,'findings':classify(variants),'therapy_evidence':'external oncology evidence adapter required','resistance_evidence':'external oncology evidence adapter required','oncologist_review_required':True}
