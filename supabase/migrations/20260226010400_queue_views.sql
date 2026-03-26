-- Queue-friendly views for Ops Core
-- These power the UI lists without heavy client joins.

-- Helper: aggregated player info per work item
create or replace view public.v_work_item_player_agg as
select
  wip.work_id,
  count(*)::int as player_count,

  (array_agg(distinct p.license_uuid order by p.license_uuid))[1] as primary_license_uuid,
  min(p.hostname) filter (where p.hostname is not null) as primary_hostname,
  min(p.site_alias) filter (where p.site_alias is not null) as primary_site_alias,
  min(p.dealer_alias) filter (where p.dealer_alias is not null) as primary_dealer_alias,

  array_agg(distinct p.license_uuid order by p.license_uuid) as license_uuids,
  array_agg(distinct p.hostname order by p.hostname) filter (where p.hostname is not null) as hostnames,
  array_agg(distinct p.site_alias order by p.site_alias) filter (where p.site_alias is not null) as site_aliases,
  array_agg(distinct p.dealer_alias order by p.dealer_alias) filter (where p.dealer_alias is not null) as dealer_aliases
from public.work_item_players wip
join public.players p on p.license_uuid = wip.license_uuid
group by wip.work_id;

-- Install queue view
create or replace view public.v_install_queue as
select
  wi.work_id,
  wi.type,
  wi.status,
  wi.priority,
  wi.assignee_user_id,
  wi.scheduled_for,
  wi.sla_due,
  wi.summary,
  wi.description,
  wi.blocked_reason_code,
  wi.blocked_reason_detail,
  wi.verified_at,
  wi.closed_at,
  wi.created_at,
  wi.updated_at,

  coalesce(agg.player_count, 0) as player_count,
  agg.primary_license_uuid,
  agg.primary_hostname,
  agg.primary_site_alias,
  agg.primary_dealer_alias,
  agg.license_uuids,
  agg.hostnames,
  agg.site_aliases,
  agg.dealer_aliases
from public.work_items wi
left join public.v_work_item_player_agg agg on agg.work_id = wi.work_id
where wi.type = 'INSTALL';

-- Incident queue view
create or replace view public.v_incident_queue as
select
  wi.work_id,
  wi.type,
  wi.status,
  wi.priority,
  wi.assignee_user_id,
  wi.scheduled_for,
  wi.sla_due,
  wi.summary,
  wi.description,
  wi.blocked_reason_code,
  wi.blocked_reason_detail,
  wi.verified_at,
  wi.closed_at,
  wi.created_at,
  wi.updated_at,

  coalesce(agg.player_count, 0) as player_count,
  agg.license_uuids,
  agg.hostnames,
  agg.site_aliases,
  agg.dealer_aliases
from public.work_items wi
left join public.v_work_item_player_agg agg on agg.work_id = wi.work_id
where wi.type = 'INCIDENT';

-- Index hints (views can't be indexed directly; ensure underlying tables support common filters)
-- Primary filters: type/status/priority/scheduled_for/sla_due handled via work_items indexes in core schema.