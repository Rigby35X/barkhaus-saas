import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import * as routing from '../../src/lib/routes.ts';
import {selectOrganization,canManageOrganization} from '../../src/lib/access.ts';
import {captureSignupIntent,readSavedSignupIntent} from '../../src/features/identity/signup.ts';
const require=createRequire(import.meta.url);
function load(file,mocks,storage){
 const source=readFileSync(new URL(file,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};
 vm.runInNewContext(code,{exports,sessionStorage:storage,URLSearchParams,window:{location:{origin:'https://app.barkhaus.io'}},require:id=>mocks[id]??require(id)});
 return exports.default;
}
function render({access=[],error='',path='/signup?plan=growth&billing=paid'}={}){
 const saved=new Map([['barkhausSignupIntent','{"plan":"growth","billing":"paid","orgId":9,"role":"owner"}']]);
 const storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
 const Pending=load('../../src/components/PendingWorkspace.tsx',{'../lib/supabase':{supabase:{}},'../features/identity/recovery':{acceptInvitation:()=>{throw Error('SSR must not accept an invitation');}}},storage);
 const Empty=()=>null;
 const mocks={
  './lib/routes':routing,
  './lib/auth':{preferredOrganization:()=>9,rememberOrganization(){},logout(){throw Error('SSR must not sign out');}},
  './lib/access':{selectOrganization,canManageOrganization},
  './hooks/useOrganizationSession':{useOrganizationSession:()=>({user:{id:'synthetic-user'},access,error,loading:false,retry(){}})},
  './lib/apiCache':{clearCache(){}},
  './features/identity/signup':{captureSignupIntent,readSavedSignupIntent},
  './components/LoginScreen':{default:Empty},'./components/PendingWorkspace':{default:Pending},
  './components/Layout':{default:props=>React.createElement('main',{'data-verified-org':props.orgId},props.children)},
  './components/Onboarding':{default:Empty},'./components/OnboardingWizard':{default:Empty},
  './lib/onboarding':{isOnboardingComplete:()=>false,resetOnboarding(){}},
  './lib/onboardingWizard':{isWizardComplete:()=>false,markWizardComplete(){},resetWizard(){}},
  './tabs/AnimalWorkspaceTab':{default:Empty},
 };
 const App=load('../../src/App.tsx',mocks,storage);
 return renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:[path]},React.createElement(App)));
}
test('an unrelated account with a remembered MBPR preference stays outside MBPR',()=>{
 const html=render({path:'/mbpr/animals'});
 assert.match(html,/Your organization workspace hasn’t been set up yet/);
 assert.match(html,/Selected plan: Growth/);
 assert.match(html,/No subscription has been activated and no payment has been taken/);
 assert.doesNotMatch(html,/data-verified-org="9"/);
 assert.doesNotMatch(html,/Org ID|Use Org ID instead/);
});
test('an existing verified MBPR member may open MBPR',()=>{
 const html=render({path:'/mbpr/animals',access:[{orgId:9,role:'owner',orgConfig:{subdomain:'mbpr'}}]});
 assert.match(html,/data-verified-org="9"/);
 assert.doesNotMatch(html,/Your organization workspace hasn’t been set up yet/);
});
test('membership verification errors do not become an organization or successful setup',()=>{
 const html=render({error:'We could not verify organization access.'});
 assert.match(html,/Unable to load your workspace/);
 assert.doesNotMatch(html,/data-verified-org="9"/);
 assert.doesNotMatch(html,/Your organization workspace hasn’t been set up yet/);
});
