import os, tempfile
os.environ['HELIX_DB_PATH']=os.path.join(tempfile.gettempdir(),'helix-test.db')
from app.db import init_db
init_db()
from app.services.genomic_core import normalize_variant
from app.services.rules import acmg_classify
from app.services.phenotype import normalize,match_variant
from app.services.biosecurity import screen
from app.services.model_router import route
from app.services.workflows import diagnose

def test_normalize():
 v=normalize_variant({'chrom':'chr1','pos':10,'ref':'a','alt':'g'}); assert v['chrom']=='1'; assert v['variant_id']
def test_acmg():
 assert acmg_classify({'criteria':{'BA1':True}})['classification']=='benign'
def test_phenotype():
 p=normalize(['seizures']); assert p[0]['hpo_id']=='HP:0001250'; assert match_variant({'phenotype_associations':['seizures']},p)==1
def test_safety(): assert screen('normal research request')['status']=='allowed'; assert screen('bioweapon request')['status']=='blocked'
def test_route(): assert route('classification')['model']['id']=='helix-acmg'
def test_diagnose():
 r=diagnose({'mode':'clinical','phenotypes':['seizures'],'variants':[{'chrom':'1','pos':1,'ref':'A','alt':'G','phenotype_associations':['seizures'],'criteria':{'PP3':True}}]}); assert r['status']=='completed'; assert r['human_review_required']; assert len(r['findings'])==1
