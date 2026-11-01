import type { ConnectorClient, ConnectorJobStatus, ConnectorSummary } from './types';

export interface ConnectorClientOptions {
  endpoint:string;
  accessToken():Promise<string|null>;
  fetch?:typeof fetch;
}
/** Browser control client only; it never receives a server credential reference. */
export function createConnectorClient(options:ConnectorClientOptions):ConnectorClient{
  const endpoint=new URL(options.endpoint);
  const loopback=['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname);
  if(endpoint.username||endpoint.password||endpoint.search||endpoint.hash||endpoint.protocol!=='https:'&&!(endpoint.protocol==='http:'&&loopback))throw new Error('A trusted HTTPS or local platform endpoint is required.');
  const transport=options.fetch??globalThis.fetch;
  async function request<T>(orgId:number,connectionId:string,action?:string,extra:Record<string,string>={}):Promise<T>{
    if(!Number.isSafeInteger(orgId)||orgId<1||!connectionId.trim()||connectionId.length>200)throw new Error('Choose a valid organization and connection.');
    const token=await options.accessToken();if(!token)throw new Error('Please sign in again.');
    const url=new URL(endpoint);const headers:Record<string,string>={Authorization:`Bearer ${token}`};
    let body:string|undefined;
    if(action){headers['Content-Type']='application/json';body=JSON.stringify({orgId,connectionId,action,...extra});}
    else {url.search=new URLSearchParams({orgId:String(orgId),connectionId,...extra}).toString();}
    let response:Response;
    try{response=await transport(url,{method:action?'POST':'GET',headers,body,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});}
    catch{throw new Error('Connection service unavailable. Retry when the workspace connection is ready.');}
    if(!response.ok){await response.body?.cancel().catch(()=>{});
      if(response.status===401)throw new Error('Please sign in again.');
      if(response.status===403)throw new Error('You do not have access to this connection.');
      if(response.status===409)throw new Error('Connection state changed. Refresh before trying again.');
      if(response.status===400)throw new Error('Check the connection and request details.');
      throw new Error('Connection service unavailable. Retry when the workspace connection is ready.');
    }
    try{return await response.json() as T;}catch{throw new Error('Connection service returned an invalid response.');}
  }
  function object(value:unknown):Record<string,unknown>{
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Connection service returned an invalid response.');
    return value as Record<string,unknown>;
  }
  function publicJob(value:unknown,orgId:number,connectionId:string,jobId?:string):ConnectorJobStatus{
    const data=object(value);const counts=object(data.counts);
    if(data.orgId!==orgId||data.connectionId!==connectionId||typeof data.id!=='string'||jobId!==undefined&&data.id!==jobId||
        !['queued','running','retry_wait','completed','failed'].includes(String(data.state))||
        typeof data.attempt!=='number'||!Number.isSafeInteger(data.attempt)||data.attempt<0||
        !['created','updated','rejected','missingReview'].every(key=>typeof counts[key]==='number'&&Number.isSafeInteger(counts[key])&&Number(counts[key])>=0))throw new Error('Connection service returned an invalid response.');
    return value as ConnectorJobStatus;
  }
  return {
    connection:async(orgId,connectionId)=>{
      const value=await request<unknown>(orgId,connectionId);const data=object(value);const mapping=object(data.mapping);
      if(data.orgId!==orgId||data.id!==connectionId||typeof data.provider!=='string'||
          !['configured','active','error','disconnected'].includes(String(data.state))||
          mapping.orgId!==orgId||!Array.isArray(mapping.fields)||typeof mapping.statusMap!=='object'||
          typeof data.activationRequired!=='boolean')throw new Error('Connection service returned an invalid response.');
      return value as ConnectorSummary;
    },
    job:async(orgId,connectionId,jobId)=>publicJob(await request<unknown>(orgId,connectionId,undefined,{jobId}),orgId,connectionId,jobId),
    sync:async(orgId,connectionId,requestKey)=>publicJob(await request<unknown>(orgId,connectionId,'sync',{requestKey}),orgId,connectionId),
    disconnect:async(orgId,connectionId)=>{
      const value=object(await request<unknown>(orgId,connectionId,'disconnect'));
      if(value.state!=='disconnected')throw new Error('Connection service returned an invalid response.');return {state:'disconnected'};
    },
    reconnect:async(orgId,connectionId)=>{
      const value=object(await request<unknown>(orgId,connectionId,'reconnect'));
      if(value.state!=='configured'||value.activationRequired!==true)throw new Error('Connection service returned an invalid response.');return {state:'configured',activationRequired:true};
    },
  };
}
