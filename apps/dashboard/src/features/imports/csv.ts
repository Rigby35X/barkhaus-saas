import { mapLegacyStatus } from '../../../../../shared/contracts/v1/animal.ts';
import type { AnimalFields, JsonValue } from '../../../../../shared/contracts/v1/animal.ts';
import type { CsvMatching, RowIssue, SavedMapping } from '../../../../../shared/contracts/v1/ingestion.ts';

export const IMPORT_LIMITS = Object.freeze({ maxBytes: 5 * 1024 * 1024, maxRows: 5000, batchSize: 50 });
export const TRANSFORMS = ['trim', 'lowercase', 'birthday', 'estimated_birthday', 'age_label', 'status'] as const;
export const CORE_FIELDS = ['name', 'species', 'breed', 'age', 'sex', 'size', 'biography', 'photos', 'lifecycle', 'availability'] as const;
const LIFECYCLES = ['intake', 'care', 'adopted', 'transferred', 'deceased', 'unknown'];
const AVAILABILITY = ['available', 'pending', 'unavailable', 'unknown'];
export function requireValue(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
export function exact(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'Expected object');
  requireValue(Object.keys(value).every(k => keys.includes(k)), 'Unexpected property');
}
export function textId(v: unknown): v is string { return typeof v === 'string' && v.trim().length > 0 && v.length <= 200; }
export function positive(v: unknown): v is number { return Number.isSafeInteger(v) && Number(v) > 0; }
export function validDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
}
export function validateMapping(value: unknown, orgId: number): asserts value is SavedMapping {
  exact(value, ['version', 'id', 'revision', 'orgId', 'fields', 'statusMap']);
  requireValue(value.version === 1 && positive(orgId) && value.orgId === orgId && textId(value.id) && positive(value.revision), 'Invalid mapping scope or revision');
  requireValue(Array.isArray(value.fields) && value.fields.length > 0 && value.fields.length <= 100, 'Invalid mapping fields');
  const targets = new Set<string>();
  for (const field of value.fields) {
    exact(field, ['sourceColumn', 'target', 'transform']);
    requireValue(textId(field.sourceColumn), 'Invalid source column');
    exact(field.target, ['kind', 'field', 'key']);
    const target = field.target;
    requireValue((target.kind === 'core' && Object.keys(target).length === 2 && CORE_FIELDS.includes(target.field as keyof AnimalFields)) ||
      (target.kind === 'custom' && Object.keys(target).length === 2 && typeof target.key === 'string' && /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(target.key) && !['constructor', 'prototype', '__proto__'].includes(target.key)), 'Invalid mapping target');
    requireValue(field.transform === null || TRANSFORMS.includes(field.transform as typeof TRANSFORMS[number]), 'Transform is not allowlisted');
    if (target.kind === 'core') {
      requireValue(target.field !== 'photos', 'Photo imports are disabled until a vetted ingestion service is integrated');
      requireValue(target.field !== 'availability', 'Map status through lifecycle with the status transform');
      requireValue(target.field !== 'lifecycle' || field.transform === 'status', 'Lifecycle requires status transform');
      requireValue(target.field !== 'age' || ['birthday', 'estimated_birthday', 'age_label'].includes(String(field.transform)), 'Age requires an explicit transform');
    }
    requireValue(field.transform !== 'status' || (target.kind === 'core' && target.field === 'lifecycle'), 'Status transform requires lifecycle target');
    requireValue(!['birthday', 'estimated_birthday', 'age_label'].includes(String(field.transform)) || (target.kind === 'core' && target.field === 'age'), 'Age transform requires age target');
    const key = target.kind === 'core' ? `core:${target.field}` : `custom:${target.key}`;
    requireValue(!targets.has(key), 'Duplicate mapping target'); targets.add(key);
  }
  requireValue(value.statusMap && typeof value.statusMap === 'object' && !Array.isArray(value.statusMap) && Object.keys(value.statusMap).length <= 100, 'Invalid status map');
  for (const [key, status] of Object.entries(value.statusMap)) {
    requireValue(textId(key), 'Invalid status label'); exact(status, ['lifecycle', 'availability']);
    requireValue(LIFECYCLES.includes(String(status.lifecycle)) && AVAILABILITY.includes(String(status.availability)), 'Invalid mapped status');
  }
}
export type ParsedCsv = { headers: string[]; rows: { row: number; cells: string[] }[]; issues: RowIssue[] };
/** Logical CSV record numbers (header = 1), including records with embedded newlines. */
export function parseCsv(source: string): ParsedCsv {
  requireValue(typeof source === 'string' && new TextEncoder().encode(source).length <= IMPORT_LIMITS.maxBytes, 'CSV exceeds byte limit');
  const input = source.replace(/^\uFEFF/, '');
  const records: string[][] = []; let cells: string[] = []; let cell = ''; let quoted = false; let closed = false;
  const issues: RowIssue[] = [];
  const issue = (message: string) => { if (!issues.some(i => i.row === records.length + 1)) issues.push({ row: records.length + 1, field: null, code: 'csv_syntax', message }); };
  const endCell = () => { cells.push(cell); requireValue(cells.length <= 100, 'CSV column limit exceeded'); cell = ''; closed = false; };
  const endRow = () => { endCell(); records.push(cells); cells = []; requireValue(records.length <= IMPORT_LIMITS.maxRows + 1, 'CSV exceeds row limit'); };
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === ',') endCell();
    else if (c === '\r' || c === '\n') { if (c === '\r' && input[i + 1] === '\n') i++; endRow(); }
    else if (c === '"' && !cell && !closed) quoted = true;
    else { if (closed || c === '"') issue('Unexpected character outside quoted field'); cell += c; }
    requireValue(cell.length <= 20000 && cells.length <= 100, 'CSV cell or column limit exceeded');
  }
  if (quoted) issue('Unterminated quoted field');
  if (cell || cells.length || closed || quoted) endRow();
  const headers = (records.shift() ?? []).map(h => h.trim());
  requireValue(headers.length > 0 && headers.length <= 100 && headers.every(Boolean), 'Missing CSV header');
  requireValue(new Set(headers.map(h => h.toLowerCase())).size === headers.length, 'Duplicate CSV header');
  const rows = records.map((cells, i) => ({ row: i + 2, cells }));
  for (const r of rows) if (r.cells.length !== headers.length) issues.push({ row: r.row, field: null, code: 'column_count', message: `Expected ${headers.length} columns; received ${r.cells.length}` });
  return { headers, rows, issues };
}
export type PreviewRow = { row: number; fields: AnimalFields; patch: Partial<AnimalFields>; customFields: Record<string, JsonValue>; importKey: string | null; issues: RowIssue[] };
export type ImportPreview = { headers: string[]; rows: PreviewRow[]; issues: RowIssue[]; warnings: string[] };
export function validateMatching(matching: unknown, mapping: SavedMapping, headers: string[], rows: readonly { row: number }[]): asserts matching is CsvMatching {
  exact(matching, ['mode', 'mappingId', 'keyColumn', 'resolutions']);
  if (matching.mode === 'stable_key') {
    requireValue(Object.keys(matching).length === 3 && matching.mappingId === mapping.id && typeof matching.keyColumn === 'string' && headers.includes(matching.keyColumn), 'Invalid stable key scope or column');
  } else if (matching.mode === 'create_only') requireValue(Object.keys(matching).length === 1, 'Invalid create-only matching');
  else {
    requireValue(matching.mode === 'reviewed' && Object.keys(matching).length === 2 && Array.isArray(matching.resolutions) && matching.resolutions.length <= IMPORT_LIMITS.maxRows, 'Choose stable keys, create-only, or reviewed matching');
    const seen = new Set<number>(); const updates = new Set<string>();
    for (const r of matching.resolutions) {
      exact(r, ['row', 'action', 'animalId', 'expectedRevision']);
      requireValue(typeof r.row === 'number' && rows.some(row => row.row === r.row) && !seen.has(r.row), 'Invalid or duplicate reviewed row'); seen.add(r.row);
      requireValue((r.action === 'create' && Object.keys(r).length === 2) || (r.action === 'update' && Object.keys(r).length === 4 && (textId(r.animalId) || positive(r.animalId)) && positive(r.expectedRevision)), 'Reviewed update requires animal ID and revision');
      if (r.action === 'update') { const id = JSON.stringify(r.animalId); requireValue(!updates.has(id), 'Two rows cannot update the same animal'); updates.add(id); }
    }
  }
}
/** Pure preview: no storage, network, animal writer, or publication commands. */
export function previewCsv(source: string, mapping: SavedMapping, matching: CsvMatching, asOf: string, orgId: number): ImportPreview {
  validateMapping(mapping, orgId); requireValue(validDate(asOf), 'Invalid preview date');
  const parsed = parseCsv(source); validateMatching(matching, mapping, parsed.headers, parsed.rows);
  for (const f of mapping.fields) requireValue(parsed.headers.includes(f.sourceColumn), `Missing mapped column: ${f.sourceColumn}`);
  const keyRows = new Map<string, PreviewRow[]>();
  const rows = parsed.rows.map(r => {
    const issues = parsed.issues.filter(i => i.row === r.row);
    const add = (field: string, code: string, message: string) => issues.push({ row: r.row, field, code, message });
    const patch: Partial<AnimalFields> = {}; const customFields: Record<string, JsonValue> = Object.create(null);
    for (const f of mapping.fields) {
      let value = r.cells[parsed.headers.indexOf(f.sourceColumn)] ?? '';
      if (f.transform === 'trim') value = value.trim();
      if (f.transform === 'lowercase') value = value.trim().toLowerCase();
      if (f.target.kind === 'custom') { customFields[f.target.key] = value; continue; }
      const field = f.target.field;
      if (field === 'age') {
        if (!value.trim()) patch.age = { kind: 'unknown' };
        else if (f.transform === 'age_label') {
          if (/^\s*[\d.]+\s*$/.test(value)) add(field, 'ambiguous_age', 'Age label requires units');
          else patch.age = { kind: 'estimate', label: value.trim(), asOf };
        } else if (!validDate(value.trim()) || value.trim() > asOf) add(field, 'invalid_date', 'Birthday must be a real nonfuture ISO date (YYYY-MM-DD)');
        else patch.age = { kind: 'birthday', date: value.trim(), estimated: f.transform === 'estimated_birthday' };
      } else if (field === 'lifecycle') {
        const status = Object.hasOwn(mapping.statusMap, value.trim()) ? mapping.statusMap[value.trim()] : mapLegacyStatus(value);
        if (status.lifecycle === 'unknown' && !Object.hasOwn(mapping.statusMap, value.trim())) add(field, 'unknown_status', 'Status requires an approved saved mapping');
        else Object.assign(patch, status);
      } else if (field === 'sex') {
        const sex = value.trim().toLowerCase();
        if (sex && !['male', 'female', 'unknown'].includes(sex)) add(field, 'invalid_enum', 'Sex must be male, female, or unknown');
        else patch.sex = (sex || 'unknown') as AnimalFields['sex'];
      } else if (field === 'size') {
        const size = value.trim().toLowerCase();
        if (size && !['small', 'medium', 'large', 'extra_large', 'unknown'].includes(size)) add(field, 'invalid_enum', 'Size must be small, medium, large, extra_large, or unknown');
        else patch.size = (size || 'unknown') as AnimalFields['size'];
      } else if (field === 'name' || field === 'species') patch[field] = value.trim();
      else if (field === 'breed' || field === 'biography') patch[field] = value.trim() || null;
    }
    for (const field of ['name', 'species'] as const) if (!patch[field]) add(field, 'required', `${field === 'name' ? 'Name' : 'Species'} is required`);
    const fields: AnimalFields = { name: '', species: '', breed: null, age: { kind: 'unknown' }, sex: 'unknown', size: 'unknown', biography: null, photos: [], lifecycle: 'unknown', availability: 'unknown', ...patch };
    const importKey = matching.mode === 'stable_key' ? (r.cells[parsed.headers.indexOf(matching.keyColumn)] ?? '').trim() : null;
    if (matching.mode === 'stable_key' && !textId(importKey)) add(matching.keyColumn, 'missing_key', 'Stable import key is required (maximum 200 characters)');
    if (matching.mode === 'reviewed' && !matching.resolutions.some(x => x.row === r.row)) add('matching', 'resolution_required', 'Explicit create or update resolution is required');
    const result = { row: r.row, fields, patch, customFields, importKey, issues };
    if (importKey) keyRows.set(importKey, [...(keyRows.get(importKey) ?? []), result]);
    return result;
  });
  for (const matches of keyRows.values()) if (matches.length > 1) for (const row of matches) row.issues.push({ row: row.row, field: matching.mode === 'stable_key' ? matching.keyColumn : null, code: 'duplicate_key', message: 'Duplicate stable key in this file; resolve before importing' });
  return { headers: parsed.headers, rows, issues: [...parsed.issues.filter(i => i.row === 1), ...rows.flatMap(r => r.issues)], warnings: matching.mode === 'create_only' ? ['A new create-only job deliberately creates new records, even for a previously imported file. Retry the same job to avoid duplicates.'] : [] };
}
