import re
# Conservative screening boundary. This does not provide actionable wet-lab instructions.
WATCH_PATTERNS=[r'weapon',r'toxin',r'pathogen enhancement',r'increase virulence',r'evade detection',r'bioweapon',r'gain.of.function']
def screen(text:str):
 hits=[p for p in WATCH_PATTERNS if re.search(p,text,re.I)]
 return {'status':'blocked' if hits else 'allowed','hits':hits,'policy':'helix-biosecurity-v1','sequence_returned':False}
