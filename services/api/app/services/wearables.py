from statistics import mean
def ingest(events): return [{'metric':e['metric'],'value':float(e['value']),'unit':e.get('unit',''),'observed_at':e['observed_at'],'source':e.get('source','unknown')} for e in events]
def trends(events):
 by={}
 for e in events: by.setdefault(e['metric'],[]).append(float(e['value']))
 return [{'metric':k,'n':len(v),'mean':mean(v) if v else 0,'delta':(v[-1]-v[0]) if len(v)>1 else 0} for k,v in by.items()]
