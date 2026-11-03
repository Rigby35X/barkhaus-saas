import type { AnimalWrite } from '../../../../../shared/contracts/v1/ingestion.ts';

export class InvalidAnimalInput extends Error {}
export const fail = (): never => { throw new InvalidAnimalInput('Invalid animal command'); };
export function object(v: unknown): Record<string, any> {
  if (!v || typeof v !== 'object' || Array.isArray(v) || ![Object.prototype, null].includes(Object.getPrototypeOf(v))) fail();
  return v as Record<string, any>;
}
function keys(v: unknown, allowed: string[], required: string[] = allowed) {
  const o = object(v);
  if (Object.keys(o).some(k => !allowed.includes(k)) || required.some(k => !Object.hasOwn(o, k))) fail();
  return o;
}
export function text(v: unknown, nonblank = true, max = 10000): asserts v is string {
  if (typeof v !== 'string' || v.length > max || (nonblank && !v.trim())) fail();
}
export function positive(v: unknown): asserts v is number { if (!Number.isSafeInteger(v) || (v as number) < 1) fail(); }
export function animalId(v: unknown) { if (typeof v === 'number') positive(v); else text(v, true, 200); }
function enumeration(v: unknown, values: string[]) { if (!values.includes(v as string)) fail(); }
export function https(v: unknown) {
  text(v, true, 2048);
  try { const u = new URL(v); if (u.protocol !== 'https:' || u.username || u.password || u.hash) fail(); } catch { fail(); }
}
function date(v: unknown) {
  text(v, true, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v || v > new Date().toISOString().slice(0, 10)) fail();
}
function age(v: unknown) {
  const o = object(v);
  if (o.kind === 'unknown') keys(o, ['kind']);
  else if (o.kind === 'birthday') { keys(o, ['kind', 'date', 'estimated']); date(o.date); if (typeof o.estimated !== 'boolean') fail(); }
  else if (o.kind === 'estimate') { keys(o, ['kind', 'label', 'asOf']); text(o.label, true, 200); date(o.asOf); }
  else fail();
}
export function photos(v: unknown, approval = false) {
  if (!Array.isArray(v) || v.length > 30) fail();
  const ids = new Set();
  for (const p of v as any[]) {
    keys(p, approval ? ['id', 'url'] : ['id', 'url', 'alt']); text(p.id, true, 200); https(p.url);
    if (ids.has(p.id)) fail(); ids.add(p.id);
    if (!approval) text(p.alt, false, 500);
  }
}
export const FIELD_NAMES = ['name','species','breed','age','sex','size','biography','photos','lifecycle','availability'];
export function fields(v: unknown, partial = false) {
  const o = keys(v, FIELD_NAMES, partial ? [] : FIELD_NAMES);
  for (const [k, value] of Object.entries(o)) {
    if (k === 'name' || k === 'species') text(value, true, 200);
    else if (k === 'breed' || k === 'biography') { if (value !== null) text(value, false); }
    else if (k === 'age') age(value);
    else if (k === 'photos') photos(value);
    else if (k === 'sex') enumeration(value, ['male','female','unknown']);
    else if (k === 'size') enumeration(value, ['small','medium','large','extra_large','unknown']);
    else if (k === 'lifecycle') enumeration(value, ['intake','care','adopted','transferred','deceased','unknown']);
    else enumeration(value, ['available','pending','unavailable','unknown']);
  }
}
function json(v: unknown, depth = 0): void {
  if (depth > 12) fail();
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return;
  if (typeof v === 'number') { if (!Number.isFinite(v)) fail(); return; }
  if (Array.isArray(v)) { v.forEach(x => json(x, depth + 1)); return; }
  const o = object(v);
  for (const [k, value] of Object.entries(o)) { if (['__proto__','constructor','prototype'].includes(k)) fail(); json(value, depth + 1); }
}
function custom(v: unknown) {
  const o = object(v);
  if (Object.keys(o).length > 100) fail();
  json(o);
  for (const k of Object.keys(o)) text(k, true, 100);
}
export function validateAnimalWrite(input: unknown): AnimalWrite {
  // Bound the whole payload before walking nested custom values.
  let encoded: string;
  try { encoded = JSON.stringify(input); } catch { return fail(); }
  if (!encoded || new TextEncoder().encode(encoded).length > 256000) fail();
  const snapshot: unknown = JSON.parse(encoded);
  const c = object(snapshot);
  const base = ['version','orgId','idempotencyKey','kind'];
  if (c.version !== 1) fail(); positive(c.orgId); text(c.idempotencyKey, true, 200);
  const update = ['animalId','expectedRevision'];
  switch (c.kind) {
    case 'create_native':
      keys(c, [...base,'fields','customFields','csvOrigin'], [...base,'fields']); fields(c.fields);
      if (c.csvOrigin !== undefined) { keys(c.csvOrigin, ['jobId','mappingId','importKey']); text(c.csvOrigin.jobId); text(c.csvOrigin.mappingId); if (c.csvOrigin.importKey !== null) text(c.csvOrigin.importKey); }
      break;
    case 'edit_native':
      keys(c, [...base,...update,'fields','customFields','internalNotes'], [...base,...update,'fields']); fields(c.fields, true);
      if (c.internalNotes !== undefined) text(c.internalNotes, false);
      break;
    case 'publish':
      keys(c, [...base,...update,'publicProfileKey','approvedPhotos']); text(c.publicProfileKey, true, 200);
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(c.publicProfileKey)) fail(); photos(c.approvedPhotos, true); break;
    case 'archive': case 'unpublish': keys(c, [...base,...update]); break;
    case 'source_upsert':
      keys(c, [...base,'connectionId','externalRecordId','sourceRevision','expectedRevision','fields','customFields'], [...base,'connectionId','externalRecordId','sourceRevision','expectedRevision','fields']);
      text(c.connectionId, true, 200); text(c.externalRecordId, true, 200);
      if (c.sourceRevision !== null) text(c.sourceRevision, true, 200);
      if (c.expectedRevision !== null) positive(c.expectedRevision); fields(c.fields, true); break;
    default: fail();
  }
  if (c.kind !== 'create_native' && c.kind !== 'source_upsert') { animalId(c.animalId); positive(c.expectedRevision); }
  if (c.customFields !== undefined) custom(c.customFields);
  // Own a detached snapshot; callers cannot mutate it during an await.
  return JSON.parse(encoded) as AnimalWrite;
}
