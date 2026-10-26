/** Frozen coordinator contract v1. No database or provider SDK dependencies. */
export const CONTRACT_VERSION = 'barkhaus.animal.v1' as const;
export type OrganizationId = number; // Retain existing positive safe-integer IDs.
export type AnimalId = string | number; // Retain existing IDs; never derive from name.
export type Lifecycle = 'intake' | 'care' | 'adopted' | 'transferred' | 'deceased' | 'unknown';
export type Availability = 'available' | 'pending' | 'unavailable' | 'unknown';
export type PublicationState = 'unpublished' | 'published' | 'archived';
export type Sex = 'male' | 'female' | 'unknown';
export type Size = 'small' | 'medium' | 'large' | 'extra_large' | 'unknown';

/** Birthday takes precedence; age labels are source estimates, never fabricated dates. */
export type AnimalAge =
  | { kind: 'birthday'; date: string; estimated: boolean }
  | { kind: 'estimate'; label: string; asOf: string }
  | { kind: 'unknown' };

export interface Photo {
  id: string;
  url: string; // Approved HTTPS image/storage URL; remote ingestion is a separate service.
  alt: string;
}

export interface AnimalFields {
  name: string;
  species: string;
  breed: string | null;
  age: AnimalAge;
  sex: Sex;
  size: Size;
  biography: string | null;
  photos: readonly Photo[]; // Order is display order; first approved photo is primary.
  lifecycle: Lifecycle;
  availability: Availability;
}

export type FieldOwner = { kind: 'barkhaus' } | { kind: 'connector'; connectionId: string };
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export interface CustomField { value: JsonValue; owner: FieldOwner }
export type AnimalSource =
  | { kind: 'native'; csvOrigin?: { jobId: string; mappingId: string; importKey: string | null } }
  | { kind: 'connector'; connectionId: string; provider: string; externalRecordId: string };

export interface AnimalRecord {
  contractVersion: typeof CONTRACT_VERSION;
  id: AnimalId;
  orgId: OrganizationId;
  revision: number; // Positive integer, atomically incremented by the write service.
  source: AnimalSource;
  fields: AnimalFields;
  ownership: Record<keyof AnimalFields, FieldOwner>;
  publication: { state: PublicationState; publicProfileKey: string | null; approvedPhotos: readonly { id: string; url: string }[] };
  privateData: { internalNotes: string; medicalRecordIds: readonly string[]; documentIds: readonly string[] };
  customFields: Record<string, CustomField>; // Always private in v1; ownership is per mapped key.
  syncState: 'current' | 'missing_review' | 'disconnected' | 'never_synced';
}

/** Explicit public allowlist; no IDs, ownership, private/custom/source fields. */
export interface PublicAnimalProfile {
  contractVersion: typeof CONTRACT_VERSION;
  publicProfileKey: string;
  name: string;
  species: string;
  breed: string | null;
  age: AnimalAge;
  sex: Sex;
  size: Size;
  biography: string | null;
  photos: readonly { url: string; alt: string }[];
  availability: Availability;
}

/** Construct a fresh object: never spread a database row into a public response. */
export function toPublicAnimal(record: AnimalRecord): PublicAnimalProfile | null {
  if (record.publication.state !== 'published' || !record.publication.publicProfileKey?.trim()) return null;
  const f = record.fields;
  const age: AnimalAge = f.age.kind === 'birthday'
    ? { kind: 'birthday', date: f.age.date, estimated: f.age.estimated }
    : f.age.kind === 'estimate'
      ? { kind: 'estimate', label: f.age.label, asOf: f.age.asOf }
      : { kind: 'unknown' };
  return {
    contractVersion: CONTRACT_VERSION, publicProfileKey: record.publication.publicProfileKey,
    name: f.name, species: f.species, breed: f.breed, age, sex: f.sex, size: f.size,
    biography: f.biography, availability: f.availability,
    photos: f.photos.filter(p => record.publication.approvedPhotos.some(a => a.id === p.id && a.url === p.url) && isHttpsUrl(p.url)).map(p => ({ url: p.url, alt: p.alt })),
  };
}

export function isHttpsUrl(value: string): boolean {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; }
  catch { return false; }
}

/** Unknown legacy statuses require review, never default to available or adopted. */
export function mapLegacyStatus(status: string): Pick<AnimalFields, 'lifecycle' | 'availability'> {
  switch (status.trim().toLowerCase()) {
    case 'available': case 'available now': case 'available: now':
      return { lifecycle: 'care', availability: 'available' };
    case 'pending': return { lifecycle: 'care', availability: 'pending' };
    case 'adopted': return { lifecycle: 'adopted', availability: 'unavailable' };
    case 'deceased': return { lifecycle: 'deceased', availability: 'unavailable' };
    case 'transferred': return { lifecycle: 'transferred', availability: 'unavailable' };
    case 'intake': return { lifecycle: 'intake', availability: 'unavailable' };
    default: return { lifecycle: 'unknown', availability: 'unknown' };
  }
}

/** Compatibility adapter only; the production MBPR reader remains unchanged. */
export function legacyCognitoPublicKey(formId: string, entryNumber: string): string {
  if (!/^\d+$/.test(formId) || !/^\d+$/.test(entryNumber)) throw new Error('Invalid Cognito public identity');
  return `dog-${formId}-${entryNumber}`;
}
