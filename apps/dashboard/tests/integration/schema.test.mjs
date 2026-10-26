import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// Reviewed SQL is executed only against this fresh, synthetic local database.
const sql = path => readFileSync(new URL('../../../../supabase/' + path, import.meta.url), 'utf8');
const owner = '00000000-0000-0000-0000-000000000001';
const staff = '00000000-0000-0000-0000-000000000002';
const viewer = '00000000-0000-0000-0000-000000000003';
const digest = 'a'.repeat(64);
test('transactional ingestion schema preserves scoped authority and durable inputs', async t => {
  const db = new PGlite();
  try {
    for (const path of ['audits/platform_v1_fixture.sql', 'migrations/202609290001_dashboard_memberships.sql',
      'migrations/202610260001_platform_v1.sql', 'migrations/202610260002_identity_invitation.sql',
      'migrations/202610260003_transactional_ingestion.sql']) await db.exec(sql(path));
    await db.exec(`insert into public.organization_memberships(user_id,org_id,role) values('${owner}',1001,'owner'),('${staff}',1001,'staff'),('${viewer}',1001,'viewer')`);
    const as = async (role, settings, statement, values = []) => {
      await db.exec(`set role ${role}`);
      try {
        for (const [key,value] of Object.entries(settings)) await db.query('select set_config($1,$2,false)', [key,String(value)]);
        return await db.query(statement,values);
      } finally { await db.exec('reset role'); }
    };
    const member = (user, statement, values) => as('authenticated', {'request.jwt.claim.sub':user},statement,values);
    const executor = (org,statement,values) => as('barkhaus_platform_executor',{'barkhaus.actor_org':org},statement,values);
    const worker = (statement, values, fence = 1) => as('barkhaus_connector_worker', {
      'barkhaus.worker_org':1002,'barkhaus.worker_connection':'c','barkhaus.worker_job':'sync','barkhaus.worker_fence':fence,
    },statement,values);
    const mapping = {version:1,id:'m',revision:1,orgId:1002,fields:[
      {sourceColumn:'Name',target:{kind:'core',field:'name'},transform:'text'},
      {sourceColumn:'Species',target:{kind:'core',field:'species'},transform:'text'},
      {sourceColumn:'Kennel',target:{kind:'custom',key:'kennel'},transform:'text'},
    ],statusMap:{Ready:{lifecycle:'care',availability:'available'}}};
    await db.query("insert into public.platform_connections(org_id,id,provider) values(1002,'c','cognito')");
    await db.query("insert into public.platform_mappings values(1002,'m',1,'c',$1)",[mapping]);
    await db.exec("insert into public.platform_jobs(org_id,id,kind,mapping_id,mapping_revision,connection_id,status,lease_owner,lease_until,fence) values(1002,'sync','connector','m',1,'c','running','worker',clock_timestamp()+interval '5 minutes',1)");
    const fields = {name:'Moss',species:'dog',breed:null,age:{kind:'unknown'},sex:'unknown',size:'unknown',biography:null};

    await t.test('realistic storage and isolated executor capability',async()=>{
      assert.deepEqual((await db.query("select name,public from storage.buckets where id='animal-private-documents'")).rows,[{name:'animal-private-documents',public:false}]);
      const role = (await db.query("select rolcanlogin,rolbypassrls from pg_roles where rolname='barkhaus_platform_executor'")).rows[0];
      assert.deepEqual(role,{rolcanlogin:false,rolbypassrls:false});
      for (const client of ['authenticated','anon','service_role']) assert.equal((await db.query("select pg_has_role($1,'barkhaus_platform_executor','MEMBER') as allowed",[client])).rows[0].allowed,false);
      await assert.rejects(executor(1002,"insert into public.platform_animals(org_id,id,source_kind,fields) values(1002,'bad','native',$1)",[fields]),/permission denied/);
    });

    await t.test('source creation uses pinned mapped ownership and accepts mapped custom values',async()=>{
      const owners = (await worker("select barkhaus_private.source_mapping_owners(1002,'c') as owners")).rows[0].owners;
      assert.equal(owners.core.name.kind,'connector');assert.equal(owners.core.biography.kind,'barkhaus');
      await worker("insert into public.platform_animals(org_id,id,source_kind,connection_id,external_record_id,fields,field_owners,custom_fields,custom_owners,lifecycle,availability) values(1002,'source','connector','c','external',$1,$2,$3,$4,'care','available')",[fields,owners.core,{kennel:'K1'},owners.custom]);
      const unowned={...fields,biography:'Unmapped source injection'};
      await assert.rejects(worker("insert into public.platform_animals(org_id,id,source_kind,connection_id,external_record_id,fields,field_owners) values(1002,'inject','connector','c','inject',$1,$2)",[unowned,owners.core]),/Unmapped source defaults/);
      await assert.rejects(worker("insert into public.platform_animals(org_id,id,source_kind,connection_id,external_record_id,fields,field_owners,custom_fields,custom_owners) values(1002,'custom-inject','connector','c','inject',$1,$2,$3,$4)",[fields,owners.core,{private:'bad'},{private:{kind:'connector',connectionId:'c'}}]),/mapped custom/);
    });

    await t.test('worker writes are fenced by job, generation, connection and database expiry',async()=>{
      await db.exec("update public.platform_connections set fence=fence+1 where org_id=1002 and id='c'");
      await assert.rejects(db.exec("update public.platform_connections set fence=0 where org_id=1002 and id='c'"),/fence must advance monotonically/);
      await assert.rejects(db.exec("update public.platform_connections set fence=fence+2 where org_id=1002 and id='c'"),/fence must advance monotonically/);
      assert.equal((await worker('select id from public.platform_animals')).rows.length,1);
      assert.equal((await worker('select id from public.platform_animals',[],999)).rows.length,0);
      await db.exec("update public.platform_jobs set lease_until=clock_timestamp()-interval '1 second' where org_id=1002 and id='sync'");
      assert.equal((await worker('select id from public.platform_animals')).rows.length,0);
      await db.exec("update public.platform_jobs set lease_until=clock_timestamp()+interval '5 minutes' where org_id=1002 and id='sync'");
      await db.exec("update public.platform_connections set generation=2 where org_id=1002 and id='c'");
      assert.equal((await worker('select id from public.platform_animals')).rows.length,0);
      await assert.rejects(db.exec("update public.platform_connections set generation=1 where org_id=1002 and id='c'"),/monotonically/);
    });

    await t.test('metadata and private input rows require same-org server capability',async()=>{
      await db.exec("insert into public.platform_import_namespaces values(1001,'csv')");
      await db.query("insert into public.platform_mappings values(1001,'csv',1,null,$1)",[{version:1,id:'csv',revision:1,orgId:1001,fields:[],statusMap:{}}]);
      await executor(1001,"insert into public.platform_jobs(org_id,id,kind,mapping_id,mapping_revision,file_sha256,definition,created_by) values(1001,'csvjob','csv','csv',1,$1,$2,$3)",[digest,{sealed:'definition'},owner]);
      await executor(1001,"insert into barkhaus_private.platform_import_sources values(1001,'csvjob','private CSV',$1)",[digest]);
      assert.equal((await executor(1002,'select * from barkhaus_private.platform_import_sources')).rows.length,0);
      await assert.rejects(member(owner,'select * from barkhaus_private.platform_import_sources'),/permission denied/);
      await assert.rejects(executor(1002,"insert into public.platform_outbox values(1001,'csvjob','escape','{}')"),/row-level security/);
      await assert.rejects(executor(1001,"update public.platform_jobs set definition='{}' where id='csvjob'"),/Immutable job inputs/);
      await assert.rejects(executor(1001,"update public.platform_jobs set generation=2 where id='csvjob'"),/Immutable job inputs/);
    });

    await t.test('CSV origin remains complete with no stable key and cannot cross orgs',async()=>{
      await member(owner,"insert into public.platform_animals(org_id,id,source_kind,fields,csv_origin_job_id,csv_origin_mapping_id) values(1001,'csv-native','native',$1,'csvjob','csv')",[fields]);
      const saved=(await member(owner,"select csv_origin_job_id,csv_origin_mapping_id,import_key from public.platform_animals where id='csv-native'")).rows[0];
      assert.deepEqual(saved,{csv_origin_job_id:'csvjob',csv_origin_mapping_id:'csv',import_key:null});
      await assert.rejects(member(owner,"update public.platform_animals set csv_origin_job_id=null,csv_origin_mapping_id=null,revision=2 where id='csv-native'"),/Immutable animal identity/);
      await assert.rejects(db.query("insert into public.platform_animals(org_id,id,source_kind,fields,csv_origin_job_id,csv_origin_mapping_id) values(1002,'escape','native',$1,'csvjob','csv')",[fields]),/CSV origin pinned job mismatch|foreign key/);
    });

    await t.test('actor resolver binds the verified UUID and rechecks active membership',async()=>{
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[staff]);
      assert.equal((await executor(1001,"select barkhaus_private.lock_platform_member(1001,$1) as role",[staff])).rows[0].role,'staff');
      assert.equal((await executor(1001,"select barkhaus_private.lock_platform_member(1001,$1) as role",[owner])).rows[0].role,null);
      await db.exec(`update public.organization_memberships set is_active=false where user_id='${staff}'`);
      assert.equal((await executor(1001,"select barkhaus_private.lock_platform_member(1001,$1) as role",[staff])).rows[0].role,null);
      await assert.rejects(member(owner,"select barkhaus_private.lock_platform_member(1001,$1)",[owner]),/permission denied/);
    });

    await t.test('deferred unit receipt checks reject expiry after writes but before COMMIT',async()=>{
      // Restore the source job to the active connection generation for this unit.
      await db.exec("update public.platform_jobs set status='cancelled',lease_owner=null,lease_until=null where org_id=1002 and id='sync'");
      await db.exec("insert into public.platform_jobs(org_id,id,kind,mapping_id,mapping_revision,connection_id,generation,status,lease_owner,lease_until,fence) values(1002,'late-sync','connector','m',1,'c',2,'running','worker',clock_timestamp()+interval '5 minutes',2)");
      await db.exec('begin');
      try {
        await db.exec("set local role barkhaus_platform_executor");
        for (const [key,value] of Object.entries({'barkhaus.actor_org':'1002','barkhaus.worker_org':'1002','barkhaus.worker_connection':'c','barkhaus.worker_job':'late-sync','barkhaus.worker_fence':'2'})) await db.query('select set_config($1,$2,true)',[key,value]);
        await db.exec("update public.platform_jobs set status='completed' where org_id=1002 and id='late-sync'");
        await db.exec("insert into public.platform_unit_receipts values(1002,'late-sync','connector:2','{}')");
        // The receipt INSERT succeeds. Expiry happens only after mutation/receipt.
        await db.exec("update public.platform_jobs set lease_until=clock_timestamp()-interval '1 second' where org_id=1002 and id='late-sync'");
        await assert.rejects(db.exec('commit'),/Commit worker fence denied/);
      } finally { await db.exec('rollback'); await db.exec('reset role'); }
      assert.equal((await db.query("select * from public.platform_unit_receipts where job_id='late-sync'")).rows.length,0);
      assert.equal((await db.query("select status from public.platform_jobs where org_id=1002 and id='late-sync'")).rows[0].status,'running');
    });
  } finally { await db.close(); }
});
