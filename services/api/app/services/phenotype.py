HPO={'seizures':'HP:0001250','developmental delay':'HP:0001263','ataxia':'HP:0001251','hearing loss':'HP:0000365','cardiomyopathy':'HP:0001638','intellectual disability':'HP:0001249','fever':'HP:0001945'}
def normalize(terms):
 out=[]
 for t in terms:
  x=t.strip().lower(); out.append({'label':t,'hpo_id':HPO.get(x,''),'normalized':x})
 return out
def match_variant(v,phenotypes):
 labels={x['normalized'] if isinstance(x,dict) else str(x).lower() for x in phenotypes}; assoc={str(x).lower() for x in v.get('phenotype_associations',[])}; return len(labels&assoc)/(max(1,len(labels)))
