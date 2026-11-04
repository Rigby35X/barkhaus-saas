-- Fictional fixtures, rolled back. Run as the test database owner, never as a browser user.
BEGIN;
DO $$ BEGIN
 ASSERT NOT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity),'Unprotected public table';
 ASSERT NOT has_table_privilege('anon','public.animals','TRUNCATE'),'Anonymous truncate grant';
 ASSERT NOT has_table_privilege('authenticated','public.animals','TRUNCATE'),'Authenticated truncate grant';
END $$;
INSERT INTO auth.users(id,email) VALUES
 ('00000000-0000-0000-0000-000000000001','owner-a@example.invalid'),
 ('00000000-0000-0000-0000-000000000002','owner-b@example.invalid'),
 ('00000000-0000-0000-0000-000000000003','member@example.invalid');
INSERT INTO public.organizations(id,org,is_active) VALUES (100001,'Test Rescue A',true),(100002,'Test Rescue B',true),(100003,'Inactive',false);
INSERT INTO public.organization_memberships(organization_id,user_id,role) VALUES
 (100001,'00000000-0000-0000-0000-000000000001','owner'),
 (100002,'00000000-0000-0000-0000-000000000002','owner'),
 (100001,'00000000-0000-0000-0000-000000000003','member');
INSERT INTO public.animals(id,org_id,name,status,internal_notes) VALUES
 (100001,100001,'Test Dog A','Available','PRIVATE A'),(100002,100002,'Test Dog B','Available','PRIVATE B'),
 (100003,100001,'Not Public','Adopted','PRIVATE'),(100004,100003,'Inactive Org','Available','PRIVATE');
INSERT INTO public.website_content(org_id,page_slug,section_key,is_visible,headline) VALUES
 (100001,'global','footer',true,'Published'),(100001,'home','hero',false,'Draft');
SET LOCAL ROLE anon;
DO $$ BEGIN
 ASSERT (SELECT count(*) FROM public.public_animals)=2,'Public filter failed';
 ASSERT (SELECT count(*) FROM public.public_website_content)=1,'Draft leaked';
 ASSERT NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='public_animals' AND column_name IN ('internal_notes','medical_notes','location')),'Private fields exposed';
 BEGIN PERFORM * FROM public.animals; RAISE EXCEPTION 'Anonymous private read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM public.applications; RAISE EXCEPTION 'Anonymous application read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.animals(org_id,name) VALUES(100001,'Bad'); RAISE EXCEPTION 'Anonymous write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.public_website_content(org_id,page_slug,section_key) VALUES(100001,'bad','bad'); RAISE EXCEPTION 'Public projection write allowed'; EXCEPTION WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN NULL; END;
 BEGIN PERFORM * FROM public.tokens_table; RAISE EXCEPTION 'Tokens readable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO storage.objects(bucket_id,name) VALUES('animal-images','100001/bad.jpg'); RAISE EXCEPTION 'Anonymous upload allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
DO $$ DECLARE n integer; BEGIN
 ASSERT (SELECT count(*) FROM public.animals)=2,'Owner scope failed';
 ASSERT (SELECT count(*) FROM public.organizations)=1,'Organization scope failed';
 ASSERT (SELECT count(*) FROM public.organization_memberships)=1,'Membership scope failed';
 INSERT INTO public.animals(org_id,name,status) VALUES(100001,'Owner Insert','Available');
 UPDATE public.animals SET name='Updated' WHERE id=100001; GET DIAGNOSTICS n=ROW_COUNT; ASSERT n=1,'Own update blocked';
 UPDATE public.animals SET name='Bad' WHERE id=100002; GET DIAGNOSTICS n=ROW_COUNT; ASSERT n=0,'Cross-org update allowed';
 DELETE FROM public.animals WHERE id=100002; GET DIAGNOSTICS n=ROW_COUNT; ASSERT n=0,'Cross-org delete allowed';
 BEGIN INSERT INTO public.animals(org_id,name) VALUES(100002,'Bad'); RAISE EXCEPTION 'Cross-org insert allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.animals SET org_id=100002 WHERE id=100001; RAISE EXCEPTION 'Organization reassignment allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.organization_memberships SET role='owner'; RAISE EXCEPTION 'Role change allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM public.linked_accounts; RAISE EXCEPTION 'Integration credentials readable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 INSERT INTO public.website_content(org_id,page_slug,section_key,footer_phone,is_visible) VALUES(100001,'global','contact','555',true);
 UPDATE public.website_content SET footer_phone='' WHERE org_id=100001 AND section_key='contact';
 ASSERT (SELECT footer_phone FROM public.website_content WHERE org_id=100001 AND section_key='contact')='','Cleared value lost';
 INSERT INTO storage.objects(bucket_id,name) VALUES('animal-images','100001/good.jpg');
 BEGIN INSERT INTO storage.objects(bucket_id,name) VALUES('animal-images','100002/bad.jpg'); RAISE EXCEPTION 'Cross-org image write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO storage.objects(bucket_id,name) VALUES('animal-images','100001/../../100002/bad.jpg'); RAISE EXCEPTION 'Traversal upload allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
DO $$ DECLARE n integer; BEGIN
 ASSERT (SELECT count(*) FROM public.animals)>0,'Member read blocked';
 UPDATE public.animals SET name='Member edit'; GET DIAGNOSTICS n=ROW_COUNT; ASSERT n=0,'Member write allowed';
 BEGIN INSERT INTO public.animals(org_id,name) VALUES(100001,'Bad'); RAISE EXCEPTION 'Member insert allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.public_animals; RAISE EXCEPTION 'Projection delete allowed'; EXCEPTION WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',true);
DO $$ BEGIN ASSERT (SELECT count(*) FROM public.animals)=0,'Unlinked user has access'; END $$;
RESET ROLE;
ROLLBACK;
