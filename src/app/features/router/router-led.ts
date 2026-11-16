import { HttpClient, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { apiUrl } from '../../core/api/http';
import { toApiError } from '../../core/api/api-error';
import { LoadError, Loading } from '../../shared/ui/feedback';

type LedMode = 'on' | 'off';

const LABELS: Record<LedMode, string> = {
  on: 'On',
  off: 'Off',
};

/** The router's indicator lights. */
@Component({
  selector: 'app-router-led',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadError, Loading],
  styleUrl: './router-firewall.scss',
  template: `
    <section class="panel">
      <header class="panel__header">
        <h2>Router lights</h2>
        <span class="panel__meta">the indicator LEDs on the router</span>
      </header>
      @if (led.isLoading() && !led.hasValue()) {
        <app-loading />
      }
      @if (led.error(); as e) {
        <app-load-error [error]="e" (retry)="led.reload()" />
      }
      @if (led.hasValue()) {
        <div class="panel__body filter-state">
          <span>
            Lights <strong>{{ labels[led.value().mode] }}</strong>
          </span>
          @if (writable()) {
            <span class="spacer"></span>
            @for (m of modes; track m) {
              <button
                type="button"
                class="btn btn--sm"
                [class.btn--primary]="led.value().mode === m"
                [disabled]="saving() || led.value().mode === m"
                (click)="set(m)"
              >
                {{ labels[m] }}
              </button>
            }
          }
        </div>
        @if (error()) {
          <p class="panel__body notice notice--error" role="alert">{{ error() }}</p>
        }
      }
    </section>
  `,
})
export class RouterLed {
  private readonly http = inject(HttpClient);

  protected readonly led = httpResource<{ writesEnabled: boolean; mode: LedMode }>(() =>
    apiUrl('/router/led'),
  );
  protected readonly labels = LABELS;
  protected readonly modes: LedMode[] = ['on', 'off'];
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly writable = computed(
    () => this.led.hasValue() && this.led.value().writesEnabled,
  );

  /** Harmless, so no confirmation: the lights only change how the router looks. */
  protected set(mode: LedMode) {
    this.error.set(null);
    this.saving.set(true);
    this.http.put(apiUrl('/router/led'), { mode }).subscribe({
      next: () => {
        this.saving.set(false);
        this.led.reload();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(toApiError(err).message);
        this.led.reload();
      },
    });
  }
}
