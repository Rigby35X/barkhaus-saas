import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePostgresPoolConfig,createPostgresPersistence} from '../../../tenant-site/src/services/animals/pg-pool.ts';
const config={host:'db.synthetic.invalid',port:5432,database:'synthetic',user:'native_runtime',password:'synthetic-only',ssl:{rejectUnauthorized:true}};

test('PostgreSQL configuration rejects missing identity or unverified remote TLS before any connection',()=>{
 for(const key of ['host','database','user','password'])assert.throws(()=>validatePostgresPoolConfig({config:{...config,[key]:undefined}}),/Explicit PostgreSQL/);
 for(const ssl of [undefined,true,false,{}, {rejectUnauthorized:false}])assert.throws(()=>validatePostgresPoolConfig({config:{...config,ssl}}),/verified TLS/);
 assert.throws(()=>validatePostgresPoolConfig({config:{...config,connectionString:'postgres://unused.invalid'}}),/explicit server/);
 assert.throws(()=>validatePostgresPoolConfig({config:{...config,max:100}}),/bounds/);
 assert.throws(()=>validatePostgresPoolConfig({config:{...config,connectionTimeoutMillis:0}}),/timeouts/);
});

test('plaintext PostgreSQL is limited to an explicit disposable loopback configuration',()=>{
 assert.throws(()=>validatePostgresPoolConfig({config:{...config,ssl:false},allowLocalPlaintext:true}),/verified TLS/);
 assert.throws(()=>validatePostgresPoolConfig({config:{...config,host:'127.0.0.1',ssl:false}}),/verified TLS/);
 const local=validatePostgresPoolConfig({config:{...config,host:'127.0.0.1',ssl:false},allowLocalPlaintext:true});
 assert.equal(local.max,5);assert.equal(local.connectionTimeoutMillis,5000);
});

test('concrete pool composition is lazy and closes without connecting or logging settings',async()=>{
 const persistence=createPostgresPersistence({config});
 assert.equal(typeof persistence.database.transaction,'function');
 await persistence.close();
});
