import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
function load(path, mocks) {
  const source = readFileSync(new URL(path, import.meta.url),'utf8');
  const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports = {};
  vm.runInNewContext(code,{exports,require: name => mocks[name] ?? require(name),structuredClone,crypto});
  return exports;
}
const { default: Editor } = load('../../src/features/animals/AnimalEditor.tsx',{'./client':{}});
const { pendingCommand } = load('../../src/features/animals/client.ts',{'../../lib/api':{}});
const record = {
  id: 'animal',orgId:1002,revision:7,source:{kind:'connector'},
  fields:{name:'Source animal',species:'Dog',breed:null,biography:null,age:{kind:'unknown'},sex:'unknown',size:'unknown',lifecycle:'care',availability:'available',photos:[]},
  ownership:Object.fromEntries(['name','species','breed','biography','age','sex','size','lifecycle','availability','photos'].map(k=>[k,{kind:'connector',connectionId:'c1'}])),
  privateData:{internalNotes:'Local note',documentIds:[],medicalRecordIds:[]},
  publication:{state:'unpublished',publicProfileKey:null,approvedPhotos:[]},
  customFields:{local:{value:'Local annotation',owner:{kind:'barkhaus'}},remote:{value:'Source value',owner:{kind:'connector',connectionId:'c1'}}},
};
test('rendered connected editor disables source-owned controls and permits local annotations',()=>{
  const html = renderToStaticMarkup(React.createElement(Editor,{orgId:1002,animal:record,canEdit:true,onSaved(){},onClose(){}}));
  assert.match(html, /name.*managed by source.*<textarea[^>]*disabled=""[^>]*>Source animal/s);
  assert.match(html, /Private notes<textarea(?![^>]*disabled)[^>]*>Local note/);
  assert.match(html, /Private custom field: local<textarea(?![^>]*disabled)[^>]*>&quot;Local annotation&quot;/);
  assert.match(html, /Private custom field: remote.*<textarea[^>]*disabled=""[^>]*>&quot;Source value&quot;/s);
});
test('viewer rendered editor disables local notes and save; blank create has no species/publication defaults',()=>{
  const html = renderToStaticMarkup(React.createElement(Editor,{orgId:1002,animal:record,canEdit:false,onSaved(){},onClose(){}}));
  assert.match(html,/Private notes<textarea[^>]*disabled=""/);
  assert.match(html,/<button[^>]*disabled=""[^>]*>Save changes/);
  const blank = renderToStaticMarkup(React.createElement(Editor,{orgId:1001,animal:null,canEdit:true,onSaved(){},onClose(){}}));
  assert.match(blank,/species<textarea[^>]*><\/textarea>/);
  assert.match(blank,/Save unpublished animal/);
});
test('network retry retains exact command/key; changed payload or revision allocates a fresh key',()=>{
  const first = {kind:'edit_native',idempotencyKey:'original',expectedRevision:7,fields:{name:'A'}};
  assert.equal(pendingCommand(first,{...first,idempotencyKey:'new'}),first);
  const changed = {...first,idempotencyKey:'new',fields:{name:'B'}};
  assert.equal(pendingCommand(first,changed),changed);
  const revised = {...first,idempotencyKey:'newer',expectedRevision:8};
  assert.equal(pendingCommand(first,revised),revised);
});

test('public image upload helper rejects private documents and unreviewed animal candidates before storage',async()=>{
  const { uploadImage } = load('../../src/lib/upload.ts',{'./supabase':{isSupabaseConfigured:true,supabase:{}}});
  await assert.rejects(uploadImage({type:'application/pdf',size:10},'animals',1001),/Private documents require signed private storage/);
  await assert.rejects(uploadImage({type:'image/jpeg',size:10},'animals',1001),/CAS completion service/);
  await assert.rejects(uploadImage({type:'image/jpeg',size:10},'logos',undefined),/organization is required/);
});
