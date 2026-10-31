class ModelAdapter:
    id='base'; version='1.0'
    def health(self): return {'available':True,'id':self.id,'version':self.version}
    def predict(self,inputs): raise NotImplementedError
