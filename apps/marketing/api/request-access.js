import { createHash } from 'node:crypto';

const interests = new Set(['Early access', 'Website and operations', 'Marketing tools', 'Partnership']);
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const clean = (value) => typeof value === 'string' ? value.trim() : '';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const respond = (status, body) => res.status(status).json(body);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(405, { error: 'Please submit the request form.' });
  }
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return respond(403, { error: 'Please submit this form from the BarkHaus website.' });
    } catch { return respond(403, { error: 'Please submit this form from the BarkHaus website.' }); }
  }
  if (!req.headers['content-type']?.startsWith('application/json')) return respond(415, { error: 'Please use the request form on this page.' });
  if (Number(req.headers['content-length'] || 0) > 12000) return respond(413, { error: 'Please shorten your message and try again.' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return respond(400, { error: 'Please check your request and try again.' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 12000) return respond(400, { error: 'Please check your request and try again.' });
  if (clean(body.company_url)) return respond(200, { success: true }); // Honeypot: no email is sent.
  const name = clean(body.name), email = clean(body.email), organization = clean(body.organization);
  const website = clean(body.website), interest = clean(body.interest), message = clean(body.message);
  if (!name || name.length > 100 || !organization || organization.length > 160 || !emailPattern.test(email) || email.length > 254 || /[\r\n]/.test(name + organization) || message.length > 3000 || website.length > 500 || !interests.has(interest)) {
    return respond(400, { error: 'Please check your name, email, organization, and message, then try again.' });
  }
  if (website) {
    try { if (!['https:', 'http:'].includes(new URL(website).protocol)) throw new Error(); }
    catch { return respond(400, { error: 'Please enter a full website address, such as https://yourrescue.org.' }); }
  }
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.BARKHAUS_REQUEST_TO_EMAIL || 'hello@barkhaus.io';
  if (!key || !from) return respond(503, { error: 'The request form is temporarily unavailable. Please email hello@barkhaus.io.' });
  const requestId = clean(body.requestId);
  if (!/^[a-f0-9-]{36}$/i.test(requestId)) return respond(400, { error: 'Please refresh the page and try again.' });
  const text = ['New BarkHaus request', '', `Name: ${name}`, `Email: ${email}`, `Organization: ${organization}`, `Website: ${website || 'Not provided'}`, `Interest: ${interest}`, '', 'Message:', message || 'No additional details provided.'].join('\n');
  const hash = createHash('sha256').update(text).digest('hex');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `barkhaus-request/${requestId}/${hash}` },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject: 'New BarkHaus early access request', text }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    if (!response.ok || !result.id) {
      console.error('BarkHaus request delivery failed', { status: response.status });
      return respond(502, { error: 'We couldn’t send your request. Please try again or email hello@barkhaus.io.' });
    }
    return respond(200, { success: true });
  } catch {
    console.error('BarkHaus request delivery could not be confirmed');
    return respond(502, { error: 'We couldn’t confirm your request was sent. Please try again or email hello@barkhaus.io.' });
  }
}
