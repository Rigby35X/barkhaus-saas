import { ConnectorError } from './config.ts';
import type { DurableConnectorStore, Scope, TrustedConnectorAuth } from './ports.ts';
/** Composition entry point; bind only after A+B persistence/auth review.
 * No public route is mounted with permissive fallback dependencies. */
export function createConnectorControl(store: DurableConnectorStore, auth: TrustedConnectorAuth) {
  async function authorize(proof: unknown, scope: Scope, manage = false) {
    if (!Number.isSafeInteger(scope.orgId) || scope.orgId < 1 || !scope.connectionId?.trim()) throw new ConnectorError('forbidden');
    const actor = await auth.member(proof,scope.orgId);
    if (actor.kind !== 'member' || actor.orgId !== scope.orgId || actor.role === 'viewer' ||
        manage && !['owner','admin'].includes(actor.role)) throw new ConnectorError('forbidden');
  }
  return {
    async enqueue(proof: unknown, scope: Scope, requestKey: string) {
      await authorize(proof,scope,true);
      if (!requestKey?.trim() || requestKey.length > 200) throw new ConnectorError('invalid_feed');
      return publicJob(await store.enqueue(scope,requestKey));
    },
    async status(proof: unknown, scope: Scope, jobId: string) {
      await authorize(proof,scope);
      return publicJob(await store.status(scope,jobId));
    },
    async disconnect(proof: unknown, scope: Scope) {
      await authorize(proof,scope,true);
      await store.disconnect(scope);
      return { state:'disconnected' as const };
    },
  };
}
function publicJob(job: import('../../../../../shared/contracts/v1/ingestion.ts').SyncJob) {
  return { id:job.id,orgId:job.orgId,connectionId:job.connectionId,state:job.state,attempt:job.attempt,nextAttemptAt:job.nextAttemptAt,counts:{...job.counts} };
}
