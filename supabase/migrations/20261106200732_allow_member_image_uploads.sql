DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='authenticated_organization_image_uploads') THEN
-- Restore signed-in uploads without granting access to another organization's folder.
CREATE POLICY authenticated_organization_image_uploads ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
 bucket_id = 'animal-images'
 AND name !~ '(^|/)\.\.(/|$)'
 AND EXISTS (
  SELECT 1 FROM public.organization_memberships m
  JOIN public.organizations o ON o.id=m.organization_id AND o.is_active IS TRUE
  WHERE m.user_id=(SELECT auth.uid()) AND m.role IN ('owner','admin')
  AND (storage.foldername(name))[1] IN (m.organization_id::text,'org-'||m.organization_id::text)
 )
);

 END IF;
END $$;
