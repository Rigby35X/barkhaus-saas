// Mailchimp integration removed
export async function POST() {
  return new Response(JSON.stringify({ error: 'Integration not available' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' },
  });
}
