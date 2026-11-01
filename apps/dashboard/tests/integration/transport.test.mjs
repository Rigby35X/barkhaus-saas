import test from 'node:test';
import assert from 'node:assert/strict';
import {PostgresDatabase} from '../../../tenant-site/src/services/animals/postgres-database.ts';

test('pool transaction holds one connection through commit and rejects escaped handles',async()=>{
  const queries=[];let connections=0,releases=0,escaped;
  const database=new PostgresDatabase({connect:async()=>{connections++;return {query:async q=>{queries.push(q);return {rows:[]};},release:()=>releases++};}});
  const value=await database.transaction(async sql=>{escaped=sql;await sql.query('animal');await sql.query('outcome');await sql.query('checkpoint');return 42;});
  assert.equal(value,42);assert.equal(connections,1);assert.equal(releases,1);
  assert.deepEqual(queries.slice(-4),['animal','outcome','checkpoint','commit']);
  assert.throws(()=>escaped.query('late write'),/closed/);
});
test('checkpoint error rolls back and releases without reporting success',async()=>{
  const queries=[];let released=false;
  const database=new PostgresDatabase({connect:async()=>({query:async q=>{queries.push(q);if(q==='checkpoint')throw Error('failed');return {rows:[]};},release:()=>released=true})});
  await assert.rejects(database.transaction(async sql=>{await sql.query('animal');await sql.query('checkpoint');}),/failed/);
  assert.equal(queries.includes('commit'),false);assert.equal(queries.at(-1),'rollback');assert.equal(released,true);
});
test('only definitely aborted serialization failures retry; uncertain commits do not',async()=>{
  let connections=0,runs=0;
  const database=new PostgresDatabase({connect:async()=>{const n=++connections;return {query:async q=>{if(q==='commit'&&n===1)throw Object.assign(Error('retry'),{code:'40001'});return {rows:[]};},release(){}};}});
  assert.equal(await database.transaction(async()=>++runs),2);assert.equal(connections,2);
  let attempts=0;
  const uncertain=new PostgresDatabase({connect:async()=>({query:async q=>{if(q==='commit')throw Error('acknowledgement lost');return {rows:[]};},release(){}})});
  await assert.rejects(uncertain.transaction(async()=>++attempts),/lost/);assert.equal(attempts,1);
});
