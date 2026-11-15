import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import type { FirewallImportResult } from '../../core/models/firewall.model';
import { FirewallService } from '../../core/services/firewall.service';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { BytesPipe, DateTimePipe, NumberPipe } from '../../shared/util/format.pipes';

// Mirrors the API default (FIREWALL_UPLOAD_MAX_MB); the server enforces the real limit.
const MAX_FILE_MB = 20;

@Component({
  selector: 'app-firewall-imports-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EmptyState, LoadError, Loading, DateTimePipe, NumberPipe, BytesPipe],
  templateUrl: './imports.page.html',
  styles: `
    .upload {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
    }
    .counts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-6);
    }
    .counts dt {
      color: var(--color-text-tertiary);
      font-size: var(--text-xs);
    }
    .counts dd {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }
    .rejected {
      color: var(--color-warning);
    }
    .raw {
      max-width: 520px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .steps {
      display: grid;
      gap: var(--space-1);
      padding-left: var(--space-5);
      list-style: decimal;
      color: var(--color-text-secondary);
      font-size: var(--text-sm);
    }
  `,
})
export class ImportsPage {
  private readonly firewall = inject(FirewallService);

  protected readonly imports = this.firewall.importsResource();
  protected readonly selectedImportId = signal<number | undefined>(undefined);
  protected readonly selectedImport = this.firewall.importResource(this.selectedImportId);
  protected readonly file = signal<File | null>(null);
  protected readonly uploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly result = signal<FirewallImportResult | null>(null);

  protected pick(input: HTMLInputElement) {
    const file = input.files?.[0] ?? null;
    this.uploadError.set(null);
    if (file && file.size > MAX_FILE_MB * 1024 * 1024) {
      this.uploadError.set(`The file is larger than ${MAX_FILE_MB} MB.`);
      input.value = '';
      this.file.set(null);
      return;
    }
    this.file.set(file);
  }

  protected upload(input: HTMLInputElement) {
    const file = this.file();
    if (!file) return;
    this.uploading.set(true);
    this.uploadError.set(null);
    this.result.set(null);
    this.firewall.uploadLog(file).subscribe({
      next: (result) => {
        this.uploading.set(false);
        this.result.set(result);
        this.file.set(null);
        input.value = '';
        this.imports.reload();
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        this.uploadError.set(toApiError(err).message);
      },
    });
  }
}
