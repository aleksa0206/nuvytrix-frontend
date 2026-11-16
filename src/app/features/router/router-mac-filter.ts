import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Observable } from 'rxjs';
import { toApiError, type FieldIssue } from '../../core/api/api-error';
import type { MacFilterEntry, MacFilterList } from '../../core/models/router.model';
import { RouterService } from '../../core/services/router.service';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { StateBadge } from '../../shared/ui/state-badge';

const MAC = /^[0-9A-Fa-f]{2}([:-][0-9A-Fa-f]{2}){5}$/;

const TITLES: Record<MacFilterList, string> = {
  lan: 'MAC filter (all devices)',
  wifi: 'Wi-Fi MAC filter (per network)',
};

/** The router's LAN and Wi-Fi MAC blacklists, read live, with confirmed changes. */
@Component({
  selector: 'app-router-mac-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StateBadge, EmptyState, LoadError, Loading],
  templateUrl: './router-mac-filter.html',
  styleUrl: './router-firewall.scss',
  host: { class: 'stack' },
})
export class RouterMacFilter {
  private readonly api = inject(RouterService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly filters = this.api.macFilterResource();
  protected readonly clients = this.api.clientsResource(() => true);
  protected readonly lists: MacFilterList[] = ['lan', 'wifi'];
  protected readonly titles = TITLES;

  /** The list being edited and the entry ('new' when adding). */
  protected readonly editing = signal<{
    list: MacFilterList;
    entry: MacFilterEntry | 'new';
  } | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly fieldErrors = signal<FieldIssue[]>([]);
  protected readonly actionError = signal<string | null>(null);

  protected readonly devices = computed(() =>
    this.clients.hasValue()
      ? [...this.clients.value().clients].sort((a, b) =>
          (a.customName ?? a.hostName ?? a.macAddress).localeCompare(
            b.customName ?? b.hostName ?? b.macAddress,
          ),
        )
      : [],
  );

  protected readonly form = this.fb.group({
    mac: ['', [Validators.required, Validators.pattern(MAC)]],
    name: ['', [Validators.maxLength(32), Validators.pattern(/^[A-Za-z0-9 _.-]*$/)]],
    ssid: [''],
  });

  protected writable(list: MacFilterList): boolean {
    if (!this.filters.hasValue()) return false;
    const state = this.filters.value();
    return state.writesEnabled && state[list].mode === 'blacklist';
  }

  protected networkName(id: string | undefined): string {
    const network = this.filters.value()?.wifiNetworks.find((n) => n.id === id);
    return network ? `${network.ssid} (${network.band})` : (id ?? '—');
  }

  protected deviceName(mac: string): string | null {
    const device = this.devices().find((d) => d.macAddress === mac.toLowerCase());
    return device ? (device.customName ?? device.hostName) : null;
  }

  protected fieldError(path: string): string | null {
    return this.fieldErrors().find((issue) => issue.path === path)?.message ?? null;
  }

  protected startCreate(list: MacFilterList) {
    this.form.reset({ ssid: this.filters.value()?.wifiNetworks[0]?.id ?? '' });
    this.resetErrors();
    this.editing.set({ list, entry: 'new' });
  }

  protected startEdit(list: MacFilterList, entry: MacFilterEntry) {
    this.form.reset({ mac: entry.mac, name: entry.name, ssid: entry.ssid ?? '' });
    this.resetErrors();
    this.editing.set({ list, entry });
  }

  /** Fills MAC and name from a device the router knows. */
  protected pickDevice(mac: string) {
    const device = this.devices().find((d) => d.macAddress === mac);
    if (!device) return;
    const name = (device.customName ?? device.hostName ?? '').replace(/[^A-Za-z0-9 _.-]/g, '');
    this.form.patchValue({ mac: device.macAddress, name: name.slice(0, 32) });
  }

  protected async save() {
    const editing = this.editing();
    if (!editing) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const input = {
      mac: value.mac.trim(),
      name: value.name.trim(),
      ...(editing.list === 'wifi' ? { ssid: value.ssid } : {}),
    };
    const who = input.name || this.deviceName(input.mac) || input.mac;
    const where =
      editing.list === 'wifi' ? `the Wi-Fi network ${this.networkName(input.ssid)}` : 'the network';
    const enabled = this.filters.value()![editing.list].enabled;
    const ok = await this.confirm.ask({
      title: editing.entry === 'new' ? `Block ${who}?` : `Change the entry for ${who}?`,
      message: enabled
        ? `${who} loses access to ${where} as soon as the router saves it.`
        : `The entry is saved; it blocks ${who} once this filter is turned on.`,
      confirmLabel: editing.entry === 'new' ? 'Add to blacklist' : 'Save entry',
      danger: enabled,
    });
    if (!ok) return;
    const request =
      editing.entry === 'new'
        ? this.api.addMacFilterEntry(editing.list, input)
        : this.api.updateMacFilterEntry(editing.list, index(editing.entry), input);
    this.saving.set(true);
    this.resetErrors();
    request.subscribe({
      next: () => {
        this.editing.set(null);
        this.done();
      },
      error: (err: unknown) => {
        const error = toApiError(err);
        this.formError.set(error.message);
        this.fieldErrors.set(error.details);
        this.done();
      },
    });
  }

  protected async remove(list: MacFilterList, entry: MacFilterEntry) {
    const who = entry.name || this.deviceName(entry.mac) || entry.mac;
    const ok = await this.confirm.ask({
      title: `Remove ${who} from the blacklist?`,
      message: 'The device is no longer blocked by this list. The entry stays in the audit log.',
      confirmLabel: 'Remove entry',
    });
    if (!ok) return;
    this.runAction(this.api.deleteMacFilterEntry(list, index(entry)));
  }

  protected async toggle(list: MacFilterList, enabled: boolean) {
    const count = this.filters.value()![list].entries.length;
    const ok = await this.confirm.ask({
      title: enabled ? `Turn on the ${TITLES[list]}?` : `Turn off the ${TITLES[list]}?`,
      message: enabled
        ? `The ${count} device(s) in the list lose access as soon as the router saves it.`
        : 'No device in the list is blocked while the filter is off. The entries are kept.',
      confirmLabel: enabled ? 'Turn on' : 'Turn off',
      danger: enabled,
    });
    if (!ok) return;
    this.runAction(this.api.setMacFilterEnabled(list, enabled));
  }

  private runAction(request: Observable<unknown>) {
    this.resetErrors();
    this.saving.set(true);
    request.subscribe({
      next: () => this.done(),
      error: (err: unknown) => {
        this.actionError.set(toApiError(err).message);
        this.done();
      },
    });
  }

  private done() {
    this.saving.set(false);
    this.filters.reload();
  }

  private resetErrors() {
    this.formError.set(null);
    this.fieldErrors.set([]);
    this.actionError.set(null);
  }
}

function index(entry: MacFilterEntry): number {
  return Number(entry.domain.split('.').pop());
}
