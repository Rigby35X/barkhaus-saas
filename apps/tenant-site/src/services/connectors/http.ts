import type { SyncJob, WriteActor } from '../../../../../shared/contracts/v1/ingestion.ts';
import type { ConnectorSummary } from '../../../../dashboard/src/features/connectors/types.ts';
import { ConnectorError, safeMessage } from './config.ts';
import type { Scope } from './ports.ts';

export interface ConnectorControlStore {
  describe(scope:Scope):Promise<ConnectorSummary>;
  enqueue(scope:Scope,requestKey:string):Promise<SyncJob>;
  status(scope:Scope,jobId:string):Promise<SyncJob>;
  disconnect(scope:Scope):Promise<void>;
  /** Request credential/config review; remains inactive until trusted activation. */
  reconnect(scope:Scope):Promise<void>;
}
export interface ConnectorHttpDependencies {
  /** Verify bearer identity + active membership server-side, never body roles. */
  authenticate(request:Request,orgId:number):Promise<Extract<WriteActor,{kind:'member'}>|null>;
  /** Bind a member control store to this verified principal; SQL rechecks it at COMMIT. */
  store(actor:Extract<WriteActor,{kind:'member'}>):ConnectorControlStore;
  /** Deliberately supported adapter registry; this never selects a default connection. */
  providers?:readonly string[];
}
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store',Vary:'Authorization'}});
function id(value:unknown):string{
  if(typeof value!=='string'||!value.trim()||value!==value.trim()||value.length>200)throw new ConnectorError('invalid_feed');return value;
}
function scope(orgId:unknown,connectionId:unknown):Scope{
  if(typeof orgId!=='number'||!Number.isSafeInteger(orgId)||orgId<1)throw new ConnectorError('invalid_feed');
  return {orgId,connectionId:id(connectionId)};
}
function job(value:SyncJob,s:Scope){
  if(value.orgId!==s.orgId||value.connectionId!==s.connectionId)throw new ConnectorError('forbidden');
  return {id:value.id,orgId:value.orgId,connectionId:value.connectionId,state:value.state,attempt:value.attempt,nextAttemptAt:value.nextAttemptAt,
    counts:{created:value.counts.created,updated:value.counts.updated,rejected:value.counts.rejected,missingReview:value.counts.missingReview}};
}
function summary(value:ConnectorSummary,s:Scope,providers:readonly string[]):ConnectorSummary{
  if(value.orgId!==s.orgId||value.id!==s.connectionId||value.mapping.orgId!==s.orgId)throw new ConnectorError('forbidden');
  if(!['configured','active','error','disconnected'].includes(value.state)||!providers.includes(value.provider))throw new ConnectorError('invalid_feed');
  // Explicitly reconstruct every nested field: provider configs, credentials,
  // raw job/error objects and arbitrary extra keys never cross this boundary.
  const mapping=value.mapping;
  const code=value.error?.code;
  const safeCode=code&&['credentials','rate_limited','unavailable','invalid_feed','forbidden','conflict','cancelled'].includes(code)?code:'unavailable';
  return {id:value.id,orgId:value.orgId,provider:value.provider,state:value.state,
    mapping:{version:1,id:mapping.id,orgId:mapping.orgId,revision:mapping.revision,
      fields:mapping.fields.map(f=>({sourceColumn:f.sourceColumn,target:f.target.kind==='core'?{kind:'core',field:f.target.field}:{kind:'custom',key:f.target.key},transform:f.transform})),
      statusMap:Object.fromEntries(Object.entries(mapping.statusMap).map(([label,status])=>[label,{lifecycle:status.lifecycle,availability:status.availability}]))},
    lastSuccessAt:value.lastSuccessAt,error:value.error?{code:safeCode,message:safeMessage(safeCode)}:null,
    activationRequired:value.activationRequired};
}
async function body(request:Request):Promise<Record<string,unknown>>{
  const reader=request.body?.getReader();if(!reader)throw new ConnectorError('invalid_feed');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>32768){await reader.cancel();throw new RangeError('body limit');}chunks.push(part.value);}
  const bytes=new Uint8Array(size);let position=0;for(const chunk of chunks){bytes.set(chunk,position);position+=chunk.byteLength;}
  const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!data||typeof data!=='object'||Array.isArray(data))throw new ConnectorError('invalid_feed');return data;
}
/** Unmounted composition only. No environment flag or public route enables this. */
export function createConnectorHttpHandler(deps:ConnectorHttpDependencies){
  const providers=[...(deps.providers??['cognito'])];
  return async(request:Request):Promise<Response>=>{
    try{
      if(!['GET','POST'].includes(request.method))return response({error:'Method not allowed'},405);
      if(!/^Bearer \S+$/.test(request.headers.get('Authorization')??''))return response({error:'Please sign in.'},401);
      let s:Scope;let input:Record<string,unknown>|null=null;let jobId:string|null=null;
      if(request.method==='GET'){
        const query=new URL(request.url).searchParams;
        if([...query.keys()].some(k=>!['orgId','connectionId','jobId'].includes(k))||[...new Set(query.keys())].some(k=>query.getAll(k).length!==1))throw new ConnectorError('invalid_feed');
        const raw=query.get('orgId');if(!raw||!/^[1-9]\d*$/.test(raw))throw new ConnectorError('invalid_feed');
        s=scope(Number(raw),query.get('connectionId'));jobId=query.has('jobId')?id(query.get('jobId')):null;
      }else{
        if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json')return response({error:'JSON required'},415);
        input=await body(request);
        if(Object.keys(input).some(k=>!['action','orgId','connectionId','requestKey'].includes(k))||!['sync','disconnect','reconnect'].includes(String(input.action)))throw new ConnectorError('invalid_feed');
        if(input.action==='sync')id(input.requestKey);else if('requestKey' in input)throw new ConnectorError('invalid_feed');
        s=scope(input.orgId,input.connectionId);
      }
      const actor=await deps.authenticate(request,s.orgId);
      if(!actor||actor.kind!=='member'||actor.orgId!==s.orgId||!actor.userId||!['owner','admin','staff'].includes(actor.role))return response({error:'Connection access denied.'},403);
      if(input&&!['owner','admin'].includes(actor.role))return response({error:'Connection access denied.'},403);
      const store=deps.store(actor);
      if(!input)return jobId===null?response(summary(await store.describe(s),s,providers)):response(job(await store.status(s,jobId),s));
      if(input.action==='sync')return response(job(await store.enqueue(s,id(input.requestKey)),s));
      if(input.action==='disconnect'){await store.disconnect(s);return response({state:'disconnected'});}
      await store.reconnect(s);return response({state:'configured',activationRequired:true});
    }catch(error){
      if(error instanceof RangeError)return response({error:'Request too large'},413);
      if(error instanceof SyntaxError||error instanceof TypeError)return response({error:'Invalid connection request'},400);
      if(error instanceof ConnectorError){const status=error.code==='forbidden'?403:error.code==='invalid_feed'?400:['conflict','cancelled'].includes(error.code)?409:503;return response({error:safeMessage(error.code)},status);}
      return response({error:'Connection service unavailable'},503);
    }
  };
}
