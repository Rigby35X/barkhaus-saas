BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('00000000-0000-0000-0000-000000000051','signup@example.invalid',now()),
 ('00000000-0000-0000-0000-000000000052','unverified@example.invalid',null),
 ('00000000-0000-0000-0000-000000000053','existing-member@example.invalid',now());
INSERT INTO public.organizations(id,org,is_active) VALUES(100051,'Existing test rescue',true);
INSERT INTO public.organization_memberships(organization_id,user_id,role)
 VALUES(100051,'00000000-0000-0000-0000-000000000053','member');
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.create_rescue('Blocked'); RAISE EXCEPTION 'Anonymous signup allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000052',true);
DO $$ BEGIN
 BEGIN PERFORM public.create_rescue('Unverified'); RAISE EXCEPTION 'Unverified signup allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000053',true);
DO $$ BEGIN
 BEGIN PERFORM public.create_rescue('Escalated'); RAISE EXCEPTION 'Member escalation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000051',true);
DO $$ DECLARE created bigint; retried bigint; BEGIN
 ASSERT (SELECT count(*) FROM public.organization_memberships)=0,'Unlinked identity sees memberships';
 BEGIN PERFORM public.create_rescue(' '); RAISE EXCEPTION 'Empty name allowed';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 created := public.create_rescue('New Test Rescue');
 retried := public.create_rescue('Repeated request');
 ASSERT created=retried,'Retry created a duplicate organization';
 ASSERT (SELECT count(*) FROM public.organizations)=1,'New owner sees another rescue';
 ASSERT (SELECT org FROM public.organizations WHERE id=created)='New Test Rescue','Wrong name';
 ASSERT (SELECT count(*) FROM public.organization_memberships)=1,'Wrong membership count';
 ASSERT (SELECT role FROM public.organization_memberships WHERE organization_id=created)='owner','No owner membership';
 ASSERT (SELECT user_id FROM public.organization_memberships WHERE organization_id=created)=auth.uid(),'Wrong owner';
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.consume_application_quota(repeat('a',64)); RAISE EXCEPTION 'Client can consume server quota';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 FOR n IN 1..5 LOOP ASSERT public.consume_application_quota(repeat('a',64)), 'Early rate limit'; END LOOP;
 ASSERT NOT public.consume_application_quota(repeat('a',64)), 'Sixth request not limited';
 ASSERT public.consume_application_quota(repeat('b',64)), 'Separate identity shares quota';
END $$;
RESET ROLE;
ROLLBACK;
