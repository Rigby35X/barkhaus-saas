import { jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import { ConnectorError } from './config.ts';

export interface ConnectorWorkloadConfig {
  issuer:string;
  audience:string;
  /** Exact verified subject -> internal worker ID; never derived from metadata. */
  subjects:ReadonlyMap<string,string>;
  /** Deployment-owned trusted JWKS/key selector; never a queue/request URL. */
  getKey:JWTVerifyGetKey;
  algorithms?:readonly ('RS256'|'ES256')[];
}
/** Cryptographic workload verification only. Composition must separately bind
 * workerId to one configured org/connection SQL capability; claims never choose it. */
export function createConnectorWorkloadVerifier(config:ConnectorWorkloadConfig){
  if(!config.issuer.trim()||!config.audience.trim()||config.subjects.size===0||
      [...config.subjects].some(([subject,workerId])=>!subject.trim()||!workerId.trim()))throw new Error('Explicit workload issuer, audience and subjects are required.');
  const subjects=new Map(config.subjects);
  const {issuer,audience,getKey}=config;
  const algorithms=[...(config.algorithms??['RS256'])];
  if(algorithms.length===0||algorithms.some(a=>!['RS256','ES256'].includes(a)))throw new Error('Approved asymmetric workload algorithms are required.');
  return async(proof:unknown):Promise<{workerId:string}>=>{
    if(typeof proof!=='string'||!proof||proof.length>16384||/\s/.test(proof))throw new ConnectorError('forbidden');
    try{
      const {payload}=await jwtVerify(proof,getKey,{issuer,audience,
        algorithms,requiredClaims:['sub','iat','exp'],maxTokenAge:'5m',clockTolerance:5});
      const workerId=payload.sub?subjects.get(payload.sub):undefined;
      if(!workerId||typeof payload.iat!=='number'||typeof payload.exp!=='number'||payload.exp-payload.iat>300||payload.exp<=payload.iat)throw new Error('Rejected workload');
      return {workerId};
    }catch{throw new ConnectorError('forbidden');}
  };
}
