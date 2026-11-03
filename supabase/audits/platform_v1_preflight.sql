-- Administrator read-only export; run alongside dashboard_permissions.sql.
-- No row contents, tokens, credential refs or private documents are selected.
begin transaction read only;
select current_database(), current_user, version();
select table_schema,table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema in ('public','storage') order by 1,2,ordinal_position;
select n.nspname,c.relname,con.conname,pg_get_constraintdef(con.oid)
from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','storage') order by 1,2,3;
select * from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname;
select id,public from storage.buckets order by id;
rollback;
