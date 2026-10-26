import { planFieldUpdate } from '../../../../shared/contracts/v1/policy.ts';
import { ConnectorError } from '../../../tenant-site/src/services/connectors/config.ts';

export function connection(orgId=1002) {
  return {version:1,id:'source-a',orgId,provider:'cognito',credentialRef:'vault://synthetic/source-a',state:'active',
    capabilities:{direction:'inbound',pagination:'cursor',incremental:false},
    config:{endpoint:'https://fixture.invalid/entries',formId:'38',identityColumn:'EntryNumber',revisionColumn:'UpdatedAt',statusColumn:'Code',pageSize:10},
    mapping:{version:1,id:'map-a',revision:1,orgId,fields:[
      {sourceColumn:'Name',target:{kind:'core',field:'name'},transform:'text'},
      {sourceColumn:'Species',target:{kind:'core',field:'species'},transform:'text'},
      {sourceColumn:'Photos',target:{kind:'core',field:'photos'},transform:'photos'},
      {sourceColumn:'Kennel',target:{kind:'custom',key:'kennel'},transform:'text'},
    ],statusMap:{Ready:{lifecycle:'care',availability:'available'},Placed:{lifecycle:'adopted',availability:'unavailable'}}}};
}
export const raw = (id='7', rev='2026-10-25T00:00:00.000Z', name='Moss')=>({EntryNumber:id,UpdatedAt:rev,Name:name,Species:'dog',Code:'Ready',Photos:['https://fixture.invalid/moss-v1.jpg'],Kennel:'K2'});
export const page = (entries, nextCursor=null, completeSnapshot=nextCursor===null)=>({status:200,body:{entries,nextCursor,completeSnapshot}});
export const auth = {
  async worker(proof) { if (proof!=='verified-workload') throw new ConnectorError('forbidden'); return {workerId:'worker-1'}; },
  async member(proof, orgId) { if(proof?.orgId!==orgId || !proof.active) throw new ConnectorError('forbidden'); return {kind:'member',userId:'test-user',orgId,role:proof.role}; },
};
/** TEST DOUBLE ONLY. No SQL or production animal repository. A+B supply these ports. */
export class FixtureStore {
  constructor(c=connection()) { this.c=c; this.animals={}; this.heads={}; this.jobs=[]; this.outcomes=[]; this.clock=1000; this.fence=0; this.writes=0; this.reviews=0; this.committedLeases=new Map(); }
  checkScope(s) { if(s.orgId!==this.c.orgId || s.connectionId!==this.c.id) throw new ConnectorError('forbidden'); }
  async enqueue(s,key) {
    this.checkScope(s);
    if(this.c.state!=='active') throw new ConnectorError('cancelled');
    const existing=this.jobs.find(j=>['queued','running','retry_wait'].includes(j.state));
    if(existing) return structuredClone(existing);
    const job={version:1,id:`job-${this.jobs.length+1}`,orgId:s.orgId,connectionId:s.connectionId,mappingRevision:this.c.mapping.revision,cursor:null,state:'queued',attempt:0,nextAttemptAt:null,counts:{created:0,updated:0,rejected:0,missingReview:0},box:null,seen:[],key};
    this.jobs.push(job); return structuredClone(job);
  }
  async status(s,id) { this.checkScope(s); return structuredClone(this.jobs.find(j=>j.id===id)); }
  async disconnect(s) { this.checkScope(s);this.c.state='disconnected';this.fence++;this.active=null;for(const j of this.jobs)if(j.state!=='completed')j.state='failed'; }
  async claim(worker,now,leaseMs) {
    this.clock=now;
    if(this.active?.expiresAt>now || this.c.state!=='active')return null;
    const j=this.jobs.find(j=>['queued','running','retry_wait'].includes(j.state)&&(!j.nextAttemptAt||Date.parse(j.nextAttemptAt)<=now));
    if(!j)return null;
    j.state='running';j.attempt++;
    const lease={orgId:this.c.orgId,connectionId:this.c.id,jobId:j.id,token:String(++this.fence),expiresAt:now+leaseMs};
    this.active=lease;
    return {lease,connection:structuredClone(this.c),job:structuredClone(j)};
  }
  valid(l) { if(this.active?.token!==l.token || this.c.state!=='active' || this.clock>=l.expiresAt)throw new ConnectorError('cancelled');return this.jobs.find(j=>j.id===l.jobId); }
  async assertLease(l,now) { this.clock=now;this.valid(l); }
  async inbox(l) { return structuredClone(this.valid(l).box); }
  async snapshot(l) { this.valid(l);return Object.fromEntries(Object.entries(this.animals).map(([id,a])=>[id,{revision:a.revision}])); }
  async saveInbox(l,p,b) { const j=this.valid(l);if(!j.box)j.box={page:structuredClone(p),before:structuredClone(b),completed:[]}; }
  async commitPage(l,run) {
    const j=this.valid(l);
    if(this.committedLeases.has(l.token))return structuredClone(this.committedLeases.get(l.token));
    const backup=structuredClone({animals:this.animals,heads:this.heads,job:j,outcomes:this.outcomes,writes:this.writes,reviews:this.reviews});
    let checkpointed=false;
    const tx={
      current:async id=>structuredClone(this.animals[id]??null),
      sourceHead:async id=>structuredClone(this.heads[id]??null),
      writer:{execute:async(actor,cmd)=>{
        if(this.failId===cmd.externalRecordId){this.failId=null;throw Error('synthetic private error body');}
        if(actor.kind!=='worker'||actor.orgId!==this.c.orgId||actor.connectionId!==this.c.id||cmd.orgId!==actor.orgId)return {ok:false,code:'forbidden'};
        let a=this.animals[cmd.externalRecordId];
        if(a){const plan=planFieldUpdate(a,actor,cmd.expectedRevision,cmd.fields,cmd.customFields);if(!plan.ok)return plan;a={...a,fields:plan.fields,customFields:plan.customFields,revision:plan.nextRevision};}
        else {
          if(cmd.expectedRevision!==null)return {ok:false,code:'conflict'};
          const fields={name:'',species:'',breed:null,age:{kind:'unknown'},sex:'unknown',size:'unknown',biography:null,photos:[],lifecycle:'unknown',availability:'unknown',...cmd.fields};
          const owner={kind:'connector',connectionId:this.c.id};
          a={contractVersion:'barkhaus.animal.v1',id:`animal-${this.c.orgId}-${Object.keys(this.animals).length+1}`,orgId:this.c.orgId,revision:1,source:{kind:'connector',connectionId:this.c.id,provider:'cognito',externalRecordId:cmd.externalRecordId},fields,ownership:Object.fromEntries(Object.keys(fields).map(k=>[k,Object.hasOwn(cmd.fields,k)?owner:{kind:'barkhaus'}])),publication:{state:'unpublished',publicProfileKey:null,approvedPhotos:[]},privateData:{internalNotes:'',medicalRecordIds:[],documentIds:[]},customFields:Object.fromEntries(Object.entries(cmd.customFields??{}).map(([k,value])=>[k,{value,owner}])),syncState:'current',applications:['local-app']};
        }
        this.animals[cmd.externalRecordId]=a;this.writes++;return {ok:true,animal:structuredClone(a),replayed:false};
      }},
      recordOutcome:async(id,outcome,revision,digest)=>{
        if(this.failOutcome){this.failOutcome=false;throw Error('commit failure');}
        this.valid(l);
        j.box.completed.push(id);j.seen.push(id);
        this.heads[id]={revision,digest};
        this.outcomes.push({jobId:j.id,cursor:j.cursor,id,outcome,revision,digest});
        if(['created','updated'].includes(outcome))j.counts[outcome]++;
      },
      checkpoint:async()=>{await this.checkpointWithinPage(l);checkpointed=true;},
    };
    let result;
    try{result=await run(tx);if(!checkpointed)throw Error('page checkpoint required');}catch(e){this.animals=backup.animals;this.heads=backup.heads;Object.assign(j,backup.job);this.outcomes=backup.outcomes;this.writes=backup.writes;this.reviews=backup.reviews;throw e;}
    this.committedLeases.set(l.token,structuredClone(result));
    // A transport failure AFTER the commit must never undo the committed receipt.
    if(this.loseCommitAck){this.loseCommitAck=false;throw Error('commit acknowledgement lost');}
    return result;
  }
  async checkpointWithinPage(l) {
    const j=this.valid(l);const box=j.box;
    if(this.failCheckpoint){this.failCheckpoint=false;throw Error('checkpoint failure');}
    if(box.page.records.some(r=>!box.completed.includes(r.externalRecordId)))throw Error('outcomes required');
    j.cursor=box.page.nextCursor;
    if(j.cursor===null){j.state='completed';if(box.page.completeSnapshot){for(const id of Object.keys(this.animals))if(!j.seen.includes(id)){this.animals[id].syncState='missing_review';j.counts.missingReview++;this.reviews++;}}}
    else j.state='queued';
    j.box=null;
  }
  async fail(l,f) { const j=this.valid(l);if(this.committedLeases.has(l.token))return;j.state=f.nextAttemptAt?'retry_wait':'failed';j.nextAttemptAt=f.nextAttemptAt;j.error=f; }
  async release(l) { if(this.active?.token===l.token)this.active=null; }
}
