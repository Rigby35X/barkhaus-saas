// Retired diagnostic endpoint: never return secret-key fragments or environment metadata.
export async function GET() {
 return new Response(JSON.stringify({error:'Diagnostic endpoint retired.'}),{status:410,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}
