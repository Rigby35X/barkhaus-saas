import { useRef, useState } from 'react';
import type { AnimalFields, AnimalRecord, JsonValue } from '../../../../../shared/contracts/v1/animal.ts';
import type { AnimalWrite } from '../../../../../shared/contracts/v1/ingestion.ts';
import { pendingCommand, readAnimal, readDocument, writeAnimal } from './client';

export const emptyAnimalFields: AnimalFields = {
  name: '', species: '', breed: null, age: { kind: 'unknown' }, sex: 'unknown', size: 'unknown', biography: null, photos: [], lifecycle: 'intake', availability: 'unavailable',
};
interface Props { orgId: number; animal: AnimalRecord | null; canEdit: boolean; canPublish?: boolean; onSaved(animal: AnimalRecord): void; onClose(): void }
export default function AnimalEditor({ orgId, animal, canEdit, canPublish = false, onSaved, onClose }: Props) {
  const [record, setRecord] = useState(animal);
  const [draft, setDraft] = useState<AnimalFields>(structuredClone(animal?.fields ?? emptyAnimalFields));
  const [notes, setNotes] = useState(animal?.privateData.internalNotes ?? '');
  const [custom, setCustom] = useState<Record<string, JsonValue>>(Object.fromEntries(Object.entries(animal?.customFields ?? {}).map(([k, v]) => [k, v.value])));
  const [customText, setCustomText] = useState<Record<string, string>>({});
  const [key, setKey] = useState(animal?.publication.publicProfileKey ?? '');
  const [approved, setApproved] = useState<readonly { id: string; url: string }[]>(animal?.publication.approvedPhotos ?? []);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [latest, setLatest] = useState<AnimalRecord | null>(null);
  const pending = useRef<AnimalWrite | null>(null);
  const editable = (field: keyof AnimalFields) => canEdit && (!record || record.ownership[field].kind === 'barkhaus');
  const change = (field: keyof AnimalFields, value: unknown) => setDraft(p => ({ ...p, [field]: value }));
  const run = async (kind: 'save' | 'publish' | 'archive' | 'unpublish') => {
    if (!canEdit || kind !== 'save' && !canPublish) return;
    setBusy(true); setError('');
    try {
      let command: AnimalWrite;
      const base = { version: 1 as const, orgId, idempotencyKey: crypto.randomUUID() };
      if (kind === 'save') {
        if (Object.values(customText).some(v => { try { JSON.parse(v); return false; } catch { return true; } })) throw new Error('Custom values must be valid JSON.');
        command = record ? { ...base, kind: 'edit_native', animalId: record.id, expectedRevision: record.revision,
          fields: Object.fromEntries(Object.entries(draft).filter(([k, value]) => editable(k as keyof AnimalFields) && JSON.stringify(value) !== JSON.stringify(record.fields[k as keyof AnimalFields]))),
          internalNotes: notes,
          customFields: Object.fromEntries(Object.entries(custom).filter(([k]) => record.customFields[k]?.owner.kind === 'barkhaus')),
        } : { ...base, kind: 'create_native', fields: draft };
      } else {
        if (!record) throw new Error('Save this animal first.');
        command = kind === 'publish' ? { ...base, kind, animalId: record.id, expectedRevision: record.revision, publicProfileKey: key, approvedPhotos: approved }
          : { ...base, kind, animalId: record.id, expectedRevision: record.revision };
      }
      pending.current = pendingCommand(pending.current, command);
      const saved = await writeAnimal(pending.current);
      pending.current = null; onSaved(saved); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.'); }
    finally { setBusy(false); }
  };
  const input = 'border rounded p-2 w-full';
  return <div role="dialog" aria-modal="true" aria-label="Animal editor" className="fixed inset-0 z-50 bg-black/40 overflow-auto p-4">
    <div className="bg-white rounded-xl max-w-3xl mx-auto p-6 space-y-4">
      <h2 className="text-xl">{record ? `Edit ${record.fields.name}` : 'Create animal'}</h2>
      {record && <p>Revision {record.revision} · {record.publication.state} · {record.source.kind}</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {record && <button type="button" disabled={busy} onClick={async () => { try { setLatest(await readAnimal(orgId, record.id)); } catch (e) { setError(String(e)); } }}>Load latest for comparison</button>}
      {latest && <div className="border p-3"><p>Latest revision {latest.revision}. Your draft remains below.</p><pre className="overflow-auto max-h-48">{JSON.stringify(latest.fields, null, 2)}</pre>
        <button type="button" onClick={() => { setRecord(latest); setDraft(structuredClone(latest.fields)); setNotes(latest.privateData.internalNotes); setCustom(Object.fromEntries(Object.entries(latest.customFields).map(([k,v]) => [k,v.value]))); setCustomText({}); setApproved(latest.publication.approvedPhotos); setKey(latest.publication.publicProfileKey ?? ''); setLatest(null); pending.current = null; setError(''); }}>Discard draft and use latest</button></div>}
      <fieldset disabled={busy} className="space-y-3">
        {(['name','species','breed','biography'] as const).map(field => <label className="block" key={field}>{field}{!editable(field) && record?.ownership[field].kind === 'connector' ? ' (managed by source)' : ''}
          <textarea className={input} disabled={!editable(field)} value={draft[field] ?? ''} onChange={e => change(field, e.target.value || (field === 'breed' || field === 'biography' ? null : ''))} /></label>)}
        {(['sex','size','lifecycle','availability'] as const).map(field => <label className="block" key={field}>{field}{!editable(field) ? ' (read only)' : ''}
          <select className={input} disabled={!editable(field)} value={draft[field]} onChange={e => change(field, e.target.value)}>
            {({ sex: ['male','female','unknown'], size: ['small','medium','large','extra_large','unknown'], lifecycle: ['intake','care','adopted','transferred','deceased','unknown'], availability: ['available','pending','unavailable','unknown'] })[field].map(v => <option key={v}>{v}</option>)}
          </select></label>)}
        <label className="block">Age
          <select className={input} disabled={!editable('age')} value={draft.age.kind} onChange={e => change('age', e.target.value === 'birthday' ? { kind: 'birthday', date: '', estimated: false } : e.target.value === 'estimate' ? { kind: 'estimate', label: '', asOf: '' } : { kind: 'unknown' })}><option>unknown</option><option>birthday</option><option>estimate</option></select>
        </label>
        {draft.age.kind === 'birthday' && <><label>Birthday<input className={input} type="date" disabled={!editable('age')} value={draft.age.date} onChange={e => change('age', { ...draft.age, date: e.target.value })} /></label><label><input type="checkbox" disabled={!editable('age')} checked={draft.age.estimated} onChange={e => change('age', { ...draft.age, estimated: e.target.checked })} /> Estimated birthday</label></>}
        {draft.age.kind === 'estimate' && <><label>Age label<input className={input} disabled={!editable('age')} value={draft.age.label} onChange={e => change('age', { ...draft.age, label: e.target.value })} /></label><label>As of<input className={input} type="date" disabled={!editable('age')} value={draft.age.asOf} onChange={e => change('age', { ...draft.age, asOf: e.target.value })} /></label></>}
        <label className="block">Private notes{!record && ' (save the animal first)'}<textarea className={input} disabled={!canEdit || !record} value={notes} onChange={e => setNotes(e.target.value)} /></label>
        {Object.entries(custom).map(([k,v]) => <label className="block" key={k}>Private custom field: {k}{record?.customFields[k]?.owner.kind === 'connector' && ' (managed by source)'}<textarea className={input} disabled={!canEdit || record?.customFields[k]?.owner.kind !== 'barkhaus'} value={customText[k] ?? JSON.stringify(v)} onChange={e => { setCustomText(p => ({ ...p, [k]: e.target.value })); try { const parsed = JSON.parse(e.target.value); setCustom(p => ({ ...p, [k]: parsed })); } catch { /* Keep invalid input visible for correction. */ } }} /></label>)}
        <div><h3>Photo candidates (save changes before approving)</h3>
          {draft.photos.map((p,i) => <div className="border p-2" key={p.id}><p>{p.id}</p>
            <label>Vetted image URL<input className={input} disabled={!editable('photos')} value={p.url} onChange={e => change('photos', draft.photos.map((v,j) => j === i ? { ...v, url: e.target.value } : v))} /></label>
            <label>Alt text<input className={input} disabled={!editable('photos')} value={p.alt} onChange={e => change('photos', draft.photos.map((v,j) => j === i ? { ...v, alt: e.target.value } : v))} /></label>
            <button type="button" disabled={!editable('photos') || i === 0} onClick={() => { const photos = [...draft.photos]; [photos[i-1], photos[i]] = [photos[i], photos[i-1]]; change('photos', photos); }}>Move earlier</button>
            <button type="button" disabled={!editable('photos')} onClick={() => change('photos', draft.photos.filter((_,j) => i !== j))}>Remove candidate</button>
          </div>)}
          <button type="button" disabled={!editable('photos')} onClick={() => change('photos', [...draft.photos, { id: crypto.randomUUID(), url: '', alt: '' }])}>Add vetted photo candidate</button>
        </div>
        <button type="button" disabled={!canEdit} onClick={() => void run('save')}>Save {record ? 'changes' : 'unpublished animal'}</button>
        {record && <div className="border p-3 space-y-2"><h3>Publication (owner/admin required)</h3>
          <label>Public profile key<input className={input} disabled={!canPublish || !!record.publication.publicProfileKey} value={key} onChange={e => setKey(e.target.value)} /></label>
          {record.fields.photos.map(p => <label className="block" key={p.id}><input type="checkbox" disabled={!canPublish} checked={approved.some(a => a.id === p.id && a.url === p.url)} onChange={e => setApproved(v => e.target.checked ? [...v, { id: p.id, url: p.url }] : v.filter(a => a.id !== p.id))} /> Approve {p.alt || p.id}</label>)}
          <button type="button" disabled={!canPublish} onClick={() => void run('publish')}>Approve and publish saved profile</button>{' '}
          <button type="button" disabled={!canPublish} onClick={() => void run('unpublish')}>Unpublish</button>{' '}
          <button type="button" disabled={!canPublish} onClick={() => void run('archive')}>Archive</button>
        </div>}
        {record && [...record.privateData.documentIds, ...record.privateData.medicalRecordIds].map(id => <button type="button" key={id} onClick={async () => { try { const access = await readDocument(orgId, record.id, id); window.open(access.url, '_blank', 'noopener,noreferrer'); } catch (e) { setError(String(e)); } }}>Open private document {id} (60 seconds)</button>)}
      </fieldset>
      <button type="button" disabled={busy} onClick={onClose}>Close</button>
    </div>
  </div>;
}
