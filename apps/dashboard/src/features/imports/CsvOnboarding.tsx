import { useState } from 'react';
import type { AnimalFields } from '../../../../../shared/contracts/v1/animal.ts';
import type { CsvImportJob, CsvMatching, SavedMapping } from '../../../../../shared/contracts/v1/ingestion.ts';
import { CORE_FIELDS, IMPORT_LIMITS, parseCsv, TRANSFORMS } from './csv.ts';
import type { ImportPreview } from './csv.ts';

export type ImportRequest = { id: string; orgId: number; mappingId: string; mappingRevision: number; matching: CsvMatching; acknowledgeCreateOnly: boolean };
/** Transport must authenticate every call; start/retry only enqueue server work. */
export interface CsvOnboardingClient {
  behavior: 'fixture' | 'persistent';
  listMappings(orgId: number): Promise<SavedMapping[]>;
  saveMapping(mapping: SavedMapping): Promise<void>;
  preview(input: ImportRequest, source: string): Promise<ImportPreview>;
  start(input: ImportRequest, source: string): Promise<CsvImportJob>;
  job(orgId: number, jobId: string): Promise<CsvImportJob>;
  retry(orgId: number, jobId: string): Promise<CsvImportJob>;
}
export type CsvOnboardingProps = { orgId: number; canImport: boolean; client: CsvOnboardingClient };
export function CsvOnboarding(props: CsvOnboardingProps) { return <ImportWorkspace key={props.orgId} {...props} />; }
function ImportWorkspace({ orgId, canImport, client }: CsvOnboardingProps) {
  const [mappings, setMappings] = useState<SavedMapping[]>([]);
  const [mapping, setMapping] = useState<SavedMapping>({ version: 1, id: '', revision: 1, orgId, fields: [], statusMap: {} });
  const [saved, setSaved] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [source, setSource] = useState(''); const [headers, setHeaders] = useState<string[]>([]);
  const [mode, setMode] = useState<'stable_key' | 'create_only' | 'reviewed'>('stable_key');
  const [keyColumn, setKeyColumn] = useState(''); const [reviewed, setReviewed] = useState<Record<number, { action: 'create' | 'update'; id: string; idType: 'number' | 'string'; revision: string }>>({});
  const [ack, setAck] = useState(false); const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [job, setJob] = useState<CsvImportJob | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [statusLabel, setStatusLabel] = useState(''); const [lifecycle, setLifecycle] = useState<AnimalFields['lifecycle']>('care'); const [availability, setAvailability] = useState<AnimalFields['availability']>('unavailable');
  const mutate = (next: SavedMapping) => { setMapping({ ...next, revision: saved ? mapping.revision + 1 : next.revision }); setSaved(false); setPreview(null); setJob(null); };
  const work = async (action: () => Promise<void>) => { setBusy(true); setError(''); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Import request failed'); } finally { setBusy(false); } };
  const matching = (): CsvMatching => mode === 'stable_key' ? { mode, mappingId: mapping.id, keyColumn } : mode === 'create_only' ? { mode } : {
    mode, resolutions: Object.entries(reviewed).map(([row, r]) => r.action === 'create' ? { row: Number(row), action: 'create' as const } : { row: Number(row), action: 'update' as const, animalId: r.idType === 'number' ? Number(r.id) : r.id, expectedRevision: Number(r.revision) }),
  };
  const request = (): ImportRequest => ({ id: requestId, orgId, mappingId: mapping.id, mappingRevision: mapping.revision, matching: matching(), acknowledgeCreateOnly: ack });
  return <section aria-label="CSV animal onboarding" className="space-y-4 p-6">
    <h2 className="text-xl font-semibold">Import animals from CSV</h2>
    <p>{client.behavior === 'fixture' ? 'Fixture mode: synthetic data only; nothing is persisted.' : 'Server import service'} · Imported animals remain unpublished. Photo URL imports are disabled.</p>
    {!canImport && <p role="status">View-only access. Staff, admins, and owners can import.</p>}
    <button disabled={busy} onClick={() => void work(async () => setMappings((await client.listMappings(orgId)).filter(m => m.orgId === orgId)))}>Load saved mappings</button>
    <fieldset disabled={busy || !canImport} className="space-y-3">
      <legend>1. File and reusable mapping</legend><button onClick={() => { setMapping({ version: 1, id: '', revision: 1, orgId, fields: [], statusMap: {} }); setSaved(false); setPreview(null); setJob(null); }}>New mapping</button>
      <label>Saved mapping <select value="" onChange={e => { const m = mappings.find(m => m.id === e.target.value); if (m) { setMapping(structuredClone(m)); setSaved(true); setPreview(null); setJob(null); } }}><option value="">Select mapping</option>{mappings.map(m => <option key={`${m.id}:${m.revision}`} value={m.id}>{m.id} (revision {m.revision})</option>)}</select></label>
      <label>Stable mapping ID <input value={mapping.id} disabled={saved || mappings.some(m => m.id === mapping.id)} onChange={e => mutate({ ...mapping, id: e.target.value })} /></label>
      <p>Reuse the same mapping ID for future uploads. Revision {mapping.revision}{saved ? ' saved' : ' unsaved'}.</p>
      <label>CSV file (UTF-8, up to 5 MiB / 5,000 rows) <input type="file" accept=".csv,text/csv" onChange={e => { const file = e.target.files?.[0]; setSource(''); setPreview(null); setJob(null); setHeaders([]); setReviewed({}); if (file) void work(async () => { if (file.size > IMPORT_LIMITS.maxBytes) throw new Error('CSV exceeds byte limit'); const content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); const parsed = parseCsv(content); setSource(content); setHeaders(parsed.headers); }); }} /></label>
      {mapping.fields.map((f, i) => <div key={i} className="flex gap-2">
        <label>Column <select value={f.sourceColumn} onChange={e => mutate({ ...mapping, fields: mapping.fields.map((v, n) => n === i ? { ...v, sourceColumn: e.target.value } : v) })}><option value="">Choose</option>{headers.map(h => <option key={h}>{h}</option>)}</select></label>
        <label>Target <select value={f.target.kind === 'custom' ? 'custom' : f.target.field} onChange={e => mutate({ ...mapping, fields: mapping.fields.map((v, n) => n === i ? { ...v, target: e.target.value === 'custom' ? { kind: 'custom', key: '' } : { kind: 'core', field: e.target.value as keyof AnimalFields }, transform: e.target.value === 'lifecycle' ? 'status' : e.target.value === 'age' ? 'birthday' : 'trim' } : v) })}>{CORE_FIELDS.filter(x => !['photos', 'availability'].includes(x)).map(x => <option key={x}>{x}</option>)}<option value="custom">Private custom field</option></select></label>
        {f.target.kind === 'custom' && <label>Private key <input value={f.target.key} onChange={e => mutate({ ...mapping, fields: mapping.fields.map((v, n) => n === i ? { ...v, target: { kind: 'custom', key: e.target.value } } : v) })} /></label>}
        <label>Transform <select value={f.transform ?? ''} onChange={e => mutate({ ...mapping, fields: mapping.fields.map((v, n) => n === i ? { ...v, transform: e.target.value || null } : v) })}><option value="">None</option>{TRANSFORMS.map(t => <option key={t}>{t}</option>)}</select></label>
        <button onClick={() => mutate({ ...mapping, fields: mapping.fields.filter((_, n) => n !== i) })}>Remove field</button>
      </div>)}
      <button onClick={() => mutate({ ...mapping, fields: [...mapping.fields, { sourceColumn: headers[0] ?? '', target: { kind: 'core', field: 'name' }, transform: 'trim' }] })}>Add field mapping</button>
      <div><label>Status label <input value={statusLabel} onChange={e => setStatusLabel(e.target.value)} /></label><label>Lifecycle <select value={lifecycle} onChange={e => setLifecycle(e.target.value as typeof lifecycle)}>{['intake', 'care', 'adopted', 'transferred', 'deceased', 'unknown'].map(s => <option key={s}>{s}</option>)}</select></label><label>Availability <select value={availability} onChange={e => setAvailability(e.target.value as typeof availability)}>{['available', 'pending', 'unavailable', 'unknown'].map(s => <option key={s}>{s}</option>)}</select></label><button onClick={() => { if (statusLabel.trim()) mutate({ ...mapping, statusMap: { ...mapping.statusMap, [statusLabel.trim()]: { lifecycle, availability } } }); }}>Map status</button></div>
      {Object.entries(mapping.statusMap).map(([label, status]) => <p key={label}>{label}: {status.lifecycle} / {status.availability} <button onClick={() => mutate({ ...mapping, statusMap: Object.fromEntries(Object.entries(mapping.statusMap).filter(([k]) => k !== label)) })}>Remove status</button></p>)}
      <button onClick={() => void work(async () => { await client.saveMapping(mapping); setSaved(true); })}>Save mapping revision</button>
      <h3>2. Matching and review</h3>
      <label>Matching <select value={mode} onChange={e => { setMode(e.target.value as typeof mode); setPreview(null); setJob(null); }}><option value="stable_key">Stable import key</option><option value="reviewed">Reviewed create/update per row</option><option value="create_only">Create-only</option></select></label>
      {mode === 'stable_key' && <label>Key column <select value={keyColumn} onChange={e => { setKeyColumn(e.target.value); setPreview(null); }}><option value="">Choose</option>{headers.map(h => <option key={h}>{h}</option>)}</select></label>}
      {mode === 'create_only' && <label><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} /> A new job deliberately creates new records. Retry the same job to avoid duplicates.</label>}
      {mode === 'reviewed' && source && parseCsv(source).rows.map(r => <div key={r.row}>Row {r.row} <label>Resolution <select value={reviewed[r.row]?.action ?? ''} onChange={e => { const action = e.target.value; setReviewed(old => action ? { ...old, [r.row]: { action: action as 'create' | 'update', id: '', idType: 'number', revision: '' } } : Object.fromEntries(Object.entries(old).filter(([key]) => Number(key) !== r.row))); setPreview(null); }}><option value="">Review required</option><option value="create">Create</option><option value="update">Update</option></select></label>{reviewed[r.row]?.action === 'update' && <><label>Animal ID <input value={reviewed[r.row].id} onChange={e => { setReviewed(old => ({ ...old, [r.row]: { ...old[r.row], id: e.target.value } })); setPreview(null); }} /></label><label>ID type <select value={reviewed[r.row].idType} onChange={e => { setReviewed(old => ({ ...old, [r.row]: { ...old[r.row], idType: e.target.value as 'number' | 'string' } })); setPreview(null); }}><option value="number">Number</option><option value="string">Text</option></select></label><label>Revision <input type="number" min="1" value={reviewed[r.row].revision} onChange={e => { setReviewed(old => ({ ...old, [r.row]: { ...old[r.row], revision: e.target.value } })); setPreview(null); }} /></label></>}</div>)}
      <button disabled={!saved || !source} onClick={() => void work(async () => { setJob(null); setPreview(null); const id = crypto.randomUUID(); setRequestId(id); setPreview(await client.preview({ ...request(), id }, source)); })}>Preview without writes</button>
      {preview && <div><p>{preview.rows.length} rows; {preview.issues.length} issues. Invalid rows will be rejected; valid rows can import.</p>{preview.warnings.map(w => <p key={w}>{w}</p>)}<table><thead><tr><th>Row</th><th>Name</th><th>Species</th><th>Lifecycle / availability</th><th>Errors</th></tr></thead><tbody>{preview.rows.map(r => <tr key={r.row}><td>{r.row}</td><td>{r.fields.name}</td><td>{r.fields.species}</td><td>{r.fields.lifecycle} / {r.fields.availability}</td><td>{r.issues.map((i, n) => <p key={n}>{i.field ?? 'CSV'}: {i.message}</p>)}</td></tr>)}</tbody></table><button disabled={Boolean(job) || (mode === 'create_only' && !ack)} onClick={() => void work(async () => setJob(await client.start(request(), source)))}>Confirm and queue import</button><p>Request ID: {requestId}. Keep this ID to recover progress if the response is interrupted.</p><button onClick={() => void work(async () => setJob(await client.job(orgId, requestId)))}>Recover job by request ID</button></div>}
    </fieldset>
    {job && <div aria-live="polite"><h3>Job {job.id}: {job.state}</h3><p>{job.processedRows} rows processed · {job.outcomes.filter(o => o.state === 'created').length} created · {job.outcomes.filter(o => o.state === 'updated').length} updated · {job.outcomes.filter(o => o.state === 'rejected').length} rejected</p><button disabled={busy} onClick={() => void work(async () => setJob(await client.job(orgId, job.id)))}>Refresh progress</button><button disabled={busy || !canImport || job.state === 'completed'} onClick={() => void work(async () => setJob(await client.retry(orgId, job.id)))}>Retry unfinished rows in this job</button>{job.outcomes.map(o => <p key={o.row}>Row {o.row}: {o.state} {o.issues.map(i => i.message).join('; ')}</p>)}<p>Rejected rows require correction and a new reviewed job. Completed rows are never retried.</p></div>}
    {busy && <p role="status">Working…</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
