/** Retired: this endpoint used anonymous select=* and a default organization.
 * No compatibility proxy to unscoped writes. Use the authorized v1 service.
 */
export const prerender = false;
const retired = () => new Response(JSON.stringify({ error: 'Legacy animal API retired. Use /api/v1/animals.' }), {
  status: 410,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', Vary: 'Authorization' },
});
export const GET = retired;
export const POST = retired;
export const PUT = retired;
export const PATCH = retired;
export const DELETE = retired;
export const OPTIONS = retired;
