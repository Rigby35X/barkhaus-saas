import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
const require=createRequire(import.meta.url);
function workspace(available=true){
 const source=readFileSync(new URL('../../src/tabs/AnimalWorkspaceTab.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};
 const mocks={
  '../features/animals/NativeAnimals':{default:props=>React.createElement('p',null,`Native ${props.orgId} publish=${props.canPublish}`)},
  '../features/imports':{CsvOnboarding:props=>React.createElement('p',null,`CSV ${props.orgId} import=${props.canImport}`),createCsvOnboardingHttpClient:options=>{assert.equal(options.endpoint,'http://localhost:5173/api/v1/imports');return {behavior:'persistent'};}},
  '../lib/platform-http':{getPlatformApiUrl:()=>{if(!available)throw Error('unavailable');return 'http://localhost:5173/api/v1/imports';}},
  '../lib/platform-session':{platformAccessToken:async()=>{throw Error('SSR must not fetch tokens');}},
 };
 vm.runInNewContext(code,{exports,require:name=>mocks[name]??require(name),URLSearchParams});
 return exports.default;
}
function render(path,props,available=true){return renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:[path]},React.createElement(workspace(available),props)));}
test('animal workspace restores CSV URL mode and keeps viewer imports disabled',()=>{
 const viewer=render('/staging-native/animals?animalMode=import',{orgId:1001,canEdit:false,canPublish:false});
 assert.match(viewer,/CSV 1001 import=false/);
 const staff=render('/staging-native/animals?animalMode=import',{orgId:1001,canEdit:true,canPublish:false});
 assert.match(staff,/CSV 1001 import=true/);
 const native=render('/staging-native/animals',{orgId:1001,canEdit:true,canPublish:true});
 assert.match(native,/Native 1001 publish=true/);
 assert.doesNotMatch(native,/CSV 1001/);
});
test('unconfigured import transport shows unavailable state without a legacy or provider fallback',()=>{
 const html=render('/staging-native/animals?animalMode=import',{orgId:1001,canEdit:true},false);
 assert.match(html,/CSV imports are not available/);
 assert.doesNotMatch(html,/CSV 1001/);
});
