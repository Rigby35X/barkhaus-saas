CREATE TABLE private.application_quotas (
  identity_hash text PRIMARY KEY CHECK (identity_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz NOT NULL,
  submissions integer NOT NULL
);
ALTER TABLE private.application_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.application_quotas FROM PUBLIC, anon, authenticated;
CREATE FUNCTION private.consume_application_quota(identity_hash text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE used integer;
BEGIN
  IF identity_hash IS NULL OR identity_hash !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  INSERT INTO private.application_quotas AS q VALUES(identity_hash,now(),1)
  ON CONFLICT ON CONSTRAINT application_quotas_pkey DO UPDATE SET
    window_start=CASE WHEN q.window_start < now()-interval '15 minutes' THEN now() ELSE q.window_start END,
    submissions=CASE WHEN q.window_start < now()-interval '15 minutes' THEN 1 ELSE least(q.submissions+1,6) END
  RETURNING submissions INTO used;
  RETURN used <= 5;
END $$;
REVOKE ALL ON FUNCTION private.consume_application_quota(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.consume_application_quota(text) TO service_role;
CREATE FUNCTION public.consume_application_quota(identity_hash text) RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.consume_application_quota(identity_hash); $$;
REVOKE ALL ON FUNCTION public.consume_application_quota(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_application_quota(text) TO service_role;
NOTIFY pgrst, 'reload schema';
