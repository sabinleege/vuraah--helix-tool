STAR_ALLELES={'CYP2C19':{'*1':'normal function','*2':'no function','*3':'no function','*17':'increased function'},'CYP2D6':{'*1':'normal function','*2':'normal function','*4':'no function'},'DPYD':{'normal':'normal function'},'TPMT':{'*1':'normal function','*2':'no function','*3A':'no function'},'NUDT15':{'*1':'normal function','*2':'decreased function'}}
def phenotype(gene,diplotype):
    parts=[x.strip() for x in diplotype.split('/') if x.strip()]; funcs=[STAR_ALLELES.get(gene,{}).get(x,'unknown') for x in parts]
    if any(x=='no function' for x in funcs) and funcs.count('no function')>=2:return 'poor metabolizer'
    if 'decreased function' in funcs:return 'intermediate metabolizer'
    if 'increased function' in funcs:return 'ultrarapid metabolizer'
    if all(x=='normal function' for x in funcs):return 'normal metabolizer'
    return 'unknown'
def interpret(gene,diplotype,drug=''):
    return {'gene':gene,'diplotype':diplotype,'phenotype':phenotype(gene,diplotype),'drug':drug,'guideline_status':'external CPIC/PharmGKB evidence adapter required','clinician_review_required':True}
