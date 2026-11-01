-- LEGACY DASHBOARD RLS CUTOVER; excluded from the platform-only staging allowlist.
-- Requires 202609290000_identity_foundation.sql. Do not apply remotely until
-- public reads/submissions have an approved replacement and regression evidence.
-- Preserving anon grants alone does NOT preserve access when no anon policies
-- exist. Source metadata review identified this exact compatibility blocker.
-- Stage2 private-data cutover is a separate subsequent deployment decision.
begin;
do $$ begin
 if to_regclass('public.organization_memberships') is null
   or to_regprocedure('barkhaus_private.organization_role(bigint)') is null then
  raise exception 'Apply reviewed identity foundation before legacy RLS cutover';
 end if;
end $$;

-- Required tables fail closed if missing or incompatible. Optional existing tables
-- are protected too; new tenant tables must receive equivalent policies explicitly.
do $$
declare
  target_table text;
  privilege_name text;
  roles text;
  predicate text;
begin
  foreach target_table in array array['animals', 'applications', 'form_submissions', 'website_content', 'branding', 'policies', 'events', 'donations'] loop
    if to_regclass('public.' || target_table) is null then
      if target_table in ('animals', 'applications', 'form_submissions', 'website_content') then
        raise exception 'Required table public.% is missing; review live schema before applying', target_table;
      end if;
      continue;
    end if;
    if not exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = target_table and c.column_name = 'org_id') then
      raise exception 'public.% has no org_id; review live schema before applying', target_table;
    end if;
    execute format('alter table public.%I enable row level security', target_table);
    -- Preserve the existing effective anon grants for Stage 1, including grants
    -- inherited from PUBLIC. Stage 2 revokes them after the public-site cutover.
    foreach privilege_name in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      if has_table_privilege('anon', 'public.' || quote_ident(target_table), privilege_name) then
        execute format('grant %s on public.%I to anon', privilege_name, target_table);
      end if;
    end loop;
    execute format('revoke all on public.%I from public, authenticated', target_table);
    execute format('grant select, insert, update, delete on public.%I to authenticated', target_table);
    predicate := 'barkhaus_private.organization_role(org_id) is not null';
    execute format('create policy bh_member_read on public.%I for select to authenticated using (%s)', target_table, predicate);
    -- Restrictive floors also constrain old permissive policies such as USING(true).
    execute format('create policy bh_member_read_floor on public.%I as restrictive for select to authenticated using (%s)', target_table, predicate);
    roles := case when target_table in ('website_content', 'branding', 'policies')
      then '(''owner'', ''admin'')' else '(''owner'', ''admin'', ''staff'')' end;
    predicate := 'barkhaus_private.organization_role(org_id) in ' || roles;
    execute format('create policy bh_member_insert on public.%I for insert to authenticated with check (%s)', target_table, predicate);
    execute format('create policy bh_member_insert_floor on public.%I as restrictive for insert to authenticated with check (%s)', target_table, predicate);
    execute format('create policy bh_member_update on public.%I for update to authenticated using (%s) with check (%s)', target_table, predicate, predicate);
    execute format('create policy bh_member_update_floor on public.%I as restrictive for update to authenticated using (%s) with check (%s)', target_table, predicate, predicate);
    execute format('create policy bh_member_delete on public.%I for delete to authenticated using (%s)', target_table, predicate);
    execute format('create policy bh_member_delete_floor on public.%I as restrictive for delete to authenticated using (%s)', target_table, predicate);
    execute format('create trigger bh_protect_org_id before update on public.%I for each row execute function barkhaus_private.protect_org_id()', target_table);
    -- Grant only the serial/identity sequence belonging to this table, if any.
    if exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = target_table and c.column_name = 'id') then
      if pg_get_serial_sequence('public.' || quote_ident(target_table), 'id') is not null then
      execute format('grant usage on sequence %s to authenticated', pg_get_serial_sequence('public.' || quote_ident(target_table), 'id'));
      end if;
    end if;
  end loop;
end $$;

do $$
declare privilege_name text;
begin
  foreach privilege_name in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
    if has_table_privilege('anon', 'public.organizations', privilege_name) then
      execute format('grant %s on public.organizations to anon', privilege_name);
    end if;
  end loop;
end $$;
alter table public.organizations enable row level security;
revoke all on public.organizations from public, authenticated;
grant select, update on public.organizations to authenticated;
create policy bh_org_read on public.organizations for select to authenticated
  using (barkhaus_private.organization_role(id) is not null);
create policy bh_org_read_floor on public.organizations as restrictive for select to authenticated
  using (barkhaus_private.organization_role(id) is not null);
create policy bh_org_update on public.organizations for update to authenticated
  using (barkhaus_private.organization_role(id) in ('owner', 'admin'))
  with check (barkhaus_private.organization_role(id) in ('owner', 'admin'));
create policy bh_org_update_floor on public.organizations as restrictive for update to authenticated
  using (barkhaus_private.organization_role(id) in ('owner', 'admin'))
  with check (barkhaus_private.organization_role(id) in ('owner', 'admin'));

-- Storage table-level operations are never part of a browser upload workflow.
revoke truncate, references, trigger on storage.objects from public, anon, authenticated;

-- Storage paths created by the dashboard: {org_id}/{folder}/{filename}.
-- Other buckets remain governed by their existing policies.
create function barkhaus_private.can_write_animal_image(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.user_id = (select auth.uid()) and m.is_active
      and m.role in ('owner', 'admin', 'staff')
      and m.org_id::text = split_part(object_name, '/', 1)
  )
$$;
revoke all on function barkhaus_private.can_write_animal_image(text) from public, anon;
grant execute on function barkhaus_private.can_write_animal_image(text) to authenticated;
create policy bh_image_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'animal-images' and barkhaus_private.can_write_animal_image(name));
create policy bh_image_insert_floor on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'animal-images' or barkhaus_private.can_write_animal_image(name));
create policy bh_image_update_floor on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'animal-images' or barkhaus_private.can_write_animal_image(name))
  with check (bucket_id <> 'animal-images' or barkhaus_private.can_write_animal_image(name));
create policy bh_image_delete_floor on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'animal-images' or barkhaus_private.can_write_animal_image(name));

commit;
