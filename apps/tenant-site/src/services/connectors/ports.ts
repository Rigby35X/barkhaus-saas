import type { AnimalRecord } from '../../../../../shared/contracts/v1/animal.ts';
import type { AnimalWriteService, ConnectorPage, SyncJob, WriteActor } from '../../../../../shared/contracts/v1/ingestion.ts';
import type { CognitoConnection } from './config.ts';

export type Scope = { orgId: number; connectionId: string };
export type Lease = Scope & { jobId: string; token: string; expiresAt: number };
export type Snapshot = Record<string, AnimalRecord>; // Read BEFORE provider fetch; immutable for this inbox page.
export type SuccessPage = Extract<ConnectorPage, { kind: 'success' }>;
export interface Inbox { page: SuccessPage; before: Snapshot; completed: readonly string[] }
export interface ClaimedJob { lease: Lease; connection: CognitoConnection; job: SyncJob }
export interface ConnectorTransaction {
  /** B's writer bound to this SAME transaction, with A's worker authorization. */
  writer: AnimalWriteService;
  /** Private animal reads belong to B's repository, scoped by org+connection. */
  current(externalRecordId: string): Promise<AnimalRecord | null>;
  sourceHead(externalRecordId: string): Promise<{ revision: string; digest: string } | null>;
  /** Ledger + outcome + seen identity + counts commit atomically with writer.execute. */
  recordOutcome(externalRecordId: string, outcome: 'created'|'updated'|'unchanged'|'stale', revision: string, digest: string): Promise<void>;
}
/** All methods must enforce tenant scope, active connection generation, cancellation,
 * deadline and current fencing token inside DB transactions. No in-process production store. */
export interface DurableConnectorStore {
  enqueue(scope: Scope, requestKey: string): Promise<SyncJob>; // Coalesce active jobs per connection; pin mapping ID+revision/config generation.
  status(scope: Scope, jobId: string): Promise<SyncJob>;
  disconnect(scope: Scope): Promise<void>; // Revoke leases/generation; keep records, local data and credentials out of response.
  claim(workerId: string, now: number, leaseMs: number): Promise<ClaimedJob | null>;
  assertLease(lease: Lease, now: number): Promise<void>;
  inbox(lease: Lease): Promise<Inbox | null>;
  snapshot(lease: Lease): Promise<Snapshot>;
  /** CAS inbox absent; persist immutable normalized page, digest and pre-fetch snapshot.
   * Also bound page count, total rows, cursor history and encrypted payload bytes. */
  saveInbox(lease: Lease, page: SuccessPage, before: Snapshot): Promise<void>;
  transaction<T>(lease: Lease, operation: (tx: ConnectorTransaction) => Promise<T>): Promise<T>;
  /** Require every inbox row outcome. Atomically advance cursor and clear inbox;
   * terminal completeSnapshot after a verified full traversal may mark unseen scoped identities missing_review.
   * Reset consecutive attempt count after successful page; reaper bounds abandoned attempts.
   * Partial/failure/cancelled traversals NEVER mark missing. Never delete records. */
  checkpoint(lease: Lease): Promise<void>;
  /** Release lease; terminal failure or bounded retry_wait, safe code/message only. */
  fail(lease: Lease, failure: { code: string; message: string; nextAttemptAt: string | null }): Promise<void>;
  release(lease: Lease): Promise<void>;
}
export interface TrustedConnectorAuth {
  /** Verify workload identity, audience, expiry and allowlist; not a JSON WriteActor. */
  worker(proof: unknown): Promise<{ workerId: string }>;
  /** Resolve active membership server-side. Never accept role/org from body. */
  member(proof: unknown, orgId: number): Promise<Extract<WriteActor, {kind:'member'}>>;
}
