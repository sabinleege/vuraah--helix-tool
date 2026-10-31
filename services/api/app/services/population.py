import os
from collections import Counter
from app.db import q
MIN=int(os.getenv('HELIX_MIN_PRIVACY_CELL','10'))
def aggregate():
 rows=q('SELECT phenotype,variant,region FROM population_observations'); groups=Counter((r['phenotype'],r['variant'],r['region']) for r in rows); return [{'phenotype':a,'variant':b,'region':c,'count':n} for (a,b,c),n in groups.items() if n>=MIN]
