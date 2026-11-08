-- Only a verified signed-in identity can provision its own first organization.
-- Privileged implementation stays outside the Data API's public schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE FUNCTION private.provision_organization(registration_name text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid(); verified_at timestamptz; existing bigint;
        new_id bigint; new_slug text; clean_name text := btrim(registration_name);
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Please sign in.' USING ERRCODE='42501'; END IF;
  IF clean_name IS NULL OR char_length(clean_name) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'Use an organization name between 2 and 120 characters.' USING ERRCODE='22023';
  END IF;
  -- Row lock serializes retries for this user; no client-selected owner or org ID.
  SELECT email_confirmed_at INTO verified_at FROM auth.users WHERE id=actor FOR UPDATE;
  IF verified_at IS NULL THEN RAISE EXCEPTION 'Verify your email before creating a rescue.' USING ERRCODE='42501'; END IF;
  SELECT organization_id INTO existing FROM public.organization_memberships
   WHERE user_id=actor AND role IN ('owner','admin') ORDER BY created_at LIMIT 1;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  IF EXISTS(SELECT 1 FROM public.organization_memberships WHERE user_id=actor) THEN
    RAISE EXCEPTION 'Ask your organization owner to grant management access.' USING ERRCODE='42501';
  END IF;
  new_slug := left(trim(both '-' FROM regexp_replace(lower(clean_name),'[^a-z0-9]+','-','g')),40);
  new_slug := coalesce(nullif(new_slug,''),'rescue') || '-' || left(replace(gen_random_uuid()::text,'-',''),12);
  INSERT INTO public.organizations(org,slug,subdomain,is_active) VALUES(clean_name,new_slug,new_slug,true) RETURNING id INTO new_id;
  INSERT INTO public.organization_memberships(organization_id,user_id,role) VALUES(new_id,actor,'owner');
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION private.provision_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.provision_organization(text) TO authenticated;

CREATE FUNCTION public.create_rescue(registration_name text) RETURNS bigint
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT private.provision_organization(registration_name);
$$;
REVOKE ALL ON FUNCTION public.create_rescue(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_rescue(text) TO authenticated;
NOTIFY pgrst, 'reload schema';
