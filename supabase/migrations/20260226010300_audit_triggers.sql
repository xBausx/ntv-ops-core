-- Audit + status automation for Ops Core
-- - Append WORK_ITEM_CREATED event on insert
-- - Append STATUS_CHANGED event on status transition
-- - Auto-stamp verified_at / closed_at on transitions

-- =========================
-- Trigger functions
-- =========================

create or replace function public.trg_work_items_audit_created()
returns trigger
language plpgsql
as $$
begin
  insert into public.work_events (work_id, event_type, payload, created_by)
  values (
    new.work_id,
    'WORK_ITEM_CREATED',
    jsonb_build_object(
      'type', new.type,
      'status', new.status,
      'priority', new.priority,
      'summary', new.summary,
      'scheduled_for', new.scheduled_for,
      'sla_due', new.sla_due
    ),
    auth.uid()
  );

  return new;
end;
$$;

create or replace function public.trg_work_items_audit_status_changed()
returns trigger
language plpgsql
as $$
declare
  now_ts timestamptz := now();
begin
  -- Only act when status changes
  if new.status is distinct from old.status then

    -- Stamp verified_at when entering VERIFIED (only if not already set)
    if new.status = 'VERIFIED' and new.verified_at is null then
      new.verified_at := now_ts;
    end if;

    -- Stamp closed_at when entering CLOSED (only if not already set)
    if new.status = 'CLOSED' and new.closed_at is null then
      new.closed_at := now_ts;
    end if;

    insert into public.work_events (work_id, event_type, payload, created_by)
    values (
      new.work_id,
      'STATUS_CHANGED',
      jsonb_build_object(
        'from', old.status,
        'to', new.status,
        'blocked_reason_code', new.blocked_reason_code,
        'blocked_reason_detail', new.blocked_reason_detail,
        'assignee_user_id', new.assignee_user_id,
        'scheduled_for', new.scheduled_for,
        'sla_due', new.sla_due
      ),
      auth.uid()
    );

  end if;

  return new;
end;
$$;

-- =========================
-- Triggers
-- =========================

drop trigger if exists trg_work_items_audit_created on public.work_items;
create trigger trg_work_items_audit_created
after insert on public.work_items
for each row
execute function public.trg_work_items_audit_created();

drop trigger if exists trg_work_items_audit_status_changed on public.work_items;
create trigger trg_work_items_audit_status_changed
before update on public.work_items
for each row
execute function public.trg_work_items_audit_status_changed();