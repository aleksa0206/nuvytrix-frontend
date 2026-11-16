import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiUrl } from '../../core/api/http';
import { toApiError } from '../../core/api/api-error';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { LoadError, Loading } from '../../shared/ui/feedback';
import { StateBadge } from '../../shared/ui/state-badge';

interface Period {
  start: string;
  end: string;
  /** 1 = Monday … 7 = Sunday. */
  days: number[];
}

interface WifiSchedule {
  writesEnabled: boolean;
  enabled: boolean;
  periods: Period[];
}

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
] as const;

/** Whether `now` falls into one of the periods (in this browser's local time). */
export function inPeriod(periods: Period[], now: Date): boolean {
  const day = now.getDay() === 0 ? 7 : now.getDay();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return periods.some((p) => p.days.includes(day) && p.start <= hhmm && hhmm < p.end);
}

/** Automatic Wi-Fi shutdown: up to four periods when the router turns Wi-Fi off. */
@Component({
  selector: 'app-router-wifi-schedule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, StateBadge, LoadError, Loading],
  styleUrl: './router-firewall.scss',
  templateUrl: './router-wifi-schedule.html',
})
export class RouterWifiSchedule {
  private readonly http = inject(HttpClient);
  private readonly confirm = inject(ConfirmService);

  protected readonly schedule = httpResource<WifiSchedule>(() => apiUrl('/router/wifi-schedule'));
  protected readonly days = DAYS;
  protected readonly enabled = signal(false);
  protected readonly periods = signal<Period[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly writable = computed(
    () => this.schedule.hasValue() && this.schedule.value().writesEnabled,
  );

  constructor() {
    // The editable copy follows what the router reports after every load.
    effect(() => {
      if (!this.schedule.hasValue()) return;
      const s = this.schedule.value();
      this.enabled.set(s.enabled);
      this.periods.set(s.periods.map((p) => ({ ...p, days: [...p.days] })));
    });
  }

  protected addPeriod() {
    this.periods.update((list) => [
      ...list,
      { start: '01:00', end: '06:00', days: [1, 2, 3, 4, 5, 6, 7] },
    ]);
  }

  protected removePeriod(index: number) {
    this.periods.update((list) => list.filter((_, i) => i !== index));
  }

  protected setTime(index: number, field: 'start' | 'end', value: string) {
    this.periods.update((list) => list.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  protected toggleDay(index: number, day: number) {
    this.periods.update((list) =>
      list.map((p, i) =>
        i !== index
          ? p
          : {
              ...p,
              days: p.days.includes(day)
                ? p.days.filter((d) => d !== day)
                : [...p.days, day].sort(),
            },
      ),
    );
  }

  protected async save() {
    const body = { enabled: this.enabled(), periods: this.periods() };
    const offNow = body.enabled && inPeriod(body.periods, new Date());
    const ok = await this.confirm.ask({
      title: body.enabled ? 'Save and switch the Wi-Fi schedule on?' : 'Save the Wi-Fi schedule?',
      message: offNow
        ? 'Now falls into one of the periods: Wi-Fi turns off right away for every wireless device, ' +
          'including any you use to reach Nuvytrix. Wired devices stay connected.'
        : body.enabled
          ? 'Wi-Fi turns off for every wireless device during these periods. Wired devices stay connected.'
          : 'The periods are kept but have no effect while the schedule is off.',
      confirmLabel: 'Save on the router',
      danger: offNow,
    });
    if (!ok) return;
    this.error.set(null);
    this.saving.set(true);
    this.http.put(apiUrl('/router/wifi-schedule'), body).subscribe({
      next: () => {
        this.saving.set(false);
        this.schedule.reload();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(toApiError(err).message);
        this.schedule.reload();
      },
    });
  }
}
