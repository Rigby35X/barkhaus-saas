import type { AnimalId, AnimalRecord } from '../../../../../shared/contracts/v1/animal.ts';
import type { AnimalWrite, WriteResult } from '../../../../../shared/contracts/v1/ingestion.ts';
import { getAdminApiUrl, getAuthHeaders } from '../../lib/api';

export class AnimalRequestError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export async function animalRequest<T>(orgId: number, query = '', command?: AnimalWrite): Promise<T> {
  if (!Number.isSafeInteger(orgId) || orgId < 1) throw new Error('An organization is required.');
  const admin = new URL(await getAdminApiUrl(orgId, 'animals'));
  admin.pathname = '/api/v1/animals';
  admin.search = query;
  const response = await fetch(admin, {
    method: command ? 'POST' : 'GET',
    headers: { ...await getAuthHeaders(), ...(command ? { 'Content-Type': 'application/json' } : {}) },
    body: command ? JSON.stringify(command) : undefined,
    cache: 'no-store',
  });
  if (!response.ok) throw new AnimalRequestError(response.status, response.status === 409
    ? 'This animal changed. Your attempted input is preserved. Reload the latest record to review before trying again.'
    : response.status === 403 ? 'You do not have permission for this operation.'
    : response.status === 503 ? 'Animal management is awaiting secure storage setup.'
    : `Animal request failed (${response.status}).`);
  return response.json() as Promise<T>;
}
export const listAnimals = (orgId: number) => animalRequest<AnimalRecord[]>(orgId, `orgId=${orgId}`);
export const readAnimal = (orgId: number, id: AnimalId) => animalRequest<AnimalRecord>(orgId, `orgId=${orgId}&animalId=${encodeURIComponent(JSON.stringify(id))}`);
export async function writeAnimal(command: AnimalWrite) {
  const result = await animalRequest<WriteResult>(command.orgId, '', command);
  if (!result.ok) throw new Error(`Animal write failed: ${result.code}`);
  return result.animal;
}
export const readDocument = (orgId: number, id: AnimalId, documentId: string) => animalRequest<{ url: string; expiresInSeconds: number }>(orgId,
  `orgId=${orgId}&animalId=${encodeURIComponent(JSON.stringify(id))}&documentId=${encodeURIComponent(documentId)}`);

/** Keep the SAME command/key for a network retry; changed drafts get a new key. */
export function pendingCommand(previous: AnimalWrite | null, next: AnimalWrite): AnimalWrite {
  if (previous && JSON.stringify({ ...previous, idempotencyKey: '' }) === JSON.stringify({ ...next, idempotencyKey: '' })) return previous;
  return next;
}
