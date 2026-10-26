import type { SqlConnection, SqlDatabase } from './sql-repository.ts';

/** A node-postgres-compatible server pool. The deployment supplies its reviewed
 * TLS/credential configuration; this module never reads connection secrets. */
export interface SqlPool { connect(): Promise<SqlConnection & { release(): void }> }
export class PostgresDatabase implements SqlDatabase {
  private pool: SqlPool;
  constructor(pool: SqlPool) { this.pool=pool; }
  async transaction<T>(run:(sql:SqlConnection)=>Promise<T>):Promise<T>{
    for(let attempt=0;;attempt++){
      const client=await this.pool.connect();let active=true;
      try{
        await client.query('begin isolation level serializable');
        await client.query("set local statement_timeout='30s'");
        await client.query("set local lock_timeout='5s'");
        const sql:SqlConnection={query:(query,parameters)=>{
          if(!active)throw new Error('Transaction already closed');return client.query(query,parameters);
        }};
        const result=await run(sql);
        await client.query('commit');active=false;return result;
      }catch(error){
        active=false;
        try{await client.query('rollback');}catch{/* Connection loss: caller resolves unknown commit by durable receipt. */}
        const code=(error as {code?:string})?.code;
        if(attempt>=2||!['40001','40P01'].includes(code??''))throw error;
        // Only definitely aborted serialization/deadlock transactions are retried.
        // Callback operations must have no external writes.
      }finally{active=false;client.release();}
    }
  }
}
