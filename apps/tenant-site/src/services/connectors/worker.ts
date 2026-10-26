import type { AnimalFields, JsonValue } from '../../../../../shared/contracts/v1/animal.ts';
import type { ConnectorAdapter } from '../../../../../shared/contracts/v1/ingestion.ts';
import { connectorIdentity } from '../../../../../shared/contracts/v1/ingestion.ts';
import { ConnectorError, safeMessage, validateConnection } from './config.ts';
import { sourceOrder } from './cognito.ts';
import type { DurableConnectorStore, TrustedConnectorAuth } from './ports.ts';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical((value as Record<string,unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export async function recordDigest(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(bytes), b=>b.toString(16).padStart(2,'0')).join('');
}
export interface WorkerOptions { leaseMs: number; timeoutMs: number; maxAttempts: number; baseDelayMs: number; maxDelayMs: number }
/** One bounded asynchronous delivery. Queue invokes independently of browser lifetime. */
export class ConnectorWorker {
  private readonly store: DurableConnectorStore;
  private readonly auth: TrustedConnectorAuth;
  private readonly adapter: ConnectorAdapter;
  private readonly options: WorkerOptions;
  private readonly now: () => number;
  private readonly random: () => number;
  constructor(store: DurableConnectorStore, auth: TrustedConnectorAuth,
    adapter: ConnectorAdapter, options: WorkerOptions,
    now: () => number = Date.now, random: () => number = Math.random) {
    this.store=store; this.auth=auth; this.adapter=adapter; this.options=options; this.now=now; this.random=random;
    const o = options;
    if (![o.leaseMs,o.timeoutMs,o.maxAttempts,o.baseDelayMs,o.maxDelayMs].every(x=>Number.isSafeInteger(x)&&x>0) ||
        o.maxAttempts > 20 || o.timeoutMs >= o.leaseMs || o.baseDelayMs > o.maxDelayMs) throw new Error('Invalid worker limits');
  }
  async runOnce(proof: unknown, signal?: AbortSignal): Promise<boolean> {
    const worker = await this.auth.worker(proof);
    const claimed = await this.store.claim(worker.workerId,this.now(),this.options.leaseMs);
    if (!claimed) return false;
    const {lease,connection:c,job} = claimed;
    const abort = AbortSignal.any([AbortSignal.timeout(this.options.timeoutMs), ...(signal ? [signal] : [])]);
    try {
      validateConnection(c);
      if (c.state !== 'active' || c.provider !== this.adapter.provider || job.orgId !== c.orgId || job.connectionId !== c.id || job.mappingRevision !== c.mapping.revision) throw new ConnectorError('cancelled');
      await this.store.assertLease(lease,this.now());
      let inbox = await this.store.inbox(lease);
      if (!inbox) {
        const before = await this.store.snapshot(lease);
        // Race deadline even when a buggy transport fails to honor AbortSignal.
        const page = await deadline(this.adapter.fetchPage(c,job.cursor,abort), abort);
        if (page.kind === 'failure') throw new ConnectorError(page.code,page.retryAfterSeconds);
        await this.store.assertLease(lease,this.now());
        await this.store.saveInbox(lease,page,before);
        inbox = await this.store.inbox(lease);
      }
      if (!inbox) throw new ConnectorError('unavailable');
      for (const record of inbox.page.records) {
        if (abort.aborted) throw new ConnectorError('unavailable');
        await this.store.assertLease(lease,this.now());
        if (inbox.completed.includes(record.externalRecordId)) continue;
        const identity = connectorIdentity(c.orgId,c.id,record.externalRecordId);
        const digest = await recordDigest({ fields:record.fields, customFields:record.customFields ?? {} });
        await this.store.transaction(lease,async tx=> {
          const head = await tx.sourceHead(record.externalRecordId);
          const order = sourceOrder(record.sourceRevision);
          if (head && order <= sourceOrder(head.revision)) {
            if (order === sourceOrder(head.revision) && digest !== head.digest) throw new ConnectorError('conflict');
            await tx.recordOutcome(record.externalRecordId,order < sourceOrder(head.revision) ? 'stale':'unchanged',head.revision,head.digest);
            return;
          }
          const current = await tx.current(record.externalRecordId);
          const before = inbox!.before[record.externalRecordId];
          if ((current?.revision ?? null) !== (before?.revision ?? null)) throw new ConnectorError('conflict');
          const fields: Partial<AnimalFields> = {};
          const customFields: Record<string,JsonValue> = Object.create(null);
          for (const key of Object.keys(record.fields) as (keyof AnimalFields)[]) {
            const owner = current?.ownership[key];
            if (!current || owner?.kind === 'connector' && owner.connectionId === c.id) Object.assign(fields,{[key]:record.fields[key]});
          }
          for (const [key,value] of Object.entries(record.customFields ?? {})) {
            const owner = current?.customFields[key]?.owner;
            if (!current || owner?.kind === 'connector' && owner.connectionId === c.id) customFields[key] = value;
          }
          const result = await tx.writer.execute({kind:'worker',orgId:c.orgId,connectionId:c.id},{
            version:1,kind:'source_upsert',orgId:c.orgId,connectionId:c.id,externalRecordId:record.externalRecordId,
            sourceRevision:record.sourceRevision,expectedRevision:before?.revision ?? null,
            idempotencyKey:await recordDigest([identity,job.id,job.cursor,record.sourceRevision,digest]),fields,customFields,
          });
          if (!result.ok) throw new ConnectorError(result.code === 'conflict' ? 'conflict':'forbidden');
          await tx.recordOutcome(record.externalRecordId,current ? 'updated':'created',record.sourceRevision!,digest);
        });
      }
      await this.store.assertLease(lease,this.now());
      await this.store.checkpoint(lease);
    } catch (e) {
      const err = e instanceof ConnectorError ? e : new ConnectorError('unavailable');
      const retry = ['unavailable','rate_limited'].includes(err.code) && job.attempt < this.options.maxAttempts;
      const delay = Math.min(this.options.maxDelayMs,this.options.baseDelayMs*2**Math.min(job.attempt,20));
      const jitter = delay*(0.5+Math.max(0,Math.min(1,this.random()))/2);
      // Retry-After is a minimum, even when longer than our exponential cap.
      const ms = Math.max(jitter,(err.retryAfterSeconds ?? 0)*1000);
      try {
        await this.store.fail(lease,{code:err.code,message:safeMessage(err.code),nextAttemptAt:retry ? new Date(this.now()+ms).toISOString():null});
      } catch { /* A revoked/expired fence cannot update job state; reaper handles expiry. */ }
    } finally {
      await this.store.release(lease).catch(()=>undefined);
    }
    return true;
  }
}
async function deadline<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new ConnectorError('unavailable');
  let listener: () => void = ()=>{};
  try {
    return await Promise.race([work,new Promise<never>((_,reject)=>{
      listener=()=>reject(new ConnectorError('unavailable'));
      signal.addEventListener('abort',listener,{once:true});
    })]);
  } finally { signal.removeEventListener('abort',listener); }
}
