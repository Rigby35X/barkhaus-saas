import type { WriteActor } from '../../../../../shared/contracts/v1/ingestion.ts';
import type { SqlDatabase, SqlSafety } from '../animals/sql-repository.ts';
import { exact, positive, textId } from '../../../../dashboard/src/features/imports/csv.ts';
import { CsvImportService } from './service.ts';
import { SqlImportStore } from './sql-store.ts';
type Member = Extract<WriteActor, { kind: 'member' }>;
export interface CsvBatchRunnerDependencies {
  database: SqlDatabase;
  safety: SqlSafety;
  /** Trusted workload/delegation resolver MUST verify the persisted job initiator.
   * No member/role from queue message JSON may establish this authority. */
  resolveDelegation(orgId: number, jobId: string): Promise<Member | null>;
}
/** A supervised runner calls once per durable delivery. Bounded batches, pinned
 * input and membership are rechecked by SqlImportStore in the shared transaction.
 * No scheduler, HTTP route or environment variable activates this factory. */
export function createCsvBatchRunner(deps: CsvBatchRunnerDependencies) {
  return async (delivery: { orgId: number; jobId: string }) => {
    exact(delivery, ['orgId', 'jobId']);
    if (!positive(delivery.orgId) || !textId(delivery.jobId)) throw new Error('Invalid import delivery');
    const principal = await deps.resolveDelegation(delivery.orgId, delivery.jobId);
    if (!principal || principal.kind !== 'member' || principal.orgId !== delivery.orgId || !textId(principal.userId) || !['owner', 'admin', 'staff'].includes(principal.role)) throw new Error('Import delegation denied');
    const service = new CsvImportService(new SqlImportStore(deps.database, principal, deps.safety), async (_context, orgId) => {
      if (principal.orgId !== orgId) throw new Error('Import delegation denied');
      return principal;
    });
    return service.runBatch(principal, delivery.orgId, delivery.jobId);
  };
}
