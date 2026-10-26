-- Integration foundation: review before any hosted application. No runtime login
-- or role membership is provisioned here. The executor is a server-only capability.
begin;
create role barkhaus_platform_executor nologin nobypassrls;
grant usage on schema public,barkhaus_private,auth to barkhaus_platform_executor;

alter table public.platform_connections
 add column generation bigint not null default 1 check(generation>0),
 add column fence bigint not null default 0 check(fence>=0),
 add column definition jsonb not null default '{}' check(jsonb_typeof(definition)='object' and not definition ? 'credentialRef'),
 add column state text not null default 'active' check(state in ('configured','active','error','disconnected'));
alter table public.platform_jobs
 drop constraint platform_jobs_status_check,
 alter column status set default 'queued',
 add constraint platform_jobs_status_check check(status in ('pending','queued','running','retry_wait','partial','completed','failed','cancelled')),
 add column definition jsonb not null default '{}' check(jsonb_typeof(definition)='object'),
 add column created_by uuid references auth.users(id),
 add column generation bigint not null default 1 check(generation>0),
 add column fence bigint not null default 0 check(fence>=0),
 add column lease_owner text,
 add column attempt integer not null default 0 check(attempt>=0),
 add column next_attempt_at timestamptz;
create unique index platform_connection_active_lease on public.platform_jobs(org_id,connection_id)
 where kind='connector' and lease_owner is not null;

alter table public.platform_animals
 add column csv_origin_job_id text,
 add column csv_origin_mapping_id text,
 add column sync_state text not null default 'never_synced' check(sync_state in ('never_synced','current','missing_review','disconnected')),
 add foreign key(org_id,csv_origin_job_id) references public.platform_jobs(org_id,id),
 add foreign key(org_id,csv_origin_mapping_id) references public.platform_import_namespaces(org_id,id),
 add check((csv_origin_job_id is null)=(csv_origin_mapping_id is null));
alter table public.platform_animals add check(legacy_animal_id is null or legacy_animal_id between 1 and 9007199254740991);

create function barkhaus_private.guard_connection_generation() returns trigger language plpgsql set search_path='' as $$
begin
 if new.id<>old.id then raise exception 'Immutable connection identity'; end if;
 if new.fence<old.fence or new.fence>old.fence+1 then raise exception 'Connection fence must advance monotonically by one'; end if;
 if new.generation<old.generation or new.generation>old.generation+1 then raise exception 'Connection generation must advance monotonically'; end if;
 if (new.definition<>old.definition or new.active<>old.active or new.state<>old.state) and new.generation<>old.generation+1 then raise exception 'Connection changes must advance generation'; end if;
 return new;
end $$;
create trigger connection_generation before update on public.platform_connections for each row execute function barkhaus_private.guard_connection_generation();

create table public.platform_import_identities (
 org_id bigint not null, mapping_id text not null, import_key text not null check(length(trim(import_key))>0), animal_id text not null,
 primary key(org_id,mapping_id,import_key),
 foreign key(org_id,mapping_id) references public.platform_import_namespaces(org_id,id),
 foreign key(org_id,animal_id) references public.platform_animals(org_id,id)
);
create table public.platform_source_revisions (
 org_id bigint not null, connection_id text not null, external_record_id text not null, source_revision text not null check(length(source_revision)>0),
 primary key(org_id,connection_id,external_record_id,source_revision),
 foreign key(org_id,connection_id,external_record_id) references public.platform_animals(org_id,connection_id,external_record_id)
);
create table public.platform_source_heads (
 org_id bigint not null, connection_id text not null, external_record_id text not null,
 source_revision text not null, source_digest text not null check(source_digest ~ '^[a-f0-9]{64}$'),
 primary key(org_id,connection_id,external_record_id),
 foreign key(org_id,connection_id,external_record_id,source_revision) references public.platform_source_revisions(org_id,connection_id,external_record_id,source_revision)
);
create table public.platform_connector_inboxes (
 org_id bigint not null, job_id text not null, body jsonb not null check(jsonb_typeof(body)='object'), digest text not null check(digest ~ '^[a-f0-9]{64}$'),
 primary key(org_id,job_id), foreign key(org_id,job_id) references public.platform_jobs(org_id,id)
);
create table public.platform_connector_seen (
 org_id bigint not null, job_id text not null, external_record_id text not null,
 primary key(org_id,job_id,external_record_id), foreign key(org_id,job_id) references public.platform_jobs(org_id,id)
);
create table public.platform_unit_receipts (
 org_id bigint not null, job_id text not null, unit_key text not null, result jsonb not null,
 primary key(org_id,job_id,unit_key), foreign key(org_id,job_id) references public.platform_jobs(org_id,id)
);
create table public.platform_outbox (
 org_id bigint not null, job_id text not null, event_key text not null, payload jsonb not null,
 primary key(org_id,job_id,event_key), foreign key(org_id,job_id) references public.platform_jobs(org_id,id)
);
create table public.platform_serialization_keys (
 org_id bigint not null references public.organizations(id), key text not null,
 primary key(org_id,key)
);
create table barkhaus_private.platform_import_sources (
 org_id bigint not null, job_id text not null, body text not null,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 primary key(org_id,job_id), foreign key(org_id,job_id) references public.platform_jobs(org_id,id)
);
alter table barkhaus_private.platform_import_sources enable row level security;
revoke all on barkhaus_private.platform_import_sources from public,anon,authenticated,service_role;
grant select,insert on barkhaus_private.platform_import_sources to barkhaus_platform_executor;
create policy executor_scope on barkhaus_private.platform_import_sources for all to barkhaus_platform_executor
 using(org_id::text=current_setting('barkhaus.actor_org',true)) with check(org_id::text=current_setting('barkhaus.actor_org',true));
create trigger immutable_source before update or delete on barkhaus_private.platform_import_sources for each row execute function barkhaus_private.immutable_platform_row();

-- Metadata is writable only by a separately bound trusted server capability.
-- Merely setting a custom GUC does not grant this NOLOGIN role to any client.
do $$ declare tab text; begin
 foreach tab in array array['platform_import_identities','platform_source_revisions','platform_source_heads','platform_connector_inboxes','platform_connector_seen','platform_unit_receipts','platform_outbox','platform_serialization_keys'] loop
  execute format('alter table public.%I add constraint positive_safe_org check(org_id between 1 and 9007199254740991)',tab);
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',tab);
  execute format('create trigger immutable_org before update on public.%I for each row execute function barkhaus_private.protect_org_id()',tab);
 end loop;
 foreach tab in array array['platform_connections','platform_mappings','platform_jobs','platform_import_namespaces','platform_import_identities','platform_source_commits','platform_source_revisions','platform_source_heads','platform_connector_inboxes','platform_connector_seen','platform_write_receipts','platform_row_outcomes','platform_unit_receipts','platform_outbox','platform_serialization_keys'] loop
  execute format('grant select,insert,update,delete on public.%I to barkhaus_platform_executor',tab);
  execute format('create policy executor_scope on public.%I for all to barkhaus_platform_executor using(org_id::text=current_setting(''barkhaus.actor_org'',true)) with check(org_id::text=current_setting(''barkhaus.actor_org'',true))',tab);
 end loop;
end $$;
grant select on public.platform_documents to barkhaus_platform_executor;
create policy executor_scope on public.platform_documents for select to barkhaus_platform_executor
 using(org_id::text=current_setting('barkhaus.actor_org',true));
-- No animal DML grant to executor: B switches the SAME connection to the member
-- or scoped worker role for animal writes, preserving their guards and RLS.
create trigger immutable_source_revision before update or delete on public.platform_source_revisions for each row execute function barkhaus_private.immutable_platform_row();
create trigger immutable_import_identity before update or delete on public.platform_import_identities for each row execute function barkhaus_private.immutable_platform_row();
create trigger immutable_unit_receipt before update or delete on public.platform_unit_receipts for each row execute function barkhaus_private.immutable_platform_row();
create trigger immutable_outbox before update or delete on public.platform_outbox for each row execute function barkhaus_private.immutable_platform_row();
create trigger immutable_inbox before update on public.platform_connector_inboxes for each row execute function barkhaus_private.immutable_platform_row();

-- Deferred to COMMIT: a callback may finish while its lease expires or a late
-- statement invalidates its unit. Metadata RLS alone only checks organization.
-- This definer can read the required scope, but cannot be called by any client.
create function barkhaus_private.verify_unit_commit() returns trigger
language plpgsql security definer set search_path='' as $$
declare job public.platform_jobs; connection public.platform_connections;
begin
 if new.org_id::text is distinct from current_setting('barkhaus.actor_org',true) then raise exception 'Commit organization denied' using errcode='42501'; end if;
 select * into strict job from public.platform_jobs where org_id=new.org_id and id=new.job_id for share;
 if job.kind='connector' then
  select * into strict connection from public.platform_connections where org_id=job.org_id and id=job.connection_id for share;
  if new.unit_key is distinct from 'connector:'||job.fence::text
    or job.org_id::text is distinct from current_setting('barkhaus.worker_org',true)
    or job.connection_id is distinct from current_setting('barkhaus.worker_connection',true)
    or job.id is distinct from current_setting('barkhaus.worker_job',true)
    or job.fence::text is distinct from current_setting('barkhaus.worker_fence',true)
    or job.lease_owner is null or job.lease_until is null or job.lease_until<=clock_timestamp()
    or job.generation<>connection.generation or not connection.active or connection.state<>'active'
    or job.status not in ('queued','completed') then
   raise exception 'Commit worker fence denied' using errcode='42501';
  end if;
 else
  if job.created_by is null or job.created_by::text is distinct from current_setting('request.jwt.claim.sub',true)
    or job.status not in ('running','partial','completed') then raise exception 'Commit import authority denied' using errcode='42501'; end if;
  perform 1 from public.organization_memberships where org_id=job.org_id and user_id=job.created_by and is_active and role in ('owner','admin','staff') for share;
  if not found then raise exception 'Commit import membership denied' using errcode='42501'; end if;
 end if;
 return new;
end $$;
revoke all on function barkhaus_private.verify_unit_commit() from public,anon,authenticated,service_role,barkhaus_platform_executor,barkhaus_connector_worker;
create constraint trigger platform_unit_commit_guard after insert on public.platform_unit_receipts
 deferrable initially deferred for each row execute function barkhaus_private.verify_unit_commit();

create or replace function barkhaus_private.check_job_mapping() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.id<>old.id or new.kind<>old.kind or new.mapping_id<>old.mapping_id or new.mapping_revision<>old.mapping_revision or new.connection_id is distinct from old.connection_id or new.file_sha256 is distinct from old.file_sha256 or new.definition<>old.definition or new.created_by is distinct from old.created_by or new.generation<>old.generation) then raise exception 'Immutable job inputs'; end if;
 if not exists(select 1 from public.platform_mappings m where m.org_id=new.org_id and m.id=new.mapping_id and m.revision=new.mapping_revision and m.connection_id is not distinct from new.connection_id) then raise exception 'Job mapping connection mismatch'; end if;
 if tg_op='INSERT' and new.kind='connector' and not exists(select 1 from public.platform_connections c where c.org_id=new.org_id and c.id=new.connection_id and c.generation=new.generation) then raise exception 'Job connection generation mismatch'; end if;
 return new;
end $$;

create function barkhaus_private.lock_platform_member(target_org bigint,target_user uuid) returns text
language plpgsql security definer set search_path='' as $$
declare member_role text;
begin
 if target_org::text is distinct from current_setting('barkhaus.actor_org',true) or target_user::text is distinct from current_setting('request.jwt.claim.sub',true) then return null; end if;
 select role into member_role from public.organization_memberships where org_id=target_org and user_id=target_user and is_active for share;
 return member_role;
end $$;
revoke all on function barkhaus_private.lock_platform_member(bigint,uuid) from public,anon,authenticated,service_role;
grant execute on function barkhaus_private.lock_platform_member(bigint,uuid) to barkhaus_platform_executor;

create or replace function barkhaus_private.worker_scope(target_org bigint,target_connection text) returns boolean language sql stable security definer set search_path='' as $$
 select target_org::text=current_setting('barkhaus.worker_org',true)
 and target_connection=current_setting('barkhaus.worker_connection',true)
 and exists(select 1 from public.platform_connections c join public.platform_jobs j on j.org_id=c.org_id and j.connection_id=c.id
 where c.org_id=target_org and c.id=target_connection and c.active and c.state='active'
 and j.id=current_setting('barkhaus.worker_job',true) and j.kind='connector' and j.status='running'
 and j.generation=c.generation and j.fence::text=current_setting('barkhaus.worker_fence',true)
 and j.lease_owner is not null and j.lease_until>clock_timestamp())
$$;

create function barkhaus_private.source_mapping_owners(target_org bigint,target_connection text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare core jsonb:='{}'; custom jsonb:='{}'; k text; mapping jsonb; item jsonb;
begin
 if not barkhaus_private.worker_scope(target_org,target_connection) then raise exception 'Active scoped worker lease required'; end if;
 select m.definition into strict mapping from public.platform_jobs j join public.platform_mappings m on m.org_id=j.org_id and m.id=j.mapping_id and m.revision=j.mapping_revision
 where j.org_id=target_org and j.id=current_setting('barkhaus.worker_job',true);
 foreach k in array array['name','species','breed','age','sex','size','biography','photos','lifecycle','availability'] loop core:=core || jsonb_build_object(k,jsonb_build_object('kind','barkhaus')); end loop;
 for item in select value from jsonb_array_elements(coalesce(mapping->'fields','[]')) loop
  if item->'target'->>'kind'='core' then core:=core || jsonb_build_object(item->'target'->>'field',jsonb_build_object('kind','connector','connectionId',target_connection));
  elsif item->'target'->>'kind'='custom' then custom:=custom || jsonb_build_object(item->'target'->>'key',jsonb_build_object('kind','connector','connectionId',target_connection)); end if;
 end loop;
 if coalesce(mapping->'statusMap','{}'::jsonb)<>'{}'::jsonb then
  core:=core || jsonb_build_object('lifecycle',jsonb_build_object('kind','connector','connectionId',target_connection),'availability',jsonb_build_object('kind','connector','connectionId',target_connection));
 end if;
 return jsonb_build_object('core',core,'custom',custom);
end $$;
revoke all on function barkhaus_private.source_mapping_owners(bigint,text) from public,anon,authenticated,service_role;
grant execute on function barkhaus_private.source_mapping_owners(bigint,text) to barkhaus_connector_worker;

-- See reviewed integration policy: mapped-only ownership; local approval metadata
-- survives operational edits, and publication state changes remain owner/admin.
create or replace function barkhaus_private.guard_platform_animal() returns trigger language plpgsql set search_path='' as $$
declare k text; owners jsonb; expected jsonb; origin public.platform_jobs;
 defaults jsonb:='{"name":"","species":"","breed":null,"age":{"kind":"unknown"},"sex":"unknown","size":"unknown","biography":null,"photos":[],"lifecycle":"unknown","availability":"unknown"}';
begin
 if tg_op='INSERT' then
  if new.csv_origin_job_id is not null then
   select * into origin from public.platform_jobs where org_id=new.org_id and id=new.csv_origin_job_id;
   if not found or origin.kind<>'csv' or origin.mapping_id<>new.csv_origin_mapping_id then raise exception 'CSV origin pinned job mismatch'; end if;
  end if;
  if current_user='barkhaus_connector_worker' then
   if new.source_kind<>'connector' or new.notes<>'' or new.import_key is not null or new.legacy_animal_id is not null or new.public_profile_key is not null or new.csv_origin_job_id is not null then raise exception 'Source create contains local data'; end if;
   owners:=barkhaus_private.source_mapping_owners(new.org_id,new.connection_id);
   if new.field_owners is distinct from owners->'core' then raise exception 'Verified mapped source ownership required'; end if;
   for k in select jsonb_object_keys(owners->'core') loop
    if owners->'core'->k->>'kind'='barkhaus' then
     expected:=case when k in ('photos','lifecycle','availability') then to_jsonb(new)->k else new.fields->k end;
     if expected is distinct from defaults->k then raise exception 'Unmapped source defaults must remain local'; end if;
    end if;
   end loop;
   for k in select jsonb_object_keys(new.custom_fields || new.custom_owners) loop
    if new.custom_owners->k is distinct from owners->'custom'->k or not new.custom_fields ? k or not new.custom_owners ? k then raise exception 'Verified mapped custom ownership required'; end if;
   end loop;
  end if;
  if new.revision<>1 or new.publication<>'unpublished' or new.approvals<>'[]'::jsonb then raise exception 'New animals must start unpublished without approvals at revision 1'; end if;
  if current_user='authenticated' then
   if new.source_kind<>'native' then raise exception 'Trusted source provisioning required'; end if;
   for k in select jsonb_object_keys(new.field_owners) loop
    if new.field_owners->k is distinct from jsonb_build_object('kind','barkhaus') then raise exception 'Native ownership must remain BarkHaus'; end if;
   end loop;
   for k in select jsonb_object_keys(new.custom_fields || new.custom_owners) loop
    if new.custom_owners->k is distinct from jsonb_build_object('kind','barkhaus') or not new.custom_fields ? k then raise exception 'Native custom ownership must remain BarkHaus'; end if;
   end loop;
  end if;
 else
  if new.org_id<>old.org_id or new.id<>old.id or new.source_kind<>old.source_kind or new.connection_id is distinct from old.connection_id or new.external_record_id is distinct from old.external_record_id or new.import_mapping_id is distinct from old.import_mapping_id or new.import_key is distinct from old.import_key or new.legacy_animal_id is distinct from old.legacy_animal_id or new.csv_origin_job_id is distinct from old.csv_origin_job_id or new.csv_origin_mapping_id is distinct from old.csv_origin_mapping_id then raise exception 'Immutable animal identity'; end if;
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
    if coalesce(old.field_owners->k->>'kind','barkhaus')<>'barkhaus' and (new.fields->k is distinct from old.fields->k or (k='photos' and new.photos<>old.photos) or (k='lifecycle' and new.lifecycle<>old.lifecycle) or (k='availability' and new.availability<>old.availability)) then raise exception 'Source-owned field'; end if;
   end loop;
   for k in select key from jsonb_each(old.custom_fields || new.custom_fields) loop
    if new.custom_fields->k is distinct from old.custom_fields->k and coalesce(old.custom_owners->k->>'kind','unregistered')<>'barkhaus' then raise exception 'Custom key requires reviewed ownership'; end if;
   end loop;
   if (new.publication<>old.publication or new.approvals<>old.approvals or new.public_profile_key is distinct from old.public_profile_key) and barkhaus_private.organization_role(old.org_id) not in ('owner','admin') then raise exception 'Publication requires owner/admin'; end if;
  end if;
 end if;
 return new;
end $$;
commit;
