import type { APIRoute } from 'astro';
import { createGatedPlatformHandler } from '../../../../services/platform/gated-runtime.ts';
export const prerender = false;
const unavailable = createGatedPlatformHandler('imports');
export const GET: APIRoute = ({ request }) => unavailable(request);
export const POST: APIRoute = ({ request }) => unavailable(request);
