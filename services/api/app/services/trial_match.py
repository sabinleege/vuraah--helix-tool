def match(profile,trials):
 out=[]
 for t in trials:
  criteria=t.get('criteria',{}); hard=all(profile.get(k)==v for k,v in criteria.items())
  out.append({'trial_id':t.get('id'),'hard_eligible':hard,'reasons':[] if hard else ['one or more hard criteria did not match']})
 return out
