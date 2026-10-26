import { isHttpsUrl, mapLegacyStatus } from './animal.ts';
import type { AnimalFields, AnimalId } from './animal.ts';

export interface LegacyReview {
  id: AnimalId;
  orgId: number;
  fields: AnimalFields;
  legacyStatus: string;
  publication: { state: 'unpublished'; publicProfileKey: null; approvedPhotos: readonly [] };
  issues: readonly string[];
}

/** Read-only reconciliation preview, NOT a migration/upsert or MBPR feed adapter.
 * Private legacy fields stay in storage until A approves a lossless migration.
 * Ambiguous aliases are flagged; no identity or publication is inferred.
 */
export function reconcileLegacyAnimal(row: Record<string, unknown>, asOf: string): LegacyReview {
  const issues: string[] = [];
  const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  if (!validDate(asOf)) throw new Error('A valid reconciliation date is required');
  const orgs = [row.org_id, row.organization_id, typeof row.org === 'object' && row.org !== null ? (row.org as { id?: unknown }).id : row.org]
    .filter(v => v !== undefined && v !== null);
  const orgId = orgs[0];
  if (typeof orgId !== 'number' || !Number.isSafeInteger(orgId) || orgId <= 0 || orgs.some(v => v !== orgId)) {
    throw new Error('Missing, invalid or conflicting organization association');
  }
  const id = row.id;
  if (!((typeof id === 'number' && Number.isSafeInteger(id) && id > 0) || (typeof id === 'string' && id.trim()))) throw new Error('Missing stable animal ID');
  const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
  const alias = (...keys: string[]): string => {
    const values = keys.map(k => text(row[k])).filter(Boolean);
    if (new Set(values).size > 1) issues.push(`Conflicting aliases: ${keys.join(', ')}`);
    return values[0] ?? '';
  };
  const name = text(row.name);
  const species = text(row.species);
  if (!name || !species) issues.push('Name and species are required before writing');
  const legacyStatus = alias('status', 'Code');
  const status = mapLegacyStatus(legacyStatus);
  if (status.lifecycle === 'unknown') issues.push('Unmapped status requires an explicit saved mapping');
  const sexText = text(row.gender).toLowerCase();
  const sex = sexText === 'male' || sexText === 'female' ? sexText : 'unknown';
  const sizeText = text(row.size).toLowerCase().replace(/[ -]/g, '_');
  const size = ['small', 'medium', 'large', 'extra_large'].includes(sizeText) ? sizeText as AnimalFields['size'] : 'unknown';
  let age: AnimalFields['age'] = { kind: 'unknown' };
  const birthday = text(row.birthday);
  if (birthday) {
    if (validDate(birthday) && birthday <= asOf) {
      if (typeof row.birthday_estimated === 'boolean' && typeof row.birthday_is_estimated === 'boolean' && row.birthday_estimated !== row.birthday_is_estimated) issues.push('Conflicting birthday estimate flags');
      const estimate = row.birthday_estimated ?? row.birthday_is_estimated;
      if (typeof estimate !== 'boolean') issues.push('Birthday estimate flag needs review');
      age = { kind: 'birthday', date: birthday, estimated: estimate !== false };
    } else issues.push('Invalid or future birthday');
  } else if (text(row.age)) age = { kind: 'estimate', label: text(row.age), asOf };
  else if (row.age !== undefined && row.age !== null) issues.push('Numeric age has no defined unit');
  const urls: string[] = [];
  const photo = (value: unknown) => {
    const url = typeof value === 'object' && value !== null ? text((value as { url?: unknown }).url) : text(value);
    if (!url) return;
    if (!isHttpsUrl(url)) { issues.push('Photo requires a vetted HTTPS ingestion path'); return; }
    if (!urls.includes(url)) urls.push(url);
  };
  // photo_url is used inconsistently by callers; preserve both candidates for review.
  ['image_url', 'photo_url', 'main_image', 'additional_image_1', 'additional_image_2', 'additional_image_3', 'additional_image_4'].forEach(k => photo(row[k]));
  if (Array.isArray(row.images)) row.images.forEach(photo);
  return {
    id, orgId, legacyStatus, publication: { state: 'unpublished', publicProfileKey: null, approvedPhotos: [] }, issues,
    fields: {
      name, species, breed: alias('breed', 'breed_primary') || null, age, sex, size,
      biography: alias('description_long', 'description') || null,
      photos: urls.map((url, index) => ({ id: `legacy-photo-${index}`, url, alt: '' })),
      ...status,
    },
  };
}
