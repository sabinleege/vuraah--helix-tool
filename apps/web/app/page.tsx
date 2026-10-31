'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import './dashboard.css';
import { Icon } from './_dashboard/icons';
import { Analysis, Tab, reportHtml } from './_dashboard/panels';
import { Composer } from './_dashboard/composer';
import { SECTIONS, Section, View, sourceState } from './_dashboard/sections';
import { Session, Subject, ago, api, loadSession, post, pretty, runPipeline } from './_dashboard/api';

const SUGGESTIONS: [string, string, string][] = [
  ['scan', 'Interpret a variant', 'BRCA1 c.68_69delAG'],
  ['dna', 'Look up an rsID', 'rs80357914'],
  ['globe', 'Analyze a genomic position', '17:43124027:ACT:A'],
  ['activity', 'Check a missense change', 'TP53 c.743G>A'],
];

function groupHistory(cases: any[]) {
  const d = new Date(), today = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), day = 86400000;
  const groups: [string, any[]][] = [['Today', []], ['Yesterday', []], ['Previous 7 days', []], ['Older', []]];
  for (const c of cases) {
    const t = new Date(c.updated_at).getTime();
    groups[t >= today ? 0 : t >= today - day ? 1 : t >= today - 7 * day ? 2 : 3][1].push(c);
  }
  return groups.filter(([, xs]) => xs.length);
}

function greeting(name?: string) {
  const h = new Date().getHours();
  return `${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}${name ? `, ${name.split(' ')[0]}` : ''}`;
}

export default function Home() {
  const [view, setView] = useState<View>('home');
  const [cases, setCases] = useState<any[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState<Subject>({});
  const [phen, setPhen] = useState('');
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [sources, setSources] = useState<any[] | null>(null);
  const [sourcesBusy, setSourcesBusy] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [toast, setToast] = useState('');
  const [sideOpen, setSideOpen] = useState(true);
  const [railOpen, setRailOpen] = useState(true);
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLElement>(null);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2600); };
  const mobile = () => window.innerWidth < 900;
  const refreshCases = useCallback(() => api('/cases').then(setCases).catch(() => {}), []);
  const refreshMetrics = useCallback(() => api('/system/metrics').then(setMetrics).catch(() => {}), []);
  const refreshSources = useCallback((force = false) => {
    setSourcesBusy(true);
    api(`/integrations/status${force ? '?refresh=true' : ''}`).then(d => setSources(d.resources)).catch(() => setSources([])).finally(() => setSourcesBusy(false));
  }, []);

  const go = useCallback((v: View) => {
    setView(v);
    if (v === 'home') { setSession(null); history.replaceState(null, '', '/'); setTimeout(() => inputRef.current?.focus(), 0); }
    else history.replaceState(null, '', `?view=${v}`);
    if (mobile()) setSideOpen(false);
  }, []);

  const openCase = useCallback(async (id: string, t: Tab = 'overview') => {
    try {
      setSession(await loadSession(id)); setTab(t); setView('home');
      history.replaceState(null, '', `?case=${id}`);
      if (mobile()) setSideOpen(false);
    } catch (e: any) { flash(`Could not open case: ${e.message}`); }
  }, []);

  useEffect(() => {
    if (mobile()) { setSideOpen(false); setRailOpen(false); }
    api('/health').then(() => setHealth('online')).catch(() => setHealth('offline'));
    refreshCases(); refreshMetrics(); refreshSources();
    api('/users').then(u => setUser(u.find((x: any) => x.id === 'user-demo') || u[0])).catch(() => {});
    const qs = new URLSearchParams(location.search);
    const id = qs.get('case'), v = qs.get('view') as View | null;
    if (id) openCase(id); else if (v && SECTIONS.some(s => s.id === v)) setView(v);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSideOpen(true); setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCase, refreshCases, refreshMetrics, refreshSources]);

  async function analyze(text = prompt, f = file) {
    if (busy || (!text.trim() && !f)) return;
    setBusy(true); setTab('overview'); setView('home');
    if (!mobile()) setRailOpen(true);
    scrollRef.current?.scrollTo({ top: 0 });
    try {
      const phenotypes = phen.split(',').map(x => x.trim()).filter(Boolean);
      const id = await runPipeline({ prompt: text.trim() || `Analyze ${f?.name}`, file: f, subject, phenotypes }, setSession);
      if (id) history.replaceState(null, '', `?case=${id}`);
      setPrompt(''); setFile(null);
      refreshCases(); refreshMetrics();
    } catch (e: any) { flash(e.message); } finally { setBusy(false); }
  }

  async function review(decision: string, notes: string) {
    if (!session?.report) return;
    const r = await post(`/reports/${session.report.id}/review`, { decision, notes });
    setSession(s => s && { ...s, report: r }); flash(`Report ${pretty(r.status)}`); refreshMetrics();
  }

  function printReport() {
    if (!session) return;
    const w = window.open('', '_blank');
    if (!w) return flash('Allow pop-ups to print the report');
    w.document.write(reportHtml(session)); w.document.close();
  }

  function exportJson() {
    if (!session) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' }));
    a.download = `${session.title.replace(/\W+/g, '_')}_${session.caseId || 'draft'}.json`; a.click();
    URL.revokeObjectURL(a.href);
  }

  async function share() {
    if (!session?.caseId) return;
    const url = `${location.origin}/?case=${session.caseId}`;
    try { await navigator.clipboard.writeText(url); flash('Link copied'); } catch { flash(url); }
  }

  function attach(f: File | null) {
    setFile(f);
    if (f && !prompt.trim()) setPrompt('Analyze the variant in this VCF with clinical interpretation, evidence and relevant trials.');
    inputRef.current?.focus();
  }

  const s = view === 'home' ? session : null;
  const v = s?.lookups.vep, cv = s?.lookups.clinvar;
  const gene = v?.gene || cv?.genes?.[0] || s?.variant.gene || session?.lookups.vep?.gene || '';
  const statusLabel = !s ? '' : s.error ? 'Needs input' : s.done ? (s.result?.status === 'completed' ? 'Complete' : 'Finished with errors') : 'Running';
  const showRail = !!s && railOpen;
  const history_ = groupHistory(cases.filter(c => !filter || `${c.title} ${c.variants} ${c.subject}`.toLowerCase().includes(filter.toLowerCase())));
  const composerProps = { value: prompt, onChange: setPrompt, onSubmit: () => analyze(), file, onFile: attach, busy, subject, setSubject, phen, setPhen, inputRef };

  return (
    <div className={`hx ${sideOpen ? '' : 'side-closed'} ${showRail ? 'with-rail' : ''}`}>
      {/* ── Menu bar ─────────────────────────────── */}
      <aside className="hx-side" aria-label="Main menu">
        <div className="hx-side-top">
          <button className="hx-brand" onClick={() => go('home')}><Icon name="dna" size={28} /><b>Helix</b></button>
          <button className="hx-icon-btn" onClick={() => setSideOpen(false)} aria-label="Close menu" title="Close menu"><Icon name="layers" size={18} /></button>
        </div>
        <button className="hx-new" onClick={() => go('home')}><Icon name="plus" size={17} />New analysis<kbd>Ctrl K</kbd></button>
        <label className="hx-side-search"><Icon name="search" size={15} />
          <input ref={searchRef} placeholder="Search analyses" value={filter} onChange={e => setFilter(e.target.value)} /></label>
        <nav className="hx-menu">
          {SECTIONS.filter(x => x.id !== 'home').map(x => (
            <button key={x.id} className={view === x.id ? 'on' : ''} onClick={() => go(x.id)} title={x.blurb}>
              <Icon name={x.icon} size={17} />{x.label}
              {x.id === 'patients' && cases.length > 0 && <em>{cases.length}</em>}
            </button>))}
        </nav>
        <div className="hx-history">
          {history_.length === 0 && <p className="hx-dim small pad">{filter ? 'No matching analyses.' : 'Your analyses will appear here.'}</p>}
          {history_.map(([label, xs]) => (
            <div key={label}>
              <h4>{label}</h4>
              {xs.map(c => {
                const vv = (() => { try { return JSON.parse(c.variants)[0]; } catch { return null; } })();
                return (
                  <button key={c.id} className={`hx-hist ${session?.caseId === c.id && view === 'home' ? 'on' : ''}`} onClick={() => openCase(c.id)} title={c.title}>
                    <span>{vv?.gene && vv?.hgvs ? `${vv.gene} ${vv.hgvs}` : c.title}</span><time>{ago(c.updated_at)}</time>
                  </button>);
              })}
            </div>))}
        </div>
        <div className="hx-side-foot">
          <button className="hx-sysline" onClick={() => go('sources')}>
            <span className={`hx-dot-sm ${health === 'online' ? 'good' : health === 'offline' ? 'bad' : ''}`} />
            {health === 'online' ? `API online · ${sources ? `${sources.filter(x => x.connected).length}/${sources.length} sources` : 'checking sources'}` : health === 'offline' ? 'API offline' : 'Checking…'}
          </button>
          <button className="hx-user" onClick={() => go('settings')}>
            <span className="hx-avatar blue"><Icon name="user" size={17} /></span>
            <span><b>{user?.display_name || 'Clinician'}</b><small>{pretty(user?.role) || 'clinician'}</small></span>
            <Icon name="settings" size={16} />
          </button>
        </div>
      </aside>
      {sideOpen && <div className="hx-scrim" onClick={() => setSideOpen(false)} />}

      {/* ── Center ───────────────────────────────── */}
      <div className="hx-center">
        <header className="hx-bar">
          {!sideOpen && <button className="hx-icon-btn" onClick={() => setSideOpen(true)} aria-label="Open menu" title="Open menu"><Icon name="layers" size={19} /></button>}
          {s ? <>
            <div className="hx-bar-title"><b>{s.title}</b>
              <small className={s.done ? (s.error ? 'warn' : 'good') : 'info'}>{s.done ? <Icon name="check" size={12} /> : <span className="hx-spin" />} {statusLabel} · {ago(s.startedAt)}</small></div>
            <span className="hx-grow" />
            <button className="hx-btn ghost" onClick={share} disabled={!s.caseId}><Icon name="share" size={15} /><span>Share</span></button>
            <button className="hx-btn ghost" onClick={exportJson}><Icon name="download" size={15} /><span>Export</span></button>
            <button className={`hx-btn ghost ${railOpen ? 'on' : ''}`} onClick={() => setRailOpen(x => !x)} title="Show or hide the details panel"><Icon name="layers" size={15} /><span>Details</span></button>
          </> : <><b className="hx-bar-plain">{view === 'home' ? 'Helix' : SECTIONS.find(x => x.id === view)?.label}</b><span className="hx-grow" /></>}
        </header>

        <main className="hx-scroll" ref={scrollRef}>
          {view !== 'home' ? (
            <Section view={view} openCase={openCase} go={go} gene={gene} sources={sources} refreshSources={() => refreshSources(true)}
              sourcesBusy={sourcesBusy} user={user} health={health} metrics={metrics} />
          ) : !s ? (
            <div className="hx-hero">
              <div className="hx-hero-logo"><Icon name="dna" size={34} /></div>
              <h1>{greeting(user?.display_name)}</h1>
              <p className="hx-dim">Which variant should Helix analyze?</p>
              <Composer {...composerProps} hero placeholder="Ask Helix… e.g. “Interpret BRCA1 c.68_69delAG”, an rsID, chrom:pos:ref:alt, or attach a VCF" />
              <div className="hx-suggest">
                {SUGGESTIONS.map(([icon, title, q]) => (
                  <button key={q} onClick={() => analyze(`Please analyze ${q} and provide clinical interpretation with evidence and relevant trials.`, null)}>
                    <Icon name={icon} size={18} /><b>{title}</b><small>{q}</small>
                  </button>))}
              </div>
              <div className="hx-hero-links">
                <button onClick={() => go('patients')}><Icon name="users" size={14} />{cases.length} patients</button>
                <button onClick={() => go('reports')}><Icon name="file" size={14} />{metrics?.reports ?? 0} reports</button>
                <button onClick={() => go('sources')}><Icon name="db" size={14} />{sources ? `${sources.filter(x => x.connected).length} sources connected` : 'checking sources'}</button>
              </div>
            </div>
          ) : (
            <div className="hx-thread">
              <div className="hx-msg user">
                <div className="hx-bubble">{s.prompt}</div>
                {s.file && <div className="hx-file"><Icon name="file" size={20} /><div><b>{s.file.name}</b><small>VCF · {(s.file.size / 1024).toFixed(1)} KB{s.variantsInFile != null && ` · ${s.variantsInFile} variant(s), analyzing the first`}</small></div></div>}
                {(s.subject.name || s.phenotypes.length > 0) && <small className="hx-dim">Patient: {[s.subject.name, s.subject.age && `${s.subject.age}y`, s.subject.sex, ...s.phenotypes].filter(Boolean).join(' · ')}</small>}
              </div>
              <div className="hx-msg helix">
                <span className="hx-avatar brand"><Icon name="dna" size={18} /></span>
                <div className="hx-answer">
                  <p>{s.error ? '' : s.done ? `Here is the analysis of ${gene ? `the ${gene} variant` : 'the variant'} ${v?.hgvsc?.split(':').pop() || s.variant.hgvs || s.variant.rsid || v?.vcf_string || ''}:` : 'Querying ClinVar, Ensembl VEP, gnomAD, PubMed and ClinicalTrials.gov, then running the Diagnose agent…'}</p>
                  <Analysis s={s} tab={tab} setTab={setTab} onReview={review} onPrint={printReport} />
                </div>
              </div>
            </div>
          )}
        </main>
        {view === 'home' && s && <Composer {...composerProps} placeholder="Analyze another variant…" />}
      </div>

      {/* ── Details panel (conversation only) ───── */}
      {showRail && s && (
        <aside className="hx-rail" aria-label="Analysis details">
          <div className="hx-rail-head"><b>Details</b><button className="hx-icon-btn" onClick={() => setRailOpen(false)} aria-label="Close details"><Icon name="x" size={16} /></button></div>
          <section className="hx-panel">
            <div className="hx-section-head"><b><Icon name="layers" size={15} /> Tools & agents</b></div>
            {s.steps.map(st => (
              <div key={st.id} className="hx-tool" title={st.note}>
                <span className={`hx-tool-icon ${st.status}`}><Icon name={{ parse: 'upload', clinvar: 'scan', vep: 'dna', gnomad: 'globe', pubmed: 'book', trials: 'clipboard', diagnose: 'bot' }[st.id]} size={15} /></span>
                <span><b>{st.label}</b><small className={st.status === 'error' ? 'bad' : st.status === 'done' ? 'good' : ''}>{st.source} · {st.status === 'running' ? 'running…' : st.status}{st.note && st.status !== 'running' ? ` · ${st.note}` : ''}</small></span>
                <time>{st.ms != null ? `${(st.ms / 1000).toFixed(1)}s` : ''}</time>
              </div>))}
          </section>
          <section className="hx-panel">
            <div className="hx-section-head"><b><Icon name="user" size={15} /> Patient</b></div>
            <div className="hx-kvs tight">
              <div className="hx-kv"><span>Name</span><span>{s.subject.name || 'Not recorded'}</span></div>
              <div className="hx-kv"><span>Age / Sex</span><span>{[s.subject.age && `${s.subject.age} years`, s.subject.sex].filter(Boolean).join(' · ') || '—'}</span></div>
              <div className="hx-kv"><span>Conditions</span><span>{[s.subject.conditions, ...s.phenotypes].filter(Boolean).join(', ') || '—'}</span></div>
              <div className="hx-kv"><span>Genetic profile</span><span>{gene ? `${gene} ${v?.hgvsc?.split(':').pop() || s.variant.hgvs || ''}` : '—'}</span></div>
              <div className="hx-kv"><span>Report</span><span>{s.report ? <i className={`hx-status ${s.report.status === 'approved' ? 'good' : 'warn'}`}>{pretty(s.report.status)}</i> : '—'}</span></div>
            </div>
          </section>
          <section className="hx-panel">
            <div className="hx-section-head"><b><Icon name="activity" size={15} /> Quick actions</b></div>
            <div className="hx-quick">
              <button onClick={() => setTab('trials')}><Icon name="clipboard" size={16} />Trials</button>
              <button onClick={() => setTab('literature')}><Icon name="book" size={16} />Literature</button>
              <button onClick={() => setTab('report')} disabled={!s.report}><Icon name="check" size={16} />Review report</button>
              <button onClick={printReport} disabled={!s.report}><Icon name="file" size={16} />Print / PDF</button>
              <button onClick={() => analyze(s.prompt, null)} disabled={busy}><Icon name="refresh" size={16} />Re-run</button>
              <button onClick={() => go('trials')}><Icon name="search" size={16} />Search trials</button>
            </div>
          </section>
          <section className="hx-panel">
            <div className="hx-section-head"><b><Icon name="db" size={15} /> Sources</b><button className="hx-link" onClick={() => go('sources')}>All <Icon name="arrow" size={12} /></button></div>
            {(sources || []).slice(0, 7).map(r => {
              const [cls, label] = sourceState(r);
              return <div key={r.id} className="hx-source"><span className={`hx-dot-sm ${cls}`} /><span>{r.name}</span><span className={`hx-status ${cls}`}>{label}</span></div>;
            })}
          </section>
        </aside>
      )}
      {toast && <div className="hx-toast" role="status">{toast}</div>}
    </div>
  );
}
