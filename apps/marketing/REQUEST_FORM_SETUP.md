# BarkHaus request form

The contact page posts to `/api/request-access`, a Vercel Node function in this app's `api` directory. Resend delivers requests to an inbox. The API key stays on the server; no database is used.

## Activate delivery

Add these environment variables to the **barkhaus-marketing** Vercel project for **Preview** and **Production**, then redeploy:

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | A Resend API key with sending access |
| `RESEND_FROM_EMAIL` | A sender on a verified domain, e.g. `BarkHaus <requests@barkhaus.io>` |
| `BARKHAUS_REQUEST_TO_EMAIL` | Receiving inbox; defaults to `hello@barkhaus.io` |

Without the key and sender, submission shows an unavailable message and an email alternative. Do not put the key in a `PUBLIC_` variable.

## Verify

Submit one test request from the deployed form. Confirm receipt and that Reply addresses the requester. The form retains entries on failure and clears them only after Resend accepts the email. Provider acceptance is not a guarantee of inbox delivery.

Astro local dev serves the page but does not run the root Vercel function. Use Vercel Preview or `vercel dev` for the full flow.

The endpoint validates fields, limits payload length, checks browser origin, and includes a honeypot. Idempotency keys prevent retry duplicates for an unchanged request. No confirmation email is sent to visitors. For public launch traffic, configure Vercel rate limiting; the honeypot is basic spam protection, not a distributed rate limiter.
