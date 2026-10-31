'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';
import { Subject } from './api';

/** ChatGPT-style prompt box: auto-growing textarea, VCF attach, patient details, voice input and send. */
export function Composer({ value, onChange, onSubmit, file, onFile, busy, hero, subject, setSubject, phen, setPhen, placeholder, inputRef }: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; file: File | null; onFile: (f: File | null) => void;
  busy: boolean; hero?: boolean; subject: Subject; setSubject: (s: Subject) => void; phen: string; setPhen: (p: string) => void;
  placeholder: string; inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [showPatient, setShowPatient] = useState(false);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const hasPatient = !!(subject.name || subject.age || subject.sex || subject.conditions || phen);

  useEffect(() => {
    const el = inputRef.current; if (!el) return;
    el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 220) + 'px';
  }, [value, inputRef]);

  function dictate() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setNote('Voice input is not supported in this browser'); setTimeout(() => setNote(''), 2500); return; }
    const rec = new SR(); rec.lang = 'en-US';
    rec.onresult = (e: any) => onChange(`${value} ${e.results[0][0].transcript}`.trim());
    rec.onend = () => setListening(false);
    setListening(true); rec.start();
  }

  const canSend = !busy && (!!value.trim() || !!file);
  return (
    <div className={`hx-composer ${hero ? 'hero' : 'dock'}`}>
      {showPatient && (
        <div className="hx-patient-pop">
          <div className="hx-section-head"><b><Icon name="user" size={15} /> Patient details</b>
            <button className="hx-icon-btn" onClick={() => setShowPatient(false)} aria-label="Close"><Icon name="x" size={15} /></button></div>
          <div className="hx-form">
            <label>Name<input className="hx-input" value={subject.name || ''} onChange={e => setSubject({ ...subject, name: e.target.value })} /></label>
            <label>Age<input className="hx-input" value={subject.age || ''} onChange={e => setSubject({ ...subject, age: e.target.value })} /></label>
            <label>Sex<select className="hx-input" value={subject.sex || ''} onChange={e => setSubject({ ...subject, sex: e.target.value })}><option value="" /><option>Female</option><option>Male</option><option>Other</option></select></label>
            <label>Conditions / family history<input className="hx-input" value={subject.conditions || ''} onChange={e => setSubject({ ...subject, conditions: e.target.value })} /></label>
            <label className="wide">Phenotypes (comma-separated)<input className="hx-input" value={phen} onChange={e => setPhen(e.target.value)} placeholder="breast cancer, ovarian cancer" /></label>
          </div>
          <small>Saved with the case when you run the analysis.</small>
        </div>
      )}
      <form className="hx-box" onSubmit={e => { e.preventDefault(); if (canSend) onSubmit(); }}>
        {file && <div className="hx-attach"><Icon name="file" size={20} /><div><b>{file.name}</b><small>VCF · {(file.size / 1024).toFixed(1)} KB</small></div>
          <button type="button" className="hx-icon-btn" onClick={() => onFile(null)} aria-label="Remove file"><Icon name="x" size={14} /></button></div>}
        <textarea ref={inputRef} rows={1} value={value} placeholder={placeholder} disabled={busy}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) onSubmit(); } }} />
        <div className="hx-box-bar">
          <input ref={fileRef} type="file" accept=".vcf,.txt,text/plain" hidden onChange={e => { onFile(e.target.files?.[0] || null); e.target.value = ''; }} />
          <button type="button" className="hx-tool-chip" onClick={() => fileRef.current?.click()} title="Attach a VCF file"><Icon name="plus" size={16} /><span>Attach VCF</span></button>
          <button type="button" className={`hx-tool-chip ${hasPatient ? 'on' : ''}`} onClick={() => setShowPatient(x => !x)}><Icon name="user" size={15} /><span>{hasPatient ? subject.name || 'Patient added' : 'Patient'}</span></button>
          <span className="hx-tool-chip static" title="Agent used for this analysis"><Icon name="bot" size={15} /><span>Diagnose</span></span>
          <span className="hx-grow" />
          {note && <small className="warn">{note}</small>}
          <button type="button" className={`hx-icon-btn ${listening ? 'live' : ''}`} onClick={dictate} aria-label="Voice input"><Icon name="mic" size={18} /></button>
          <button type="submit" className="hx-send" disabled={!canSend} aria-label="Analyze">{busy ? <span className="hx-spin" /> : <Icon name="arrow" size={18} />}</button>
        </div>
      </form>
      {!hero && <p className="hx-fine">Helix queries public genomic databases live. Decision support only; results need qualified review.</p>}
    </div>
  );
}
