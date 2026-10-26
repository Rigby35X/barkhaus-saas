import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {SqlAnimalRepository} from '../../../tenant-site/src/services/animals/sql-repository.ts';
import {AnimalWriteService} from '../../../tenant-site/src/services/animals/AnimalWriteService.ts';

export const owner={kind:'member',orgId:1001,userId:'00000000-0000-0000-0000-000000000001',role:'owner'};
export const staff={...owner,userId:'00000000-0000-0000-0000-000000000002',role:'staff'};
export const viewer={...owner,userId:'00000000-0000-0000-0000-000000000003',role:'viewer'};
export const owner2={...owner,orgId:1002,userId:'00000000-0000-0000-0000-000000000004'};
export const fields={name:'Pip',species:'dog',breed:null,age:{kind:'unknown'},sex:'unknown',size:'small',biography:null,photos:[],lifecycle:'care',availability:'available'};
export const create=(key='native',extra={})=>({version:1,orgId:1001,kind:'create_native',idempotencyKey:key,fields:{...fields},...extra});
export async function fixture(path) {
  const db=new PGlite(path);
  const read=name=>readFileSync(new URL('../../../../supabase/'+name,import.meta.url),'utf8');
  await db.exec(read('audits/platform_v1_fixture.sql'));
  for(const name of ['202609290001_dashboard_memberships.sql','202610260001_platform_v1.sql','202610260002_identity_invitation.sql','202610260003_transactional_ingestion.sql'])await db.exec(read('migrations/'+name));
  await db.exec(`insert into auth.users(id,email) values('${owner2.userId}','owner2@example.test');
    insert into public.organization_memberships(user_id,org_id,role) values
    ('${owner.userId}',1001,'owner'),('${staff.userId}',1001,'staff'),('${viewer.userId}',1001,'viewer'),('${owner2.userId}',1002,'owner');`);
  const faults={match:null,afterCommit:false,afterUnitCommit:false,expireUnit:false};
  const database={async transaction(run){
    let unitCommitted=false;
    const result=await db.transaction(sql=>run({async query(query,args){
      if(faults.match?.test(query)){faults.match=null;throw new Error('Injected SQL failure');}
      if(/insert into public.platform_unit_receipts/.test(query))unitCommitted=true;
      const result=await sql.query(query,args);
      if(faults.expireUnit&&/insert into public.platform_unit_receipts/.test(query)){
        faults.expireUnit=false;
        await sql.query("update public.platform_jobs set lease_until=clock_timestamp()-interval '1 second' where kind='connector' and status in ('queued','completed')");
      }
      return result;
    }}));
    if(faults.afterUnitCommit&&unitCommitted){faults.afterUnitCommit=false;throw new Error('Commit acknowledgement lost');}
    if(faults.afterCommit){faults.afterCommit=false;throw new Error('Commit acknowledgement lost');}
    return result;
  }};
  const safety={photoAllowed:async(org,url)=>url.startsWith(`https://images.example/${org}/`)};
  const repository=(principal=owner,extra={})=>new SqlAnimalRepository(database,{principal,...extra},safety);
  return {db,database,safety,repository,service:(p=owner)=>new AnimalWriteService(repository(p)),faults};
}
