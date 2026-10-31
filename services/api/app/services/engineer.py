from .biosecurity import screen
def request(sequence):
 gate=screen(sequence)
 return {'biosecurity':gate,'allowed':gate['decision'].startswith('allowed'),'research_only':True,'guides':[]}
