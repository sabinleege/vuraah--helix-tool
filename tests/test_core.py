import sys;sys.path.insert(0,'services/api')
from app.services.rules import acmg_classify
from app.services.biosecurity import screen

def test_acmg_is_deterministic(): assert acmg_classify({'criteria':{'BA1':True}})['classification']=='benign'
def test_unknown_is_vus(): assert acmg_classify({'criteria':{}})['classification']=='uncertain_significance'
def test_biosecurity_does_not_return_sequence():
 r=screen('normal sequence'); assert 'sequence_returned' in r and r['sequence_returned'] is False
