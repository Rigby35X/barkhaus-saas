-- Synthetic local fixture ONLY. Never apply to a hosted database.
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.organizations(id bigint primary key, org text);
create table storage.buckets(id text primary key, name text not null, public boolean not null default false);
create table storage.objects(id bigint generated always as identity, bucket_id text, name text);
alter table storage.objects enable row level security;
grant usage on schema public,auth,storage to authenticated,anon,service_role;
grant all on storage.objects to authenticated,anon;
grant usage on all sequences in schema storage to authenticated,anon;
create policy fixture_legacy on storage.objects for all to public using(true) with check(true);
create table public.animals(id bigint primary key,org_id bigint,name text);
create table public.applications(id bigint primary key,org_id bigint,name text);
create table public.form_submissions(id bigint primary key,org_id bigint,name text);
create table public.website_content(id bigint primary key,org_id bigint,name text);
insert into public.organizations values (1001,'Native fixture'),(1002,'Connector fixture');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000001','owner@example.test'),('00000000-0000-0000-0000-000000000002','staff@example.test'),('00000000-0000-0000-0000-000000000003','viewer@example.test');
