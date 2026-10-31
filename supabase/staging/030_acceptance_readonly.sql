-- PREPARED ONLY: SELECT checks after approved staging migration and seed.
-- Each row must have passed=true. No mutations or customer records are returned.
select 'trusted_roles_no_login_or_bypass' as check_name,
 count(*)=3 and bool_and(not rolcanlogin and not rolbypassrls and not rolsuper) as passed
from pg_roles where rolname in ('barkhaus_native_writer','barkhaus_platform_executor','barkhaus_connector_worker')
union all
select 'no_browser_or_service_role_delegation',not exists(
 select 1 from pg_auth_members m join pg_roles p on p.oid=m.roleid join pg_roles c on c.oid=m.member
 where p.rolname in ('barkhaus_native_writer','barkhaus_platform_executor','barkhaus_connector_worker')
 and c.rolname in ('anon','authenticated','service_role'))
union all
select 'no_direct_authenticated_animal_writes',
 not has_table_privilege('authenticated','public.platform_animals','INSERT')
 and not has_table_privilege('authenticated','public.platform_animals','UPDATE')
 and not has_table_privilege('authenticated','public.platform_animals','DELETE')
union all
select 'service_role_no_platform_privileges',not exists(
 select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) privilege
 where n.nspname='public' and left(c.relname,9)='platform_' and c.relkind in ('r','p')
 and has_table_privilege('service_role',c.oid,privilege))
union all
select 'deferred_commit_authorization',exists(select 1 from pg_trigger
 where tgrelid='public.platform_unit_receipts'::regclass and tgname='platform_unit_commit_guard'
 and tgdeferrable and tginitdeferred and tgenabled='O')
union all
select 'platform_tables_rls',bool_and(c.relrowsecurity)
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname like 'platform\_%' escape '\' and c.relkind in ('r','p')
union all
select 'private_platform_bucket',exists(select 1 from storage.buckets where id='animal-private-documents' and not public)
union all
select 'two_synthetic_organizations',count(*)=2 and bool_and(id in (1001,1002)) from public.organizations
union all
select 'synthetic_memberships',count(*)=5 and count(*) filter(where is_active)=4 from public.organization_memberships
union all
select 'no_live_connector_configuration',not exists(select 1 from public.platform_connections)
union all
select 'no_live_jobs',not exists(select 1 from public.platform_jobs);
