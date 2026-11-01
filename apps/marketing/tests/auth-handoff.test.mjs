import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceAuthUrl} from '../src/lib/workspace-auth.ts';

test('login uses the dashboard origin without forwarding sessions or a rescue identity',()=>{
 const url=workspaceAuthUrl(undefined,'login','?access_token=secret&orgId=9&returnTo=https://evil.invalid');
 assert.equal(url,'https://app.barkhaus.io/login');
 assert.equal(workspaceAuthUrl('http://localhost:5173','login'),'http://localhost:5173/login');
});
test('signup preserves a paid or optional trial preference without granting membership or billing',()=>{
 assert.equal(workspaceAuthUrl(undefined,'signup','?plan=growth&billing=paid&role=owner&orgId=9&access_token=secret'),'https://app.barkhaus.io/signup?plan=growth&billing=paid');
 assert.equal(workspaceAuthUrl(undefined,'signup','?plan=starter&billing=trial'),'https://app.barkhaus.io/signup?plan=starter&billing=trial');
 assert.equal(workspaceAuthUrl(undefined,'signup','?plan=invalid&billing=active'),'https://app.barkhaus.io/signup');
});
test('handoff refuses open redirects and ambiguous deployment origins',()=>{
 for(const origin of ['','https://evil.invalid','https://app.barkhaus.io.evil.invalid','https://user:pass@app.barkhaus.io','https://app.barkhaus.io/path','https://app.barkhaus.io?next=x','http://app.barkhaus.io']) assert.throws(()=>workspaceAuthUrl(origin,'login'));
 assert.equal(workspaceAuthUrl('https://app.barkhaus.io/','signup'),'https://app.barkhaus.io/signup');
 assert.throws(()=>workspaceAuthUrl(undefined,'//evil.invalid'));
});
test('duplicate intent parameters cannot create ambiguous signup choices',()=>{
 assert.equal(workspaceAuthUrl(undefined,'signup','?plan=pro&plan=starter&billing=paid&billing=trial'),'https://app.barkhaus.io/signup');
});
