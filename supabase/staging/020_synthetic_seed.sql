-- PREPARED ONLY. After migration review/application approval, run ONLY in the
-- isolated staging project. Replace the five UUIDs with Auth-created test users.
-- No passwords/tokens/service keys belong in this file. Do not insert auth.users.
begin;
do $$
declare
  owner_a uuid := '00000000-0000-0000-0000-000000000000';
  staff_a uuid := '00000000-0000-0000-0000-000000000000';
  viewer_a uuid := '00000000-0000-0000-0000-000000000000';
  revoked_a uuid := '00000000-0000-0000-0000-000000000000';
  owner_b uuid := '00000000-0000-0000-0000-000000000000';
  staging_user_ids uuid[];
begin
  staging_user_ids:=array[owner_a,staff_a,viewer_a,revoked_a,owner_b];
  if array_position(staging_user_ids,'00000000-0000-0000-0000-000000000000'::uuid) is not null
    or (select count(distinct u) from unnest(staging_user_ids) u)<>5 then
    raise exception 'Replace all five placeholders with distinct staging Auth test UUIDs';
  end if;
  if (select count(*) from auth.users where id=any(staging_user_ids))<>5 then
    raise exception 'Create the five synthetic staging users through Supabase Auth first';
  end if;
  if exists(select 1 from public.organizations) or exists(select 1 from public.platform_animals)
    or exists(select 1 from public.organization_memberships) then
    raise exception 'Empty synthetic staging application required; seed refuses existing rows';
  end if;
  insert into public.organizations(id,org,slug,subdomain) values
    (1001,'BarkHaus Staging Native','staging-native','staging-native'),
    (1002,'BarkHaus Staging Connected','staging-connected','staging-connected');
  insert into public.organization_memberships(user_id,org_id,role,is_active) values
    (owner_a,1001,'owner',true),(staff_a,1001,'staff',true),(viewer_a,1001,'viewer',true),
    (revoked_a,1001,'staff',false),(owner_b,1002,'owner',true);
  perform setval(pg_get_serial_sequence('public.organizations','id'),1002,true);
end $$;
commit;
