def pedigree(family):
 members=family.get('members',[]) if isinstance(family,dict) else []
 return {'members':members,'relationships':family.get('relationships',[]) if isinstance(family,dict) else [],'inheritance_analysis':'requires validated family-genetics rules and counselor review'}
def carrier(variants): return {'candidate_variants':variants,'cascade_testing':'consent required for each family member','counselor_review_required':True}
