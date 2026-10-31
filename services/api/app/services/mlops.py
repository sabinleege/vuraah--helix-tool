import json,statistics
def benchmark(predictions,truths):
 pairs=[(float(p),int(t)) for p,t in zip(predictions,truths)]
 if not pairs:return {'n':0}
 brier=sum((p-t)**2 for p,t in pairs)/len(pairs)
 return {'n':len(pairs),'brier':brier,'mean_prediction':statistics.mean(p for p,_ in pairs),'positive_rate':statistics.mean(t for _,t in pairs)}
def drift(reference,current):
 if not reference or not current:return {'status':'insufficient_data'}
 return {'status':'review','reference_mean':statistics.mean(reference),'current_mean':statistics.mean(current),'delta':statistics.mean(current)-statistics.mean(reference)}
