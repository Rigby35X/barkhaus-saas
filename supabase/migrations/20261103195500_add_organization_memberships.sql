create table public.organization_memberships (
  organization_id bigint not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_memberships_user_id_idx on public.organization_memberships(user_id);
alter table public.organization_memberships enable row level security;
revoke all on public.organization_memberships from anon, authenticated;
grant select on public.organization_memberships to authenticated;
grant all on public.organization_memberships to service_role;
create policy "Members can read their own memberships"
  on public.organization_memberships for select to authenticated
  using (user_id = (select auth.uid()));

comment on table public.organization_memberships is
  'Server-managed links from Supabase Auth users to BarkHaus organizations. Clients may read only their own memberships.';
