import type { APIRoute } from 'astro'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char] ?? char))

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json()
    const name = String(payload?.name ?? '').trim()
    const email = String(payload?.email ?? '').trim()
    const message = String(payload?.message ?? '').trim()
    const website = String(payload?.website ?? '').trim()

    // Honeypot field: real visitors never see/fill this.
    if (website) return json({ ok: true })

    if (!name || !email || !message) {
      return json({ ok: false, error: 'Please complete all fields.' }, 400)
    }

    if (name.length > 120 || email.length > 180 || message.length > 5000) {
      return json({ ok: false, error: 'Your message is too long.' }, 400)
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email)) {
      return json({ ok: false, error: 'Please enter a valid email address.' }, 400)
    }

    const apiKey = import.meta.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('RESEND_API_KEY is not configured')
      return json({ ok: false, error: 'Contact email is not configured yet.' }, 503)
    }

    const to = import.meta.env.CONTACT_TO_EMAIL || 'contact@mbpups.org'
    const from = import.meta.env.CONTACT_FROM_EMAIL || 'Mission Bay Puppy Rescue <website@mbpups.org>'

    const subject = `Website contact from ${name}`
    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>')

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#12283A">
            <h2 style="color:#0B3B5C">New Mission Bay Puppy Rescue website message</h2>
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
            <p><strong>Message:</strong></p>
            <p>${safeMessage}</p>
          </div>
        `,
        text: `New Mission Bay Puppy Rescue website message\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      }),
    })

    if (!response.ok) {
      const details = await response.text()
      console.error('Resend contact error:', response.status, details)
      return json({ ok: false, error: 'We could not send your message. Please try again.' }, 502)
    }

    return json({ ok: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return json({ ok: false, error: 'We could not send your message. Please try again.' }, 500)
  }
}
