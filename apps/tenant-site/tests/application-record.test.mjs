import assert from 'node:assert/strict';
import { applicationRecord } from '../src/pages/api/applications.js';
const payload={first_name:'Test',last_name:'Applicant',email:'test@example.invalid',phone:'555',form_data:{pet:'Test Dog'},org_id:2,status:'approved',notes:'Injected',replied_at:'today'};
const record=applicationRecord(payload,1);
assert.deepEqual(record,{org_id:1,type:'adoption',applicant_name:'Test Applicant',email:'test@example.invalid',phone:'555',status:'new',form_data:{pet:'Test Dog'}});
assert.throws(()=>applicationRecord({...payload,email:'invalid'},1));
assert.throws(()=>applicationRecord({...payload,form_data:{tooLarge:'x'.repeat(80001)}},1));
console.log('PASS: application organization comes from tenant, protected fields are excluded, contact and size validation work.');
