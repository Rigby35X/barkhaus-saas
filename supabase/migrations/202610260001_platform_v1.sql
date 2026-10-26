-- Additive v1 foundation. Requires reviewed Stage 1; no legacy backfill/cutover.
begin;
create table public.platform_connections (
 org_id bigint not null references public.organizations(id), id text not null,
 provider text not null check(provider in ('cognito')), active boolean not null default true,
 primary key(org_id,id)
);
-- Secret references are never browser-readable, including to an org member.
create table barkhaus_private.connection_credentials (
 org_id bigint not null, connection_id text not null, secret_ref text not null,
 primary key(org_id,connection_id), foreign key(org_id,connection_id) references public.platform_connections(org_id,id)
);
-- NOLOGIN role is selected only by a trusted worker transaction, never from JWT
-- metadata. Do not grant membership in this role to authenticated/service_role.
create role barkhaus_connector_worker nologin;
grant usage on schema public,barkhaus_private to barkhaus_connector_worker;
create table public.platform_mappings (
 org_id bigint not null references public.organizations(id), id text not null,
 revision bigint not null check(revision>0), connection_id text,
 definition jsonb not null check(jsonb_typeof(definition)='object'),
 primary key(org_id,id,revision),
 foreign key(org_id,connection_id) references public.platform_connections(org_id,id)
);
create table public.platform_jobs (
 org_id bigint not null references public.organizations(id), id text not null,
 kind text not null check(kind in ('csv','connector')), mapping_id text not null, mapping_revision bigint not null,
 connection_id text, file_sha256 text, status text not null default 'pending' check(status in ('pending','running','completed','failed','cancelled')),
 checkpoint jsonb, lease_until timestamptz,
 primary key(org_id,id),
 foreign key(org_id,mapping_id,mapping_revision) references public.platform_mappings(org_id,id,revision),
 foreign key(org_id,connection_id) references public.platform_connections(org_id,id),
 check((kind='csv' and connection_id is null and file_sha256 is not null and file_sha256 ~ '^[a-f0-9]{64}$') or (kind='connector' and connection_id is not null))
);
create unique index platform_connection_running_job on public.platform_jobs(org_id,connection_id) where kind='connector' and status='running';
create function barkhaus_private.check_job_mapping() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.id<>old.id or new.kind<>old.kind or new.mapping_id<>old.mapping_id or new.mapping_revision<>old.mapping_revision or new.connection_id is distinct from old.connection_id or new.file_sha256 is distinct from old.file_sha256) then raise exception 'Immutable job inputs'; end if;
 if not exists(select 1 from public.platform_mappings m where m.org_id=new.org_id and m.id=new.mapping_id and m.revision=new.mapping_revision and m.connection_id is not distinct from new.connection_id) then
 raise exception 'Job mapping connection mismatch'; end if;
 return new;
end $$;
create trigger job_mapping before insert or update on public.platform_jobs for each row execute function barkhaus_private.check_job_mapping();
create table public.platform_animals (
 org_id bigint not null references public.organizations(id), id text not null check(length(id)>0),
 legacy_animal_id bigint, revision bigint not null default 1 check(revision between 1 and 9007199254740991),
 source_kind text not null check(source_kind in ('native','connector')), connection_id text,
 external_record_id text, import_mapping_id text, import_key text,
 lifecycle text not null default 'unknown' check(lifecycle in ('intake','care','adopted','transferred','deceased','unknown')),
 availability text not null default 'unknown' check(availability in ('available','pending','unavailable','unknown')),
 publication text not null default 'unpublished' check(publication in ('unpublished','published','archived')),
 public_profile_key text, fields jsonb not null check(jsonb_typeof(fields)='object' and length(trim(fields->>'name'))>0 and length(trim(fields->>'species'))>0 and fields ? 'name' and fields ? 'species'),
 field_owners jsonb not null default '{}' check(jsonb_typeof(field_owners)='object'),
 custom_fields jsonb not null default '{}' check(jsonb_typeof(custom_fields)='object'),
 custom_owners jsonb not null default '{}' check(jsonb_typeof(custom_owners)='object'),
 photos jsonb not null default '[]' check(jsonb_typeof(photos)='array'),
 approvals jsonb not null default '[]' check(jsonb_typeof(approvals)='array'),
 notes text not null default '',
 primary key(org_id,id), unique(org_id,public_profile_key), unique(org_id,connection_id,external_record_id),
 unique(org_id,import_mapping_id,import_key),
 foreign key(org_id,connection_id) references public.platform_connections(org_id,id),
 check((source_kind='native' and connection_id is null and external_record_id is null) or
 (source_kind='connector' and connection_id is not null and external_record_id is not null and length(external_record_id)>0)),
 check((import_mapping_id is null)=(import_key is null)),
 check(publication<>'published' or (public_profile_key is not null and length(trim(public_profile_key))>0))
);
-- Mapping namespace has many immutable revisions. Import identities bind to a
-- pinned mapping through the job; the namespace is separately registered here.
create table public.platform_import_namespaces (
 org_id bigint not null references public.organizations(id), id text not null, primary key(org_id,id)
);
alter table public.platform_animals add foreign key(org_id,import_mapping_id) references public.platform_import_namespaces(org_id,id);
create table public.platform_documents (
 org_id bigint not null, id text not null, animal_id text not null,
 object_name text not null, kind text not null check(kind in ('medical','document')),
 primary key(org_id,id), unique(object_name),
 foreign key(org_id,animal_id) references public.platform_animals(org_id,id),
 check(split_part(object_name,'/',1)=org_id::text)
);
create table public.platform_source_commits (
 org_id bigint not null, connection_id text not null, external_record_id text not null,
 source_digest text not null check(source_digest ~ '^[a-f0-9]{64}$'), job_id text not null,
 primary key(org_id,connection_id,external_record_id,source_digest),
 foreign key(org_id,connection_id,external_record_id) references public.platform_animals(org_id,connection_id,external_record_id),
 foreign key(org_id,job_id) references public.platform_jobs(org_id,id)
);
create table public.platform_write_receipts (
 org_id bigint not null references public.organizations(id), actor_id text not null, idempotency_key text not null,
 operation text not null, payload_sha256 text not null check(payload_sha256 ~ '^[a-f0-9]{64}$'),
 result jsonb not null, primary key(org_id,actor_id,idempotency_key)
);
create table public.platform_row_outcomes (
 org_id bigint not null, job_id text not null, row_key text not null, animal_id text,
 payload_sha256 text not null check(payload_sha256 ~ '^[a-f0-9]{64}$'), outcome jsonb not null,
 primary key(org_id,job_id,row_key), foreign key(org_id,job_id) references public.platform_jobs(org_id,id),
 foreign key(org_id,animal_id) references public.platform_animals(org_id,id)
);
create function barkhaus_private.guard_platform_animal() returns trigger language plpgsql set search_path='' as $$
declare k text;
begin
 if tg_op='INSERT' then
  if current_user='barkhaus_connector_worker' then
   if new.source_kind<>'connector' or new.notes<>'' or new.custom_fields<>'{}'::jsonb or new.custom_owners<>'{}'::jsonb or new.import_key is not null or new.legacy_animal_id is not null or new.public_profile_key is not null then raise exception 'Source create contains local data'; end if;
   foreach k in array array['name','species','breed','age','sex','size','biography','photos','lifecycle','availability'] loop
    if new.field_owners->k is distinct from jsonb_build_object('kind','connector','connectionId',new.connection_id) then raise exception 'Explicit source ownership required'; end if;
   end loop;
  end if;
  if new.revision<>1 or new.publication<>'unpublished' or new.approvals<>'[]'::jsonb then raise exception 'New animals must start unpublished without approvals at revision 1'; end if;
  if current_user='authenticated' and (new.source_kind<>'native' or new.field_owners<>'{}'::jsonb or new.custom_owners<>'{}'::jsonb) then raise exception 'Trusted source provisioning required'; end if;
 else
  if new.org_id<>old.org_id or new.id<>old.id or new.source_kind<>old.source_kind or new.connection_id is distinct from old.connection_id or new.external_record_id is distinct from old.external_record_id or new.import_mapping_id is distinct from old.import_mapping_id or new.import_key is distinct from old.import_key or new.legacy_animal_id is distinct from old.legacy_animal_id then raise exception 'Immutable animal identity'; end if;
  if new.revision<>old.revision+1 then raise exception 'Revision conflict'; end if;
  if old.public_profile_key is not null and new.public_profile_key is distinct from old.public_profile_key then raise exception 'Immutable public key'; end if;
  if current_user='barkhaus_connector_worker' then
   if new.notes<>old.notes or new.publication<>old.publication or new.public_profile_key is distinct from old.public_profile_key or new.approvals<>old.approvals or new.field_owners<>old.field_owners or new.custom_owners<>old.custom_owners then raise exception 'Source cannot modify local metadata'; end if;
   for k in select key from jsonb_each(old.fields || new.fields) loop
    if new.fields->k is distinct from old.fields->k and old.field_owners->k is distinct from jsonb_build_object('kind','connector','connectionId',old.connection_id) then raise exception 'Field not owned by connection'; end if;
   end loop;
   for k in select key from jsonb_each(old.custom_fields || new.custom_fields) loop
    if new.custom_fields->k is distinct from old.custom_fields->k and old.custom_owners->k is distinct from jsonb_build_object('kind','connector','connectionId',old.connection_id) then raise exception 'Custom key not owned by connection'; end if;
   end loop;
   foreach k in array array['photos','lifecycle','availability'] loop
    if to_jsonb(new)->k is distinct from to_jsonb(old)->k and old.field_owners->k is distinct from jsonb_build_object('kind','connector','connectionId',old.connection_id) then raise exception 'Field not owned by connection'; end if;
   end loop;
  end if;
  if current_user='authenticated' then
   if new.field_owners<>old.field_owners or new.custom_owners<>old.custom_owners then raise exception 'Reviewed ownership operation required'; end if;
   for k in select jsonb_object_keys(old.field_owners) loop
    if coalesce(old.field_owners->k->>'kind','barkhaus') <> 'barkhaus' and (new.fields->k is distinct from old.fields->k or (k='photos' and new.photos<>old.photos) or (k='lifecycle' and new.lifecycle<>old.lifecycle) or (k='availability' and new.availability<>old.availability)) then raise exception 'Source-owned field'; end if;
   end loop;
   for k in select key from jsonb_each(old.custom_fields || new.custom_fields) loop
    if new.custom_fields->k is distinct from old.custom_fields->k and coalesce(old.custom_owners->k->>'kind','unregistered') <> 'barkhaus' then raise exception 'Custom key requires reviewed ownership'; end if;
   end loop;
   for k in select jsonb_object_keys(old.custom_owners) loop
    if old.custom_owners->k->>'kind' <> 'barkhaus' and new.custom_fields->k is distinct from old.custom_fields->k then raise exception 'Source-owned custom field'; end if;
   end loop;
   if (new.publication<>old.publication or new.approvals<>old.approvals or new.public_profile_key is distinct from old.public_profile_key) and barkhaus_private.organization_role(old.org_id) not in ('owner','admin') then raise exception 'Publication requires owner/admin'; end if;
  end if;
 end if;
 return new;
end $$;
create trigger platform_animal_guard before insert or update on public.platform_animals for each row execute function barkhaus_private.guard_platform_animal();
-- Browser reads are tenant scoped; only native animal operational writes granted.
-- Jobs/mappings/receipts/outcomes are written by B's trusted transactional writer.
do $$ declare tab text; begin
 foreach tab in array array['platform_documents','platform_source_commits','platform_connections','platform_mappings','platform_jobs','platform_animals','platform_import_namespaces','platform_write_receipts','platform_row_outcomes'] loop
 execute format('alter table public.%I enable row level security',tab);
 execute format('revoke all on public.%I from public,anon,authenticated',tab);
 execute format('grant select on public.%I to authenticated',tab);
 execute format('create policy tenant_read on public.%I for select to authenticated using(barkhaus_private.organization_role(org_id) is not null)',tab);
 execute format('create trigger immutable_org before update on public.%I for each row execute function barkhaus_private.protect_org_id()',tab);
 end loop;
end $$;
grant select,insert,update on public.platform_animals to barkhaus_connector_worker;
create function barkhaus_private.worker_scope(target_org bigint, target_connection text) returns boolean language sql stable security definer set search_path='' as $$
 select target_org::text=current_setting('barkhaus.worker_org',true)
 and target_connection=current_setting('barkhaus.worker_connection',true)
 and exists(select 1 from public.platform_connections where org_id=target_org and id=target_connection and active)
$$;
revoke all on function barkhaus_private.worker_scope(bigint,text) from public,anon,authenticated,service_role;
grant execute on function barkhaus_private.worker_scope(bigint,text) to barkhaus_connector_worker;
create policy source_read on public.platform_animals for select to barkhaus_connector_worker using(source_kind='connector' and barkhaus_private.worker_scope(org_id,connection_id));
create policy source_insert on public.platform_animals for insert to barkhaus_connector_worker with check(source_kind='connector' and barkhaus_private.worker_scope(org_id,connection_id));
create policy source_update on public.platform_animals for update to barkhaus_connector_worker using(source_kind='connector' and barkhaus_private.worker_scope(org_id,connection_id)) with check(source_kind='connector' and barkhaus_private.worker_scope(org_id,connection_id));
grant insert,update on public.platform_animals to authenticated;
create policy animal_insert on public.platform_animals for insert to authenticated with check(barkhaus_private.organization_role(org_id) in ('owner','admin','staff'));
create policy animal_update on public.platform_animals for update to authenticated using(barkhaus_private.organization_role(org_id) in ('owner','admin','staff')) with check(barkhaus_private.organization_role(org_id) in ('owner','admin','staff'));
revoke all on barkhaus_private.connection_credentials from public,anon,authenticated,service_role;
-- Private bucket must never be made public; preflight must confirm separately.
insert into storage.buckets(id,public) values('animal-private-documents',false);
create function barkhaus_private.document_access(object_name text,write_access boolean) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organization_memberships m where m.user_id=auth.uid() and m.is_active and m.org_id::text=split_part(object_name,'/',1) and (not write_access or m.role in ('owner','admin','staff')))
$$;
revoke all on function barkhaus_private.document_access(text,boolean) from public,anon;
grant execute on function barkhaus_private.document_access(text,boolean) to authenticated,anon;
create policy private_doc_read on storage.objects for select to authenticated using(bucket_id='animal-private-documents' and barkhaus_private.document_access(name,false));
create policy private_doc_insert on storage.objects for insert to authenticated with check(bucket_id='animal-private-documents' and barkhaus_private.document_access(name,true));
-- Restrictive floors prevent permissive historical policies from bypassing guards.
create policy private_doc_read_floor on storage.objects as restrictive for select to public using(bucket_id<>'animal-private-documents' or (current_user='authenticated' and barkhaus_private.document_access(name,false)));
create policy private_doc_insert_floor on storage.objects as restrictive for insert to public with check(bucket_id<>'animal-private-documents' or (current_user='authenticated' and barkhaus_private.document_access(name,true)));
create policy private_doc_update_floor on storage.objects as restrictive for update to public using(bucket_id<>'animal-private-documents') with check(bucket_id<>'animal-private-documents');
create policy private_doc_delete_floor on storage.objects as restrictive for delete to public using(bucket_id<>'animal-private-documents');
create function barkhaus_private.immutable_platform_row() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Immutable ledger or mapping revision; insert a new reviewed revision'; end $$;
create trigger immutable_mapping before update or delete on public.platform_mappings for each row execute function barkhaus_private.immutable_platform_row();
create trigger immutable_source_commit before update or delete on public.platform_source_commits for each row execute function barkhaus_private.immutable_platform_row();
create trigger immutable_receipt before update or delete on public.platform_write_receipts for each row execute function barkhaus_private.immutable_platform_row();
create trigger immutable_outcome before update or delete on public.platform_row_outcomes for each row execute function barkhaus_private.immutable_platform_row();
-- Trusted writer calls inside its animal/outcome transaction. Atomic conflict
-- comparison rejects changed-payload reuse, including concurrent inserts.
create function barkhaus_private.record_write_receipt(target_org bigint, actor text, key text, op text, digest text, response jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare saved public.platform_write_receipts;
begin
 insert into public.platform_write_receipts values(target_org,actor,key,op,digest,response) on conflict do nothing;
 select * into strict saved from public.platform_write_receipts where org_id=target_org and actor_id=actor and idempotency_key=key;
 if saved.operation<>op or saved.payload_sha256<>digest then raise exception 'Idempotency payload conflict' using errcode='23505'; end if;
 return saved.result;
end $$;
revoke all on function barkhaus_private.record_write_receipt(bigint,text,text,text,text,jsonb) from public,anon,authenticated,service_role;
commit;
