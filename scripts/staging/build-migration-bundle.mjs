import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Offline generator only. It never opens a connection or applies SQL.
const root = new URL('../../',import.meta.url);
const plan = JSON.parse(readFileSync(new URL('deploy/staging/migration-plan.json',root),'utf8'));
if (plan.projectRef !== 'idybpiomulkebvhqibdp' || plan.status !== 'prepared-not-authorized-for-remote-application') throw new Error('Unexpected staging plan');
const allowlist = [
 'supabase/staging/000_public_prerequisites.sql',
 'supabase/migrations/202609290000_identity_foundation.sql',
 'supabase/migrations/202610260001_platform_v1.sql',
 'supabase/migrations/202610260002_identity_invitation.sql',
 'supabase/migrations/202610260003_transactional_ingestion.sql',
];
if (JSON.stringify(plan.orderedSqlFiles)!==JSON.stringify(allowlist) || allowlist.some(file=>plan.excludedSqlFiles.includes(file))) throw new Error('Review the migration allowlist');
let sql=`-- PREPARED ONLY: NO REMOTE APPLICATION AUTHORIZED.\n-- Target: isolated BarkHaus staging ${plan.projectRef}; confirm the Dashboard reference.\n-- Do not run in production. Existing application objects cause the bootstrap to fail.\n-- Single transaction: any error rolls back the complete setup. No Auth users or seed.\nbegin;\nset local lock_timeout='5s';\nset local statement_timeout='120s';\n`;
for(const file of allowlist){
 const source=readFileSync(new URL(file,root),'utf8');
 const starts=source.match(/^begin;\s*$/gm)??[], ends=source.match(/^commit;\s*$/gm)??[];
 if(starts.length!==1||ends.length!==1)throw new Error(`Review transaction boundaries: ${file}`);
 const digest=createHash('sha256').update(source).digest('hex');
 sql+=`\n-- Source: ${file}\n-- SHA256: ${digest}\n`+source.replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'').trim()+'\n';
}
sql+='\ncommit;\n';
const output=new URL('deploy/staging/platform-setup.sql',root);
if(process.argv.includes('--check')){
 if(readFileSync(output,'utf8')!==sql)throw new Error('Prepared bundle is stale; regenerate and review it.');
 console.log('Prepared staging bundle matches the reviewed allowlist; no SQL executed.');
}else{
 writeFileSync(output,sql);console.log('Prepared staging bundle generated locally; no SQL executed.');
}
