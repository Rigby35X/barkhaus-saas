export const prerender = false;
export function applicationRecord(body, orgId) {
  const name = [body.first_name,body.last_name].filter(Boolean).join(' ').trim();
  if (!name || name.length>200 || typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length>180)
    throw new Error('Please provide your name and a valid email.');
  if (JSON.stringify(body.form_data ?? {}).length>80000) throw new Error('Application is too large.');
  return {org_id:orgId,type:'adoption',applicant_name:name,email:body.email,
    phone:String(body.phone ?? '').slice(0,80),status:'new',form_data:body.form_data ?? {}};
}
export async function POST({request,locals}) {
  const json = (body,status=200) => new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  if (!locals.tenant?.orgId) return json({error:'Organization not found.'},404);
  // Same-origin browser form; no cross-domain public submission API.
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({error:'Invalid origin.'},403);
  const key=import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return json({error:'Applications are not configured.'},503);
  try {
    if (Number(request.headers.get('content-length') || 0)>100000) return json({error:'Application is too large.'},413);
    const text=await request.text();
    if(text.length>100000) return json({error:'Application is too large.'},413);
    const record=applicationRecord(JSON.parse(text),locals.tenant.orgId);
    const response=await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/rest/v1/applications`,{
      method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(record)});
    if(!response.ok) return json({error:'Could not submit application.'},502);
    return json({success:true},201);
  } catch { return json({error:'Please check your application and try again.'},400); }
}
