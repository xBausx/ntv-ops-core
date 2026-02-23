-- Phase 1.x — Audit integrity: automatically log STATUS_CHANGED events
-- Also sets verified_at / closed_at when moving into VERIFIED / CLOSED.

-- -----------------------------------------------------------------------------
-- Before-update: set status timestamps (VERIFIED/CLOSED) deterministically
-- -----------------------------------------------------------------------------
create or replace function public.set_work_item_status_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Only act when status actually changes
  if new.status is distinct from old.status then
    if new.status = 'VERIFIED' then
      new.verified_at = coalesce(new.verified_at, now());
    end if;

    if new.status = 'CLOSED' then
      new.closed_at = coalesce(new.closed_at, now());
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_work_items_set_status_timestamps on public.work_items;
create trigger trg_work_items_set_status_timestamps
before update of status on public.work_items
for each row
execute function public.set_work_item_status_timestamps();

-- -----------------------------------------------------------------------------
-- After-update: append audit event when status changes
-- -----------------------------------------------------------------------------
create or replace function public.log_work_item_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.work_events (
      work_id,
      event_type,
      payload,
      created_by,
      created_at
    )
    values (
      new.work_id,
      'STATUS_CHANGED',
      jsonb_build_object(
        'from_status', old.status,
        'to_status', new.status,
        'changed_fields', jsonb_build_object(
          'blocked_reason_code', jsonb_build_object('from', old.blocked_reason_code, 'to', new.blocked_reason_code),
          'blocked_reason_detail', jsonb_build_object('from', old.blocked_reason_detail, 'to', new.blocked_reason_detail)
        )
      ),
      auth.uid(),
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_work_items_audit_status_changed on public.work_items;
create trigger trg_work_items_audit_status_changed
after update of status on public.work_items
for each row
execute function public.log_work_item_status_change();