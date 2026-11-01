import { randomUUID } from 'node:crypto';
import type { WriteActor } from '../../../../../shared/contracts/v1/ingestion.ts';
import type { ConnectorSummary } from '../../../../dashboard/src/features/connectors/types.ts';
import { SqlAnimalRepository, json } from '../animals/sql-repository.ts';
import type { SqlAnimalTransaction, SqlDatabase, SqlPrincipal, SqlSafety } from '../animals/sql-repository.ts';
import { ConnectorError, safeMessage } from './config.ts';
import type { ConnectorControlStore } from './http.ts';
import type { Scope } from './ports.ts';
import type { SyncJob } from '../../../../../shared/contracts/v1/ingestion.ts';

const zeroCounts=()=>({created:0,updated:0,rejected:0,missingReview:0});
/** Member-only controls, separate from the worker capability. Membership remains
 * locked through COMMIT; the HTTP authorization check alone is insufficient. */
export class SqlConnectorControlStore implements ConnectorControlStore {
  private repository:SqlAnimalRepository;
  private principal:Extract<SqlPrincipal,{kind:'member'}>;
  constructor(database:SqlDatabase,principal:Extract<SqlPrincipal,{kind:'member'}>,safety:SqlSafety){
    this.principal={...principal};this.repository=new SqlAnimalRepository(database,{principal:this.principal},safety);
  }
  private async transaction<T>(scope:Scope,manage:boolean,run:(tx:SqlAnimalTransaction)=>Promise<T>):Promise<T>{
    if(scope.orgId!==this.principal.orgId||!scope.connectionId?.trim())throw new ConnectorError('forbidden');
    return this.repository.transaction(async tx=>{
      const actor=await tx.verifyActor({...this.principal,role:'viewer'} as WriteActor);
      if(!actor||actor.kind!=='member'||actor.role==='viewer'||manage&&!['owner','admin'].includes(actor.role))throw new ConnectorError('forbidden');
      await tx.lock(['connection',scope.connectionId]);
      return run(tx);
    });
  }
  private job(row:Record<string,any>):SyncJob{
    return {version:1,id:row.id,orgId:Number(row.org_id),connectionId:row.connection_id,mappingRevision:Number(row.mapping_revision),
      cursor:row.checkpoint?.cursor??null,state:row.status==='cancelled'?'failed':row.status,attempt:row.attempt,
      nextAttemptAt:row.next_attempt_at?new Date(row.next_attempt_at).toISOString():null,counts:{...zeroCounts(),...row.checkpoint?.counts}};
  }
  private async connection(tx:SqlAnimalTransaction,scope:Scope){
    const {rows}=await tx.meta('select * from public.platform_connections where org_id=$1 and id=$2 for update',[scope.orgId,scope.connectionId]);
    if(!rows[0])throw new ConnectorError('forbidden');return rows[0];
  }
  async describe(scope:Scope):Promise<ConnectorSummary>{
    return this.transaction(scope,false,async tx=>{
      const c=await this.connection(tx,scope);
      const {rows:success}=await tx.meta(`select checkpoint->>'completedAt' as completed_at from public.platform_jobs
        where org_id=$1 and connection_id=$2 and status='completed' and checkpoint->>'completedAt' is not null
        order by (checkpoint->>'completedAt')::timestamptz desc limit 1`,[scope.orgId,scope.connectionId]);
      const {rows:failures}=await tx.meta(`select checkpoint->'error'->>'code' as code,checkpoint->'error'->>'at' as failed_at from public.platform_jobs
        where org_id=$1 and connection_id=$2 and generation=$3 and status in ('failed','retry_wait')
        and checkpoint->'error' is not null order by (checkpoint->'error'->>'at')::timestamptz desc nulls last,id limit 1`,[scope.orgId,scope.connectionId,c.generation]);
      const known=['credentials','rate_limited','unavailable','invalid_feed','forbidden','conflict','cancelled'];
      const failure=failures[0];
      const successAt=success[0]?.completed_at?new Date(success[0].completed_at).toISOString():null;
      const code=failure&&(!successAt||failure.failed_at&&Date.parse(failure.failed_at)>Date.parse(successAt))?failure.code:null;
      // The HTTP layer applies a second explicit allowlist; no config/credential
      // reference, endpoint, raw source rows or provider error message is returned.
      return {id:c.id,orgId:Number(c.org_id),provider:c.provider,state:c.state,mapping:c.definition.mapping,
        lastSuccessAt:successAt,
        error:code?{code:known.includes(code)?code:'unavailable',message:safeMessage(code)}:null,
        activationRequired:c.state!=='active'||!c.active};
    });
  }
  async enqueue(scope:Scope,requestKey:string):Promise<SyncJob>{
    if(!requestKey?.trim()||requestKey.length>200)throw new ConnectorError('invalid_feed');
    return this.transaction(scope,true,async tx=>{
      const c=await this.connection(tx,scope);
      if(!c.active||c.state!=='active')throw new ConnectorError('cancelled');
      const {rows:prior}=await tx.meta(`select * from public.platform_jobs where org_id=$1 and connection_id=$2
        and definition->>'requestKey'=$3 order by id`,[scope.orgId,scope.connectionId,requestKey]);
      if(prior[0]){if(Number(prior[0].generation)!==Number(c.generation))throw new ConnectorError('conflict');return this.job(prior[0]);}
      const {rows:active}=await tx.meta("select * from public.platform_jobs where org_id=$1 and connection_id=$2 and status in ('queued','running','retry_wait')",[scope.orgId,scope.connectionId]);
      if(active[0])return this.job(active[0]);
      const mapping=c.definition.mapping;
      if(!mapping||mapping.orgId!==scope.orgId)throw new ConnectorError('invalid_feed');
      const {rows:maps}=await tx.meta('select definition=$5::jsonb as matches from public.platform_mappings where org_id=$1 and id=$2 and revision=$3 and connection_id=$4',[scope.orgId,mapping.id,mapping.revision,scope.connectionId,json(mapping)]);
      if(!maps[0]?.matches)throw new ConnectorError('invalid_feed');
      const id=randomUUID();
      const {rows}=await tx.meta(`insert into public.platform_jobs(org_id,id,kind,mapping_id,mapping_revision,connection_id,generation,definition,status,checkpoint)
        values($1,$2,'connector',$3,$4,$5,$6,$7,'queued',$8) returning *`,[scope.orgId,id,mapping.id,mapping.revision,scope.connectionId,c.generation,json({requestKey,connection:c.definition}),json({cursor:null,counts:zeroCounts(),history:[],pages:0,rows:0})]);
      await tx.meta('insert into public.platform_outbox values($1,$2,$3,$4)',[scope.orgId,id,'enqueue',json({jobId:id})]);
      return this.job(rows[0]);
    });
  }
  async status(scope:Scope,jobId:string):Promise<SyncJob>{
    return this.transaction(scope,false,async tx=>{
      await this.connection(tx,scope);
      const {rows}=await tx.meta('select * from public.platform_jobs where org_id=$1 and id=$2 and connection_id=$3',[scope.orgId,jobId,scope.connectionId]);
      if(!rows[0])throw new ConnectorError('forbidden');return this.job(rows[0]);
    });
  }
  async disconnect(scope:Scope):Promise<void>{await this.changeState(scope,'disconnected');}
  async reconnect(scope:Scope):Promise<void>{await this.changeState(scope,'configured');}
  private async changeState(scope:Scope,state:'configured'|'disconnected'){
    return this.transaction(scope,true,async tx=>{
      const c=await this.connection(tx,scope);
      // A retry of the same desired state is harmless; it never activates sync.
      if(c.state===state&&!c.active)return;
      await tx.meta('update public.platform_connections set active=false,state=$3,generation=generation+1 where org_id=$1 and id=$2',[scope.orgId,scope.connectionId,state]);
      await tx.meta("update public.platform_jobs set status='cancelled',lease_owner=null,lease_until=null where org_id=$1 and connection_id=$2 and status in ('queued','running','retry_wait')",[scope.orgId,scope.connectionId]);
    });
  }
}
