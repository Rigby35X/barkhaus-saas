import { Pool } from 'pg';
import type { PoolConfig } from 'pg';
import { PostgresDatabase } from './postgres-database.ts';
import type { SqlPool } from './postgres-database.ts';

export interface PostgresPersistenceOptions {
  /** Server-owned explicit settings; never request JSON or a browser key. */
  config: PoolConfig;
  /** Only disposable local PostgreSQL tests may turn TLS off. */
  allowLocalPlaintext?: boolean;
  /** Sanitized signal; never pass raw pool/provider errors into logs. */
  onBackgroundError?: () => void;
}

/** Validate without opening a connection. Explicit identity fields prevent pg
 * from silently selecting a different host/user/database/password from PG* env.
 * This does not establish that the supplied login has reviewed role delegation. */
export function validatePostgresPoolConfig(options: PostgresPersistenceOptions): PoolConfig {
  const input = options.config;
  if (input.connectionString !== undefined) throw new Error('Use explicit server PostgreSQL settings.');
  for (const key of ['host','database','user','password'] as const) {
    if (typeof input[key] !== 'string' || !input[key] || input[key] !== input[key].trim()) {
      throw new Error(`Explicit PostgreSQL ${key} is required.`);
    }
  }
  const host=input.host!;
  if (host.includes('/') || /\s/.test(host)) throw new Error('An explicit PostgreSQL host is required.');
  const local=['localhost','127.0.0.1','::1'].includes(host.toLowerCase());
  if (input.ssl === false) {
    if (!local || options.allowLocalPlaintext !== true) throw new Error('PostgreSQL requires verified TLS.');
  } else if (!input.ssl || typeof input.ssl !== 'object' || input.ssl.rejectUnauthorized !== true) {
    throw new Error('PostgreSQL requires explicit verified TLS.');
  }
  const port=input.port??5432;
  const max=input.max??5;
  if (!Number.isInteger(port) || port<1 || port>65535 || !Number.isInteger(max) || max<1 || max>20) {
    throw new Error('Invalid PostgreSQL pool bounds.');
  }
  const connectionTimeoutMillis=input.connectionTimeoutMillis??5000;
  const idleTimeoutMillis=input.idleTimeoutMillis??30000;
  if (!Number.isSafeInteger(connectionTimeoutMillis) || connectionTimeoutMillis<1 || connectionTimeoutMillis>30000 ||
      !Number.isSafeInteger(idleTimeoutMillis) || idleTimeoutMillis<1 || idleTimeoutMillis>300000) {
    throw new Error('Invalid PostgreSQL pool timeouts.');
  }
  return {...input,host,port,max,connectionTimeoutMillis,idleTimeoutMillis};
}

/** Concrete node-postgres transport, constructed only by explicit trusted server
 * composition/local harnesses. No environment read, route mount or runtime flag. */
export function createPostgresPersistence(options: PostgresPersistenceOptions) {
  const pool = new Pool(validatePostgresPoolConfig(options));
  pool.on('error',()=>{ options.onBackgroundError?.(); });
  const transport:SqlPool={async connect(){
    const client=await pool.connect();
    return {
      async query<T>(query:string,parameters?:any[]){
        const result=await client.query(query,parameters);
        return {rows:result.rows as T[]};
      },
      release(){client.release();},
    };
  }};
  return {database:new PostgresDatabase(transport),close:()=>pool.end()};
}
