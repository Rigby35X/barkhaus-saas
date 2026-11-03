import type { AnimalId, AnimalRecord, OrganizationId } from '../../../../../shared/contracts/v1/animal.ts';
import type { AnimalWrite, WriteActor, WriteResult } from '../../../../../shared/contracts/v1/ingestion.ts';

/** Trusted server adapters only. Never implement this interface in a browser.
 * All methods run on the SAME transaction/connection, including authorization.
 * Fail/throw rolls back rows, identities, revision, receipt and ingestion outcome.
 */
export interface AnimalTransaction {
  /** Re-read active membership or trusted connection worker grant, under revocation-safe locking.
   * Bind this adapter to a VERIFIED bearer/session or worker capability outside command JSON.
   * Checking whether a claimed user/connection merely exists is NOT authentication.
   * Derive role from current DB state; never return claim.role without verification. */
  verifyActor(claim: WriteActor): Promise<WriteActor | null>;
  get(orgId: OrganizationId, id: AnimalId): Promise<AnimalRecord | null>;
  list(orgId: OrganizationId): Promise<AnimalRecord[]>;
  findSource(orgId: OrganizationId, connectionId: string, externalRecordId: string): Promise<AnimalRecord | null>;
  findImport(orgId: OrganizationId, mappingId: string, importKey: string): Promise<AnimalRecord | null>;
  /** Check connection/mapping/job same-org FKs, pinned mapping, input file, job state, worker lease.
   * Must atomically record CSV row outcomes/checkpoints alongside put/receipts. */
  verifyIngestion(actor: WriteActor, command: AnimalWrite): Promise<boolean>;
  provider(orgId: OrganizationId, connectionId: string): Promise<string>;
  allocateId(): Promise<AnimalId>;
  /** Compare-and-swap and unique identity/public key constraints. null revision means INSERT only. */
  put(animal: AnimalRecord, expectedRevision: number | null): Promise<boolean>;
  receipt(scope: readonly (string | number)[]): Promise<{ fingerprint: string; result: WriteResult } | null>;
  saveReceipt(scope: readonly (string | number)[], fingerprint: string, result: WriteResult): Promise<void>;
  /** Opaque revision history, NEVER lexical ordering. CAS and a serialized connection lease are mandatory. */
  hasSourceRevision(orgId: number, connectionId: string, externalId: string, revision: string): Promise<boolean>;
  saveSourceRevision(orgId: number, connectionId: string, externalId: string, revision: string): Promise<void>;
  /** Only vetted image assets owned by this org or approved source ingestion; no fetching here. */
  isPhotoAllowed(orgId: number, url: string): Promise<boolean>;
  /** Must verify private bucket, animal association, object org, current membership and signed TTL. */
  signPrivateDocument(orgId: number, animalId: AnimalId, documentId: string, expiresInSeconds: number): Promise<string | null>;
}
export interface AnimalRepository {
  /** Serializable with bounded retry, or equivalent row/advisory locks for identity+receipt+CAS.
   * Retry callbacks must not cause external effects. Never return before durable commit. */
  transaction<T>(run: (tx: AnimalTransaction) => Promise<T>): Promise<T>;
}
