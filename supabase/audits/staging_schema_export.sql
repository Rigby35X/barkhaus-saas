-- SAFE SHARED METADATA EXPORT v1. Run this single SELECT in Supabase SQL Editor.
-- Reads catalogs and explicitly selected storage.buckets configuration ONLY.
-- No customer rows, auth.users/sessions, storage.objects rows, Vault values,
-- credentials, connection strings or function/view/default/policy SQL bodies.
-- Expressions are represented by presence/fingerprints: arbitrary SQL literals
-- can contain secrets. Administrator-only semantic review is still required.
-- This is an inventory, not replayable DDL or authorization to migrate.
with
relations as (
  select c.oid,n.nspname as schema_name,c.relname as object_name,c.relkind,
    c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity,c.reloptions
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','storage','barkhaus_private') and c.relkind in ('r','p','v','m','S')
),
objects as (
  select schema_name,object_name,relkind as kind,pg_catalog.pg_get_userbyid(relowner) as owner,
    relrowsecurity as rls_enabled,relforcerowsecurity as rls_forced,
    coalesce('security_invoker=true'=any(reloptions),false) as security_invoker
  from relations
),
columns as (
  select r.schema_name,r.object_name,a.attnum as position,a.attname as column_name,
    pg_catalog.format_type(a.atttypid,a.atttypmod) as data_type,not a.attnotnull as nullable,
    a.attidentity as identity_kind,a.attgenerated as generated_kind,
    d.oid is not null as has_default_or_generated_expression,
    case when d.oid is not null then md5(pg_catalog.pg_get_expr(d.adbin,d.adrelid)) end as expression_fingerprint
  from relations r join pg_catalog.pg_attribute a on a.attrelid=r.oid
  left join pg_catalog.pg_attrdef d on d.adrelid=r.oid and d.adnum=a.attnum
  where a.attnum>0 and not a.attisdropped
),
constraints as (
  select r.schema_name,r.object_name,k.conname as constraint_name,k.contype as kind,
    k.convalidated as validated,k.condeferrable as deferrable,k.condeferred as initially_deferred,
    array(select a.attname from unnest(k.conkey) with ordinality x(num,pos)
      join pg_catalog.pg_attribute a on a.attrelid=k.conrelid and a.attnum=x.num order by x.pos) as columns,
    rn.nspname as referenced_schema,rc.relname as referenced_object,
    array(select a.attname from unnest(k.confkey) with ordinality x(num,pos)
      join pg_catalog.pg_attribute a on a.attrelid=k.confrelid and a.attnum=x.num order by x.pos) as referenced_columns,
    k.confupdtype as on_update_code,k.confdeltype as on_delete_code,
    md5(pg_catalog.pg_get_constraintdef(k.oid)) as definition_fingerprint
  from relations r join pg_catalog.pg_constraint k on k.conrelid=r.oid
  left join pg_catalog.pg_class rc on rc.oid=k.confrelid
  left join pg_catalog.pg_namespace rn on rn.oid=rc.relnamespace
),
indexes as (
  select r.schema_name,r.object_name,i.relname as index_name,x.indisunique as is_unique,
    x.indisprimary as is_primary,x.indisvalid as is_valid,x.indpred is not null as is_partial,
    md5(pg_catalog.pg_get_indexdef(x.indexrelid)) as definition_fingerprint
  from relations r join pg_catalog.pg_index x on x.indrelid=r.oid
  join pg_catalog.pg_class i on i.oid=x.indexrelid
),
policies as (
  select schemaname as schema_name,tablename as object_name,policyname as policy_name,
    permissive,roles,cmd as command,qual is not null as has_using,with_check is not null as has_with_check,
    case when qual is not null then md5(qual) end as using_fingerprint,
    case when with_check is not null then md5(with_check) end as with_check_fingerprint
  from pg_catalog.pg_policies where schemaname in ('public','storage','barkhaus_private')
),
table_grants as (
  select r.schema_name,r.object_name,
    case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end as grantee,
    pg_catalog.pg_get_userbyid(a.grantor) as grantor,a.privilege_type,a.is_grantable
  from relations r cross join lateral pg_catalog.aclexplode(coalesce(r.relacl,
    pg_catalog.acldefault(case when r.relkind='S' then 'S'::"char" else 'r'::"char" end,r.relowner))) a
),
column_grants as (
  select r.schema_name,r.object_name,c.attname as column_name,
    case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end as grantee,
    a.privilege_type,a.is_grantable
  from relations r join pg_catalog.pg_attribute c on c.attrelid=r.oid and c.attnum>0 and not c.attisdropped
  cross join lateral pg_catalog.aclexplode(c.attacl) a
),
schema_grants as (
  select n.nspname as schema_name,pg_catalog.pg_get_userbyid(n.nspowner) as owner,
    case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end as grantee,
    a.privilege_type,a.is_grantable
  from pg_catalog.pg_namespace n cross join lateral pg_catalog.aclexplode(coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a
  where n.nspname in ('public','storage','barkhaus_private')
),
routine_metadata as (
  select p.oid,n.nspname as schema_name,p.proname as routine_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
    pg_catalog.pg_get_function_result(p.oid) as result_type,l.lanname as language,
    pg_catalog.pg_get_userbyid(p.proowner) as owner,p.prosecdef as security_definer,
    p.provolatile as volatility,p.proleakproof as leakproof,
    exists(select 1 from unnest(p.proconfig) setting where setting like 'search_path=%') as has_explicit_search_path,
    md5(p.prosrc) as body_fingerprint,p.proacl,p.proowner
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  join pg_catalog.pg_language l on l.oid=p.prolang
  where n.nspname in ('public','barkhaus_private') and p.prokind in ('f','p')
),
routines as (
  select schema_name,routine_name,identity_arguments,result_type,language,owner,security_definer,
    volatility,leakproof,has_explicit_search_path,body_fingerprint from routine_metadata
),
routine_grants as (
  select p.schema_name,p.routine_name,p.identity_arguments,
    case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end as grantee,
    a.privilege_type,a.is_grantable
  from routine_metadata p cross join lateral pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
),
default_grants as (
  select pg_catalog.pg_get_userbyid(d.defaclrole) as creating_role,
    coalesce(n.nspname,'<all schemas>') as schema_name,d.defaclobjtype as object_type,
    case when a.grantee=0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(a.grantee) end as grantee,
    a.privilege_type,a.is_grantable
  from pg_catalog.pg_default_acl d left join pg_catalog.pg_namespace n on n.oid=d.defaclnamespace
  cross join lateral pg_catalog.aclexplode(d.defaclacl) a
  where d.defaclnamespace=0 or n.nspname in ('public','storage','barkhaus_private')
),
role_attributes as (
  select rolname as role_name,rolsuper as superuser,rolinherit as inherits,
    rolcanlogin as can_login,rolcreaterole as can_create_roles,rolbypassrls as bypasses_rls
  from pg_catalog.pg_roles
),
role_memberships as (
  select child.rolname as member_role,parent.rolname as granted_role,m.admin_option
  from pg_catalog.pg_auth_members m join pg_catalog.pg_roles child on child.oid=m.member
  join pg_catalog.pg_roles parent on parent.oid=m.roleid
),
triggers as (
  select r.schema_name,r.object_name,t.tgname as trigger_name,t.tgenabled as enabled_mode,
    t.tgdeferrable as deferrable,t.tginitdeferred as initially_deferred,
    fn.nspname as function_schema,p.proname as function_name,
    md5(pg_catalog.pg_get_triggerdef(t.oid)) as definition_fingerprint
  from relations r join pg_catalog.pg_trigger t on t.tgrelid=r.oid
  join pg_catalog.pg_proc p on p.oid=t.tgfoid join pg_catalog.pg_namespace fn on fn.oid=p.pronamespace
  where not t.tgisinternal
),
views as (
  select schema_name,object_name,md5(pg_catalog.pg_get_viewdef(oid)) as definition_fingerprint
  from relations where relkind in ('v','m')
),
buckets as (
  select jsonb_build_object('id',to_jsonb(b)->'id','name',to_jsonb(b)->'name',
    'public',to_jsonb(b)->'public','file_size_limit',to_jsonb(b)->'file_size_limit',
    'allowed_mime_types',to_jsonb(b)->'allowed_mime_types') as configuration
  from storage.buckets b
)
select jsonb_build_object(
  'format','barkhaus.safe-schema-export.v1','captured_at',statement_timestamp(),
  'database',current_database(),'exporting_role',current_user,'server_version',current_setting('server_version'),
  'scope',jsonb_build_array('public','storage','barkhaus_private'),
  'expressions','Presence/fingerprints only; no raw SQL bodies, literals or defaults. Administrator semantic review remains required.',
  'objects',coalesce((select jsonb_agg(to_jsonb(x) order by schema_name,object_name) from objects x),'[]'),
  'columns',coalesce((select jsonb_agg(to_jsonb(x) order by schema_name,object_name,position) from columns x),'[]'),
  'constraints',coalesce((select jsonb_agg(to_jsonb(x) order by schema_name,object_name,constraint_name) from constraints x),'[]'),
  'indexes',coalesce((select jsonb_agg(to_jsonb(x) order by schema_name,object_name,index_name) from indexes x),'[]'),
  'policies',coalesce((select jsonb_agg(to_jsonb(x) order by schema_name,object_name,policy_name) from policies x),'[]'),
  'table_grants',coalesce((select jsonb_agg(to_jsonb(x) order by schema_name,object_name,grantee,privilege_type) from table_grants x),'[]'),
  'column_grants',coalesce((select jsonb_agg(to_jsonb(x) order by schema_name,object_name,column_name,grantee,privilege_type) from column_grants x),'[]'),
  'schema_grants',coalesce((select jsonb_agg(to_jsonb(x) order by schema_name,grantee,privilege_type) from schema_grants x),'[]'),
  'routines',coalesce((select jsonb_agg(to_jsonb(x) order by schema_name,routine_name,identity_arguments) from routines x),'[]'),
  'routine_grants',coalesce((select jsonb_agg(to_jsonb(x) order by schema_name,routine_name,identity_arguments,grantee) from routine_grants x),'[]'),
  'default_grants',coalesce((select jsonb_agg(to_jsonb(x) order by creating_role,schema_name,object_type,grantee) from default_grants x),'[]'),
  'roles',coalesce((select jsonb_agg(to_jsonb(x) order by role_name) from role_attributes x),'[]'),
  'role_memberships',coalesce((select jsonb_agg(to_jsonb(x) order by member_role,granted_role) from role_memberships x),'[]'),
  'triggers',coalesce((select jsonb_agg(to_jsonb(x) order by schema_name,object_name,trigger_name) from triggers x),'[]'),
  'views',coalesce((select jsonb_agg(to_jsonb(x) order by schema_name,object_name) from views x),'[]'),
  'storage_buckets',coalesce((select jsonb_agg(configuration order by configuration->>'id') from buckets),'[]'),
  'extensions',(select coalesce(jsonb_agg(jsonb_build_object('name',extname,'version',extversion) order by extname),'[]') from pg_catalog.pg_extension)
) as barkhaus_schema_export;
