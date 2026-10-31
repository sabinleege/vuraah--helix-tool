from pydantic import BaseModel, Field
from typing import Any, Optional, Literal
class Variant(BaseModel):
    assembly:str='GRCh38'; chrom:str=''; pos:int=0; ref:str=''; alt:str=''; hgvs:str=''; gene:str=''; transcript:str=''; consequence:str=''; phenotype_associations:list[str]=[]; criteria:dict[str,Any]={}; metadata:dict[str,Any]={}
class CaseCreate(BaseModel): title:str; mode:Literal['clinical','research','consumer']='clinical'; subject:dict[str,Any]={}; phenotypes:list[str]=[]; variants:list[Variant]=[]
class AnalysisCreate(BaseModel): case_id:str; agent:str; input:dict[str,Any]={}; user_id:str='user-demo'
class ConsentCreate(BaseModel): subject_id:str; agent:str; purpose:str; data_categories:list[str]; expires_at:Optional[str]=None; version:str='1.0'
class ReviewCreate(BaseModel): reviewer_id:str='user-demo'; decision:Literal['approve','reject','request_changes']; notes:str=''
class EvidenceCreate(BaseModel): source:str; title:str; content:str; entity_type:str='variant'; entity_id:str=''; quality:float=0.5; metadata:dict[str,Any]={}
class ModelCreate(BaseModel): id:str; name:str; version:str; task:str; provider:str='local'; status:str='registered'; metrics:dict[str,Any]={}
