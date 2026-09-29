-- Read-only preflight. Export these results before any migration.
select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name in
('organization_memberships', 'organizations', 'animals', 'applications', 'form_submissions', 'website_content', 'branding', 'policies', 'events', 'donations')
order by table_name, ordinal_position;

select n.nspname as schema_name, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity, c.reloptions
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage') and c.relkind in ('r', 'p', 'v', 'm') order by 1, 2;

select * from pg_policies where schemaname in ('public', 'storage') order by schemaname, tablename, policyname;
select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'storage') and grantee in ('PUBLIC', 'anon', 'authenticated') order by 2, 3, 1, 4;

-- Views and SECURITY DEFINER RPCs may bypass table RLS: review before cutover.
select n.nspname, p.proname, p.prosecdef, p.proconfig, p.proacl, pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f' order by p.proname;
select id, name, public, file_size_limit, allowed_mime_types from storage.buckets;

select grantee, table_schema, table_name, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and grantee in ('PUBLIC', 'anon', 'authenticated')
order by table_name, grantee, column_name;

select member_role.rolname as member_role, parent_role.rolname as inherited_role
from pg_auth_members m join pg_roles member_role on member_role.oid = m.member
join pg_roles parent_role on parent_role.oid = m.roleid
where member_role.rolname in ('anon', 'authenticated');
