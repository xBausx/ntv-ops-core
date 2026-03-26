/** Angular Imports */
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Third Party Imports */
import { Button, Card } from '@ntv360/component-pantry';

/** Local Imports */
import {
  getImportFileExtension,
  isAllowedImportFileExtension,
  runCsvImportDryRun,
} from '../data-access/import-dry-run.util';
import {
  CLIENT_IMPORT_START_STATUSES,
  IMPORT_ALLOWED_SOURCE_EXTENSIONS,
  type ImportPreviewRow,
  type ImportPreviewSummary,
  type ImportValidationIssue,
} from '../models/import.models';

@Component({
  selector: 'app-import-page',
  standalone: true,
  imports: [Card, Button, RouterLink],
  template: `
    <section class="space-y-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <div class="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Admin</div>
          <h1 class="mt-1 page-title">Bootstrap Import</h1>
          <p class="mt-1 max-w-3xl text-sm text-white/60">
            Validate legacy installation-tracker data before it is imported into Ops Core.
          </p>
        </div>

        <a routerLink="/admin" class="text-sm font-semibold text-white/70 underline hover:text-white">
          Back to Admin →
        </a>
      </div>

      @if (errorText()) {
        <ntv-card>
          <div class="rounded-xl border border-red-500/20 bg-red-500/10 p-4 md:p-5">
            <p class="text-sm font-bold text-red-200">Import dry run failed</p>
            <p class="mt-1 whitespace-pre-wrap text-sm text-red-100/80">{{ errorText() }}</p>
          </div>
        </ntv-card>
      }

      @if (infoText()) {
        <ntv-card>
          <div class="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 md:p-5">
            <p class="text-sm font-bold text-blue-200">Import note</p>
            <p class="mt-1 whitespace-pre-wrap text-sm text-blue-100/80">{{ infoText() }}</p>
          </div>
        </ntv-card>
      }

      <ntv-card>
        <div class="p-4 md:p-5">
          <div class="text-sm font-extrabold text-white/80">Source file</div>
          <p class="mt-1 text-sm text-white/60">
            Select an XLSX, XLS, or CSV export from the existing installations workflow.
          </p>

          <div class="mt-4">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              class="block w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white/80
                     file:mr-4 file:rounded-lg file:border file:border-white/10 file:bg-white/[0.08] file:px-3 file:py-2
                     file:text-sm file:font-semibold file:text-white transition hover:file:bg-white/[0.14]"
              (change)="onFileSelected($event)"
            />
          </div>

          @if (selectedFileName()) {
            <div class="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p class="text-sm font-semibold text-white/80">Selected file</p>
              <p class="mt-1 break-all text-sm text-white/90">{{ selectedFileName() }}</p>
              <p class="mt-2 text-xs text-white/45">
                Allowed extensions: {{ allowedExtensionsLabel() }}
              </p>
            </div>
          } @else {
            <div class="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p class="text-sm text-white/60">No file selected yet.</p>
            </div>
          }

          <div class="mt-4 flex flex-wrap gap-2">
            <ntv-button (click)="runDryRun()" [disabled]="!selectedFile() || isRunningDryRun()">
              @if (isRunningDryRun()) {
                Running dry run…
              } @else {
                Run dry run
              }
            </ntv-button>
          </div>
        </div>
      </ntv-card>

      <ntv-card>
        <div class="p-4 md:p-5">
          <div class="text-sm font-extrabold text-white/80">Validation rules</div>
          <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-white/60">
            <li><span class="font-semibold">license_uuid</span> is required.</li>
            <li><span class="font-semibold">summary</span> is required.</li>
            <li>Legacy statuses are normalized into canonical Ops Core statuses.</li>
            <li>
              Client-safe start statuses are
              <span class="font-semibold">{{ clientStartStatusesLabel() }}</span>.
            </li>
            <li>Rows with validation errors are excluded from the future import action.</li>
          </ul>
        </div>
      </ntv-card>

      @if (summary(); as currentSummary) {
        <ntv-card>
          <div class="p-4 md:p-5">
            <div class="text-sm font-extrabold text-white/80">Dry-run summary</div>
            <div class="mt-4 grid gap-3 md:grid-cols-4">
              <div class="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div class="text-xs font-bold uppercase tracking-wide text-white/40">Rows</div>
                <div class="mt-2 text-2xl font-extrabold text-white/90">{{ currentSummary.totalRows }}</div>
              </div>

              <div class="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                <div class="text-xs font-bold uppercase tracking-wide text-blue-200/80">Valid</div>
                <div class="mt-2 text-2xl font-extrabold text-blue-100">{{ currentSummary.validRows }}</div>
              </div>

              <div class="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <div class="text-xs font-bold uppercase tracking-wide text-red-200/80">Errors</div>
                <div class="mt-2 text-2xl font-extrabold text-red-100">{{ currentSummary.errorCount }}</div>
              </div>

              <div class="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div class="text-xs font-bold uppercase tracking-wide text-amber-200/80">Warnings</div>
                <div class="mt-2 text-2xl font-extrabold text-amber-100">{{ currentSummary.warningCount }}</div>
              </div>
            </div>
          </div>
        </ntv-card>
      }

      @if (issues().length > 0) {
        <ntv-card>
          <div class="p-4 md:p-5">
            <div class="text-sm font-extrabold text-white/80">Validation issues</div>
            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="text-left text-white/40">
                  <tr class="border-b border-white/10">
                    <th class="py-3 pr-4 font-semibold">Row</th>
                    <th class="py-3 pr-4 font-semibold">Field</th>
                    <th class="py-3 pr-4 font-semibold">Level</th>
                    <th class="py-3 pr-0 font-semibold">Message</th>
                  </tr>
                </thead>
                <tbody>
                  @for (issue of issues(); track issue.rowNumber + '-' + issue.field + '-' + issue.message) {
                    <tr class="border-b border-white/5">
                      <td class="py-3 pr-4 text-white/80">{{ issue.rowNumber }}</td>
                      <td class="py-3 pr-4 text-white/70">{{ issue.field }}</td>
                      <td class="py-3 pr-4">
                        <span
                          class="inline-flex rounded-full px-2 py-1 text-xs font-bold"
                          [class.bg-red-500/15]="issue.level === 'error'"
                          [class.text-red-200]="issue.level === 'error'"
                          [class.bg-amber-500/15]="issue.level === 'warning'"
                          [class.text-amber-200]="issue.level === 'warning'"
                        >
                          {{ issue.level }}
                        </span>
                      </td>
                      <td class="py-3 pr-0 text-white/70">{{ issue.message }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </ntv-card>
      }

      @if (previewRows().length > 0) {
        <ntv-card>
          <div class="p-4 md:p-5">
            <div class="flex items-center justify-between gap-4">
              <div>
                <div class="text-sm font-extrabold text-white/80">Preview rows</div>
                <p class="mt-1 text-sm text-white/60">
                  Normalized rows that would be used by the future import action.
                </p>
              </div>
              @if (previewRows().length > previewRowsPreview().length) {
                <div class="text-xs font-semibold text-white/40">
                  Showing first {{ previewRowsPreview().length }} rows
                </div>
              }
            </div>

            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="text-left text-white/40">
                  <tr class="border-b border-white/10">
                    <th class="py-3 pr-4 font-semibold">Row</th>
                    <th class="py-3 pr-4 font-semibold">License UUID</th>
                    <th class="py-3 pr-4 font-semibold">Hostname</th>
                    <th class="py-3 pr-4 font-semibold">Dealer</th>
                    <th class="py-3 pr-4 font-semibold">Site</th>
                    <th class="py-3 pr-4 font-semibold">Status</th>
                    <th class="py-3 pr-4 font-semibold">Summary</th>
                    <th class="py-3 pr-0 font-semibold">Importable</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of previewRowsPreview(); track row.rowNumber) {
                    <tr class="border-b border-white/5">
                      <td class="py-3 pr-4 text-white/80">{{ row.rowNumber }}</td>
                      <td class="break-all py-3 pr-4 text-white/80">{{ row.license_uuid || '—' }}</td>
                      <td class="py-3 pr-4 text-white/70">{{ row.hostname || '—' }}</td>
                      <td class="py-3 pr-4 text-white/70">{{ row.dealer_alias || '—' }}</td>
                      <td class="py-3 pr-4 text-white/70">{{ row.site_alias || '—' }}</td>
                      <td class="py-3 pr-4 text-white/70">{{ row.normalized_status || '—' }}</td>
                      <td class="py-3 pr-4 text-white/80">{{ row.summary || '—' }}</td>
                      <td class="py-3 pr-0">
                        <span
                          class="inline-flex rounded-full px-2 py-1 text-xs font-bold"
                          [class.bg-emerald-500/15]="row.canImport"
                          [class.text-emerald-200]="row.canImport"
                          [class.bg-red-500/15]="!row.canImport"
                          [class.text-red-200]="!row.canImport"
                        >
                          {{ row.canImport ? 'Yes' : 'No' }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </ntv-card>
      }
    </section>
  `,
})
export class ImportPageComponent {
  readonly selectedFile = signal<File | null>(null);
  readonly selectedFileName = signal<string>('');
  readonly isRunningDryRun = signal<boolean>(false);
  readonly errorText = signal<string>('');
  readonly infoText = signal<string>('');
  readonly issues = signal<ImportValidationIssue[]>([]);
  readonly previewRows = signal<ImportPreviewRow[]>([]);
  readonly summary = signal<ImportPreviewSummary | null>(null);

  readonly allowedExtensionsLabel = computed(() => IMPORT_ALLOWED_SOURCE_EXTENSIONS.join(', '));
  readonly clientStartStatusesLabel = computed(() => CLIENT_IMPORT_START_STATUSES.join(', '));
  readonly previewRowsPreview = computed(() => this.previewRows().slice(0, 20));

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    this.selectedFile.set(file);
    this.selectedFileName.set(file?.name ?? '');
    this.resetDryRunState();
  }

  async runDryRun(): Promise<void> {
    const file = this.selectedFile();

    this.resetDryRunState();

    if (!file) {
      this.errorText.set('Select a source file first.');
      return;
    }

    const extension = getImportFileExtension(file.name);

    if (!isAllowedImportFileExtension(extension)) {
      this.errorText.set(`Unsupported file type: ${extension || '(none)'}`);
      return;
    }

    if (extension !== '.csv') {
      this.infoText.set(
        'Browser dry-run preview currently supports CSV files. XLSX/XLS support should be wired through the import backend or a dedicated parser next.',
      );
      return;
    }

    this.isRunningDryRun.set(true);

    try {
      const text = await file.text();
      const result = runCsvImportDryRun(text);

      if (result.summary.totalRows === 0) {
        this.errorText.set('The selected CSV file appears to be empty.');
        return;
      }

      this.issues.set(result.issues);
      this.previewRows.set(result.previewRows);
      this.summary.set(result.summary);
    } catch (error: unknown) {
      this.errorText.set(this.getErrorMessage(error));
    } finally {
      this.isRunningDryRun.set(false);
    }
  }

  private resetDryRunState(): void {
    this.errorText.set('');
    this.infoText.set('');
    this.issues.set([]);
    this.previewRows.set([]);
    this.summary.set(null);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}