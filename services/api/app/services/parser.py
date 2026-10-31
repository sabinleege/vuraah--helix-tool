from .genomic_core import normalize_variant
def parse_vcf(text):
 out=[]
 for line in text.splitlines():
  if not line or line.startswith('#'): continue
  f=line.split('	')
  if len(f)>=5:
   chrom,pos,_,ref,alt=f[:5]; out.append(normalize_variant({'chrom':chrom,'pos':int(pos),'ref':ref,'alt':alt}))
 return out
def parse_input(payload):
 if isinstance(payload,str): return parse_vcf(payload)
 if isinstance(payload,dict) and 'vcf' in payload: return parse_vcf(payload['vcf'])
 return [normalize_variant(v) for v in payload.get('variants',[])] if isinstance(payload,dict) else []
