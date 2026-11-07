import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
let source=fs.readFileSync(new URL('../src/middleware.ts',import.meta.url),'utf8')
 .replace("import { defineMiddleware } from 'astro:middleware';",'const defineMiddleware = fn => fn;')
 .replace("'./lib/organization-auth.js'",JSON.stringify(new URL('../src/lib/organization-auth.js',import.meta.url).href))
 .replaceAll('import.meta.env.DASHBOARD_ORIGIN',"'https://dashboard.example.invalid'")
 .replaceAll('import.meta.env.PUBLIC_SUPABASE_URL',"'https://supabase.example.invalid'")
 .replaceAll('import.meta.env.PUBLIC_SUPABASE_ANON_KEY',"'public-test-key'");
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source,{mode:'transform'})).toString('base64'));
let enabled=true;
globalThis.fetch=async(url,opts)=>{
 if(url.includes('/auth/v1/user'))return new Response(JSON.stringify({id:'test-user'}));
 if(url.includes('organization_memberships'))return new Response(JSON.stringify(enabled?[{role:'owner',organizations:{is_active:true}}]:[]));
 return new Response(JSON.stringify([{id:1,org:'Test Rescue',slug:'test',is_active:true}]));
};
let called=0;
const next=async()=>{called++;return new Response('{"ok":true}',{headers:{'Cache-Control':'public, max-age=300'}});};
const check=async(method,path,body,token=true)=>{
 let url=new URL('https://test.barkhaus.io'+path);
 let headers={host:'test.barkhaus.io','Content-Type':'application/json',...(token?{Authorization:'Bearer test-token'}:{})};
 const request=new Request(url,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
 return onRequest({request,url,locals:{}},next);
};
let encoded=await check('PUT','/api/%61dmin/animals',{orgId:1},false);assert.equal(encoded.status,401);assert.equal(called,0);
let res=await check('PUT','/api/website-content',{orgId:1},false);assert.equal(res.status,401);assert.equal(called,0);
res=await check('PUT','/api/website-content',{orgId:1,org_id:2});assert.equal(res.status,400);assert.equal(called,0);
res=await check('PUT','/api/website-content',{org_id:1});assert.equal(res.status,400);
res=await check('PUT','/api/website-content',{orgId:'1&org_id=eq.2'});assert.equal(res.status,400);
res=await check('PUT','/api/website-content',{orgId:2});assert.equal(res.status,403);
enabled=false;res=await check('PUT','/api/website-content',{orgId:1});assert.equal(res.status,403);assert.equal(called,0);
enabled=true;res=await check('PUT','/api/website-content',{orgId:1});assert.equal(res.status,200);assert.equal(called,1);assert.equal(res.headers.get('Cache-Control'),'private, no-store');
res=await check('DELETE','/api/admin/animals?orgId=1&id=10');assert.equal(res.status,200);
res=await check('OPTIONS','/api/admin/animals',null,false);assert.equal(res.status,204);assert.equal(res.headers.get('Access-Control-Allow-Origin'),'https://dashboard.example.invalid');assert.match(res.headers.get('Access-Control-Allow-Headers'),/Authorization/);
res=await check('GET','/api/website-content',null,false);assert.equal(res.status,200);
console.log('PASS: middleware rejects missing/conflicting scopes, cross-host organizations, revoked membership and anonymous writes before invoking handlers; allows public reads and preflight.');
