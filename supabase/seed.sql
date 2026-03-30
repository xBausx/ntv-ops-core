-- Local development seed for Ops Core.
-- Purpose: make `supabase db reset` produce a usable app with deterministic users,
-- role mappings, linked players, queue data, and work history.

-- ---------------------------------------------------------------------------
-- Auth users (local development only)
-- ---------------------------------------------------------------------------
-- Supabase local seed files run after migrations. We seed auth.users and
-- auth.identities so email/password sign-in works immediately after reset.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'admin@ntv360.local',
    crypt('OpsCore123', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Local Admin","seeded":true}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'ops@ntv360.local',
    crypt('OpsCore123', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Local Ops","seeded":true}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'readonly@ntv360.local',
    crypt('OpsCore123', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Local Read Only","seeded":true}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    '',
    ''
  )
on conflict (id) do nothing;

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    'admin@ntv360.local',
    '11111111-1111-4111-8111-111111111111',
    jsonb_build_object(
      'sub', '11111111-1111-4111-8111-111111111111',
      'email', 'admin@ntv360.local',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    'ops@ntv360.local',
    '22222222-2222-4222-8222-222222222222',
    jsonb_build_object(
      'sub', '22222222-2222-4222-8222-222222222222',
      'email', 'ops@ntv360.local',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    'readonly@ntv360.local',
    '33333333-3333-4333-8333-333333333333',
    jsonb_build_object(
      'sub', '33333333-3333-4333-8333-333333333333',
      'email', 'readonly@ntv360.local',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- App roles
-- ---------------------------------------------------------------------------
insert into public.profiles (user_id, role)
values
  ('11111111-1111-4111-8111-111111111111', 'ADMIN'),
  ('22222222-2222-4222-8222-222222222222', 'OPS'),
  ('33333333-3333-4333-8333-333333333333', 'READ_ONLY')
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Players
-- ---------------------------------------------------------------------------
insert into public.players (
  license_uuid,
  hostname,
  dealer_alias,
  site_alias,
  license_type,
  screen,
  dashboard_url,
  mesh_device_id,
  mesh_url,
  tags
)
values
  (
    '90000000-0000-4000-8000-000000000001',
    'ops-lobby-01',
    'Metro Screens',
    'Cebu HQ',
    'PRO',
    'Main Lobby Wall',
    'https://dashboard.ntv360.local/players/ops-lobby-01',
    'mesh-ops-lobby-01',
    'https://mesh.ntv360.local/device/mesh-ops-lobby-01',
    array['install', 'priority', 'indoor']
  ),
  (
    '90000000-0000-4000-8000-000000000002',
    'ops-cafe-02',
    'Metro Screens',
    'Ayala Food Hall',
    'LITE',
    'Menu Board Pair',
    'https://dashboard.ntv360.local/players/ops-cafe-02',
    'mesh-ops-cafe-02',
    'https://mesh.ntv360.local/device/mesh-ops-cafe-02',
    array['install', 'outdoor-facing']
  ),
  (
    '90000000-0000-4000-8000-000000000003',
    'ops-hotel-03',
    'Vismin Media',
    'Mactan Hotel',
    'PRO',
    'Reception Kiosk',
    'https://dashboard.ntv360.local/players/ops-hotel-03',
    'mesh-ops-hotel-03',
    'https://mesh.ntv360.local/device/mesh-ops-hotel-03',
    array['incident', 'vip']
  ),
  (
    '90000000-0000-4000-8000-000000000004',
    'ops-mall-04',
    'Vismin Media',
    'SM North Wing',
    'PRO',
    'Atrium LED',
    'https://dashboard.ntv360.local/players/ops-mall-04',
    'mesh-ops-mall-04',
    'https://mesh.ntv360.local/device/mesh-ops-mall-04',
    array['incident', 'critical']
  ),
  (
    '90000000-0000-4000-8000-000000000005',
    'ops-clinic-05',
    'Health Ads',
    'Fuente Clinic',
    'LITE',
    'Waiting Area Screen',
    'https://dashboard.ntv360.local/players/ops-clinic-05',
    'mesh-ops-clinic-05',
    'https://mesh.ntv360.local/device/mesh-ops-clinic-05',
    array['task', 'maintenance']
  ),
  (
    '90000000-0000-4000-8000-000000000006',
    'ops-campus-06',
    'Campus Media',
    'University Walk',
    'PRO',
    'Student Commons',
    'https://dashboard.ntv360.local/players/ops-campus-06',
    'mesh-ops-campus-06',
    'https://mesh.ntv360.local/device/mesh-ops-campus-06',
    array['install', 'staging']
  )
on conflict (license_uuid) do nothing;

-- ---------------------------------------------------------------------------
-- Work items
-- ---------------------------------------------------------------------------
insert into public.work_items (
  work_id,
  type,
  status,
  priority,
  assignee_user_id,
  scheduled_for,
  sla_due,
  summary,
  description,
  blocked_reason_code,
  blocked_reason_detail,
  verified_at,
  closed_at,
  created_at,
  updated_at
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    'INSTALL',
    'NEW',
    2,
    '11111111-1111-4111-8111-111111111111',
    now() + interval '4 hours',
    now() + interval '12 hours',
    'Cebu HQ lobby player replacement',
    'Replace the offline lobby unit and validate Dashboard + MeshCentral connectivity before handoff.',
    null,
    null,
    null,
    null,
    now() - interval '3 hours',
    now() - interval '45 minutes'
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    'INSTALL',
    'SCHEDULED',
    1,
    '22222222-2222-4222-8222-222222222222',
    now() + interval '1 day',
    now() + interval '1 day 6 hours',
    'Ayala food hall dual-screen onboarding',
    'Bring two new menu boards online and confirm content sync with the client playlist.',
    null,
    null,
    null,
    null,
    now() - interval '18 hours',
    now() - interval '30 minutes'
  ),
  (
    '70000000-0000-4000-8000-000000000003',
    'INSTALL',
    'BLOCKED',
    1,
    '22222222-2222-4222-8222-222222222222',
    now() + interval '2 days',
    now() + interval '2 days 8 hours',
    'University commons pilot install',
    'Pilot screen is staged but cannot be completed until the venue grants VLAN access.',
    'SITE_ACCESS',
    'Venue contact has not yet approved after-hours cabinet access.',
    null,
    null,
    now() - interval '2 days',
    now() - interval '20 minutes'
  ),
  (
    '70000000-0000-4000-8000-000000000004',
    'INSTALL',
    'VERIFIED',
    3,
    '11111111-1111-4111-8111-111111111111',
    now() - interval '3 days',
    now() - interval '2 days 12 hours',
    'Mactan reception kiosk refresh',
    'Completed kiosk refresh and verified the scheduled campaign handover.',
    null,
    null,
    now() - interval '30 hours',
    null,
    now() - interval '4 days',
    now() - interval '30 hours'
  ),
  (
    '70000000-0000-4000-8000-000000000005',
    'INCIDENT',
    'NEW',
    1,
    '11111111-1111-4111-8111-111111111111',
    null,
    now() + interval '2 hours',
    'SM atrium LED offline during morning rotation',
    'Investigate display heartbeat failure and restore the player before midday campaign start.',
    null,
    null,
    null,
    null,
    now() - interval '2 hours',
    now() - interval '15 minutes'
  ),
  (
    '70000000-0000-4000-8000-000000000006',
    'INCIDENT',
    'IN_PROGRESS',
    2,
    '22222222-2222-4222-8222-222222222222',
    now() + interval '45 minutes',
    now() + interval '6 hours',
    'Hotel kiosk content freeze after reboot',
    'Remote session is active. Validate storage health and recover the campaign cache.',
    null,
    null,
    null,
    null,
    now() - interval '7 hours',
    now() - interval '10 minutes'
  ),
  (
    '70000000-0000-4000-8000-000000000007',
    'INCIDENT',
    'CLOSED',
    4,
    '11111111-1111-4111-8111-111111111111',
    now() - interval '2 days',
    now() - interval '2 days',
    'Clinic waiting area schedule drift',
    'Time sync was corrected and campaign playback was verified with the site contact.',
    null,
    null,
    null,
    now() - interval '1 day',
    now() - interval '3 days',
    now() - interval '1 day'
  ),
  (
    '70000000-0000-4000-8000-000000000008',
    'TASK',
    'IN_PROGRESS',
    3,
    '22222222-2222-4222-8222-222222222222',
    now() + interval '8 hours',
    now() + interval '1 day',
    'Quarterly preventive maintenance sweep',
    'Run a preventive maintenance checklist on lower-priority player inventory before the weekend.',
    null,
    null,
    null,
    null,
    now() - interval '1 day',
    now() - interval '5 minutes'
  )
on conflict (work_id) do nothing;

-- ---------------------------------------------------------------------------
-- Work ↔ player links
-- ---------------------------------------------------------------------------
insert into public.work_item_players (work_id, license_uuid)
values
  ('70000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000002'),
  ('70000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000006'),
  ('70000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000006'),
  ('70000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000003'),
  ('70000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000004'),
  ('70000000-0000-4000-8000-000000000006', '90000000-0000-4000-8000-000000000003'),
  ('70000000-0000-4000-8000-000000000007', '90000000-0000-4000-8000-000000000005'),
  ('70000000-0000-4000-8000-000000000008', '90000000-0000-4000-8000-000000000005')
on conflict (work_id, license_uuid) do nothing;

-- ---------------------------------------------------------------------------
-- Work history / notes
-- ---------------------------------------------------------------------------
insert into public.work_events (
  event_id,
  work_id,
  event_type,
  payload,
  created_by,
  created_at
)
values
  (
    '80000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    'NOTE_ADDED',
    '{"text":"Replacement hardware is staged at Cebu HQ and ready for dispatch."}',
    '11111111-1111-4111-8111-111111111111',
    now() - interval '2 hours'
  ),
  (
    '80000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000002',
    'STATUS_CHANGED',
    '{"from_status":"NEW","to_status":"SCHEDULED","reason":"Client confirmed installation window."}',
    '22222222-2222-4222-8222-222222222222',
    now() - interval '6 hours'
  ),
  (
    '80000000-0000-4000-8000-000000000003',
    '70000000-0000-4000-8000-000000000003',
    'NOTE_ADDED',
    '{"text":"Site contact asked to reschedule after access badges are reactivated."}',
    '22222222-2222-4222-8222-222222222222',
    now() - interval '45 minutes'
  ),
  (
    '80000000-0000-4000-8000-000000000004',
    '70000000-0000-4000-8000-000000000004',
    'STATUS_CHANGED',
    '{"from_status":"IN_PROGRESS","to_status":"VERIFIED","reason":"Campaign playback validated on-site."}',
    '11111111-1111-4111-8111-111111111111',
    now() - interval '30 hours'
  ),
  (
    '80000000-0000-4000-8000-000000000005',
    '70000000-0000-4000-8000-000000000005',
    'NOTE_ADDED',
    '{"text":"Heartbeat dropped at 09:12. Waiting for remote session approval from mall IT."}',
    '11111111-1111-4111-8111-111111111111',
    now() - interval '70 minutes'
  ),
  (
    '80000000-0000-4000-8000-000000000006',
    '70000000-0000-4000-8000-000000000006',
    'STATUS_CHANGED',
    '{"from_status":"NEW","to_status":"IN_PROGRESS","reason":"MeshCentral session started by ops."}',
    '22222222-2222-4222-8222-222222222222',
    now() - interval '4 hours'
  ),
  (
    '80000000-0000-4000-8000-000000000007',
    '70000000-0000-4000-8000-000000000007',
    'STATUS_CHANGED',
    '{"from_status":"VERIFIED","to_status":"CLOSED","reason":"Site contact confirmed stable playback for 24 hours."}',
    '11111111-1111-4111-8111-111111111111',
    now() - interval '1 day'
  ),
  (
    '80000000-0000-4000-8000-000000000008',
    '70000000-0000-4000-8000-000000000008',
    'NOTE_ADDED',
    '{"text":"Start with the clinic and campus units before the Friday content push."}',
    '22222222-2222-4222-8222-222222222222',
    now() - interval '3 hours'
  )
on conflict (event_id) do nothing;

-- ---------------------------------------------------------------------------
-- External references
-- ---------------------------------------------------------------------------
insert into public.external_refs (
  external_ref_id,
  system,
  external_id,
  url,
  license_uuid,
  work_id,
  created_at
)
values
  (
    '60000000-0000-4000-8000-000000000001',
    'DASHBOARD',
    'ops-lobby-01',
    'https://dashboard.ntv360.local/players/ops-lobby-01',
    '90000000-0000-4000-8000-000000000001',
    null,
    now() - interval '7 days'
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    'MESHCENTRAL',
    'mesh-ops-lobby-01',
    'https://mesh.ntv360.local/device/mesh-ops-lobby-01',
    '90000000-0000-4000-8000-000000000001',
    null,
    now() - interval '7 days'
  ),
  (
    '60000000-0000-4000-8000-000000000003',
    'SHEETS',
    'install-seed-001',
    'https://docs.google.com/spreadsheets/d/local-seed-install-001',
    null,
    '70000000-0000-4000-8000-000000000001',
    now() - interval '2 days'
  ),
  (
    '60000000-0000-4000-8000-000000000004',
    'HUBSPOT',
    'incident-seed-001',
    'https://app.hubspot.com/contacts/local-seed-incident-001',
    null,
    '70000000-0000-4000-8000-000000000005',
    now() - interval '2 hours'
  )
on conflict (external_ref_id) do nothing;
