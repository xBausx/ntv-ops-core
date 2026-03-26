export type WorkItem = {
  work_id: string;
  type: 'INSTALL' | 'INCIDENT' | 'TASK';
  status: string;
  priority: number;

  assignee_user_id: string | null;

  scheduled_for: string | null;
  sla_due: string | null;

  summary: string;
  description: string | null;

  blocked_reason_code: string | null;
  blocked_reason_detail: string | null;

  verified_at: string | null;
  closed_at: string | null;

  created_at: string;
  updated_at: string;
};

export type WorkEvent = {
  event_id: string;
  work_id: string;
  event_type: string;
  payload: any;
  created_by: string | null;
  created_at: string;
};

export type LinkedPlayer = {
  license_uuid: string;
  hostname: string | null;
  site_alias: string | null;
  dealer_alias: string | null;
  dashboard_url: string | null;
  mesh_url: string | null;
};

export const WORK_STATUSES = [
  'NEW',
  'SCHEDULED',
  'IN_PROGRESS',
  'BLOCKED',
  'VERIFIED',
  'CLOSED',
] as const;

export const CLIENT_EDITABLE_WORK_STATUSES = [
  'NEW',
  'SCHEDULED',
  'IN_PROGRESS',
  'BLOCKED',
] as const;

export type WorkDetailCacheState = {
  workItem: WorkItem | null;
  events: WorkEvent[];
  players: LinkedPlayer[];
  userRole: string;
  authHint: boolean;
  needsProvisioning: boolean;
};