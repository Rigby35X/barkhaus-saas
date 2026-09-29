-- Stage 2: apply ONLY after public-site reads and form submission endpoints have
-- been moved to explicitly authorized server routes/public projections and tested.
-- The current tenant site uses anon reads of animals/organizations/website_content;
-- applying this today will block those paths. See apps/dashboard/SECURITY_ROLLOUT.md.
begin;
do $$
declare target_table text; column_list text;
begin
  if to_regclass('public.organization_memberships') is null then
    raise exception 'Apply and verify Stage 1 first';
  end if;
  foreach target_table in array array['organizations', 'animals', 'applications', 'form_submissions', 'website_content', 'branding', 'policies', 'events', 'donations'] loop
    if to_regclass('public.' || target_table) is not null then
      execute format('revoke all on public.%I from public, anon', target_table);
      select string_agg(quote_ident(c.column_name), ', ') into column_list
      from information_schema.columns c where c.table_schema = 'public' and c.table_name = target_table;
      execute format('revoke all (%s) on public.%I from public, anon', column_list, target_table);
    end if;
  end loop;
end $$;
-- Restrictive policies prevent old anon/public permissive policies from authorizing
-- Storage writes. Public image delivery is retained if the bucket itself is public.
create policy bh_image_anon_insert_denied on storage.objects as restrictive for insert to anon
  with check (bucket_id <> 'animal-images');
create policy bh_image_anon_update_denied on storage.objects as restrictive for update to anon
  using (bucket_id <> 'animal-images') with check (bucket_id <> 'animal-images');
create policy bh_image_anon_delete_denied on storage.objects as restrictive for delete to anon
  using (bucket_id <> 'animal-images');
commit;
