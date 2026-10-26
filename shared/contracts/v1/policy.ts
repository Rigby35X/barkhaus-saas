import type { AnimalFields, AnimalRecord, CustomField, JsonValue } from './animal.ts';
import type { WriteActor, WriteFailure } from './ingestion.ts';

/** Pure shared policy, not authentication and not a replacement for DB RLS/CAS. */
export function planFieldUpdate(
  record: AnimalRecord,
  actor: WriteActor,
  expectedRevision: number,
  patch: Partial<AnimalFields>,
  customPatch: Record<string, JsonValue> = {},
): { ok: true; fields: AnimalFields; customFields: Record<string, CustomField>; nextRevision: number } | WriteFailure {
  if (actor.orgId !== record.orgId ||
    (actor.kind === 'member' && actor.role === 'viewer') ||
    (actor.kind === 'worker' && (record.source.kind !== 'connector' || record.source.connectionId !== actor.connectionId))) {
    return { ok: false, code: 'forbidden' };
  }
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1 || expectedRevision >= Number.MAX_SAFE_INTEGER || expectedRevision !== record.revision) return { ok: false, code: 'conflict' };
  const denied = Object.keys(patch).filter(key => {
    if (!Object.hasOwn(record.fields, key) || !Object.hasOwn(record.ownership, key)) return true;
    const owner = record.ownership[key as keyof AnimalFields];
    return actor.kind === 'member' ? owner.kind !== 'barkhaus' : owner.kind !== 'connector' || owner.connectionId !== actor.connectionId;
  });
  for (const key of Object.keys(customPatch)) {
    const owner = Object.hasOwn(record.customFields, key) ? record.customFields[key].owner : null;
    if (!owner || (actor.kind === 'member' ? owner.kind !== 'barkhaus' : owner.kind !== 'connector' || owner.connectionId !== actor.connectionId)) denied.push(`customFields.${key}`);
  }
  if (denied.length) return { ok: false, code: 'forbidden', fields: denied };
  const customFields = { ...record.customFields };
  for (const key of Object.keys(customPatch)) customFields[key] = { ...record.customFields[key], value: customPatch[key] };
  return { ok: true, fields: { ...record.fields, ...patch }, customFields, nextRevision: record.revision + 1 };
}

/** Missing records only become review candidates after a complete valid snapshot. */
export function missingRecordAction(outcome: 'failure' | 'partial' | 'complete', seen: boolean): 'keep' | 'missing_review' {
  return outcome === 'complete' && !seen ? 'missing_review' : 'keep';
}
