'use client';
import { useState } from 'react';
import { Icon } from './icons';
import { Session, Trial, clinvarStars, fmtAf, pretty, tone } from './api';

export type Tab = 'overview' | 'interventions' | 'trials' | 'literature' | 'report';

const Pending = ({ text = 'Waiting for source…' }: { text?: string }) => <p className="hx-dim hx-pulse">{text}</p>;

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="hx-kv"><span>{k}</span><span>{v ?? '—'}</span></div>;
}

function stepState(s: Session, id: string) {
  return s.steps.find(x => x.id === id);
}

/** Variant identity: ClinVar assertion, Helix ACMG engine result and identifiers. */
function VariantCard({ s }: { s: Session }) {
  const { clinvar, vep, gnomad } = s.lookups;
  const finding = s.result?.findings?.[0];
  const gene = vep?.gene || clinvar?.genes?.[0] || s.variant.gene;
  const hgvsc = vep?.hgvsc?.split(':').pop() || s.variant.hgvs || (s.variant.chrom ? `${s.variant.chrom}:${s.variant.pos} ${s.variant.ref}>${s.variant.alt}` : s.variant.rsid);
  const hgvsp = vep?.hgvsp?.split(':').pop() || (clinvar?.protein_change ? `p.${clinvar.protein_change}` : '');
  const t = tone(clinvar?.classification);
  const acmg = finding?.acmg;
  const met = acmg ? Object.entries(acmg.criteria).filter(([, on]) => on).map(([k]) => k) : [];
  return (
    <section className="hx-card">
      <h3>Variant Interpretation</h3>
      <div className="hx-variant-head">
        <div className={`hx-badge-icon ${t}`}><Icon name={t === 'good' ? 'check' : 'alert'} size={22} /></div>
        <div>
          <div className={`hx-gene ${t}`}>{gene || 'Unknown gene'}</div>
          <div className="hx-hgvs">{hgvsc}{hgvsp && ` (${hgvsp})`}</div>
          <div className="hx-pills">
            {clinvar?.found && <span className={`hx-pill ${t}`}>ClinVar: {clinvar.classification}</span>}
            {clinvar && !clinvar.found && <span className="hx-pill muted">Not in ClinVar</span>}
            {acmg && <span className="hx-pill outline" title="Helix deterministic ACMG engine; only criteria entered on the case are applied">
              Helix ACMG: {pretty(acmg.classification)}</span>}
          </div>
        </div>
      </div>
      <div className="hx-kvs">
        <Row k="Gene" v={gene} />
        <Row k="Transcript" v={vep?.mane || clinvar?.title?.split('(')[0] || vep?.transcript} />
        <Row k="Variant type" v={vep ? vep.consequences.map(pretty).join(', ') : clinvar?.variant_type} />
        <Row k="Impact (VEP)" v={vep?.impact} />
        <Row k="Position (GRCh38)" v={vep?.vcf_string} />
        <Row k="ACMG (Helix engine)" v={acmg ? `${pretty(acmg.classification)}${met.length ? ` (${met.join(', ')})` : ' — no criteria entered'}` : undefined} />
        <Row k="ClinVar ID" v={clinvar?.found ? <a href={clinvar.url} target="_blank" rel="noreferrer">{clinvar.accession}</a> : undefined} />
        <Row k="dbSNP ID" v={(clinvar?.dbsnp || vep?.rsids?.[0]) && <a href={`https://www.ncbi.nlm.nih.gov/snp/${clinvar?.dbsnp || vep?.rsids?.[0]}`} target="_blank" rel="noreferrer">{clinvar?.dbsnp || vep?.rsids?.[0]}</a>} />
        <Row k="Allele frequency (gnomAD)" v={gnomad ? (gnomad.found ? `${fmtAf(gnomad.exome?.af ?? gnomad.genome?.af)} (${gnomad.exome ? 'exomes' : 'genomes'})` : 'Absent') : undefined} />
      </div>
    </section>
  );
}

function EvidenceRow({ icon, cls, title, text, state }: { icon: string; cls: string; title: string; text?: React.ReactNode; state?: { status: string; note?: string } }) {
  const body = text ?? (state?.status === 'error' ? <span className="bad">Unavailable: {state.note}</span>
    : state?.status === 'skipped' ? <span className="hx-dim">Skipped: {state.note}</span> : <span className="hx-pulse">Querying…</span>);
  return <div className="hx-ev"><span className={`hx-dot ${cls}`}><Icon name={icon} size={15} /></span><div><b>{title}</b><small>{body}</small></div></div>;
}

/** Evidence summary across sources; the ring is ClinVar's own review-status star rating (0–4). */
function EvidenceCard({ s }: { s: Session }) {
  const { clinvar, gnomad, pubmed, vep } = s.lookups;
  const stars = clinvar?.found ? clinvarStars(clinvar.review_status) : 0;
  const label = ['None', 'Low', 'Moderate', 'High', 'Highest'][stars];
  return (
    <section className="hx-card">
      <div className="hx-card-top">
        <h3>Evidence Summary</h3>
        <div className="hx-ring" title={`ClinVar review status: ${clinvar?.review_status || 'n/a'}`}>
          <small>ClinVar review</small>
          <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" className="track" />
            <circle cx="18" cy="18" r="15" className="fill" strokeDasharray={`${(stars / 4) * 94.2} 94.2`} /></svg>
          <b>{stars}/4</b><em>{label}</em>
        </div>
      </div>
      <EvidenceRow icon="shield" cls="red" title="ClinVar" state={stepState(s, 'clinvar')}
        text={clinvar && (clinvar.found ? `${clinvar.classification} (${clinvar.review_status})` : 'No matching ClinVar record')} />
      <EvidenceRow icon="globe" cls="blue" title="gnomAD" state={stepState(s, 'gnomad')}
        text={gnomad && (gnomad.found ? `AF ${fmtAf(gnomad.exome?.af)} exomes · ${fmtAf(gnomad.genome?.af)} genomes` : 'Absent from gnomAD r4')} />
      <EvidenceRow icon="book" cls="teal" title="Literature" state={stepState(s, 'pubmed')}
        text={pubmed && `${pubmed.count} PubMed record${pubmed.count === 1 ? '' : 's'}`} />
      <EvidenceRow icon="user" cls="violet" title="Phenotype (HPO)"
        text={s.phenotypes.length ? s.phenotypes.join(', ') : clinvar?.traits?.length ? `ClinVar condition: ${clinvar.traits.slice(0, 2).join(', ')}` : 'No phenotypes entered'} />
      <EvidenceRow icon="activity" cls="indigo" title="Ensembl VEP" state={stepState(s, 'vep')}
        text={vep && `${pretty(vep.most_severe_consequence)} · ${vep.impact || 'n/a'} impact`} />
    </section>
  );
}

function ImplicationsCard({ s }: { s: Session }) {
  const traits: string[] = s.lookups.clinvar?.traits || [];
  return (
    <section className="hx-card">
      <h3>Clinical Context</h3>
      <ul className="hx-checks">
        {traits.slice(0, 3).map(t => <li key={t}><Icon name="check" size={15} />Associated condition (ClinVar): {t}</li>)}
        {s.result?.human_review_required && <li><Icon name="shield" size={15} />Qualified human review required before clinical use</li>}
        {s.report && <li><Icon name="file" size={15} />Report {pretty(s.report.status)}</li>}
        {!traits.length && !s.result && <li className="hx-dim">Waiting for ClinVar and the Diagnose agent…</li>}
      </ul>
    </section>
  );
}

export function TrialsTable({ trials, limit }: { trials: Trial[]; limit?: number }) {
  if (!trials.length) return <p className="hx-dim">No open trials found for this gene on ClinicalTrials.gov.</p>;
  return (
    <div className="hx-table-wrap">
      <table className="hx-table">
        <thead><tr><th>NCT ID</th><th>Title</th><th>Phase</th><th>Condition</th><th>Status</th><th>Location</th></tr></thead>
        <tbody>{trials.slice(0, limit).map(t => (
          <tr key={t.nct}>
            <td><a href={`https://clinicaltrials.gov/study/${t.nct}`} target="_blank" rel="noreferrer">{t.nct}</a></td>
            <td>{t.title}</td><td>{t.phase}</td><td>{t.conditions}</td>
            <td><span className={`hx-status ${t.status.startsWith('recruiting') ? 'good' : 'info'}`}>{t.status}</span></td>
            <td>{t.locations || '—'}</td>
          </tr>))}
        </tbody>
      </table>
    </div>
  );
}

function Overview({ s, setTab, onPrint }: { s: Session; setTab: (t: Tab) => void; onPrint: () => void }) {
  const { clinvar, vep, gnomad, pubmed, trials } = s.lookups;
  const acmg = s.result?.findings?.[0]?.acmg;
  const pred = s.result?.findings?.[0]?.prediction;
  return (
    <>
      <div className="hx-grid3">
        <section className="hx-card">
          <h3>Variant Impact</h3>
          {vep ? <>
            <div className="hx-kvs tight">
              <Row k="Consequence" v={vep.consequences.map(pretty).join(', ')} />
              <Row k="Protein position" v={vep.protein_start ? `aa ${vep.protein_start} (${vep.amino_acids})` : '—'} />
              <Row k="Protein change" v={vep.hgvsp?.split(':').pop()} />
              <Row k="AlphaMissense" v={vep.alphamissense ? `${vep.alphamissense.score} (${pretty(vep.alphamissense.class)})` : 'n/a (not missense)'} />
            </div>
            <p className="hx-sub">Predicted effect</p>
            <span className={`hx-pill ${vep.impact === 'HIGH' ? 'bad' : vep.impact === 'MODERATE' ? 'warn' : 'muted'}`}>{vep.impact} impact</span>
            {pred && <p className="hx-dim small">Helix model router: {pred.interpretation} ({pred.model?.id}, score {pred.score})</p>}
          </> : <Pending text={stepState(s, 'vep')?.status === 'error' ? `Ensembl VEP unavailable: ${stepState(s, 'vep')?.note}` : undefined} />}
        </section>
        <section className="hx-card">
          <h3>Supporting Evidence</h3>
          <ul className="hx-evlist">
            <li><b>ClinVar</b><span>{clinvar?.found ? clinvar.classification : clinvar ? 'no record' : '…'}</span><em>{clinvar?.found ? `★${clinvarStars(clinvar.review_status)}` : ''}</em></li>
            <li><b>gnomAD</b><span>{gnomad ? (gnomad.found ? `AF ${fmtAf(gnomad.exome?.af ?? gnomad.genome?.af)}` : 'absent') : '…'}</span><em>{gnomad?.exome ? `${gnomad.exome.ac}/${gnomad.exome.an}` : ''}</em></li>
            <li><b>Ensembl VEP</b><span>{vep ? pretty(vep.most_severe_consequence) : '…'}</span><em>{vep?.impact}</em></li>
            <li><b>AlphaMissense</b><span>{vep?.alphamissense ? pretty(vep.alphamissense.class) : 'n/a'}</span><em>{vep?.alphamissense?.score ?? ''}</em></li>
            <li><b>Literature</b><span>{pubmed ? `${pubmed.count} PubMed records` : '…'}</span><em></em></li>
            <li><b>Helix ACMG</b><span>{acmg ? pretty(acmg.classification) : '…'}</span><em>{acmg ? `${acmg.counts.strong}S/${acmg.counts.moderate}M/${acmg.counts.supporting}P` : ''}</em></li>
          </ul>
        </section>
        <section className="hx-card">
          <h3>Helix Workflow</h3>
          <ol className="hx-steps">
            {(s.result?.workflow || ['qc', 'normalize', 'annotate', 'phenotype', 'predict', 'acmg', 'evidence', 'rank', 'review']).slice(0, 9).map((w: string, i: number) => (
              <li key={w} className={s.result ? 'done' : ''}><span>{i + 1}</span>{pretty(w)}</li>))}
          </ol>
          <button className="hx-btn primary block" disabled={!s.report} onClick={onPrint}>Generate Clinical Report</button>
        </section>
      </div>
      <section className="hx-card">
        <div className="hx-card-top"><h3><Icon name="clipboard" size={16} /> Related Clinical Trials</h3>
          {trials && <button className="hx-link" onClick={() => setTab('trials')}>View all {trials.items.length} <Icon name="arrow" size={14} /></button>}</div>
        {trials ? <TrialsTable trials={trials.items} limit={4} /> : <Pending text={stepState(s, 'trials')?.status === 'error' ? 'ClinicalTrials.gov unavailable' : undefined} />}
      </section>
    </>
  );
}

function Interventions({ s }: { s: Session }) {
  const counts = new Map<string, number>();
  s.lookups.trials?.items.forEach(t => t.interventions.forEach(i => counts.set(i, (counts.get(i) || 0) + 1)));
  const list = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  return (
    <section className="hx-card">
      <h3>Interventions under study</h3>
      <p className="hx-dim small">Interventions in open ClinicalTrials.gov studies that mention this gene. This is research context, not a treatment recommendation.</p>
      {list.length ? <ul className="hx-bars">{list.map(([name, n]) => (
        <li key={name}><span>{name}</span><i style={{ width: `${(n / list[0][1]) * 100}%` }} /><b>{n} trial{n > 1 ? 's' : ''}</b></li>))}</ul>
        : <p className="hx-dim">No interventions available yet.</p>}
    </section>
  );
}

function Literature({ s }: { s: Session }) {
  const p = s.lookups.pubmed;
  if (!p) return <section className="hx-card"><Pending /></section>;
  return (
    <section className="hx-card">
      <div className="hx-card-top"><h3>Literature ({p.count})</h3>
        <a className="hx-link" href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(p.term)}`} target="_blank" rel="noreferrer">Open in PubMed <Icon name="arrow" size={14} /></a></div>
      <ul className="hx-articles">{p.articles.map((a: any) => (
        <li key={a.pmid}><a href={a.url} target="_blank" rel="noreferrer">{a.title}</a><small>{a.journal} · {a.year} · PMID {a.pmid}</small></li>))}</ul>
    </section>
  );
}

function ReportTab({ s, onReview, onPrint }: { s: Session; onReview: (d: string, notes: string) => Promise<void>; onPrint: () => void }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const r = s.report;
  if (!r) return <section className="hx-card"><Pending text={s.done ? 'No report was generated for this analysis.' : 'The report is created when the Diagnose agent finishes.'} /></section>;
  const review = JSON.parse(r.content_json || '{}').review;
  const act = async (d: string) => { setBusy(true); try { await onReview(d, notes); setNotes(''); } finally { setBusy(false); } };
  return (
    <section className="hx-card">
      <div className="hx-card-top"><h3>Clinical Report</h3><span className={`hx-status ${r.status === 'approved' ? 'good' : r.status === 'rejected' ? 'bad' : 'warn'}`}>{pretty(r.status)}</span></div>
      <div className="hx-kvs tight">
        <Row k="Report ID" v={<code>{r.id}</code>} />
        <Row k="Created" v={new Date(r.created_at).toLocaleString()} />
        <Row k="Reviewer" v={r.reviewer_id} />
        {review && <Row k="Review notes" v={review.notes || '—'} />}
      </div>
      <textarea className="hx-input" rows={3} placeholder="Reviewer notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="hx-row">
        <button className="hx-btn good" disabled={busy} onClick={() => act('approve')}><Icon name="check" size={15} />Approve</button>
        <button className="hx-btn" disabled={busy} onClick={() => act('request_changes')}>Request changes</button>
        <button className="hx-btn bad" disabled={busy} onClick={() => act('reject')}><Icon name="x" size={15} />Reject</button>
        <span className="hx-grow" />
        <button className="hx-btn primary" onClick={onPrint}><Icon name="file" size={15} />Print / PDF</button>
      </div>
    </section>
  );
}

export function Analysis({ s, tab, setTab, onReview, onPrint }: {
  s: Session; tab: Tab; setTab: (t: Tab) => void; onReview: (d: string, notes: string) => Promise<void>; onPrint: () => void;
}) {
  if (s.error) return <p className="hx-error"><Icon name="alert" size={16} />{s.error}</p>;
  const tabs: [Tab, string][] = [['overview', 'Overview'], ['interventions', 'Interventions'],
    ['trials', `Clinical Trials${s.lookups.trials ? ` (${s.lookups.trials.items.length})` : ''}`],
    ['literature', `Literature${s.lookups.pubmed ? ` (${s.lookups.pubmed.count})` : ''}`], ['report', 'Report & Review']];
  return (
    <>
      <div className="hx-grid2">
        <VariantCard s={s} />
        <div className="hx-stack"><EvidenceCard s={s} /><ImplicationsCard s={s} /></div>
      </div>
      <div className="hx-tabs" role="tablist">
        {tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === 'overview' && <Overview s={s} setTab={setTab} onPrint={onPrint} />}
      {tab === 'interventions' && <Interventions s={s} />}
      {tab === 'trials' && <section className="hx-card">{s.lookups.trials ? <TrialsTable trials={s.lookups.trials.items} /> : <Pending />}</section>}
      {tab === 'literature' && <Literature s={s} />}
      {tab === 'report' && <ReportTab s={s} onReview={onReview} onPrint={onPrint} />}
      <p className="hx-disclaimer">Decision support only. Sources: NCBI ClinVar, Ensembl VEP, gnomAD, PubMed and ClinicalTrials.gov, queried live. Qualified human review is required before clinical use.</p>
    </>
  );
}

const esc = (x: unknown) => String(x ?? '—').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Printable report (browser print → PDF) built from the stored analysis and live lookups. */
export function reportHtml(s: Session) {
  const { clinvar, vep, gnomad, pubmed, trials } = s.lookups;
  const acmg = s.result?.findings?.[0]?.acmg;
  const rows: [string, unknown][] = [
    ['Gene', vep?.gene || clinvar?.genes?.[0]], ['HGVS', `${vep?.mane || ''} ${vep?.hgvsc?.split(':').pop() || s.variant.hgvs || ''}`],
    ['Protein', vep?.hgvsp?.split(':').pop()], ['Consequence', pretty(vep?.most_severe_consequence)], ['Impact', vep?.impact],
    ['Position (GRCh38)', vep?.vcf_string], ['ClinVar', clinvar?.found ? `${clinvar.classification}, ${clinvar.review_status} (${clinvar.accession})` : 'No record'],
    ['Conditions', clinvar?.traits?.join('; ')], ['dbSNP', clinvar?.dbsnp || vep?.rsids?.[0]],
    ['gnomAD AF', gnomad?.found ? `${fmtAf(gnomad.exome?.af)} exomes / ${fmtAf(gnomad.genome?.af)} genomes` : 'Absent'],
    ['Helix ACMG engine', acmg && pretty(acmg.classification)], ['PubMed records', pubmed?.count],
  ];
  const subj = s.subject;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.title)} — Helix report</title>
<style>body{font:14px/1.5 system-ui,sans-serif;color:#111;max-width:820px;margin:32px auto;padding:0 20px}h1{font-size:22px;margin:0}
table{border-collapse:collapse;width:100%;margin:14px 0}td,th{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}th{width:200px;color:#555;font-weight:600}
.muted{color:#666}.box{border:1px solid #ccc;border-radius:8px;padding:10px 14px;margin-top:18px;font-size:12px}</style></head><body>
<h1>${esc(s.title)}</h1><p class="muted">Helix Genomic Intelligence · Case ${esc(s.caseId)} · Report ${esc(s.report?.id)} · Status: ${esc(pretty(s.report?.status))} · ${new Date().toLocaleString()}</p>
<h3>Patient</h3><table><tr><th>Name</th><td>${esc(subj.name)}</td></tr><tr><th>Age / Sex</th><td>${esc(subj.age)} / ${esc(subj.sex)}</td></tr><tr><th>Phenotypes</th><td>${esc(s.phenotypes.join(', ') || subj.conditions)}</td></tr></table>
<h3>Variant</h3><table>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
<h3>Open clinical trials (${trials?.items.length ?? 0})</h3><table>${(trials?.items || []).slice(0, 10).map(t => `<tr><th>${esc(t.nct)}</th><td>${esc(t.title)}<br><span class="muted">${esc(t.phase)} · ${esc(t.status)}</span></td></tr>`).join('')}</table>
<div class="box">Decision support only; requires review by a qualified professional before clinical use. Data retrieved live from NCBI ClinVar, Ensembl VEP, gnomAD, PubMed and ClinicalTrials.gov.</div>
<script>window.onload=()=>window.print()</script></body></html>`;
}
