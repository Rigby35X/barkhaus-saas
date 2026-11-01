import type { SavedMapping } from '../../../../../shared/contracts/v1/ingestion.ts';

export interface ConnectorJobStatus {
  id: string;
  orgId: number;
  connectionId: string;
  state: 'queued'|'running'|'retry_wait'|'completed'|'failed';
  attempt: number;
  nextAttemptAt: string|null;
  counts: { created:number; updated:number; rejected:number; missingReview:number };
}
export interface ConnectorSummary {
  id: string;
  orgId: number;
  provider: string;
  state: 'configured'|'active'|'error'|'disconnected';
  mapping: SavedMapping;
  lastSuccessAt: string|null;
  error: { code:string; message:string }|null;
  /** Reconnection awaits a trusted credential/configuration review. */
  activationRequired: boolean;
}
export interface ConnectorClient {
  connection(orgId:number,connectionId:string):Promise<ConnectorSummary>;
  job(orgId:number,connectionId:string,jobId:string):Promise<ConnectorJobStatus>;
  sync(orgId:number,connectionId:string,requestKey:string):Promise<ConnectorJobStatus>;
  disconnect(orgId:number,connectionId:string):Promise<{state:'disconnected'}>;
  reconnect(orgId:number,connectionId:string):Promise<{state:'configured';activationRequired:true}>;
}
