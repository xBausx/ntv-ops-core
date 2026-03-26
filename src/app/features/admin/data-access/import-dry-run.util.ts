/** Local Imports */
import {
  IMPORT_ALLOWED_SOURCE_EXTENSIONS,
  IMPORT_STATUS_MAP,
  type ImportPreviewRow,
  type ImportPreviewSummary,
  type ImportSourceRow,
  type ImportValidationIssue,
} from '../models/import.models';

export type ImportDryRunResult = {
  previewRows: ImportPreviewRow[];
  issues: ImportValidationIssue[];
  summary: ImportPreviewSummary;
};

/**
 * Extracts the lowercase file extension from a selected source filename.
 *
 * @param fileName Source filename provided by the browser file picker.
 * @returns Lowercase extension including the leading period, or an empty string when no extension exists.
 */
export function getImportFileExtension(fileName: string): string {
  const normalizedFileName = fileName.trim().toLowerCase();
  const lastDotIndex = normalizedFileName.lastIndexOf('.');

  if (lastDotIndex < 0) return '';

  return normalizedFileName.slice(lastDotIndex);
}

/**
 * Checks whether the selected file extension is allowed by the current bootstrap import page.
 *
 * @param extension Lowercase extension including the leading period.
 * @returns True when the extension is one of the allowed source file types.
 */
export function isAllowedImportFileExtension(extension: string): boolean {
  return IMPORT_ALLOWED_SOURCE_EXTENSIONS.includes(
    extension as (typeof IMPORT_ALLOWED_SOURCE_EXTENSIONS)[number],
  );
}

/**
 * Runs the current browser-side CSV dry run flow end to end.
 *
 * @param text Raw CSV file contents.
 * @returns Preview rows, validation issues, and summary counts derived from the source file.
 */
export function runCsvImportDryRun(text: string): ImportDryRunResult {
  const parsedRows = parseCsvText(text);
  const sourceRows = mapImportSourceRows(parsedRows);
  const issues = validateImportSourceRows(sourceRows);
  const previewRows = buildImportPreviewRows(sourceRows, issues);

  return {
    previewRows,
    issues,
    summary: {
      totalRows: previewRows.length,
      validRows: previewRows.filter((row) => row.canImport).length,
      errorCount: issues.filter((issue) => issue.level === 'error').length,
      warningCount: issues.filter((issue) => issue.level === 'warning').length,
    },
  };
}

/**
 * Parses CSV text into rows while supporting quoted values, escaped quotes, and CRLF or LF line endings.
 *
 * @param text Raw CSV content from the selected file.
 * @returns Parsed rows in source order, excluding fully empty rows.
 */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let currentCell = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') index += 1;

      currentRow.push(currentCell.trim());
      currentCell = '';

      if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);

      currentRow = [];
      continue;
    }

    currentCell += character;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());

    if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);
  }

  return rows;
}

/**
 * Maps raw parsed CSV rows into the canonical bootstrap import row shape.
 * Missing headers resolve to empty strings so downstream validation can report row-level issues cleanly.
 *
 * @param rows Parsed CSV rows including the header row at index zero.
 * @returns Canonical import rows aligned to the original source line numbers.
 */
export function mapImportSourceRows(rows: string[][]): ImportSourceRow[] {
  const [headerRow = [], ...dataRows] = rows;
  const normalizedHeaders = headerRow.map((value) => value.trim().toLowerCase());

  const getValue = (row: string[], header: string): string => {
    const headerIndex = normalizedHeaders.indexOf(header);
    return headerIndex >= 0 ? (row[headerIndex] ?? '').trim() : '';
  };

  return dataRows.map((row, index) => ({
    rowNumber: index + 2,
    license_uuid: getValue(row, 'license_uuid'),
    hostname: getValue(row, 'hostname'),
    dealer_alias: getValue(row, 'dealer_alias'),
    site_alias: getValue(row, 'site_alias'),
    scheduled_for: getValue(row, 'scheduled_for'),
    status: getValue(row, 'status'),
    summary: getValue(row, 'summary'),
    dashboard_url: getValue(row, 'dashboard_url'),
    mesh_device_id: getValue(row, 'mesh_device_id'),
    mesh_url: getValue(row, 'mesh_url'),
    blocked_reason_code: getValue(row, 'blocked_reason_code'),
    blocked_reason_detail: getValue(row, 'blocked_reason_detail'),
  }));
}

/**
 * Applies the current browser-side validation rules to canonical import rows.
 *
 * @param rows Canonical import rows created from the selected CSV file.
 * @returns Validation issues for required fields, status normalization, and warning-only checks.
 */
export function validateImportSourceRows(rows: ImportSourceRow[]): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = [];

  for (const row of rows) {
    if (!row.license_uuid) {
      issues.push({
        rowNumber: row.rowNumber,
        field: 'license_uuid',
        level: 'error',
        message: 'license_uuid is required.',
      });
    }

    if (!row.summary) {
      issues.push({
        rowNumber: row.rowNumber,
        field: 'summary',
        level: 'error',
        message: 'summary is required.',
      });
    }

    const normalizedStatus = normalizeImportStatus(row.status);

    if (!normalizedStatus) {
      issues.push({
        rowNumber: row.rowNumber,
        field: 'status',
        level: 'error',
        message: `Status "${row.status || '(empty)'}" is not recognized.`,
      });
    }

    if (normalizedStatus === 'BLOCKED' && !row.blocked_reason_code) {
      issues.push({
        rowNumber: row.rowNumber,
        field: 'blocked_reason_code',
        level: 'warning',
        message: 'BLOCKED rows should include a blocked_reason_code.',
      });
    }
  }

  return issues;
}

/**
 * Builds preview rows for the UI and marks rows as importable only when they have no validation errors.
 *
 * @param rows Canonical import rows.
 * @param issues Validation issues generated for the same row set.
 * @returns Preview rows containing normalized status and import eligibility.
 */
export function buildImportPreviewRows(
  rows: ImportSourceRow[],
  issues: ImportValidationIssue[],
): ImportPreviewRow[] {
  const errorRowNumbers = new Set(
    issues.filter((issue) => issue.level === 'error').map((issue) => issue.rowNumber),
  );

  return rows.map((row) => {
    const normalizedStatus = normalizeImportStatus(row.status);

    return {
      ...row,
      normalized_status: normalizedStatus,
      canImport: !errorRowNumbers.has(row.rowNumber) && normalizedStatus !== '',
    };
  });
}

/**
 * Normalizes a legacy source status into the canonical Ops Core preview status.
 *
 * @param value Raw status text from the source file.
 * @returns Canonical status when recognized, otherwise an empty string.
 */
export function normalizeImportStatus(value: string): ImportPreviewRow['normalized_status'] {
  const normalizedKey = value.trim().toLowerCase();
  return IMPORT_STATUS_MAP[normalizedKey] ?? '';
}