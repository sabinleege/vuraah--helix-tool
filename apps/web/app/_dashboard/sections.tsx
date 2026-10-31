'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from './icons';
import { TrialsTable } from './panels';
import { API, Trial, ago, api, pretty, toTrial } from './api';

export type View = 'home' | 'patients' | 'reports' | 'trials' | 'literature' | 'sources' | 'agents' | 'settings';

export const SECTIONS: { id: View; label: string; icon: string; blurb: string }[] = [
  { id: 'home', label: 'New Analysis', icon: 'chat', blurb: 'Ask Helix about a variant' },
  { id: 'patients', label: 'Patients', icon: 'users', blurb: 'Every case with its patient, variant and status' },
  { id: 'reports', label: 'Reports', icon: 'file', blurb: 'Clinical reports waiting for review or signed off' },
  { id: 'trials', label: 'Clinical Trials', icon: 'clipboard', blurb: 'Search open studies on ClinicalTrials.gov' },
  { id: 'literature', label: 'Literature', icon: 'book', blurb: 'Search PubMed for genes, variants and conditions' },
  { id: 'sources', label: 'Data Sources', icon: 'db', blurb: 'Live connection status of every database and model' },
  { id: 'agents', label: 'Agents', icon: 'bot', blurb: 'The seven Helix agents and what each one does' },
  { id: 'settings', label: 'Settings', icon: 'settings', blurb: 'Account, API connection, platform metrics and audit log' },
];

function Header({ view, children }: { view: View; children?: React.ReactNode }) {
  const s = SECTIONS.find(x => x.id === view)!;
  return (
    <div className="hx-view-head">
      <span className="hx-conv-icon sm"><Icon name={s.icon} size={20} /></span>
      <div><h2>{s.label}</h2><small>{s.blurb}</small></div>
      <span className="hx-grow" />{children}
    </div>
  );
}

const parse = (x: any) => { try { return typeof x === 'string' ? JSON.parse(x) : x; } catch { return null; } };

function Loading({ error }: { error?: string }) {
  return error ? <p className="hx-error"><Icon name="alert" size={16} />{error}</p> : <p className="hx-dim hx-pulse">Loading…</p>;
}

function PatientsView({ openCase }: { openCase: (id: string) => void }) {
  const [cases, setCases] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { api('/cases').then(setCases).catch(e => setErr(e.message)); }, []);
  const rows = (cases || []).map(c => ({ ...c, subj: parse(c.subject) || {}, v: parse(c.variants)?.[0] || {}, phen: parse(c.phenotypes) || [] }))
    .filter(c => !q || `${c.title} ${c.subj.name} ${c.v.gene} ${c.v.hgvs}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Header view="patients"><input className="hx-input slim" placeholder="Filter by name, gene, variant…" value={q} onChange={e => setQ(e.target.value)} /></Header>
      {!cases ? <Loading error={err} /> : rows.length === 0 ? <p className="hx-dim">No cases yet. Start a new analysis to create one.</p> : (
        <section className="hx-card"><div className="hx-table-wrap"><table className="hx-table click">
          <thead><tr><th>Patient</th><th>Age / Sex</th><th>Variant</th><th>Phenotypes</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>{rows.map(c => (
            <tr key={c.id} onClick={() => openCase(c.id)}>
              <td><b>{c.subj.name || 'Unnamed'}</b><small>{c.title}</small></td>
              <td>{[c.subj.age, c.subj.sex].filter(Boolean).join(' / ') || '—'}</td>
              <td>{c.v.gene ? `${c.v.gene} ${c.v.hgvs || ''}` : '—'}</td>
              <td>{c.phen.join(', ') || c.subj.conditions || '—'}</td>
              <td><span className="hx-status info">{pretty(c.status)}</span></td>
              <td>{ago(c.updated_at)}</td>
            </tr>))}
          </tbody></table></div></section>)}
    </>
  );
}

function ReportsView({ openCase }: { openCase: (id: string, tab?: 'report') => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    api('/cases').then(async (cases: any[]) => {
      const lists = await Promise.all(cases.map(c => api(`/reports/${c.id}`).then((rs: any[]) => rs.map(r => ({ ...r, caseTitle: c.title, subj: parse(c.subject) || {} })))));
      setRows(lists.flat().sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }).catch(e => setErr(e.message));
  }, []);
  const shown = (rows || []).filter(r => filter === 'all' || r.status === filter);
  const count = (s: string) => (rows || []).filter(r => r.status === s).length;
  return (
    <>
      <Header view="reports">
        <div className="hx-seg">{[['all', 'All'], ['pending_review', `Pending (${count('pending_review')})`], ['approved', `Approved (${count('approved')})`], ['changes_requested', 'Changes'], ['rejected', 'Rejected']].map(([id, l]) => (
          <button key={id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{l}</button>))}</div>
      </Header>
      {!rows ? <Loading error={err} /> : shown.length === 0 ? <p className="hx-dim">No reports in this list.</p> : (
        <div className="hx-list">{shown.map(r => (
          <button key={r.id} className="hx-list-item" onClick={() => openCase(r.case_id, 'report')}>
            <span className="hx-dot blue"><Icon name="file" size={15} /></span>
            <span><b>{r.caseTitle}</b><small>{r.subj.name ? `${r.subj.name} · ` : ''}Report {r.id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}</small></span>
            <span className={`hx-status ${r.status === 'approved' ? 'good' : r.status === 'rejected' ? 'bad' : 'warn'}`}>{pretty(r.status)}</span>
            <Icon name="chevron" size={16} />
          </button>))}</div>)}
    </>
  );
}

function TrialsView({ initial }: { initial: string }) {
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(true);
  const [res, setRes] = useState<Trial[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function search(term = q) {
    if (!term.trim()) return;
    setBusy(true); setErr('');
    try {
      const st = open ? `&status=${encodeURIComponent('RECRUITING|NOT_YET_RECRUITING|ACTIVE_NOT_RECRUITING')}` : '';
      const r = await api(`/integrations/trials?page_size=50&query=${encodeURIComponent(term)}${st}`);
      setRes((r.studies || []).map(toTrial));
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  useEffect(() => { if (initial) search(initial); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Header view="trials" />
      <form className="hx-searchrow" onSubmit={e => { e.preventDefault(); search(); }}>
        <Icon name="search" size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Gene, condition or drug — e.g. BRCA1, triple negative breast cancer, olaparib" />
        <label className="hx-check"><input type="checkbox" checked={open} onChange={e => setOpen(e.target.checked)} />Open studies only</label>
        <button className="hx-btn primary" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
      </form>
      {err && <p className="hx-error"><Icon name="alert" size={16} />{err}</p>}
      {res && <section className="hx-card"><p className="hx-dim small">{res.length} studies from ClinicalTrials.gov</p><TrialsTable trials={res} /></section>}
    </>
  );
}

function LiteratureView({ initial }: { initial: string }) {
  const [q, setQ] = useState(initial);
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function search(term = q) {
    if (!term.trim()) return;
    setBusy(true); setErr('');
    try { setRes(await api(`/integrations/pubmed/articles?retmax=25&term=${encodeURIComponent(term)}`)); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  useEffect(() => { if (initial) search(initial); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Header view="literature" />
      <form className="hx-searchrow" onSubmit={e => { e.preventDefault(); search(); }}>
        <Icon name="search" size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. BRCA1 c.68_69del, CYP2C19 clopidogrel, Lynch syndrome" />
        <button className="hx-btn primary" disabled={busy}>{busy ? 'Searching…' : 'Search PubMed'}</button>
      </form>
      {err && <p className="hx-error"><Icon name="alert" size={16} />{err}</p>}
      {res && <section className="hx-card">
        <p className="hx-dim small">{res.count.toLocaleString()} PubMed records · showing the newest {res.articles.length}</p>
        <ul className="hx-articles">{res.articles.map((a: any) => (
          <li key={a.pmid}><a href={a.url} target="_blank" rel="noreferrer">{a.title}</a><small>{a.journal} · {a.year} · PMID {a.pmid}</small></li>))}</ul>
      </section>}
    </>
  );
}

export function sourceState(r: any): [string, string] {
  if (r.connected) return ['good', 'Connected'];
  if (r.access === 'license_required') return ['warn', 'License required'];
  if (r.access === 'terms_required') return ['warn', 'Terms required'];
  return ['bad', 'Unreachable'];
}

function SourcesView({ sources, refresh, busy }: { sources: any[] | null; refresh: () => void; busy: boolean }) {
  const [tools, setTools] = useState<any[] | null>(null);
  useEffect(() => { api('/integrations/tools').then(d => setTools(d.tools)).catch(() => setTools([])); }, []);
  const up = (sources || []).filter(s => s.connected).length;
  return (
    <>
      <Header view="sources"><button className="hx-btn" onClick={refresh} disabled={busy}><Icon name="refresh" size={15} className={busy ? 'hx-rot' : ''} />{busy ? 'Checking…' : 'Re-check'}</button></Header>
      {!sources ? <Loading /> : <>
        <p className="hx-dim">{up} of {sources.length} sources connected. Licensed models need credentials or weights configured before Helix can use them.</p>
        <div className="hx-cards">{sources.map(r => {
          const [cls, label] = sourceState(r);
          return (
            <section key={r.id} className="hx-card">
              <div className="hx-card-top"><h3>{r.name}</h3><span className={`hx-status ${cls}`}>{label}</span></div>
              <p className="hx-dim small">{r.role}</p>
              <div className="hx-kvs tight">
                <div className="hx-kv"><span>Type</span><span>{r.kind}</span></div>
                <div className="hx-kv"><span>Terms</span><span>{r.license_or_terms}</span></div>
                {r.latency_ms != null && <div className="hx-kv"><span>Latency</span><span>{r.latency_ms} ms</span></div>}
              </div>
              <a className="hx-link" href={r.endpoint} target="_blank" rel="noreferrer">{r.endpoint.replace(/^https?:\/\//, '')} <Icon name="arrow" size={12} /></a>
            </section>);
        })}</div>
      </>}
      <h3 className="hx-h">Local bioinformatics tools</h3>
      {!tools ? <Loading /> : <section className="hx-card"><div className="hx-table-wrap"><table className="hx-table">
        <thead><tr><th>Tool</th><th>Purpose</th><th>Needed for</th><th>Status</th></tr></thead>
        <tbody>{tools.map(t => (
          <tr key={t.id}><td><a href={t.install} target="_blank" rel="noreferrer">{t.id}</a></td><td>{t.purpose}</td><td>{t.required_for}</td>
            <td><span className={`hx-status ${t.available ? 'good' : 'warn'}`}>{t.available ? 'Installed' : 'Not installed'}</span></td></tr>))}
        </tbody></table></div></section>}
    </>
  );
}

const AGENT_ICON: Record<string, string> = { diagnose: 'scan', manage: 'activity', engineer: 'flask', pharmacogenomics: 'pill', oncology: 'shield', reproductive: 'users', trial_match: 'clipboard' };

function AgentsView({ go }: { go: (v: View) => void }) {
  const [agents, setAgents] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/agents').then(setAgents).catch(e => setErr(e.message)); }, []);
  return (
    <>
      <Header view="agents" />
      {!agents ? <Loading error={err} /> : <div className="hx-cards">{agents.map(a => (
        <section key={a.id} className="hx-card hx-agent">
          <span className="hx-dot indigo lg"><Icon name={AGENT_ICON[a.id] || 'bot'} size={20} /></span>
          <h3>{a.name}</h3><p className="hx-dim small">{a.description}</p>
          {a.id === 'diagnose' ? <button className="hx-btn primary" onClick={() => go('home')}>Use in chat</button>
            : a.id === 'trial_match' ? <button className="hx-btn" onClick={() => go('trials')}>Search trials</button>
              : <Link className="hx-btn" href={`/agents/${a.id}`}>Open workspace</Link>}
        </section>))}</div>}
    </>
  );
}

function SettingsView({ user, health, metrics }: { user: any; health: string; metrics: Record<string, number> | null }) {
  const [audit, setAudit] = useState<any[] | null>(null);
  useEffect(() => { api('/audit').then(a => setAudit(Array.isArray(a) ? a.slice(0, 20) : [])).catch(() => setAudit([])); }, []);
  return (
    <>
      <Header view="settings" />
      <div className="hx-grid2">
        <section className="hx-card"><h3>Account</h3><div className="hx-kvs tight">
          <div className="hx-kv"><span>Name</span><span>{user?.display_name || '—'}</span></div>
          <div className="hx-kv"><span>Email</span><span>{user?.email || '—'}</span></div>
          <div className="hx-kv"><span>Role</span><span>{pretty(user?.role) || '—'}</span></div>
          <div className="hx-kv"><span>Organization</span><span>{user?.org_id || '—'}</span></div>
        </div></section>
        <section className="hx-card"><h3>API connection</h3><div className="hx-kvs tight">
          <div className="hx-kv"><span>Endpoint</span><span><code>{API}</code></span></div>
          <div className="hx-kv"><span>Status</span><span className={health === 'online' ? 'good' : 'bad'}>{health}</span></div>
          <div className="hx-kv"><span>Change it</span><span>Set <code>NEXT_PUBLIC_API_URL</code> and restart the web app</span></div>
        </div></section>
      </div>
      <h3 className="hx-h">Platform metrics</h3>
      {metrics ? <div className="hx-metrics wide">{Object.entries(metrics).map(([k, n]) => <div key={k}><b>{n}</b><small>{pretty(k)}</small></div>)}</div> : <Loading />}
      <h3 className="hx-h">Recent audit events</h3>
      {!audit ? <Loading /> : <section className="hx-card"><div className="hx-table-wrap"><table className="hx-table">
        <thead><tr><th>Event</th><th>Case</th><th>When</th></tr></thead>
        <tbody>{audit.map(a => <tr key={a.id}><td>{pretty(a.event_type)}</td><td>{a.case_id?.slice(0, 8) || '—'}</td><td>{ago(a.created_at)}</td></tr>)}</tbody>
      </table></div></section>}
    </>
  );
}

export function Section(props: {
  view: View; openCase: (id: string, tab?: 'report') => void; go: (v: View) => void; gene: string;
  sources: any[] | null; refreshSources: () => void; sourcesBusy: boolean; user: any; health: string; metrics: Record<string, number> | null;
}) {
  const { view } = props;
  return (
    <div className="hx-view">
      {view === 'patients' && <PatientsView openCase={props.openCase} />}
      {view === 'reports' && <ReportsView openCase={props.openCase} />}
      {view === 'trials' && <TrialsView initial={props.gene} />}
      {view === 'literature' && <LiteratureView initial={props.gene} />}
      {view === 'sources' && <SourcesView sources={props.sources} refresh={props.refreshSources} busy={props.sourcesBusy} />}
      {view === 'agents' && <AgentsView go={props.go} />}
      {view === 'settings' && <SettingsView user={props.user} health={props.health} metrics={props.metrics} />}
    </div>
  );
}
