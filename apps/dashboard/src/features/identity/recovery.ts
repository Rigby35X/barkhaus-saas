/** Fixed deployment allowlist: never accept a returnTo URL from query input. */
const ORIGINS = new Set(['https://app.barkhaus.io', 'http://localhost:5173']);
export const RECOVERY_PENDING = 'barkhausRecoveryPending';
export function identityRedirect(origin: string): string {
  if (!ORIGINS.has(origin)) throw new Error('Identity redirect is not configured for this deployment.');
  return new URL('/?identity=recovery', origin).href;
}
export interface RecoveryClient {
  auth: {
    resetPasswordForEmail(email: string, options: { redirectTo: string }): Promise<{ error: unknown }>;
    getUser(): Promise<{ data: { user: unknown }; error: unknown }>;
    updateUser(input: { password: string }): Promise<{ error: unknown }>;
    signOut(options?: { scope: 'local' }): Promise<{ error: unknown }>;
  };
}
export async function requestRecovery(client: RecoveryClient, email: string, origin: string): Promise<void> {
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: identityRedirect(origin) });
  if (error) throw new Error('Unable to request recovery. Please try again.');
}
export async function finishRecovery(client: RecoveryClient, password: string): Promise<void> {
  if (password.length < 12) throw new Error('Use at least 12 characters.');
  // Auth owns verification, token expiry and single-use enforcement. A local flag
  // controls presentation only; it never grants permission to change a password.
  const verified = await client.auth.getUser();
  if (verified.error || !verified.data.user) throw new Error('Recovery link expired. Request a new link.');
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error('Unable to change password. Request a new recovery link.');
  const signedOut = await client.auth.signOut();
  if (signedOut.error) throw new Error('Password updated. Please sign out before continuing.');
}
export async function acceptInvitation(client: { rpc(name: string, args: { token_digest: string }): PromiseLike<{ error: unknown }> }, token: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid invitation.');
  // Link carries 256 random bits; DB stores SHA-256 only. No role/org in client input.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const token_digest = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
  const { error } = await client.rpc('accept_organization_invitation', { token_digest });
  if (error) throw new Error('Invitation invalid, expired, or already used. Contact your administrator.');
}
