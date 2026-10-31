from .base import ModelAdapter
class ESMAdapter(ModelAdapter):
    id='esm'; version='adapter-1.0'
    def predict(self,inputs): return {'provider':'external/model-weights-required','status':'adapter_ready','inputs':inputs}
