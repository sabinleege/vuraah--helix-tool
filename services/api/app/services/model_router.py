from .model_registry import list_models
TASKS={'variant_effect':['alpha-missense'],'protein':['esm'],'dna':['evo2'],'regulatory':['enformer'],'classification':['helix-acmg'],'phenotype':['helix-phenotype'],'reasoning':['general-llm']}
def route(task,preferred=None):
 ids=preferred if isinstance(preferred,list) else TASKS.get(task,[]); available={x['id']:x for x in list_models()}
 if task=='classification' and 'helix-acmg' not in available:
  from .model_registry import seed; seed(); available={x['id']:x for x in list_models()}
 for i in ids:
  if i in available and available[i]['status'] not in {'blocked','retired'}: return {'model':available[i],'route':'registry'}
 return {'model':{'id':'deterministic-fallback','version':'1.0','provider':'local'},'route':'local-fallback'}
def predict(task,variant):
 r=route(task);
 if task=='variant_effect':
  # transparent heuristic fallback only; external model adapters can replace it
  deleterious=variant.get('consequence') in {'nonsense','frameshift','splice','deletion','insertion'}
  return {'model':r['model'],'score':0.9 if deleterious else 0.5,'interpretation':'high-effect heuristic' if deleterious else 'indeterminate'}
 return {'model':r['model'],'score':0.0,'interpretation':'adapter-ready'}
