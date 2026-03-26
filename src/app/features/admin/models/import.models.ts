export type ImportSourceRow = {
  rowNumber: number;
  license_uuid: string;
  hostname: string;
  dealer_alias: string;
  site_alias: string;
  scheduled_for: string;
  status: string;
  summary: string;
  dashboard_url: string;
  mesh_device_id: string;
  mesh_url: string;
  blocked_reason_code: string;
  blocked_reason_detail: string;
};

export type ImportValidationLevel = 'error' | 'warning';

export type ImportValidationIssue = {
  rowNumber: number;
  field: keyof ImportSourceRow | 'row';
  level: ImportValidationLevel;
  message: string;
};

export type ImportPreviewRow = ImportSourceRow & {
  normalized_status: 'NEW' | 'SCHEDULED' | 'IN_PROGRESS' | 'BLOCKED' | 'VERIFIED' | 'CLOSED' | '';
  canImport: boolean;
};

export type ImportPreviewSummary = {
  totalRows: number;
  validRows: number;
  errorCount: number;
  warningCount: number;
};

export const IMPORT_ALLOWED_SOURCE_EXTENSIONS = ['.xlsx', '.xls', '.csv'] as const;

export const IMPORT_STATUS_MAP: Record<string, ImportPreviewRow['normalized_status']> = {
  new: 'NEW',
  planned: 'NEW',
  queued: 'NEW',
  pending: 'NEW',

  scheduled: 'SCHEDULED',
  booked: 'SCHEDULED',

  in_progress: 'IN_PROGRESS',
  'in progress': 'IN_PROGRESS',
  working: 'IN_PROGRESS',
  ongoing: 'IN_PROGRESS',
  'on-going': 'IN_PROGRESS',

  blocked: 'BLOCKED',
  hold: 'BLOCKED',
  waiting: 'BLOCKED',

  verified: 'VERIFIED',

  closed: 'CLOSED',
  complete: 'CLOSED',
  completed: 'CLOSED',
  done: 'CLOSED',
};

export const CLIENT_IMPORT_START_STATUSES = ['NEW', 'SCHEDULED', 'IN_PROGRESS', 'BLOCKED'] as const;