-- Public projections are intentionally read-only and owned by the migration role.
-- They bypass base-table RLS ONLY for the explicit public columns/predicates below.
-- Phase 2: apply after public projections exist and compatible applications are deployed.
DO $$
DECLARE t record; predicate text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t.tablename);
    -- Secrets, legacy identity, and tables without an established tenant relation fail closed.
    IF t.tablename IN ('linked_accounts','tokens_table','user','organization_memberships') THEN
      CONTINUE;
    END IF;
    IF t.tablename='organizations' THEN
      predicate := 'id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name=t.tablename AND column_name='org_id') THEN
      predicate := 'org_id';
    ELSE
      CONTINUE;
    END IF;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',t.tablename);
    EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING
      (EXISTS (SELECT 1 FROM public.organization_memberships m WHERE m.organization_id=%I
       AND m.user_id=(SELECT auth.uid())))',t.tablename,predicate);
    -- Org creation/deletion requires a separate server-side onboarding/admin workflow.
    IF t.tablename <> 'organizations' THEN
      EXECUTE format('CREATE POLICY tenant_insert ON public.%I FOR INSERT TO authenticated WITH CHECK
        (EXISTS (SELECT 1 FROM public.organization_memberships m WHERE m.organization_id=%I
         AND m.user_id=(SELECT auth.uid()) AND m.role IN (''owner'',''admin'')))',t.tablename,predicate);
      EXECUTE format('CREATE POLICY tenant_delete ON public.%I FOR DELETE TO authenticated USING
        (EXISTS (SELECT 1 FROM public.organization_memberships m WHERE m.organization_id=%I
         AND m.user_id=(SELECT auth.uid()) AND m.role IN (''owner'',''admin'')))',t.tablename,predicate);
    END IF;
    EXECUTE format('CREATE POLICY tenant_update ON public.%I FOR UPDATE TO authenticated USING
      (EXISTS (SELECT 1 FROM public.organization_memberships m WHERE m.organization_id=%I
       AND m.user_id=(SELECT auth.uid()) AND m.role IN (''owner'',''admin''))) WITH CHECK
      (EXISTS (SELECT 1 FROM public.organization_memberships m WHERE m.organization_id=%I
       AND m.user_id=(SELECT auth.uid()) AND m.role IN (''owner'',''admin'')))',t.tablename,predicate,predicate);
  END LOOP;
END $$;
GRANT SELECT ON public.organization_memberships TO authenticated;
DROP POLICY IF EXISTS "Members can read their own memberships" ON public.organization_memberships;
CREATE POLICY "Members can read their own memberships" ON public.organization_memberships
FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
-- Existing membership SELECT policy remains; role assignment stays server managed.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
-- Replace the reviewed anonymous-upload policy. Public bucket reads stay public.
DROP POLICY IF EXISTS "Allow public uploads 1jzq8a1_0" ON storage.objects;
CREATE POLICY tenant_image_read ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id='animal-images' AND name !~ '(^|/)\.\.(/|$)' AND EXISTS (SELECT 1 FROM public.organization_memberships m
 WHERE m.user_id=(SELECT auth.uid()) AND
 (storage.foldername(name))[1] IN (m.organization_id::text,'org-'||m.organization_id::text)));
CREATE POLICY tenant_image_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='animal-images' AND name !~ '(^|/)\.\.(/|$)' AND EXISTS (SELECT 1 FROM public.organization_memberships m
 WHERE m.user_id=(SELECT auth.uid()) AND m.role IN ('owner','admin') AND
 (storage.foldername(name))[1] IN (m.organization_id::text,'org-'||m.organization_id::text)));
CREATE POLICY tenant_image_update ON storage.objects FOR UPDATE TO authenticated USING (
 bucket_id='animal-images' AND name !~ '(^|/)\.\.(/|$)' AND EXISTS (SELECT 1 FROM public.organization_memberships m
 WHERE m.user_id=(SELECT auth.uid()) AND m.role IN ('owner','admin') AND
 (storage.foldername(name))[1] IN (m.organization_id::text,'org-'||m.organization_id::text))) WITH CHECK (
 bucket_id='animal-images' AND name !~ '(^|/)\.\.(/|$)' AND EXISTS (SELECT 1 FROM public.organization_memberships m
 WHERE m.user_id=(SELECT auth.uid()) AND m.role IN ('owner','admin') AND
 (storage.foldername(name))[1] IN (m.organization_id::text,'org-'||m.organization_id::text)));
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
NOTIFY pgrst, 'reload schema';
