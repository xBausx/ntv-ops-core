-- Phase 1.x — Queue views (Install Queue)
-- One row per INSTALL work item, with aggregated player info for fast queue rendering.

create or replace view public.v_install_queue as
select
  w.work_id,
  w.type,
  w.status,
  w.priority,
  w.assignee_user_id,
  w.scheduled_for,
  w.sla_due,
  w.summary,
  w.description,
  w.blocked_reason_code,
  w.blocked_reason_detail,
  w.verified_at,
  w.closed_at,
  w.created_at,
  w.updated_at,

  -- Aggregates
  p.players_count,
  coalesce(p.license_uuids, '{}'::uuid[])    as license_uuids,
  coalesce(p.hostnames, '{}'::text[])        as hostnames,
  coalesce(p.dealer_aliases, '{}'::text[])   as dealer_aliases,
  coalesce(p.site_aliases, '{}'::text[])     as site_aliases,

  -- "Primary" (first by license_uuid) — convenient for queue display
  p.primary_license_uuid,
  p.primary_hostname,
  p.primary_dealer_alias,
  p.primary_site_alias,
  p.primary_dashboard_url,
  p.primary_mesh_device_id,
  p.primary_mesh_url

from public.work_items w
left join lateral (
  select
    count(*)::int as players_count,

    array_agg(wip.license_uuid order by wip.license_uuid) as license_uuids,
    array_agg(pl.hostname order by wip.license_uuid)      as hostnames,
    array_agg(pl.dealer_alias order by wip.license_uuid)  as dealer_aliases,
    array_agg(pl.site_alias order by wip.license_uuid)    as site_aliases,

    (array_agg(wip.license_uuid order by wip.license_uuid))[1] as primary_license_uuid,
    (array_agg(pl.hostname order by wip.license_uuid))[1]      as primary_hostname,
    (array_agg(pl.dealer_alias order by wip.license_uuid))[1]  as primary_dealer_alias,
    (array_agg(pl.site_alias order by wip.license_uuid))[1]    as primary_site_alias,
    (array_agg(pl.dashboard_url order by wip.license_uuid))[1] as primary_dashboard_url,
    (array_agg(pl.mesh_device_id order by wip.license_uuid))[1] as primary_mesh_device_id,
    (array_agg(pl.mesh_url order by wip.license_uuid))[1]      as primary_mesh_url
  from public.work_item_players wip
  join public.players pl
    on pl.license_uuid = wip.license_uuid
  where wip.work_id = w.work_id
) p on true
where w.type = 'INSTALL';

-- Allow app access to the view (RLS still applies via base tables)
grant select on public.v_install_queue to authenticated;