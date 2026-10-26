import { requireOrganizationAccess } from '../../lib/dashboard-auth.ts';
import type { SqlPrincipal } from './sql-repository.ts';

/** Authentication entry point for a future gated HTTP composition. No request
 * actor/UUID/role is accepted as proof; the guard calls Auth and memberships.
 * The SQL repository then rechecks/locks that membership through commit. */
export async function authorizeSqlMember(request:Request,orgId:unknown):Promise<{principal:Extract<SqlPrincipal,{kind:'member'}>}|{response:Response}>{
  const result=await requireOrganizationAccess(request,orgId,['owner','admin','staff','viewer'],{'Cache-Control':'private, no-store'});
  if('response' in result)return result;
  const {userId,orgId:verifiedOrg}=result.principal;
  return {principal:{kind:'member',userId,orgId:verifiedOrg}};
}
