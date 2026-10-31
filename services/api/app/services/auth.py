import hashlib,hmac,base64,json,time
SECRET='development-change-me'
def hash_password(password): return hashlib.sha256(password.encode()).hexdigest()
def issue(user_id,org_id,role,ttl=3600):
 payload={'sub':user_id,'org':org_id,'role':role,'exp':int(time.time())+ttl}; raw=json.dumps(payload,separators=(',',':')).encode(); sig=hmac.new(SECRET.encode(),raw,hashlib.sha256).hexdigest(); return base64.urlsafe_b64encode(raw).decode()+'.'+sig
def verify(token):
 raw,sig=token.split('.',1); data=base64.urlsafe_b64decode(raw).decode(); expected=hmac.new(SECRET.encode(),data.encode(),hashlib.sha256).hexdigest();
 if not hmac.compare_digest(sig,expected): raise ValueError('invalid_token')
 payload=json.loads(data);
 if payload['exp']<time.time(): raise ValueError('expired_token')
 return payload
