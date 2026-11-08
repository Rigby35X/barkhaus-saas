-- Apply after tenant_private_data_policies. Direct SDK requests must enforce
-- active organizations just as the server authorization helper does.
DO $$
DECLARE t record; column_name text; member_scope text; admin_scope text;
BEGIN
 FOR t IN SELECT tablename FROM pg_policies WHERE schemaname='public' AND policyname='tenant_read' LOOP
  column_name := CASE WHEN t.tablename='organizations' THEN 'id' ELSE 'org_id' END;
  IF t.tablename='organizations' THEN
   member_scope := format('%I.is_active IS TRUE AND EXISTS (SELECT 1 FROM public.organization_memberships m WHERE m.organization_id=%I.%I AND m.user_id=(SELECT auth.uid()))',t.tablename,t.tablename,column_name);
  ELSE
   member_scope := format('EXISTS (SELECT 1 FROM public.organization_memberships m JOIN public.organizations o ON o.id=m.organization_id AND o.is_active IS TRUE WHERE m.organization_id=%I.%I AND m.user_id=(SELECT auth.uid()))',t.tablename,column_name);
  END IF;
  admin_scope := replace(member_scope,'m.user_id=', 'm.role IN (''owner'',''admin'') AND m.user_id=');
  EXECUTE format('ALTER POLICY tenant_read ON public.%I USING (%s)',t.tablename,member_scope);
  EXECUTE format('ALTER POLICY tenant_update ON public.%I USING (%s) WITH CHECK (%s)',t.tablename,admin_scope,admin_scope);
  IF t.tablename<>'organizations' THEN
   EXECUTE format('ALTER POLICY tenant_insert ON public.%I WITH CHECK (%s)',t.tablename,admin_scope);
   EXECUTE format('ALTER POLICY tenant_delete ON public.%I USING (%s)',t.tablename,admin_scope);
  END IF;
 END LOOP;
 FOR t IN SELECT policyname,cmd FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
  AND policyname IN ('tenant_image_read','tenant_image_insert','tenant_image_update','Allow public uploads 1jzq8a1_0') LOOP
  member_scope := 'bucket_id=''animal-images'' AND name !~ ''(^|/)\.\.(/|$)'' AND EXISTS (SELECT 1 FROM public.organization_memberships m JOIN public.organizations o ON o.id=m.organization_id AND o.is_active IS TRUE WHERE m.user_id=(SELECT auth.uid()) AND (storage.foldername(objects.name))[1] IN (m.organization_id::text,''org-''||m.organization_id::text))';
  IF t.cmd<>'SELECT' THEN member_scope := replace(member_scope,'m.user_id=', 'm.role IN (''owner'',''admin'') AND m.user_id='); END IF;
  IF t.cmd='INSERT' THEN
   EXECUTE format('ALTER POLICY %I ON storage.objects TO authenticated WITH CHECK (%s)',t.policyname,member_scope);
  ELSIF t.cmd='SELECT' THEN
   EXECUTE format('ALTER POLICY %I ON storage.objects TO authenticated USING (%s)',t.policyname,member_scope);
  ELSE
   EXECUTE format('ALTER POLICY %I ON storage.objects TO authenticated USING (%s) WITH CHECK (%s)',t.policyname,member_scope,member_scope);
  END IF;
 END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
