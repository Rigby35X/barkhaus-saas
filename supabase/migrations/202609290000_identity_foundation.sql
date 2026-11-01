-- Additive platform identity only. Prepared; apply only after staging approval.
-- Requires organizations(id bigint-compatible) and managed Supabase Auth.
-- Does not alter legacy organizations/animal/form/website RLS, grants or policies.
-- Does not remove existing legacy access risks: those need a separate cutover.
begin;

create schema if not exists barkhaus_private;
revoke all on schema barkhaus_private from public;
grant usage on schema barkhaus_private to authenticated;

-- Fail if an unreviewed membership table already exists rather than silently adopting it.
create table public.organization_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id bigint not null references public.organizations(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'staff', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, org_id)
);
create index organization_memberships_org_idx on public.organization_memberships(org_id);
alter table public.organization_memberships enable row level security;
revoke all on public.organization_memberships from public, anon, authenticated;
grant select on public.organization_memberships to authenticated;
grant all on public.organization_memberships to service_role;
create policy membership_self_read on public.organization_memberships
  for select to authenticated using (user_id = (select auth.uid()) and is_active);

-- Run as postgres/table owner; private functions avoid recursive membership policies.
-- Roles come from this table, never editable JWT user_metadata.
create function barkhaus_private.organization_role(target_org bigint)
returns text language sql stable security definer set search_path = '' as $$
  select m.role from public.organization_memberships m
  where m.org_id = target_org and m.user_id = (select auth.uid()) and m.is_active
$$;
revoke all on function barkhaus_private.organization_role(bigint) from public, anon;
grant execute on function barkhaus_private.organization_role(bigint) to authenticated;

create function barkhaus_private.protect_org_id()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.org_id is distinct from old.org_id then
    raise exception 'Organization ownership cannot be changed' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function barkhaus_private.protect_org_id() from public;

-- A narrow member-only display projection avoids granting access to or changing
-- RLS on legacy organizations. No caller-supplied actor/org or SELECT * payload.
create function public.my_organization_access()
returns table(org_id bigint, role text, organizations jsonb)
language sql stable security definer set search_path = '' as $$
 select m.org_id,m.role,jsonb_strip_nulls(jsonb_build_object(
  'org',to_jsonb(o)->'org',
  'logo_dark_url',to_jsonb(o)->'logo_dark_url',
  'primary_color',to_jsonb(o)->'primary_color',
  'secondary_color',to_jsonb(o)->'secondary_color',
  'contact_email',to_jsonb(o)->'contact_email',
  'email',to_jsonb(o)->'email',
  'phone',to_jsonb(o)->'phone',
  'address',to_jsonb(o)->'address',
  'facebook_url',to_jsonb(o)->'facebook_url',
  'instagram_url',to_jsonb(o)->'instagram_url',
  'twitter_url',to_jsonb(o)->'twitter_url',
  'subdomain',to_jsonb(o)->'subdomain',
  'website',to_jsonb(o)->'website'
 ))
 from public.organization_memberships m join public.organizations o on o.id=m.org_id
 where m.user_id=(select auth.uid()) and m.is_active
 order by m.org_id
$$;
revoke all on function public.my_organization_access() from public,anon,authenticated,service_role;
grant execute on function public.my_organization_access() to authenticated;

commit;
