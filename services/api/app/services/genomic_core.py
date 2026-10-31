import re, hashlib
from dataclasses import dataclass,asdict
@dataclass
class VariantKnowledgeObject:
 assembly:str='GRCh38'; chrom:str=''; pos:int=0; ref:str=''; alt:str=''; hgvs:str=''; gene:str=''; transcript:str=''; consequence:str=''; population_frequency:float|None=None; clinvar:dict|None=None; phenotype_associations:list|None=None; predictions:dict|None=None; structure:dict|None=None; functional:dict|None=None; provenance:list|None=None; variant_id:str=''
 def to_dict(self): return asdict(self)
def infer_consequence(ref,alt):
 if len(ref)==len(alt)==1:return 'SNV'
 if len(ref)<len(alt):return 'insertion'
 if len(ref)>len(alt):return 'deletion'
 return 'complex'
def normalize_variant(v):
 chrom=str(v.get('chrom','')).replace('chr',''); pos=int(v.get('pos',0) or 0); ref=str(v.get('ref','')).upper(); alt=str(v.get('alt','')).upper()
 key=f"{v.get('assembly','GRCh38')}:{chrom}:{pos}:{ref}:{alt}"; vid=hashlib.sha256(key.encode()).hexdigest()[:24]
 hgvs=v.get('hgvs') or (f"g.{pos}{ref}>{alt}" if chrom and pos and len(ref)==len(alt)==1 else '')
 return VariantKnowledgeObject(assembly=v.get('assembly','GRCh38'),chrom=chrom,pos=pos,ref=ref,alt=alt,hgvs=hgvs,gene=v.get('gene',''),transcript=v.get('transcript',''),consequence=v.get('consequence') or infer_consequence(ref,alt),phenotype_associations=v.get('phenotype_associations',[]),predictions=v.get('predictions',{}),provenance=v.get('provenance',[]),variant_id=vid).to_dict()
def annotate(v):
 v=normalize_variant(v); v['annotation']={'canonical_id':v['variant_id'],'sequence_change':v['consequence'],'annotation_engine':'helix-annotation-v1'}; return v
