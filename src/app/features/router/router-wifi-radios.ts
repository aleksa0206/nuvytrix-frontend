import { HttpClient, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { apiUrl } from '../../core/api/http';
import { toApiError } from '../../core/api/api-error';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { LoadError, Loading } from '../../shared/ui/feedback';

type Band = '2.4 GHz' | '5 GHz';

interface WifiRadio {
  domain: string;
  band: Band;
  channel: number;
  autoChannel: boolean;
  power: number;
  standard: string;
  country: string;
}

interface WifiRadios {
  writesEnabled: boolean;
  radios: WifiRadio[];
  channels: Record<Band, number[]>;
  powerLevels: number[];
}

/** Channel and transmit power per Wi-Fi band. */
@Component({
  selector: 'app-router-wifi-radios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadError, Loading],
  styleUrl: './router-firewall.scss',
  template: `
    <section class="panel">
      <header class="panel__header">
        <h2>Wi-Fi radios</h2>
        <span class="panel__meta">channel and signal strength per band</span>
      </header>
      @if (radios.isLoading() && !radios.hasValue()) {
        <app-loading />
      }
      @if (radios.error(); as e) {
        <app-load-error [error]="e" (retry)="radios.reload()" />
      }
      @if (radios.hasValue()) {
        @let r = radios.value();
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Band</th>
                <th>Channel</th>
                <th>Signal strength</th>
                <th>Standard</th>
                @if (writable()) {
                  <th><span class="visually-hidden">Actions</span></th>
                }
              </tr>
            </thead>
            <tbody>
              @for (radio of r.radios; track radio.domain) {
                <tr>
                  <td>{{ radio.band }}</td>
                  <td>
                    @if (writable()) {
                      <select
                        class="select"
                        [attr.aria-label]="'Channel ' + radio.band"
                        [disabled]="saving()"
                        #channel
                        (change)="draftChannel(radio.band, channel.value)"
                      >
                        <option value="auto" [selected]="radio.autoChannel">Automatic</option>
                        @for (c of r.channels[radio.band]; track c) {
                          <option
                            [value]="c"
                            [selected]="!radio.autoChannel && radio.channel === c"
                          >
                            {{ c }}
                          </option>
                        }
                      </select>
                    } @else {
                      {{ radio.autoChannel ? 'Automatic' : radio.channel }}
                    }
                  </td>
                  <td>
                    @if (writable()) {
                      <select
                        class="select"
                        [attr.aria-label]="'Signal strength ' + radio.band"
                        [disabled]="saving()"
                        #power
                        (change)="draftPower(radio.band, +power.value)"
                      >
                        @for (p of r.powerLevels; track p) {
                          <option [value]="p" [selected]="radio.power === p">{{ p }}%</option>
                        }
                      </select>
                    } @else {
                      {{ radio.power }}%
                    }
                  </td>
                  <td>{{ radio.standard }}</td>
                  @if (writable()) {
                    <td class="row-actions">
                      <button
                        type="button"
                        class="btn btn--sm btn--primary"
                        [disabled]="saving() || !changed(radio)"
                        (click)="save(radio)"
                      >
                        {{ saving() ? 'Saving…' : 'Save' }}
                      </button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (error()) {
          <p class="panel__body notice notice--error" role="alert">{{ error() }}</p>
        }
      }
    </section>
  `,
})
export class RouterWifiRadios {
  private readonly http = inject(HttpClient);
  private readonly confirm = inject(ConfirmService);

  protected readonly radios = httpResource<WifiRadios>(() => apiUrl('/router/wifi-radios'));
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Unsaved choices per band. */
  private readonly drafts = signal<
    Partial<Record<Band, { channel: 'auto' | number; power: number }>>
  >({});
  protected readonly writable = computed(
    () => this.radios.hasValue() && this.radios.value().writesEnabled,
  );

  private draftFor(radio: WifiRadio) {
    return (
      this.drafts()[radio.band] ?? {
        channel: radio.autoChannel ? ('auto' as const) : radio.channel,
        power: radio.power,
      }
    );
  }

  protected draftChannel(band: Band, value: string) {
    const radio = this.radios.value()!.radios.find((r) => r.band === band)!;
    this.drafts.update((d) => ({
      ...d,
      [band]: { ...this.draftFor(radio), channel: value === 'auto' ? 'auto' : Number(value) },
    }));
  }

  protected draftPower(band: Band, power: number) {
    const radio = this.radios.value()!.radios.find((r) => r.band === band)!;
    this.drafts.update((d) => ({ ...d, [band]: { ...this.draftFor(radio), power } }));
  }

  protected changed(radio: WifiRadio): boolean {
    const d = this.drafts()[radio.band];
    if (!d) return false;
    const channel = radio.autoChannel ? 'auto' : radio.channel;
    return d.channel !== channel || d.power !== radio.power;
  }

  protected async save(radio: WifiRadio) {
    const draft = this.draftFor(radio);
    const ok = await this.confirm.ask({
      title: `Change the ${radio.band} radio?`,
      message:
        `Channel ${draft.channel === 'auto' ? 'automatic' : draft.channel}, signal strength ${draft.power}%. ` +
        `The ${radio.band} radio restarts: devices on it drop for a moment and reconnect. Wired devices are not affected.`,
      confirmLabel: 'Save on the router',
      danger: true,
    });
    if (!ok) return;
    this.error.set(null);
    this.saving.set(true);
    this.http.put(apiUrl('/router/wifi-radios'), { band: radio.band, ...draft }).subscribe({
      next: () => {
        this.saving.set(false);
        this.drafts.update((d) => ({ ...d, [radio.band]: undefined }));
        this.radios.reload();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(toApiError(err).message);
        this.radios.reload();
      },
    });
  }
}
