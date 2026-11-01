import type { WriteActor } from '../../../../../shared/contracts/v1/ingestion.ts';
import { AnimalWriteService } from './AnimalWriteService.ts';
import { createAnimalHttpHandler, jsonResponse } from './http.ts';
import { authorizeSqlMember } from './sql-authority.ts';
import { SqlAnimalRepository } from './sql-repository.ts';
import type { SqlDatabase, SqlPrincipal, SqlSafety } from './sql-repository.ts';

type Member = Extract<WriteActor, {kind:'member'}>;
export type SqlMemberAccess =
  | { principal: Extract<SqlPrincipal,{kind:'member'}>; actor: Member }
  | { response: Response };
export interface SqlAnimalHttpOptions {
  /** Shared transaction transport, also supplied to imports/connectors. */
  database: SqlDatabase;
  safety: SqlSafety;
  /** Trusted resolver calls Auth and active memberships. Never build this from JSON. */
  authorize?: (request: Request, orgId: number) => Promise<SqlMemberAccess>;
}

/** Explicit composition only: not mounted by runtime.ts and no env flag enables it.
 * A service/repository is constructed for the verified request actor. SQL rechecks
 * and locks its membership on the same connection as each write and receipt. */
export function createSqlAnimalHttpHandler(options: SqlAnimalHttpOptions) {
  const authorize = options.authorize ?? authorizeSqlMember;
  return createAnimalHttpHandler({
    async authenticate(request, orgId) {
      const access = await authorize(request, orgId);
      if ('response' in access) return access.response;
      const {principal, actor} = access;
      if (principal.kind !== 'member' || actor.kind !== 'member' ||
          principal.orgId !== orgId || actor.orgId !== orgId ||
          principal.userId !== actor.userId || !principal.userId ||
          !['owner','admin','staff','viewer'].includes(actor.role)) {
        return jsonResponse({error:'forbidden'},403);
      }
      return actor;
    },
    serviceForActor(actor) {
      return new AnimalWriteService(new SqlAnimalRepository(options.database, {
        principal:{kind:'member',orgId:actor.orgId,userId:actor.userId},
      },options.safety));
    },
  });
}
