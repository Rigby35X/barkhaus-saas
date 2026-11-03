/** Coordinator may compose this module after server persistence is reviewed.
 * Fixture capability is explicit; this is not a connected-provider claim. */
export const connectorCapabilities = [{ provider:'cognito', direction:'inbound', readiness:'synthetic-fixtures', pagination:'cursor' }] as const;
export interface ConnectorJobStatus {
  id: string;
  orgId: number;
  connectionId: string;
  state: 'queued'|'running'|'retry_wait'|'completed'|'failed';
  attempt: number;
  nextAttemptAt: string|null;
  counts: { created:number; updated:number; rejected:number; missingReview:number };
}
