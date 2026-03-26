export type InstallQueueRow = {
  work_id: string;
  type: 'INSTALL';
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

  player_count: number;
  license_uuids: string[] | null;
  hostnames: string[] | null;
  site_aliases: string[] | null;
  dealer_aliases: string[] | null;
};

export type InstallQueueTableRow = InstallQueueRow & {
  hostnames_display: string;
  site_display: string;
  dealer_display: string;
};

export const INSTALL_WORK_STATUSES = [
  'NEW',
  'SCHEDULED',
  'IN_PROGRESS',
  'BLOCKED',
  'VERIFIED',
  'CLOSED',
] as const;

export const CLIENT_CREATABLE_INSTALL_STATUSES = [
  'NEW',
  'SCHEDULED',
  'IN_PROGRESS',
  'BLOCKED',
] as const;

export type InstallCacheState = {
  rows: InstallQueueRow[];
  currentPage: number;
  hasMore: boolean;
  userEmail: string;
  userId: string;
  userRole: string;
};