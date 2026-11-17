import { HttpClient, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiUrl } from '../../core/api/http';
import { toApiError } from '../../core/api/api-error';

interface Thresholds {
  diskPercent: number;
  memoryPercent: number;
  temperatureC: number;
  opticalWeakDbm: number;
  latencyMs: number;
  packetLossPercent: number;
  jitterMs: number;
  sshFailures: number;
  backupMaxAgeHours: number;
}

const FIELDS: {
  key: keyof Thresholds;
  label: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
}[] = [
  { key: 'diskPercent', label: 'Disk full', unit: '%', min: 50, max: 99 },
  { key: 'memoryPercent', label: 'Server memory used', unit: '%', min: 50, max: 99 },
  { key: 'temperatureC', label: 'Server CPU temperature', unit: '°C', min: 50, max: 105 },
  {
    key: 'opticalWeakDbm',
    label: 'Weak fiber signal below',
    unit: 'dBm',
    min: -30,
    max: -15,
    step: 0.5,
  },
  { key: 'latencyMs', label: 'Ping latency (3 checks in a row)', unit: 'ms', min: 5, max: 5000 },
  {
    key: 'packetLossPercent',
    label: 'Packet loss (3 checks in a row)',
    unit: '%',
    min: 1,
    max: 100,
  },
  { key: 'jitterMs', label: 'Jitter (3 checks in a row)', unit: 'ms', min: 1, max: 1000 },
  {
    key: 'sshFailures',
    label: 'Failed SSH logins from one address in 10 min',
    unit: '',
    min: 2,
    max: 100,
  },
  { key: 'backupMaxAgeHours', label: 'No successful backup for', unit: 'h', min: 6, max: 336 },
];

/** Alert thresholds; changes apply to the next checks. */
@Component({
  selector: 'app-alert-thresholds',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <section class="panel">
      <header class="panel__header">
        <h2>Alert thresholds</h2>
        <span class="panel__meta">when Nuvytrix raises a notification</span>
      </header>
      @if (thresholds.hasValue()) {
        <form class="panel__body grid" (submit)="$event.preventDefault(); save()">
          @for (f of fields; track f.key) {
            <label class="field">
              <span>{{ f.label }}</span>
              <span class="input-unit">
                <input
                  class="input mono"
                  type="number"
                  [name]="f.key"
                  [min]="f.min"
                  [max]="f.max"
                  [step]="f.step ?? 1"
                  [ngModel]="draft()[f.key]"
                  (ngModelChange)="set(f.key, $event)"
                />
                <small>{{ f.unit }}</small>
              </span>
            </label>
          }
          <div class="actions">
            <button type="submit" class="btn btn--primary" [disabled]="saving()">Save</button>
            @if (saved()) {
              <span class="saved" role="status">Saved</span>
            }
          </div>
        </form>
        @if (error()) {
          <p class="panel__body notice notice--error" role="alert">{{ error() }}</p>
        }
      }
    </section>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--space-3) var(--space-4);
    }
    .field {
      display: grid;
      gap: 4px;
      font-size: var(--text-sm);
    }
    .input-unit {
      display: flex;
      align-items: center;
      gap: 6px;
      .input {
        width: 110px;
      }
    }
    .actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      grid-column: 1 / -1;
    }
    .saved {
      color: var(--color-ok);
      font-size: var(--text-sm);
    }
  `,
})
export class AlertThresholds {
  private readonly http = inject(HttpClient);
  protected readonly fields = FIELDS;
  protected readonly thresholds = httpResource<Thresholds>(() => apiUrl('/alerts/thresholds'));
  protected readonly draft = signal<Partial<Thresholds>>({});
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.thresholds.hasValue()) this.draft.set({ ...this.thresholds.value() });
    });
  }

  protected set(key: keyof Thresholds, value: number) {
    this.saved.set(false);
    this.draft.update((d) => ({ ...d, [key]: Number(value) }));
  }

  protected save() {
    this.error.set(null);
    this.saving.set(true);
    this.http.put<Thresholds>(apiUrl('/alerts/thresholds'), this.draft()).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        this.thresholds.reload();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }
}
