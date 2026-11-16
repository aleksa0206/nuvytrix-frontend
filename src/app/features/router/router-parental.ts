import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Observable } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import type {
  ParentalDevice,
  ParentalMode,
  ParentalTemplate,
} from '../../core/models/router.model';
import { RouterService } from '../../core/services/router.service';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { StateBadge } from '../../shared/ui/state-badge';

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
] as const;

/** Parental control on the router: templates with schedules and site lists, and bound devices. */
@Component({
  selector: 'app-router-parental',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StateBadge, EmptyState, LoadError, Loading],
  templateUrl: './router-parental.html',
  styleUrl: './router-firewall.scss',
  host: { class: 'stack' },
})
export class RouterParental {
  private readonly api = inject(RouterService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly parental = this.api.parentalResource();
  protected readonly clients = this.api.clientsResource(() => true);
  protected readonly days = DAYS;

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Template whose period / site form is open. */
  protected readonly periodFor = signal<number | null>(null);
  protected readonly urlFor = signal<number | null>(null);
  protected readonly addingDevice = signal(false);

  protected readonly writable = computed(
    () => this.parental.hasValue() && this.parental.value().writesEnabled,
  );
  protected readonly devices = computed(() =>
    this.clients.hasValue()
      ? [...this.clients.value().clients].sort((a, b) =>
          (a.customName ?? a.hostName ?? a.macAddress).localeCompare(
            b.customName ?? b.hostName ?? b.macAddress,
          ),
        )
      : [],
  );

  protected readonly templateName = this.fb.control('', [
    Validators.required,
    Validators.maxLength(32),
  ]);
  protected readonly periodForm = this.fb.group({
    start: ['08:00', Validators.required],
    end: ['20:00', Validators.required],
    days: this.fb.control<number[]>([1, 2, 3, 4, 5]),
  });
  protected readonly urlControl = this.fb.control('', Validators.required);
  protected readonly deviceForm = this.fb.group({
    mac: ['', [Validators.required, Validators.pattern(/^[0-9A-Fa-f]{2}([:-][0-9A-Fa-f]{2}){5}$/)]],
    description: ['', [Validators.maxLength(32), Validators.pattern(/^[A-Za-z0-9 _.-]*$/)]],
    template: this.fb.control<number>(1),
  });

  protected deviceName(mac: string): string {
    const d = this.devices().find((c) => c.macAddress === mac.toLowerCase());
    return d ? (d.customName ?? d.hostName ?? mac) : mac;
  }

  protected templateLabel(index: number): string {
    return this.parental.value()?.templates.find((t) => t.index === index)?.name ?? `#${index}`;
  }

  protected boundTo(template: ParentalTemplate): ParentalDevice[] {
    return this.parental.value()?.devices.filter((d) => d.template === template.index) ?? [];
  }

  protected dayLabels(days: number[]): string {
    return days.length === 7
      ? 'every day'
      : days.map((d) => DAYS.find((x) => x.value === d)?.label ?? d).join(', ');
  }

  protected modeText(kind: 'time' | 'url', mode: ParentalMode): string {
    if (kind === 'time') {
      return mode === 'allow'
        ? 'internet only during these times'
        : 'no internet during these times';
    }
    return mode === 'allow' ? 'only these sites' : 'these sites are blocked';
  }

  protected toggleDay(day: number) {
    const current = this.periodForm.controls.days.value;
    this.periodForm.controls.days.setValue(
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  }

  protected async addTemplate() {
    if (this.templateName.invalid) return;
    this.run(this.api.addParentalTemplate(this.templateName.value.trim()), () =>
      this.templateName.reset(''),
    );
  }

  protected async setTemplate(
    t: ParentalTemplate,
    change: Parameters<RouterService['updateParentalTemplate']>[1],
    message: string,
  ) {
    const devices = this.boundTo(t).length;
    const ok = await this.confirm.ask({
      title: `Change “${t.name}”?`,
      message: `${message} It applies to ${devices} device(s) bound to this template as soon as the router saves it.`,
      confirmLabel: 'Save',
    });
    if (!ok) return;
    this.run(this.api.updateParentalTemplate(t.index, change));
  }

  protected async deleteTemplate(t: ParentalTemplate) {
    const ok = await this.confirm.ask({
      title: `Delete the template “${t.name}”?`,
      message: 'Its times and sites are deleted too. They stay in the audit log.',
      confirmLabel: 'Delete template',
      danger: true,
    });
    if (ok) this.run(this.api.deleteParentalTemplate(t.index));
  }

  protected addPeriod(t: ParentalTemplate) {
    const v = this.periodForm.getRawValue();
    this.run(this.api.addParentalPeriod(t.index, v), () => this.periodFor.set(null));
  }

  protected deletePeriod(t: ParentalTemplate, period: number) {
    this.run(this.api.deleteParentalPeriod(t.index, period));
  }

  protected addUrl(t: ParentalTemplate) {
    if (this.urlControl.invalid) return;
    this.run(this.api.addParentalUrl(t.index, this.urlControl.value.trim()), () => {
      this.urlControl.reset('');
      this.urlFor.set(null);
    });
  }

  protected deleteUrl(t: ParentalTemplate, item: number) {
    this.run(this.api.deleteParentalUrl(t.index, item));
  }

  protected startAddDevice() {
    this.deviceForm.reset({ template: this.parental.value()?.templates[0]?.index ?? 1 });
    this.addingDevice.set(true);
  }

  protected pickDevice(mac: string) {
    const d = this.devices().find((c) => c.macAddress === mac);
    if (!d) return;
    const name = (d.customName ?? d.hostName ?? '').replace(/[^A-Za-z0-9 _.-]/g, '').slice(0, 32);
    this.deviceForm.patchValue({ mac: d.macAddress, description: name });
  }

  protected async addDevice() {
    if (this.deviceForm.invalid) {
      this.deviceForm.markAllAsTouched();
      return;
    }
    const v = this.deviceForm.getRawValue();
    const ok = await this.confirm.ask({
      title: `Apply “${this.templateLabel(v.template)}” to ${this.deviceName(v.mac)}?`,
      message:
        'The template’s time and site rules apply to this device as soon as the router saves it.',
      confirmLabel: 'Apply template',
    });
    if (ok) this.run(this.api.addParentalDevice(v), () => this.addingDevice.set(false));
  }

  protected moveDevice(device: ParentalDevice, template: number) {
    this.run(this.api.updateParentalDevice(device.index, { ...device, template }));
  }

  protected async removeDevice(device: ParentalDevice) {
    const ok = await this.confirm.ask({
      title: `Remove parental control from ${this.deviceName(device.mac)}?`,
      message: 'The device is no longer limited by any template.',
      confirmLabel: 'Remove',
    });
    if (ok) this.run(this.api.deleteParentalDevice(device.index));
  }

  private run(request: Observable<unknown>, onSuccess?: () => void) {
    this.error.set(null);
    this.saving.set(true);
    request.subscribe({
      next: () => {
        onSuccess?.();
        this.saving.set(false);
        this.parental.reload();
      },
      error: (err: unknown) => {
        this.error.set(toApiError(err).message);
        this.saving.set(false);
        this.parental.reload();
      },
    });
  }
}
