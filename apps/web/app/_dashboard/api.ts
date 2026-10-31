export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(API + path, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof body?.detail === 'string' ? body.detail.slice(0, 160) : `HTTP ${r.status}`);
  return body as T;
}
export const post = <T = any>(path: string, data: unknown) =>
  api<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export type StepId = 'parse' | 'clinvar' | 'vep' | 'gnomad' | 'pubmed' | 'trials' | 'diagnose';
export type Step = { id: StepId; label: string; source: string; status: 'pending' | 'running' | 'done' | 'error' | 'skipped'; ms?: number; note?: string };
export type Subject = { name?: string; age?: string; sex?: string; conditions?: string };
export type VariantInput = { gene?: string; transcript?: string; hgvs?: string; rsid?: string; chrom?: string; pos?: number; ref?: string; alt?: string };
export type Trial = { nct: string; title: string; phase: string; conditions: string; status: string; locations: string; interventions: string[] };
export type Lookups = { clinvar?: any; vep?: any; gnomad?: any; pubmed?: any; trials?: { total: number; items: Trial[] } };
export type Session = {
  caseId?: string; title: string; prompt: string; file?: { name: string; size: number }; variantsInFile?: number;
  variant: VariantInput; subject: Subject; phenotypes: string[]; lookups: Lookups; steps: Step[];
  result?: any; report?: any; error?: string; startedAt: string; updatedAt: string; done: boolean;
};

const STEP_DEFS: Record<StepId, [string, string]> = {
  parse: ['VCF Intake', 'Helix VCF parser'],
  clinvar: ['Variant Interpretation', 'NCBI ClinVar'],
  vep: ['Consequence Annotation', 'Ensembl VEP'],
  gnomad: ['Population Frequency', 'gnomAD r4'],
  pubmed: ['Literature Search', 'NCBI PubMed'],
  trials: ['Clinical Trials', 'ClinicalTrials.gov'],
  diagnose: ['Diagnose Agent', 'Helix ACMG + report'],
};
const makeStep = (id: StepId): Step => ({ id, label: STEP_DEFS[id][0], source: STEP_DEFS[id][1], status: 'pending' });

const STOP = new Set(['VCF', 'HGVS', 'ACMG', 'DNA', 'RNA', 'AND', 'THE', 'FOR', 'WITH', 'GRCH38', 'GRCH37', 'SNV', 'CNV', 'PGX', 'HPO', 'VUS', 'NM']);

/** Pull a gene, HGVS (optionally with a RefSeq transcript), rsID or chrom:pos:ref:alt out of free text. */
export function parsePrompt(text: string): VariantInput {
  const h = text.match(/(?:(N[MC]_\d+(?:\.\d+)?)(?:\(([A-Za-z0-9-]+)\))?:)?(c\.[A-Za-z0-9_+\-*>]+)/);
  const rs = text.match(/\brs\d+\b/i);
  const vcf = text.match(/\b(?:chr)?([0-9]{1,2}|X|Y|MT?)[:\s-](\d{3,})[:\s-]([ACGT]+)[:>\s-]+([ACGT]+)\b/i);
  const gene = h?.[2] || (text.match(/\b[A-Z][A-Z0-9-]{2,9}\b/g) || []).find(t => !STOP.has(t) && !/^N[MC]_/.test(t) && !/^RS\d/.test(t));
  return {
    gene, transcript: h?.[1], hgvs: h?.[3], rsid: rs?.[0].toLowerCase(),
    ...(vcf ? { chrom: vcf[1], pos: Number(vcf[2]), ref: vcf[3].toUpperCase(), alt: vcf[4].toUpperCase() } : {}),
  };
}

const ENGINE_CONSEQUENCE: [RegExp, string][] = [
  [/frameshift/, 'frameshift'], [/stop_gained/, 'nonsense'], [/splice_(acceptor|donor)/, 'splice'],
  [/missense/, 'missense'], [/synonymous/, 'synonymous'], [/inframe_deletion/, 'deletion'], [/inframe_insertion/, 'insertion'],
];

export function toTrial(s: any): Trial {
  const p = s.protocolSection || {};
  const countries = [...new Set<string>((p.contactsLocationsModule?.locations || []).map((l: any) => l.country).filter(Boolean))];
  const phases = (p.designModule?.phases || []).map((x: string) => x === 'NA' ? 'N/A' : x.replace('EARLY_PHASE1', 'Early 1').replace(/PHASE(\d)/, '$1'));
  return {
    nct: p.identificationModule?.nctId, title: p.identificationModule?.briefTitle,
    phase: phases.length ? (phases[0] === 'N/A' ? 'N/A' : 'Phase ' + phases.join('/')) : 'N/A',
    conditions: (p.conditionsModule?.conditions || []).slice(0, 2).join(', '),
    status: (p.statusModule?.overallStatus || '').replace(/_/g, ' ').toLowerCase(),
    locations: countries.slice(0, 2).join(', ') + (countries.length > 2 ? ` +${countries.length - 2}` : ''),
    interventions: (p.armsInterventionsModule?.interventions || []).map((i: any) => i.name),
  };
}

/** ClinVar title "NM_007294.4(BRCA1):c.68_69del (p.Glu23fs)" -> "NM_007294.4:c.68_69del" for VEP. */
const vepHgvsFromClinvar = (title?: string) => title?.replace(/\s*\(p\..*\)\s*$/, '').replace(/\([^)]*\)(?=:)/, '');
const cPart = (hgvs?: string) => hgvs?.split(':').pop();

/**
 * Runs the live lookups (ClinVar, Ensembl VEP, gnomAD, PubMed, ClinicalTrials.gov) and then the
 * Helix Diagnose agent, reporting progress through `set` so the dashboard updates step by step.
 */
export async function runPipeline(
  input: { prompt: string; file?: File | null; subject: Subject; phenotypes: string[] },
  emit: (s: Session) => void,
): Promise<string | undefined> {
  const now = new Date().toISOString();
  let v = parsePrompt(input.prompt);
  const ids: StepId[] = [...(input.file ? ['parse' as StepId] : []), 'clinvar', 'vep', 'gnomad', 'pubmed', 'trials', 'diagnose'];
  let cur: Session = {
    title: 'Variant Analysis', prompt: input.prompt, file: input.file ? { name: input.file.name, size: input.file.size } : undefined,
    variant: v, subject: input.subject, phenotypes: input.phenotypes, lookups: {}, steps: ids.map(makeStep),
    startedAt: now, updatedAt: now, done: false,
  };
  const set = (fn: (s: Session) => Session) => { cur = fn(cur); emit(cur); };
  emit(cur);
  const patch = (id: StepId, p: Partial<Step>) => set(s => ({ ...s, steps: s.steps.map(x => x.id === id ? { ...x, ...p } : x) }));
  const setLookup = (k: keyof Lookups, val: any) => set(s => ({ ...s, lookups: { ...s.lookups, [k]: val } }));
  async function step<T>(id: StepId, fn: () => Promise<T>, note?: (r: T) => string): Promise<T | undefined> {
    const t0 = performance.now(); patch(id, { status: 'running' });
    try {
      const r = await fn(); patch(id, { status: 'done', ms: Math.round(performance.now() - t0), note: note?.(r) }); return r;
    } catch (e: any) {
      patch(id, { status: 'error', ms: Math.round(performance.now() - t0), note: e?.message || 'failed' }); return undefined;
    }
  }
  const skip = (id: StepId, note: string) => patch(id, { status: 'skipped', note });

  if (input.file) {
    const fd = new FormData(); fd.append('file', input.file);
    const parsed = await step('parse', () => api('/upload/vcf', { method: 'POST', body: fd }), (r: any) => `${r.count} variant(s)`);
    const first = parsed?.variants?.[0];
    if (first) v = { ...v, chrom: first.chrom, pos: first.pos, ref: first.ref, alt: first.alt };
    set(s => ({ ...s, variantsInFile: parsed?.count, variant: v }));
  }
  const hasCoords = !!(v.chrom && v.pos && v.ref && v.alt);
  if (!v.hgvs && !v.rsid && !hasCoords) {
    ids.filter(i => i !== 'parse').forEach(i => skip(i, 'no variant'));
    set(s => ({ ...s, done: true, error: 'I could not find a variant to analyze. Include a gene with HGVS (e.g. "BRCA1 c.68_69delAG"), an rsID, chrom:pos:ref:alt, or attach a VCF.' }));
    return;
  }

  const literatureAndTrials = (gene: string, c?: string) => Promise.all([
    step('pubmed', () => api(`/integrations/pubmed/articles?retmax=10&term=${encodeURIComponent(c ? `${gene} ${c.replace(/(del|dup)[ACGT]+$/i, '$1')}` : gene)}`),
      (r: any) => `${r.count} records`).then(r => setLookup('pubmed', r)),
    step('trials', async () => {
      const r = await api(`/integrations/trials?page_size=25&status=${encodeURIComponent('RECRUITING|NOT_YET_RECRUITING|ACTIVE_NOT_RECRUITING')}&query=${encodeURIComponent(gene)}`);
      return { total: r.totalCount ?? r.studies?.length ?? 0, items: (r.studies || []).map(toTrial) };
    }, r => `${r.items.length} open`).then(r => setLookup('trials', r)),
  ]);

  let clinvar: any, vep: any, side: Promise<unknown> | undefined;
  if (v.hgvs) {
    if (v.gene) side = literatureAndTrials(v.gene, v.hgvs);
    clinvar = await step('clinvar', () => api(`/integrations/clinvar/variant?hgvs=${encodeURIComponent(v.hgvs!)}${v.gene ? `&gene=${encodeURIComponent(v.gene)}` : ''}`),
      (r: any) => r.found ? r.classification : 'not in ClinVar');
    setLookup('clinvar', clinvar);
    const q = vepHgvsFromClinvar(clinvar?.found ? clinvar.title : undefined) || (v.transcript ? `${v.transcript}:${v.hgvs}` : `${v.gene}:${v.hgvs}`);
    vep = await step('vep', () => api(`/integrations/vep?hgvs=${encodeURIComponent(q)}`), (r: any) => r.most_severe_consequence?.replace(/_/g, ' '));
  } else {
    const qs = hasCoords ? `chrom=${v.chrom}&pos=${v.pos}&ref=${v.ref}&alt=${v.alt}` : `hgvs=${v.rsid}`;
    vep = await step('vep', () => api(`/integrations/vep?${qs}`), (r: any) => r.most_severe_consequence?.replace(/_/g, ' '));
    const gene = vep?.gene || v.gene, c = cPart(vep?.hgvsc);
    if (gene) side = literatureAndTrials(gene, c); else { skip('pubmed', 'gene unknown'); skip('trials', 'gene unknown'); }
    if (c) {
      clinvar = await step('clinvar', () => api(`/integrations/clinvar/variant?hgvs=${encodeURIComponent(c)}${gene ? `&gene=${encodeURIComponent(gene)}` : ''}`),
        (r: any) => r.found ? r.classification : 'not in ClinVar');
      setLookup('clinvar', clinvar);
    } else skip('clinvar', 'no coding HGVS');
  }
  setLookup('vep', vep);
  if (!side) {
    const gene = vep?.gene || clinvar?.genes?.[0];
    side = gene ? literatureAndTrials(gene, v.hgvs || cPart(vep?.hgvsc)) : (skip('pubmed', 'gene unknown'), skip('trials', 'gene unknown'), Promise.resolve());
  }
  if (vep?.vcf_string) {
    const g = await step('gnomad', () => api(`/integrations/gnomad/variant?variant_id=${encodeURIComponent(vep.vcf_string)}`),
      (r: any) => r.found ? 'found' : 'absent');
    setLookup('gnomad', g);
  } else skip('gnomad', 'no genomic coordinates');
  await side;

  // Diagnose agent: persist an enriched variant on a new case, then run the analysis (creates the report).
  const gene = vep?.gene || clinvar?.genes?.[0] || v.gene || '';
  const [chrom, pos, ref, alt] = (vep?.vcf_string || '').split('-');
  const consequence = ENGINE_CONSEQUENCE.find(([re]) => re.test(vep?.most_severe_consequence || ''))?.[1] || '';
  const variant = {
    assembly: 'GRCh38', chrom: chrom || v.chrom || '', pos: Number(pos || v.pos || 0), ref: ref || v.ref || '', alt: alt || v.alt || '',
    hgvs: cPart(vep?.hgvsc) || v.hgvs || '', gene, transcript: vep?.mane || vep?.transcript || v.transcript || '', consequence,
    phenotype_associations: clinvar?.traits || [], metadata: { clinvar: clinvar?.accession, rsid: clinvar?.dbsnp || vep?.rsids?.[0] },
  };
  const title = `${gene || 'Variant'} Variant Analysis`;
  let caseId: string | undefined;
  await step('diagnose', async () => {
    const c = await post('/cases', { title, mode: 'clinical', subject: input.subject, phenotypes: input.phenotypes, variants: [variant] });
    caseId = c.id;
    set(s => ({ ...s, caseId, title }));
    const result = await post('/analysis', {
      case_id: c.id, agent: 'diagnose',
      input: { prompt: input.prompt, file: cur.file, variant: v, lookups: cur.lookups, steps: cur.steps },
    });
    set(s => ({ ...s, result, report: result.report }));
    return result;
  }, (r: any) => r.status);
  set(s => ({ ...s, done: true, updatedAt: new Date().toISOString() }));
  return caseId;
}

/** Rebuild a dashboard session from a stored case and its latest analysis. */
export async function loadSession(id: string): Promise<Session> {
  const c = await api(`/cases/${id}`);
  const a = c.analyses?.[0];
  const input = a ? JSON.parse(a.input_json || '{}') : {};
  const result = a ? JSON.parse(a.result_json || '{}') : undefined;
  const steps: Step[] = (input.steps || []).map((s: Step) => s.id === 'diagnose' ? { ...s, status: result?.status === 'completed' ? 'done' : 'error', note: result?.status } : s);
  return {
    caseId: c.id, title: c.title, prompt: input.prompt || c.title, file: input.file, variant: input.variant || {},
    subject: c.subject || {}, phenotypes: c.phenotypes || [], lookups: input.lookups || {}, steps, result,
    report: c.reports?.[0], startedAt: c.created_at, updatedAt: c.updated_at, done: true,
  };
}

export function clinvarStars(review?: string) {
  const r = (review || '').toLowerCase();
  if (r.includes('practice guideline')) return 4;
  if (r.includes('expert panel')) return 3;
  if (r.includes('multiple submitters') && r.includes('no conflicts')) return 2;
  if (r.includes('single submitter') || r.includes('conflicting')) return 1;
  return 0;
}

export function tone(classification?: string) {
  const c = (classification || '').toLowerCase();
  if (c.includes('conflicting') || c.includes('uncertain')) return 'warn';
  if (c.includes('pathogenic')) return 'bad';
  if (c.includes('benign')) return 'good';
  return 'muted';
}

export function ago(iso?: string) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const fmtAf = (af?: number | null) => af == null ? '—' : af === 0 ? '0' : af < 0.001 ? af.toExponential(2) : af.toFixed(4);
export const pretty = (x?: string) => (x || '').replace(/_/g, ' ');
