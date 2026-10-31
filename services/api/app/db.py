import os, sqlite3, json, uuid
from datetime import datetime, timezone
DB=os.getenv('HELIX_DB_PATH','./helix.db')
def now(): return datetime.now(timezone.utc).isoformat()
def conn():
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; return c
def init_db():
    c=conn();
    c.executescript("""
    CREATE TABLE IF NOT EXISTS organizations(id TEXT PRIMARY KEY,name TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,org_id TEXT,display_name TEXT NOT NULL,email TEXT,role TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY,org_id TEXT NOT NULL,title TEXT NOT NULL,mode TEXT NOT NULL,subject TEXT NOT NULL,phenotypes TEXT NOT NULL,variants TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS analyses(id TEXT PRIMARY KEY,case_id TEXT NOT NULL,agent TEXT NOT NULL,status TEXT NOT NULL,input_json TEXT NOT NULL,result_json TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS evidence(id TEXT PRIMARY KEY,org_id TEXT,source TEXT NOT NULL,title TEXT NOT NULL,content TEXT NOT NULL,entity_type TEXT,entity_id TEXT,quality REAL NOT NULL,metadata_json TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS consents(id TEXT PRIMARY KEY,subject_id TEXT NOT NULL,agent TEXT NOT NULL,purpose TEXT NOT NULL,data_categories TEXT NOT NULL,status TEXT NOT NULL,expires_at TEXT,version TEXT NOT NULL,created_at TEXT NOT NULL,revoked_at TEXT);
    CREATE TABLE IF NOT EXISTS audits(id TEXT PRIMARY KEY,org_id TEXT,event_type TEXT NOT NULL,user_id TEXT,case_id TEXT,payload TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS models(id TEXT PRIMARY KEY,name TEXT NOT NULL,version TEXT NOT NULL,task TEXT NOT NULL,status TEXT NOT NULL,provider TEXT NOT NULL,metrics_json TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,case_id TEXT NOT NULL,analysis_id TEXT NOT NULL,status TEXT NOT NULL,content_json TEXT NOT NULL,reviewer_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS trials(id TEXT PRIMARY KEY,external_id TEXT NOT NULL,title TEXT NOT NULL,status TEXT NOT NULL,criteria_json TEXT NOT NULL,metadata_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS wearable_events(id TEXT PRIMARY KEY,subject_id TEXT NOT NULL,metric TEXT NOT NULL,value REAL NOT NULL,unit TEXT NOT NULL,observed_at TEXT NOT NULL,source TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,kind TEXT NOT NULL,read INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS population_observations(id TEXT PRIMARY KEY,org_id TEXT,phenotype TEXT NOT NULL,variant TEXT,region TEXT,created_at TEXT NOT NULL);
    """);
    if not c.execute('SELECT 1 FROM organizations LIMIT 1').fetchone():
        oid='org-demo'; c.execute('INSERT INTO organizations VALUES(?,?,?)',(oid,'Helix Demo Institution',now())); c.execute('INSERT INTO users VALUES(?,?,?,?,?,?)',('user-demo',oid,'Demo Clinician','clinician@example.org','clinician',now()))
    c.commit(); c.close()
def q(sql,args=()):
    c=conn(); rows=c.execute(sql,args).fetchall(); c.close(); return [dict(r) for r in rows]
def one(sql,args=()):
    c=conn(); r=c.execute(sql,args).fetchone(); c.close(); return dict(r) if r else None
def run(sql,args=()):
    c=conn(); c.execute(sql,args); c.commit(); c.close()
