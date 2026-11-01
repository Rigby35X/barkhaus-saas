import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { captureSignupIntent, parseSignupIntent, readSavedSignupIntent, saveSignupIntent, signupRedirect, signUpWithEmail, signInWithGoogle } from '../../src/features/identity/signup.ts';
const require=createRequire(import.meta.url);
const storage=()=>{const saved=new Map();return {getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};};
const intent={plan:'growth',billing:'paid'};

test('only supported plan/billing preferences survive signup callbacks and storage',()=>{
 const saved=storage();
 assert.deepEqual(captureSignupIntent('?plan=growth&billing=paid&role=owner&orgId=9&returnTo=https://evil.test',saved),intent);
 assert.deepEqual(readSavedSignupIntent(saved),intent);
 assert.deepEqual(parseSignupIntent('?plan=starter'),{plan:'starter',billing:'paid'});
 assert.deepEqual(parseSignupIntent('?plan=pro&billing=trial'),{plan:'pro',billing:'trial'});
 for(const query of ['?plan=enterprise&billing=paid','?plan=growth&billing=active','?plan=starter&plan=pro','?plan=pro&billing=paid&billing=trial','?role=owner&orgId=9'])assert.equal(parseSignupIntent(query),null);
 saved.setItem('barkhausSignupIntent','{"plan":"growth","billing":"paid","role":"owner","orgId":9,"subscription":"active"}');
 assert.deepEqual(readSavedSignupIntent(saved),intent);
 assert.throws(()=>saveSignupIntent(saved,{plan:'enterprise',billing:'active'}));
 assert.equal(readSavedSignupIntent({getItem(){throw new Error('storage blocked');}}),null);
});

test('email signup and OAuth use fixed dashboard callbacks with no arbitrary redirect or URL tokens',async()=>{
 assert.equal(signupRedirect('https://app.barkhaus.io','signup',intent),'https://app.barkhaus.io/signup?plan=growth&billing=paid');
 assert.equal(signupRedirect('http://localhost:5173','login',null),'http://localhost:5173/login');
 for(const origin of ['https://barkhaus.io','https://app.barkhaus.io.evil.test','https://app.barkhaus.io/path','javascript:alert(1)','https://evil.test'])assert.throws(()=>signupRedirect(origin,'signup',intent));
 let oauth;
 await signInWithGoogle({auth:{async signInWithOAuth(input){oauth=input;return {error:null};}}},'https://app.barkhaus.io','signup',intent);
 assert.deepEqual(oauth,{provider:'google',options:{redirectTo:'https://app.barkhaus.io/signup?plan=growth&billing=paid',queryParams:{prompt:'select_account'}}});
 await assert.rejects(signInWithGoogle({auth:{async signInWithOAuth(){return {error:new Error('private provider detail')};}}},'https://app.barkhaus.io','login',null),/Google sign-in is unavailable/);
});

test('email signup collects untrusted preferences without creating roles, memberships or active subscriptions',async()=>{
 let request;
 const client={auth:{async signUp(input){request=input;return {data:{session:null},error:null};}}};
 const result=await signUpWithEmail(client,{fullName:' New Staff ',organizationName:' Any Rescue ',email:' staff@example.test ',password:'valid-long-password',intent,role:'owner',orgId:9,subscription:'active'},'https://app.barkhaus.io');
 assert.equal(result,'confirmation-required');
 assert.equal(request.email,'staff@example.test');
 assert.deepEqual(request.options.data,{full_name:'New Staff',organization_name:'Any Rescue',requested_plan:'growth',billing_preference:'paid'});
 assert.ok(!JSON.stringify(request).includes('orgId'));
 assert.ok(!Object.hasOwn(request.options.data,'role'));
 assert.ok(!Object.hasOwn(request.options.data,'subscription'));
 assert.equal(request.options.emailRedirectTo,'https://app.barkhaus.io/signup?plan=growth&billing=paid');
 const existing={auth:{async signUp(){return {data:{session:null},error:{code:'user_already_exists'}};}}};
 assert.equal(await signUpWithEmail(existing,{fullName:'Staff',organizationName:'Rescue',email:'staff@example.test',password:'valid-long-password',intent},'https://app.barkhaus.io'),'confirmation-required');
 let calls=0;
 await assert.rejects(signUpWithEmail({auth:{async signUp(){calls++;}}},{fullName:'Staff',organizationName:'Rescue',email:'staff@example.test',password:'short',intent},'https://app.barkhaus.io'),/12 characters/);
 assert.equal(calls,0);
 await assert.rejects(signUpWithEmail({auth:{async signUp(){throw new Error('private provider detail');}}},{fullName:'Staff',organizationName:'Rescue',email:'staff@example.test',password:'valid-long-password',intent},'https://app.barkhaus.io'),error=>error.message==='Unable to create your account. Please try again or sign in.');
});

function screen(path) {
 const source=readFileSync(new URL('../../src/components/LoginScreen.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};const saved=storage();
 vm.runInNewContext(code,{exports,sessionStorage:saved,URLSearchParams,URL,window:{location:{origin:'https://app.barkhaus.io'}},require:id=>{
  if(id==='../lib/supabase')return {supabase:{},isSupabaseConfigured:true};
  if(id==='../lib/auth')return {login(){throw new Error('render must not authenticate');}};
  if(id==='../features/identity/signup')return {captureSignupIntent,saveSignupIntent,signInWithGoogle,signUpWithEmail};
  if(id==='../features/identity/recovery')return {RECOVERY_PENDING:'barkhausRecoveryPending'};
  return require(id);
 }});
 return renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:[path]},React.createElement(exports.default)));
}
test('signup and returning-user screens communicate separate actions and paid signup does not require a trial',()=>{
 const signup=screen('/signup?plan=pro&billing=paid');
 assert.match(signup,/Create your BarkHaus account/);assert.match(signup,/Organization name/);assert.match(signup,/Continue with Google/);assert.match(signup,/>Sign up<\/button>/);assert.match(signup,/value="paid" selected=""/);assert.match(signup,/No payment is collected here/);assert.match(signup,/Already have an account/);
 assert.match(screen('/signup/?plan=pro&billing=paid'),/Create your BarkHaus account/);
 const login=screen('/login');
 assert.match(login,/Welcome back/);assert.match(login,/Sign in to your existing rescue workspace/);assert.match(login,/>Sign in<\/button>/);assert.match(login,/New to BarkHaus/);assert.ok(!login.includes('id="signup-organization"'));
});
