import { randomUUID } from 'node:crypto';
import type { SyncJob } from '../../../../../shared/contracts/v1/ingestion.ts';
import { AnimalWriteService } from '../animals/AnimalWriteService.ts';
import { SqlAnimalRepository, json } from '../animals/sql-repository.ts';
import type { SqlDatabase, SqlSafety, SqlAnimalTransaction } from '../animals/sql-repository.ts';
import { ConnectorError, validateConnection } from './config.ts';
import type { CognitoConnection } from './config.ts';
import { recordDigest } from './worker.ts';
import type { ClaimedJob, ConnectorTransaction, DurableConnectorStore, Inbox, Lease, Scope, Snapshot, SuccessPage } from './ports.ts';

/** An internal, verified workload capability, never a browser/queue JSON actor.
 * Production workload verification and secret resolution remain runtime-gated. */
export interface ConnectorSqlCapability extends Scope { workerId: string }
const zeroCounts = () => ({created:0,updated:0,rejected:0,missingReview:0});
export class SqlConnectorStore implements DurableConnectorStore {
  private database: SqlDatabase; private capability: ConnectorSqlCapability; private safety: SqlSafety;
  private credentialRef: (scope: Scope) => Promise<string>;
  constructor(database:SqlDatabase,capability:ConnectorSqlCapability,safety:SqlSafety,credentialRef:(scope:Scope)=>Promise<string>){
    this.database=database;this.capability={...capability};this.safety=safety;this.credentialRef=credentialRef;
  }
  private scope(scope:Scope):void {
    if(scope.orgId!==this.capability.orgId||scope.connectionId!==this.capability.connectionId)throw new ConnectorError('forbidden');
  }
  private repository(lease?:Lease):SqlAnimalRepository {
    return new SqlAnimalRepository(this.database,{principal:{kind:'worker',...this.capability,jobId:lease?.jobId??'',fence:lease?.token??'0'}},this.safety);
  }
  private job(row:Record<string,any>):SyncJob {
    return {version:1,id:row.id,orgId:Number(row.org_id),connectionId:row.connection_id,mappingRevision:Number(row.mapping_revision),
      cursor:row.checkpoint?.cursor??null,state:row.status==='cancelled'?'failed':row.status,attempt:row.attempt,nextAttemptAt:row.next_attempt_at?new Date(row.next_attempt_at).toISOString():null,
      counts:{...zeroCounts(),...row.checkpoint?.counts}};
  }
  private async pinned(tx:SqlAnimalTransaction,lease:Lease,live=true):Promise<Record<string,any>> {
    this.scope(lease);
    await tx.lock(['connection',lease.connectionId]);
    const {rows}=await tx.meta(`select j.*,c.generation as current_generation,c.state as connection_state,c.active from public.platform_jobs j
      join public.platform_connections c on c.org_id=j.org_id and c.id=j.connection_id
      where j.org_id=$1 and j.id=$2 and j.connection_id=$3 for update of j,c`,[lease.orgId,lease.jobId,lease.connectionId]);
    const row=rows[0];
    if(!row||!row.active||row.connection_state!=='active'||Number(row.current_generation)!==Number(row.generation))throw new ConnectorError('cancelled');
    if(live){const p=tx.context.principal;
      if(p.kind!=='worker'||!await tx.verifyActor({kind:'worker',orgId:lease.orgId,connectionId:lease.connectionId}))throw new ConnectorError('cancelled');
    }
    return row;
  }
  async enqueue(scope:Scope,requestKey:string):Promise<SyncJob>{
    this.scope(scope);if(!requestKey.trim()||requestKey.length>200)throw new ConnectorError('invalid_feed');
    return this.repository().transaction(async tx=>{
      await tx.lock(['connection',scope.connectionId]);
      const {rows}=await tx.meta('select * from public.platform_connections where org_id=$1 and id=$2 for update',[scope.orgId,scope.connectionId]);const c=rows[0];
      if(!c||!c.active||c.state!=='active')throw new ConnectorError('cancelled');
      const {rows:prior}=await tx.meta(`select * from public.platform_jobs where org_id=$1 and connection_id=$2 and definition->>'requestKey'=$3 order by id`,[scope.orgId,scope.connectionId,requestKey]);
      if(prior[0]){if(Number(prior[0].generation)!==Number(c.generation))throw new ConnectorError('conflict');return this.job(prior[0]);}
      const {rows:active}=await tx.meta(`select * from public.platform_jobs where org_id=$1 and connection_id=$2 and status in ('queued','running','retry_wait')`,[scope.orgId,scope.connectionId]);
      if(active[0])return this.job(active[0]);
      const mapping=c.definition.mapping;
      const {rows:maps}=await tx.meta('select definition from public.platform_mappings where org_id=$1 and id=$2 and revision=$3 and connection_id=$4',[scope.orgId,mapping.id,mapping.revision,scope.connectionId]);
      if(!maps[0]||await recordDigest(maps[0].definition)!==await recordDigest(mapping))throw new ConnectorError('invalid_feed');
      const id=randomUUID();
      const {rows:jobs}=await tx.meta(`insert into public.platform_jobs(org_id,id,kind,mapping_id,mapping_revision,connection_id,generation,definition,status,checkpoint)
        values($1,$2,'connector',$3,$4,$5,$6,$7,'queued',$8) returning *`,[scope.orgId,id,mapping.id,mapping.revision,scope.connectionId,c.generation,json({requestKey,connection:c.definition}),json({cursor:null,counts:zeroCounts(),history:[],pages:0,rows:0})]);
      await tx.meta('insert into public.platform_outbox values($1,$2,$3,$4)',[scope.orgId,id,'enqueue',json({jobId:id})]);return this.job(jobs[0]);
    });
  }
  async status(scope:Scope,jobId:string):Promise<SyncJob>{
    this.scope(scope);return this.repository().transaction(async tx=>{
      const {rows}=await tx.meta('select * from public.platform_jobs where org_id=$1 and id=$2 and connection_id=$3',[scope.orgId,jobId,scope.connectionId]);
      if(!rows[0])throw new ConnectorError('forbidden');return this.job(rows[0]);
    });
  }
  async disconnect(scope:Scope):Promise<void>{
    this.scope(scope);await this.repository().transaction(async tx=>{
      await tx.lock(['connection',scope.connectionId]);
      await tx.meta(`update public.platform_connections set active=false,state='disconnected',generation=generation+1 where org_id=$1 and id=$2`,[scope.orgId,scope.connectionId]);
      await tx.meta(`update public.platform_jobs set status='cancelled',lease_owner=null,lease_until=null where org_id=$1 and connection_id=$2 and status in ('queued','running','retry_wait')`,[scope.orgId,scope.connectionId]);
    });
  }
  async claim(workerId:string,_now:number,leaseMs:number):Promise<ClaimedJob|null>{
    if(workerId!==this.capability.workerId||!Number.isSafeInteger(leaseMs)||leaseMs<1||leaseMs>300000)throw new ConnectorError('forbidden');
    return this.repository().transaction(async tx=>{
      const s=this.capability;await tx.lock(['connection',s.connectionId]);
      const {rows:connections}=await tx.meta(`select * from public.platform_connections where org_id=$1 and id=$2 and active and state='active' for update`,[s.orgId,s.connectionId]);
      const c=connections[0];if(!c)return null;
      await tx.meta(`update public.platform_jobs set lease_owner=null,status=case when attempt>=5 then 'failed' else 'retry_wait' end
        where org_id=$1 and connection_id=$2 and lease_until<=clock_timestamp() and lease_owner is not null`,[s.orgId,s.connectionId]);
      await tx.meta("update public.platform_jobs set status='failed' where org_id=$1 and connection_id=$2 and lease_owner is null and status in ('queued','retry_wait') and attempt>=5",[s.orgId,s.connectionId]);
      const {rows:busy}=await tx.meta(`select id from public.platform_jobs where org_id=$1 and connection_id=$2 and lease_owner is not null`,[s.orgId,s.connectionId]);if(busy.length)return null;
      const {rows}=await tx.meta(`select * from public.platform_jobs where org_id=$1 and connection_id=$2 and generation=$3 and status in ('queued','retry_wait')
        and (next_attempt_at is null or next_attempt_at<=clock_timestamp()) order by id limit 1 for update`,[s.orgId,s.connectionId,c.generation]);if(!rows[0])return null;
      const {rows:fences}=await tx.meta('update public.platform_connections set fence=fence+1 where org_id=$1 and id=$2 returning fence',[s.orgId,s.connectionId]);
      const {rows:claimed}=await tx.meta(`update public.platform_jobs set status='running',lease_owner=$3,fence=$4,lease_until=clock_timestamp()+$5::bigint*interval '1 millisecond',attempt=attempt+1,next_attempt_at=null
        where org_id=$1 and id=$2 returning *`,[s.orgId,rows[0].id,workerId,fences[0].fence,leaseMs]);
      const row=claimed[0];const connection={...row.definition.connection,id:s.connectionId,orgId:s.orgId,state:'active',credentialRef:await this.credentialRef(s)} as CognitoConnection;
      validateConnection(connection);
      return {lease:{orgId:s.orgId,connectionId:s.connectionId,jobId:row.id,token:String(row.fence),expiresAt:new Date(row.lease_until).getTime()},connection,job:this.job(row)};
    });
  }
  async assertLease(lease:Lease,_now:number):Promise<void>{await this.repository(lease).transaction(async tx=>{await this.pinned(tx,lease);});}
  private async readInbox(tx:SqlAnimalTransaction,lease:Lease):Promise<Inbox|null>{
    const {rows}=await tx.meta('select body,digest from public.platform_connector_inboxes where org_id=$1 and job_id=$2',[lease.orgId,lease.jobId]);
    if(!rows[0])return null;
    if(await recordDigest(rows[0].body)!==rows[0].digest)throw new ConnectorError('conflict');
    return {...rows[0].body,completed:[]};
  }
  async inbox(lease:Lease):Promise<Inbox|null>{return this.repository(lease).transaction(async tx=>{await this.pinned(tx,lease);return this.readInbox(tx,lease);});}
  async snapshot(lease:Lease):Promise<Snapshot>{return this.repository(lease).transaction(async tx=>{
    await this.pinned(tx,lease);const {rows}=await tx.animal('select external_record_id,revision from public.platform_animals where org_id=$1 and connection_id=$2',[lease.orgId,lease.connectionId]);
    if(rows.length>100000)throw new ConnectorError('invalid_feed');return Object.fromEntries(rows.map(r=>[r.external_record_id,{revision:Number(r.revision)}]));
  });}
  async saveInbox(lease:Lease,page:SuccessPage,before:Snapshot):Promise<void>{
    if(page.records.length>100||Buffer.byteLength(json({page,before}))>10*1024*1024)throw new ConnectorError('invalid_feed');
    const body={page,before};const hash=await recordDigest(body);
    await this.repository(lease).transaction(async tx=>{
      await this.pinned(tx,lease);
      const prior=await this.readInbox(tx,lease);if(prior){if(await recordDigest({page:prior.page,before:prior.before})!==hash)throw new ConnectorError('conflict');return;}
      await tx.meta('insert into public.platform_connector_inboxes values($1,$2,$3,$4)',[lease.orgId,lease.jobId,json(body),hash]);
    });
  }
  async commitPage<T>(lease:Lease,operation:(tx:ConnectorTransaction)=>Promise<T>):Promise<T>{
    return this.repository(lease).transaction(async tx=>{
      const row=await this.pinned(tx,lease,false);const unit=`connector:${lease.token}`;
      const {rows:receipts}=await tx.meta('select result from public.platform_unit_receipts where org_id=$1 and job_id=$2 and unit_key=$3',[lease.orgId,lease.jobId,unit]);
      if(receipts[0])return receipts[0].result.value as T;
      await this.pinned(tx,lease);
      const box=await this.readInbox(tx,lease);if(!box)throw new ConnectorError('conflict');
      const checkpoint={...row.checkpoint};const counts={...zeroCounts(),...checkpoint.counts};let checkpointed=false;
      const writer=new AnimalWriteService({transaction:run=>run(tx)});
      const rowKey=(id:string)=>json([checkpoint.cursor??null,id]);
      const result=await operation({writer,current:id=>tx.findSource(lease.orgId,lease.connectionId,id),
        sourceHead:async id=>{const {rows}=await tx.meta('select source_revision as revision,source_digest as digest from public.platform_source_heads where org_id=$1 and connection_id=$2 and external_record_id=$3',[lease.orgId,lease.connectionId,id]);return rows[0] as {revision:string;digest:string}??null;},
        recordOutcome:async(id,outcome,revision,hash)=>{
          if(!box.page.records.some(r=>r.externalRecordId===id))throw new ConnectorError('conflict');
          const animal=await tx.findSource(lease.orgId,lease.connectionId,id);if(!animal)throw new ConnectorError('conflict');
          await tx.saveSourceRevision(lease.orgId,lease.connectionId,id,revision);
          await tx.meta(`insert into public.platform_source_heads values($1,$2,$3,$4,$5) on conflict(org_id,connection_id,external_record_id)
            do update set source_revision=excluded.source_revision,source_digest=excluded.source_digest`,[lease.orgId,lease.connectionId,id,revision,hash]);
          await tx.meta('insert into public.platform_source_commits values($1,$2,$3,$4,$5) on conflict do nothing',[lease.orgId,lease.connectionId,id,hash,lease.jobId]);
          await tx.meta('insert into public.platform_row_outcomes values($1,$2,$3,$4,$5,$6)',[lease.orgId,lease.jobId,rowKey(id),await tx.databaseId(animal),hash,json({externalRecordId:id,state:outcome})]);
          await tx.meta('insert into public.platform_connector_seen values($1,$2,$3) on conflict do nothing',[lease.orgId,lease.jobId,id]);
          if(outcome==='created'||outcome==='updated')counts[outcome]++;
        },
        checkpoint:async()=>{
          if(checkpointed)throw new ConnectorError('conflict');await this.pinned(tx,lease);
          for(const record of box.page.records){const {rows}=await tx.meta('select 1 from public.platform_row_outcomes where org_id=$1 and job_id=$2 and row_key=$3',[lease.orgId,lease.jobId,rowKey(record.externalRecordId)]);if(!rows.length)throw new ConnectorError('conflict');}
          const history=checkpoint.history??[];
          if(box.page.nextCursor!==null&&history.includes(box.page.nextCursor))throw new ConnectorError('invalid_feed');
          if((checkpoint.pages??0)>=1000||(checkpoint.rows??0)+box.page.records.length>100000)throw new ConnectorError('invalid_feed');
          let moreFinalization=false;
          if(box.page.nextCursor===null&&box.page.completeSnapshot){
            const {rows:seen}=await tx.meta('select external_record_id from public.platform_connector_seen where org_id=$1 and job_id=$2',[lease.orgId,lease.jobId]);
            const {rows:missing}=await tx.animal(`select a.* from public.platform_animals a where a.org_id=$1 and a.connection_id=$2 and a.sync_state<>'missing_review'
              and not (a.external_record_id=any($3::text[])) order by a.id limit 101 for update`,[lease.orgId,lease.connectionId,seen.map(r=>r.external_record_id)]);
            for(const animal of missing.slice(0,100))await tx.animal(`update public.platform_animals set sync_state='missing_review',revision=revision+1 where org_id=$1 and id=$2 and revision=$3`,[lease.orgId,animal.id,animal.revision]);
            counts.missingReview+=Math.min(missing.length,100);moreFinalization=missing.length>100;
          }
          const state=box.page.nextCursor===null&&!moreFinalization?'completed':'queued';
          const next={cursor:box.page.nextCursor,counts,history:[...history,...(box.page.nextCursor?[box.page.nextCursor]:[])],pages:(checkpoint.pages??0)+1,rows:(checkpoint.rows??0)+box.page.records.length,finalizing:moreFinalization};
          await tx.meta('update public.platform_jobs set checkpoint=$3,status=$4,attempt=0 where org_id=$1 and id=$2',[lease.orgId,lease.jobId,json(next),state]);
          await tx.meta('delete from public.platform_connector_inboxes where org_id=$1 and job_id=$2',[lease.orgId,lease.jobId]);
          if(moreFinalization){const body={page:{kind:'success',records:[],nextCursor:null,completeSnapshot:true},before:{}};await tx.meta('insert into public.platform_connector_inboxes values($1,$2,$3,$4)',[lease.orgId,lease.jobId,json(body),await recordDigest(body)]);}
          await tx.meta('insert into public.platform_outbox values($1,$2,$3,$4)',[lease.orgId,lease.jobId,unit,json({jobId:lease.jobId,state})]);checkpointed=true;
        }});
      if(!checkpointed)throw new ConnectorError('conflict');
      const {rows:valid}=await tx.meta(`select j.id from public.platform_jobs j join public.platform_connections c on c.org_id=j.org_id and c.id=j.connection_id
        where j.org_id=$1 and j.id=$2 and j.fence=$3::bigint and j.lease_owner=$4 and j.lease_until>clock_timestamp()
        and c.active and c.state='active' and c.generation=j.generation`,[lease.orgId,lease.jobId,lease.token,this.capability.workerId]);
      if(!valid.length)throw new ConnectorError('cancelled');
      await tx.meta('insert into public.platform_unit_receipts values($1,$2,$3,$4)',[lease.orgId,lease.jobId,unit,json({value:result??null})]);return result;
    });
  }
  async fail(lease:Lease,failure:{code:string;message:string;nextAttemptAt:string|null}):Promise<void>{
    await this.repository(lease).transaction(async tx=>{
      const row=await this.pinned(tx,lease,false);
      const {rows}=await tx.meta('select 1 from public.platform_unit_receipts where org_id=$1 and job_id=$2 and unit_key=$3',[lease.orgId,lease.jobId,`connector:${lease.token}`]);if(rows.length)return;
      if(String(row.fence)!==lease.token||row.lease_owner!==this.capability.workerId)return;
      await this.pinned(tx,lease);
      await tx.meta(`update public.platform_jobs set status=$3,next_attempt_at=$4,checkpoint=checkpoint||$5::jsonb where org_id=$1 and id=$2`,[lease.orgId,lease.jobId,failure.nextAttemptAt?'retry_wait':'failed',failure.nextAttemptAt,json({error:{code:failure.code,message:failure.message}})]);
    });
  }
  async release(lease:Lease):Promise<void>{
    this.scope(lease);await this.repository(lease).transaction(async tx=>{await tx.meta(`update public.platform_jobs set lease_owner=null,lease_until=null,status=case when status='running' then 'retry_wait' else status end where org_id=$1 and id=$2 and fence=$3::bigint and lease_owner=$4`,[lease.orgId,lease.jobId,lease.token,this.capability.workerId]);});
  }
}
