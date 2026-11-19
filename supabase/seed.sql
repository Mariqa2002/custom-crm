-- LOCAL DEVELOPMENT ONLY. `supabase db reset` runs this after the migrations.
-- Creates two test users; the on_auth_user_created trigger seeds each one.
--   mariqa@local.test    the main test account (sign in with a magic link from Mailpit)
--   intruder@local.test  second account used by scripts/rls-test.mjs
-- Both also have the password local-dev-only-123 so the RLS script can sign in.

do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('11111111-1111-4111-8111-111111111111'::uuid, 'mariqa@local.test', 'Mariqa J. Cumberbatch'),
      ('22222222-2222-4222-8222-222222222222'::uuid, 'intruder@local.test', 'Intruder Test')
    ) as v(id, email, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('local-dev-only-123', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', u.full_name), now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end $$;
