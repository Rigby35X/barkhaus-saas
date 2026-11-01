import { useEffect, useRef, useState } from 'react';
import type { ConnectorClient, ConnectorJobStatus, ConnectorSummary } from './types';

export interface ConnectorPanelProps {
  orgId:number;
  role:'owner'|'admin'|'staff'|'viewer';
  client:ConnectorClient;
  connectionId?:string;
}
/** Connection management is separate from choosing native animal management.
 * This panel never starts a worker, collects a provider secret or activates sync. */
export function ConnectorPanel({orgId,role,client,connectionId=''}:ConnectorPanelProps){
  const [selected,setSelected]=useState(connectionId);
  const [connection,setConnection]=useState<ConnectorSummary|null>(null);
  const [job,setJob]=useState<ConnectorJobStatus|null>(null);
  const [jobId,setJobId]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [confirmDisconnect,setConfirmDisconnect]=useState(false);
  const sequence=useRef(0);
  const manage=role==='owner'||role==='admin';
  useEffect(()=>{
    sequence.current++;setSelected(connectionId);setConnection(null);setJob(null);setJobId('');setError('');setNotice('');setBusy(false);setConfirmDisconnect(false);
    return ()=>{sequence.current++;};
  },[orgId,connectionId,client]);
  async function work(run:()=>Promise<void>){
    const request=++sequence.current;setBusy(true);setError('');setNotice('');
    try{await run();}catch(e){if(request===sequence.current)setError(e instanceof Error?e.message:'Connection request failed.');}
    finally{if(request===sequence.current)setBusy(false);}
  }
  async function load(){
    const request=sequence.current;
    const value=await client.connection(orgId,selected);
    if(request===sequence.current)setConnection(value);
  }
  function changeSelection(value:string){sequence.current++;setSelected(value);setConnection(null);setJob(null);setJobId('');setError('');setNotice('');setBusy(false);setConfirmDisconnect(false);}
  if(role==='viewer')return <section aria-label="Connections"><h2>Connections</h2><p>Your role does not permit connection management. Animal records remain available through your workspace.</p></section>;
  return <section aria-label="Connections" className="space-y-4">
    <h2>Connections</h2>
    <p>Connections are optional. Manage animals directly in BarkHaus or use a configured provider with one-way sync.</p>
    <label>Connection ID <input value={selected} onChange={e=>changeSelection(e.target.value)} placeholder="Choose your configured connection" /></label>
    <button disabled={busy||!selected.trim()} onClick={()=>void work(load)}>Load connection</button>
    {connection&&<div>
      <h3>{connection.provider} · {connection.id}</h3>
      <p>State: {connection.state}. Last successful sync: {connection.lastSuccessAt?new Date(connection.lastSuccessAt).toLocaleString():'Not recorded yet'}.</p>
      {connection.error&&<p role="alert">{connection.error.message}</p>}
      <h4>Saved field mapping · revision {connection.mapping.revision}</h4>
      <table><thead><tr><th>Source field</th><th>BarkHaus field</th><th>Transform</th></tr></thead><tbody>{connection.mapping.fields.map((field,index)=><tr key={index}><td>{field.sourceColumn}</td><td>{field.target.kind==='core'?field.target.field:`Custom: ${field.target.key}`}</td><td>{field.transform??'None'}</td></tr>)}</tbody></table>
      <p>Mapping changes require a reviewed saved revision. Source-owned fields remain managed in the connected software.</p>
      {Object.entries(connection.mapping.statusMap).map(([label,state])=><p key={label}>{label}: {state.lifecycle} / {state.availability}</p>)}
      {connection.activationRequired&&<p>Configuration and credential review is required before sync can be activated.</p>}
      <button disabled={!manage||busy||connection.state!=='active'||connection.activationRequired} onClick={()=>void work(async()=>{
        const request=sequence.current;const value=await client.sync(orgId,connection.id,crypto.randomUUID());
        if(request===sequence.current){setJob(value);setJobId(value.id);setNotice('Sync queued. The server worker processes records independently of this page.');}
      })}>Queue sync</button>
      <button disabled={!manage||busy} onClick={()=>void work(async()=>{
        const request=sequence.current;await client.reconnect(orgId,connection.id);if(request!==sequence.current)return;
        await load();if(request===sequence.current)setNotice('Reconnect requested. Sync remains inactive until server-side credential and configuration review.');
      })}>Request reconnect review</button>
      <label><input type="checkbox" checked={confirmDisconnect} disabled={!manage||busy} onChange={e=>setConfirmDisconnect(e.target.checked)} /> Stop syncing and preserve saved animals and BarkHaus information</label>
      <button disabled={!manage||busy||!confirmDisconnect||connection.state==='disconnected'} onClick={()=>void work(async()=>{
        const request=sequence.current;await client.disconnect(orgId,connection.id);if(request!==sequence.current)return;
        await load();if(request===sequence.current){setJob(null);setJobId('');setConfirmDisconnect(false);setNotice('Disconnected. Saved animals remain; field ownership has not been transferred to BarkHaus.');}
      })}>Disconnect</button>
      <label>Job ID <input value={jobId} onChange={e=>setJobId(e.target.value)} /></label>
      <button disabled={busy||!jobId.trim()} onClick={()=>void work(async()=>{
        const request=sequence.current;const value=await client.job(orgId,connection.id,jobId);if(request===sequence.current)setJob(value);
      })}>Refresh job</button>
    </div>}
    {job&&<div aria-live="polite"><h3>Job {job.id}: {job.state}</h3><p>Attempt {job.attempt} · {job.counts.created} created · {job.counts.updated} updated · {job.counts.rejected} rejected · {job.counts.missingReview} need review</p>{job.nextAttemptAt&&<p>Retry scheduled: {new Date(job.nextAttemptAt).toLocaleString()}</p>}</div>}
    {notice&&<p role="status">{notice}</p>}{busy&&<p role="status">Loading…</p>}{error&&<p role="alert">{error}</p>}
  </section>;
}
