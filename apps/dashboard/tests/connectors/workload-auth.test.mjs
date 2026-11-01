import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const tenantRequire=createRequire(new URL('../../../tenant-site/package.json',import.meta.url));
const {generateKeyPair,SignJWT}=await import(tenantRequire.resolve('jose'));
import {createConnectorWorkloadVerifier} from '../../../tenant-site/src/services/connectors/workload-auth.ts';

test('workload JWT signature, issuer, audience, expiry and subject determine only an internal worker ID',async()=>{
 const keys=await generateKeyPair('ES256');const other=await generateKeyPair('ES256');
 const config={issuer:'https://identity.example.test',audience:'barkhaus-connectors',subjects:new Map([['verified-service','worker-a']]),getKey:async()=>keys.publicKey,algorithms:['ES256']};
 const verify=createConnectorWorkloadVerifier(config);
 const sign=async(extra={},key=keys.privateKey)=>new SignJWT({sub:'verified-service',iss:config.issuer,aud:config.audience,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+120,...extra}).setProtectedHeader({alg:'ES256'}).sign(key);
 assert.deepEqual(await verify(await sign({orgId:999,connectionId:'forged-scope'})),{workerId:'worker-a'});
 for(const input of [null,{workerId:'worker-a'},'unsigned.claims.token',await sign({},other.privateKey),await sign({sub:'unknown-service'}),await sign({iss:'https://attacker.example.test'}),await sign({aud:'other-audience'}),await sign({exp:1}),await sign({exp:Math.floor(Date.now()/1000)+600})]){
  await assert.rejects(()=>verify(input),e=>e.code==='forbidden'&&!/token|claims|signature|attacker/.test(e.message));
 }
 config.subjects.set('added-after-composition','worker-b');
 const added=await sign({sub:'added-after-composition'});
 await assert.rejects(()=>verify(added));
});
