import { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase.client';

/**
 * NOTE:
 * We’re intentionally keeping this as a thin wrapper so:
 * - Features don’t duplicate Supabase wiring
 * - We can later swap to generated DB types (supabase gen types typescript)
 */

export type QueueStatus = 'NEW' | 'SCHEDULED' | 'IN_PROGRESS' | 'BLOCKED' | 'VERIFIED' | 'CLOSED';
export type WorkType = 'INSTALL' | 'INCIDENT' | 'TASK';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface InstallQueueRow {
  work_id: string;
  type: WorkType;
  status: QueueStatus;
  priority: Priority;
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

  players_count: number | null;
  license_uuids: string[]; // uuid[] comes back as string[]
  hostnames: string[];
  dealer_aliases: string[];
  site_aliases: string[];

  primary_license_uuid: string | null;
  primary_hostname: string | null;
  primary_dealer_alias: string | null;
  primary_site_alias: string | null;
  primary_dashboard_url: string | null;
  primary_mesh_device_id: string | null;
  primary_mesh_url: string | null;
}

export type IncidentQueueRow = InstallQueueRow;

export interface PlayerRow {
  license_uuid: string;
  hostname: string | null;
  dealer_alias: string | null;
  site_alias: string | null;
  license_type: string | null;
  screen: string | null;
  dashboard_url: string | null;
  mesh_device_id: string | null;
  mesh_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface WorkItemRow {
  work_id: string;
  type: WorkType;
  status: QueueStatus;
  priority: Priority;
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
}

export interface WorkEventRow {
  event_id: string;
  work_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

function isUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );
}

function throwIfError(error: PostgrestError | null, context: string): void {
  if (!error) return;
  throw new Error(`${context}: ${error.message}${error.details ? ` (${error.details})` : ''}`);
}

/** ---------------------------
 *  Queues (Views)
 *  ---------------------------
 */

export async function fetchInstallQueue(params?: {
  limit?: number;
  status?: QueueStatus;
  assigneeUserId?: string | null;
  scheduledFrom?: string; // ISO date-time
  scheduledTo?: string; // ISO date-time
}): Promise<InstallQueueRow[]> {
  const supabase = getSupabaseClient();

  let q = supabase
    .from('v_install_queue')
    .select('*')
    .order('created_at', { ascending: false });

  if (params?.status) q = q.eq('status', params.status);
  if (params?.assigneeUserId === null) q = q.is('assignee_user_id', null);
  if (params?.assigneeUserId) q = q.eq('assignee_user_id', params.assigneeUserId);
  if (params?.scheduledFrom) q = q.gte('scheduled_for', params.scheduledFrom);
  if (params?.scheduledTo) q = q.lte('scheduled_for', params.scheduledTo);
  if (params?.limit) q = q.limit(params.limit);

  const { data, error } = await q;
  throwIfError(error, 'fetchInstallQueue failed');

  return (data ?? []) as InstallQueueRow[];
}

export async function fetchIncidentQueue(params?: {
  limit?: number;
  status?: QueueStatus;
  assigneeUserId?: string | null;
  slaDueBefore?: string; // ISO date-time
}): Promise<IncidentQueueRow[]> {
  const supabase = getSupabaseClient();

  let q = supabase
    .from('v_incident_queue')
    .select('*')
    .order('created_at', { ascending: false });

  if (params?.status) q = q.eq('status', params.status);
  if (params?.assigneeUserId === null) q = q.is('assignee_user_id', null);
  if (params?.assigneeUserId) q = q.eq('assignee_user_id', params.assigneeUserId);
  if (params?.slaDueBefore) q = q.lte('sla_due', params.slaDueBefore);
  if (params?.limit) q = q.limit(params.limit);

  const { data, error } = await q;
  throwIfError(error, 'fetchIncidentQueue failed');

  return (data ?? []) as IncidentQueueRow[];
}

/** ---------------------------
 *  Players
 *  ---------------------------
 */

export async function getPlayerByLicenseUuid(licenseUuid: string): Promise<PlayerRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('license_uuid', licenseUuid)
    .maybeSingle();

  throwIfError(error, 'getPlayerByLicenseUuid failed');
  return (data ?? null) as PlayerRow | null;
}

export async function searchPlayers(params: { query: string; limit?: number }): Promise<PlayerRow[]> {
  const supabase = getSupabaseClient();
  const raw = (params.query ?? '').trim();
  const limit = params.limit ?? 25;

  if (!raw) return [];

  // If it’s a UUID, do a direct hit
  if (isUuid(raw)) {
    const { data, error } = await supabase.from('players').select('*').eq('license_uuid', raw).limit(1);
    throwIfError(error, 'searchPlayers(uuid) failed');
    return (data ?? []) as PlayerRow[];
  }

  // Otherwise search common text fields.
  // PostgREST `or()` syntax: "col.ilike.%term%,col2.ilike.%term%"
  const term = `%${raw}%`;
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .or(
      [
        `hostname.ilike.${term}`,
        `dealer_alias.ilike.${term}`,
        `site_alias.ilike.${term}`,
        `license_type.ilike.${term}`,
      ].join(',')
    )
    .order('updated_at', { ascending: false })
    .limit(limit);

  throwIfError(error, 'searchPlayers(text) failed');
  return (data ?? []) as PlayerRow[];
}

/** ---------------------------
 *  Work Items + Events
 *  ---------------------------
 */

export async function getWorkItem(workId: string): Promise<WorkItemRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from('work_items').select('*').eq('work_id', workId).maybeSingle();
  throwIfError(error, 'getWorkItem failed');

  return (data ?? null) as WorkItemRow | null;
}

export async function getWorkEvents(workId: string, limit = 100): Promise<WorkEventRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('work_events')
    .select('*')
    .eq('work_id', workId)
    .order('created_at', { ascending: false })
    .limit(limit);

  throwIfError(error, 'getWorkEvents failed');
  return (data ?? []) as WorkEventRow[];
}