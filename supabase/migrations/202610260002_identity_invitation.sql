-- Trusted issuance/provisioning only; never trusts signup metadata.
begin;
create table barkhaus_private.organization_invitations (
 token_sha256 text primary key check(token_sha256 ~ '^[a-f0-9]{64}$'),
 org_id bigint not null references public.organizations(id), email text not null check(email=lower(trim(email)) and position('@' in email)>1),
 role text not null check(role in ('admin','staff','viewer')),
 expires_at timestamptz not null, accepted_at timestamptz,
 issued_by uuid not null references auth.users(id)
);
revoke all on barkhaus_private.organization_invitations from public,anon,authenticated,service_role;
create function barkhaus_private.issue_organization_invitation(target_org bigint, inviter uuid, target_email text, target_role text, token_digest text, expiry timestamptz)
returns void language plpgsql set search_path='' as $$
begin
 -- Caller must independently validate inviter with Auth before this trusted call.
 if not exists(select 1 from public.organization_memberships where org_id=target_org and user_id=inviter and is_active and role in ('owner','admin')) then raise exception 'Invitation issuer denied'; end if;
 if expiry<=now() or expiry>now()+interval '7 days' then raise exception 'Invalid invitation expiry'; end if;
 insert into barkhaus_private.organization_invitations values(token_digest,target_org,lower(trim(target_email)),target_role,expiry,null,inviter);
end $$;
revoke all on function barkhaus_private.issue_organization_invitation(bigint,uuid,text,text,text,timestamptz) from public,anon,authenticated,service_role;
create function public.accept_organization_invitation(token_digest text) returns bigint
language plpgsql security definer set search_path='' as $$
declare invitation barkhaus_private.organization_invitations; verified_email text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into invitation from barkhaus_private.organization_invitations where token_sha256=token_digest for update;
 if not found or invitation.expires_at<=now() or invitation.accepted_at is not null or verified_email is distinct from invitation.email then raise exception 'Invitation invalid or expired'; end if;
 if not exists(select 1 from public.organization_memberships where user_id=invitation.issued_by and org_id=invitation.org_id and is_active and role in ('owner','admin')) then raise exception 'Invitation issuer revoked'; end if;
 -- Existing or revoked memberships require explicit admin review; never reactivate
 -- or downgrade an owner implicitly through an old invitation.
 insert into public.organization_memberships(user_id,org_id,role) values(auth.uid(),invitation.org_id,invitation.role);
 update barkhaus_private.organization_invitations set accepted_at=now() where token_sha256=token_digest;
 return invitation.org_id;
end $$;
revoke all on function public.accept_organization_invitation(text) from public,anon;
grant execute on function public.accept_organization_invitation(text) to authenticated;
create function barkhaus_private.provision_initial_owner(target_org bigint, verified_user uuid)
returns void language plpgsql set search_path='' as $$
begin
 -- This capability is deliberately unavailable to browser/service_role callers.
 -- Admin verifies Auth UUID + existing org, independently of signup metadata.
 perform 1 from public.organizations where id=target_org for update;
 if not found then raise exception 'Verified organization required'; end if;
 if exists(select 1 from public.organization_memberships where org_id=target_org) then raise exception 'Organization already provisioned'; end if;
 insert into public.organization_memberships(user_id,org_id,role) values(verified_user,target_org,'owner');
end $$;
revoke all on function barkhaus_private.provision_initial_owner(bigint,uuid) from public,anon,authenticated,service_role;
commit;
