import { createHash, randomUUID } from 'node:crypto';
import { CONTRACT_VERSION } from '../../../../../shared/contracts/v1/animal.ts';
import type { AnimalFields, AnimalId, AnimalRecord, FieldOwner, JsonValue } from '../../../../../shared/contracts/v1/animal.ts';
import type { AnimalWrite, WriteActor, WriteResult } from '../../../../../shared/contracts/v1/ingestion.ts';
import type { AnimalRepository, AnimalTransaction } from './repository.ts';

/** Structural PostgreSQL transport: the callback owns ONE connection and commits
 * only after it resolves. Tested with real Postgres SQL in PGlite. Production
 * transport/login binding is intentionally not wired into HTTP runtime. */
export interface SqlConnection { query<T = Record<string, any>>(sql: string, parameters?: any[]): Promise<{ rows: T[] }> }
export interface SqlDatabase { transaction<T>(run: (sql: SqlConnection) => Promise<T>): Promise<T> }
/** Server-owned context, established by Auth/workload verification, never JSON.
 * Import delegation is bound to the persisted initiating Auth UUID and job pins.
 * The repository rechecks membership, scope and lease under locks at every use. */
export type SqlPrincipal =
  | { kind: 'member'; orgId: number; userId: string }
  | { kind: 'worker'; orgId: number; connectionId: string; jobId: string; fence: string; workerId: string };
export interface SqlContext { principal: SqlPrincipal; importJobId?: string }
export interface SqlSafety {
  photoAllowed(orgId: number, url: string): Promise<boolean>;
  signDocument?(orgId: number, objectName: string, seconds: number): Promise<string | null>;
}
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const json = (value: unknown) => JSON.stringify(value);

export class SqlAnimalRepository implements AnimalRepository {
  readonly database: SqlDatabase; readonly context: SqlContext; readonly safety: SqlSafety;
  constructor(database: SqlDatabase, context: SqlContext, safety: SqlSafety) { this.database=database; this.context=context; this.safety=safety; }
  async transaction<T>(run: (tx: SqlAnimalTransaction) => Promise<T>): Promise<T> {
    return this.database.transaction(async sql => {
      const tx = new SqlAnimalTransaction(sql, this.context, this.safety);
      await tx.initialize();
      return run(tx);
    });
  }
}

export class SqlAnimalTransaction implements AnimalTransaction {
  readonly sql: SqlConnection; readonly context: SqlContext; readonly safety: SqlSafety;
  constructor(sql: SqlConnection, context: SqlContext, safety: SqlSafety) { this.sql=sql; this.context=context; this.safety=safety; }
  async initialize(): Promise<void> {
    const p = this.context.principal;
    if (!Number.isSafeInteger(p.orgId) || p.orgId < 1) throw new Error('Invalid trusted SQL scope');
    // All settings are transaction-local; pooled connections cannot retain authority.
    await this.sql.query(`select set_config('barkhaus.actor_org',$1,true), set_config('request.jwt.claim.sub',$2,true),
      set_config('barkhaus.worker_org',$1,true), set_config('barkhaus.worker_connection',$3,true),
      set_config('barkhaus.worker_job',$4,true), set_config('barkhaus.worker_fence',$5,true)`,
    [String(p.orgId), p.kind === 'member' ? p.userId : '', p.kind === 'worker' ? p.connectionId : '', p.kind === 'worker' ? p.jobId : '', p.kind === 'worker' ? p.fence : '']);
    await this.sql.query('set local role barkhaus_platform_executor');
  }
  async meta<T = Record<string, any>>(query: string, parameters: any[] = []): Promise<{rows: T[]}> {
    await this.sql.query('set local role barkhaus_platform_executor');
    return this.sql.query<T>(query, parameters);
  }
  async animal<T = Record<string, any>>(query: string, parameters: any[] = []): Promise<{rows: T[]}> {
    await this.sql.query(this.context.principal.kind === 'member' ? 'set local role authenticated' : 'set local role barkhaus_connector_worker');
    return this.sql.query<T>(query, parameters);
  }
  async lock(key: readonly unknown[]): Promise<void> {
    const org = this.context.principal.orgId;
    await this.meta('insert into public.platform_serialization_keys(org_id,key) values($1,$2) on conflict do nothing', [org, json(key)]);
    await this.meta('select key from public.platform_serialization_keys where org_id=$1 and key=$2 for update', [org, json(key)]);
  }
  async verifyActor(claim: WriteActor): Promise<WriteActor | null> {
    const p = this.context.principal;
    if (claim.orgId !== p.orgId || claim.kind !== p.kind) return null;
    if (p.kind === 'member') {
      if (claim.kind !== 'member' || claim.userId !== p.userId) return null;
      const {rows} = await this.meta<{role: string | null}>('select barkhaus_private.lock_platform_member($1,$2::uuid) as role',[p.orgId,p.userId]);
      const role = rows[0]?.role;
      return role && ['owner','admin','staff','viewer'].includes(role) ? {kind:'member',orgId:p.orgId,userId:p.userId,role:role as Extract<WriteActor,{kind:'member'}>['role']} : null;
    }
    if (claim.kind !== 'worker' || claim.connectionId !== p.connectionId) return null;
    await this.lock(['connection',p.connectionId]);
    const {rows} = await this.meta(`select j.id from public.platform_jobs j join public.platform_connections c on c.org_id=j.org_id and c.id=j.connection_id
      where j.org_id=$1 and j.id=$2 and j.connection_id=$3 and j.fence=$4::bigint and j.lease_owner=$5
      and j.lease_until>clock_timestamp() and j.status='running' and c.active and c.state='active' and j.generation=c.generation
      for update of j,c`,[p.orgId,p.jobId,p.connectionId,p.fence,p.workerId]);
    return rows.length ? {kind:'worker',orgId:p.orgId,connectionId:p.connectionId} : null;
  }
  private scoped(orgId: number): boolean { return orgId === this.context.principal.orgId; }
  async verifyIngestion(actor: WriteActor, command: AnimalWrite): Promise<boolean> {
    const jobId = actor.kind === 'worker' && this.context.principal.kind === 'worker' ? this.context.principal.jobId : this.context.importJobId;
    if (!jobId) return !(command.kind === 'source_upsert' || command.kind === 'create_native' && command.csvOrigin);
    const {rows} = await this.meta(`select j.*,m.definition as mapping from public.platform_jobs j join public.platform_mappings m
      on m.org_id=j.org_id and m.id=j.mapping_id and m.revision=j.mapping_revision where j.org_id=$1 and j.id=$2 for update of j`,[actor.orgId,jobId]);
    const job = rows[0];
    if (!job || !['running'].includes(job.status)) return false;
    if (actor.kind === 'member') {
      if (job.kind !== 'csv' || job.created_by !== actor.userId) return false;
      if (command.kind === 'create_native') return command.csvOrigin?.jobId === jobId && command.csvOrigin.mappingId === job.mapping_id;
      return command.kind === 'edit_native';
    }
    if (command.kind !== 'source_upsert' || job.kind !== 'connector' || job.connection_id !== actor.connectionId) return false;
    const mappedCore = new Set<string>(['lifecycle','availability']);
    const mappedCustom = new Set<string>();
    for (const field of job.mapping.fields ?? []) (field.target.kind === 'core' ? mappedCore : mappedCustom).add(field.target.field ?? field.target.key);
    return Object.keys(command.fields).every(k => mappedCore.has(k)) && Object.keys(command.customFields ?? {}).every(k => mappedCustom.has(k));
  }
  async decode(row: Record<string, any>): Promise<AnimalRecord> {
    const orgId = Number(row.org_id);
    const {rows:docs} = await this.meta('select id,kind from public.platform_documents where org_id=$1 and animal_id=$2',[orgId,row.id]);
    const fields = {...row.fields, photos:row.photos,lifecycle:row.lifecycle,availability:row.availability} as AnimalFields;
    const ownership = Object.fromEntries(Object.keys(fields).map(k=>[k,row.field_owners[k] ?? {kind:'barkhaus'}])) as Record<keyof AnimalFields,FieldOwner>;
    const source: AnimalRecord['source'] = row.source_kind === 'connector' ? {kind:'connector',connectionId:row.connection_id,provider:await this.provider(orgId,row.connection_id),externalRecordId:row.external_record_id} :
      {kind:'native',...(row.csv_origin_job_id ? {csvOrigin:{jobId:row.csv_origin_job_id,mappingId:row.csv_origin_mapping_id,importKey:row.import_key}} : {})};
    return {contractVersion:CONTRACT_VERSION,id:row.legacy_animal_id === null ? row.id : Number(row.legacy_animal_id),orgId,revision:Number(row.revision),source,fields,ownership,
      publication:{state:row.publication,publicProfileKey:row.public_profile_key,approvedPhotos:row.approvals},
      privateData:{internalNotes:row.notes,medicalRecordIds:docs.filter(d=>d.kind==='medical').map(d=>d.id),documentIds:docs.filter(d=>d.kind==='document').map(d=>d.id)},
      customFields:Object.fromEntries(Object.entries(row.custom_fields).map(([k,value])=>[k,{value:value as JsonValue,owner:row.custom_owners[k] ?? {kind:'barkhaus'}}])),syncState:row.sync_state};
  }
  async get(orgId:number,id:AnimalId):Promise<AnimalRecord|null> {
    if (!this.scoped(orgId)) return null;
    const {rows} = await this.animal(`select * from public.platform_animals where org_id=$1 and ${typeof id==='number'?'legacy_animal_id=$2::bigint':'id=$2'}`,[orgId,id]);
    return rows[0] ? this.decode(rows[0]) : null;
  }
  async list(orgId:number):Promise<AnimalRecord[]> {
    if (!this.scoped(orgId)) return [];
    const {rows}=await this.animal('select * from public.platform_animals where org_id=$1 order by id',[orgId]);
    const result: AnimalRecord[]=[];for(const row of rows) result.push(await this.decode(row));return result;
  }
  async findSource(orgId:number,connectionId:string,externalRecordId:string):Promise<AnimalRecord|null> {
    if (!this.scoped(orgId)) return null;
    await this.lock(['source',connectionId,externalRecordId]);
    const {rows}=await this.animal('select * from public.platform_animals where org_id=$1 and connection_id=$2 and external_record_id=$3',[orgId,connectionId,externalRecordId]);
    return rows[0] ? this.decode(rows[0]) : null;
  }
  async findImport(orgId:number,mappingId:string,importKey:string):Promise<AnimalRecord|null> {
    if (!this.scoped(orgId)) return null;
    await this.lock(['import',mappingId,importKey]);
    const {rows}=await this.meta('select animal_id from public.platform_import_identities where org_id=$1 and mapping_id=$2 and import_key=$3',[orgId,mappingId,importKey]);
    return rows[0] ? this.get(orgId,rows[0].animal_id) : null;
  }
  async provider(orgId:number,connectionId:string):Promise<string> {
    const {rows}=await this.meta('select provider from public.platform_connections where org_id=$1 and id=$2',[orgId,connectionId]);
    if (!rows[0]) throw new Error('Scoped provider unavailable');return rows[0].provider;
  }
  async allocateId():Promise<AnimalId> { return randomUUID(); }
  async sourceOwnership(orgId:number,connectionId:string):Promise<Record<keyof AnimalFields,FieldOwner>> {
    const {rows}=await this.animal('select barkhaus_private.source_mapping_owners($1,$2) as owners',[orgId,connectionId]);
    return rows[0].owners.core;
  }
  async databaseId(record:AnimalRecord):Promise<string> {
    if(typeof record.id==='string')return record.id;
    const {rows}=await this.animal('select id from public.platform_animals where org_id=$1 and legacy_animal_id=$2',[record.orgId,record.id]);
    if(!rows[0])throw new Error('Legacy adoption requires reviewed mapping');return rows[0].id;
  }
  async put(record:AnimalRecord,expectedRevision:number|null):Promise<boolean> {
    if(!this.scoped(record.orgId))return false;
    const id=await this.databaseId(record);
    const {photos,lifecycle,availability,...profile}=record.fields;
    const origin=record.source.kind==='native'?record.source.csvOrigin:undefined;
    const data=[record.orgId,id,record.revision,record.source.kind,record.source.kind==='connector'?record.source.connectionId:null,
      record.source.kind==='connector'?record.source.externalRecordId:null,origin?.importKey!=null?origin.mappingId:null,origin?.importKey??null,
      lifecycle,availability,record.publication.state,record.publication.publicProfileKey,json(profile),json(record.ownership),
      json(Object.fromEntries(Object.entries(record.customFields).map(([k,v])=>[k,v.value]))),json(Object.fromEntries(Object.entries(record.customFields).map(([k,v])=>[k,v.owner]))),
      json(photos),json(record.publication.approvedPhotos),record.privateData.internalNotes,origin?.jobId??null,origin?.mappingId??null,record.syncState];
    const columns='org_id,id,revision,source_kind,connection_id,external_record_id,import_mapping_id,import_key,lifecycle,availability,publication,public_profile_key,fields,field_owners,custom_fields,custom_owners,photos,approvals,notes,csv_origin_job_id,csv_origin_mapping_id,sync_state'.split(',');
    if(expectedRevision===null){
      const {rows}=await this.animal(`insert into public.platform_animals(${columns.join(',')}) values(${data.map((_,i)=>'$'+(i+1)).join(',')}) on conflict do nothing returning id`,data);return rows.length===1;
    }
    const {rows}=await this.animal(`update public.platform_animals set ${columns.slice(2).map((name,i)=>`${name}=$${i+3}`).join(',')} where org_id=$1 and id=$2 and revision=$23 returning id`,[...data,expectedRevision]);return rows.length===1;
  }
  async receipt(scope:readonly(string|number)[]):Promise<{fingerprint:string;result:WriteResult}|null> {
    await this.lock(['receipt',...scope]);
    const {rows}=await this.meta('select result from public.platform_write_receipts where org_id=$1 and actor_id=$2 and idempotency_key=$3',[scope[0],json(scope.slice(1,-1)),scope.at(-1)]);
    return rows[0]?.result??null;
  }
  async saveReceipt(scope:readonly(string|number)[],fingerprint:string,result:WriteResult):Promise<void> {
    await this.meta('insert into public.platform_write_receipts(org_id,actor_id,idempotency_key,operation,payload_sha256,result) values($1,$2,$3,$4,$5,$6)',[scope[0],json(scope.slice(1,-1)),scope.at(-1),JSON.parse(fingerprint).kind,digest(fingerprint),json({fingerprint,result})]);
  }
  async hasSourceRevision(orgId:number,connectionId:string,externalId:string,revision:string):Promise<boolean> {
    const {rows}=await this.meta('select 1 from public.platform_source_revisions where org_id=$1 and connection_id=$2 and external_record_id=$3 and source_revision=$4',[orgId,connectionId,externalId,revision]);return rows.length>0;
  }
  async saveSourceRevision(orgId:number,connectionId:string,externalId:string,revision:string):Promise<void> {
    await this.meta('insert into public.platform_source_revisions values($1,$2,$3,$4) on conflict do nothing',[orgId,connectionId,externalId,revision]);
  }
  async isPhotoAllowed(orgId:number,url:string):Promise<boolean> { return this.scoped(orgId)&&this.safety.photoAllowed(orgId,url); }
  async signPrivateDocument(orgId:number,id:AnimalId,documentId:string,seconds:number):Promise<string|null> {
    if(!this.safety.signDocument||seconds!==60)return null;
    const record=await this.get(orgId,id);if(!record)return null;
    const dbId=await this.databaseId(record);
    const {rows}=await this.meta('select object_name from public.platform_documents where org_id=$1 and animal_id=$2 and id=$3',[orgId,dbId,documentId]);
    return rows[0]?this.safety.signDocument(orgId,rows[0].object_name,seconds):null;
  }
}
