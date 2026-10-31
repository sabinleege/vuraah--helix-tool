PATH=['PVS1','PS1','PS2','PS3','PS4','PM1','PM2','PM3','PM4','PM5','PM6','PP1','PP3','PP4']; BENIGN=['BA1','BS1','BS2','BS3','BS4','BP1','BP2','BP3','BP4','BP5','BP6','BP7']
def acmg_classify(v):
 c=v.get('criteria',{}) or {}; active={k:bool(c.get(k)) for k in PATH+BENIGN}; strong=sum(active[k] for k in ['PVS1','PS1','PS2','PS3','PS4']); moderate=sum(active[k] for k in ['PM1','PM2','PM3','PM4','PM5','PM6']); supporting=sum(active[k] for k in ['PP1','PP3','PP4']); benign=sum(active[k] for k in BENIGN)
 if active['BA1'] or benign>=2: cls='benign'
 elif strong>=1 and (moderate>=1 or supporting>=1) or strong>=2 or moderate>=3: cls='pathogenic'
 elif moderate>=1 or supporting>=1: cls='uncertain_significance'
 else: cls='uncertain_significance'
 return {'classification':cls,'criteria':active,'counts':{'strong':strong,'moderate':moderate,'supporting':supporting,'benign':benign},'engine':'helix-acmg-v2'}
