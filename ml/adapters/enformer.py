from .base import ModelAdapter
class EnformerAdapter(ModelAdapter):
    id='enformer'; version='adapter-1.0'
    def predict(self,inputs): return {'provider':'external/model-weights-required','status':'adapter_ready','inputs':inputs}
