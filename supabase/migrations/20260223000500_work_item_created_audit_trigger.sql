-- Phase 1.x — Audit integrity: automatically log WORK_ITEM_CREATED events on insert

create or replace function public.log_work_item_created()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.work_events (
    work_id,
    event_type,
    payload,
    created_by,
    created_at
  )
  values (
    new.work_id,
    'WORK_ITEM_CREATED',
    jsonb_build_object(
      'type', new.type,
      'status', new.status,
      'priority', new.priority,
      'summary', new.summary,
      'scheduled_for', new.scheduled_for,
      'assignee_user_id', new.assignee_user_id
    ),
    auth.uid(),
    now()
  );

  return new;
end;
$$;

drop trigger if exists trg_work_items_audit_created on public.work_items;
create trigger trg_work_items_audit_created
after insert on public.work_items
for each row
execute function public.log_work_item_created();