import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Observable } from 'rxjs';
import { toApiError, type FieldIssue } from '../../core/api/api-error';
import type { DhcpReservation } from '../../core/models/router.model';
import { RouterService } from '../../core/services/router.service';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { StateBadge } from '../../shared/ui/state-badge';
import { formatDuration } from '../../shared/util/format';

/** Lease units offered by the router's own form. */
const UNITS = [
  { seconds: 604800, label: 'weeks' },
  { seconds: 86400, label: 'days' },
  { seconds: 3600, label: 'hours' },
  { seconds: 60, label: 'minutes' },
] as const;

const MAC = /^[0-9A-Fa-f]{2}([:-][0-9A-Fa-f]{2}){5}$/;

/** The router's main DHCP pool and static reservations, read live, with confirmed changes. */
@Component({
  selector: 'app-router-dhcp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StateBadge, EmptyState, LoadError, Loading],
  templateUrl: './router-dhcp.html',
  styleUrl: './router-firewall.scss',
})
export class RouterDhcp {
  private readonly api = inject(RouterService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly dhcp = this.api.dhcpResource();
  protected readonly clients = this.api.clientsResource(() => true);
  protected readonly units = UNITS;
  protected readonly formatDuration = formatDuration;

  protected readonly editingPool = signal(false);
  protected readonly editing = signal<DhcpReservation | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly fieldErrors = signal<FieldIssue[]>([]);
  protected readonly actionError = signal<string | null>(null);

  protected readonly writable = computed(
    () => this.dhcp.hasValue() && this.dhcp.value().writesEnabled,
  );

  /** Known devices, for picking a MAC address and for naming reservations. */
  protected readonly devices = computed(() =>
    this.clients.hasValue()
      ? [...this.clients.value().clients].sort((a, b) =>
          (a.customName ?? a.hostName ?? a.macAddress).localeCompare(
            b.customName ?? b.hostName ?? b.macAddress,
          ),
        )
      : [],
  );

  protected readonly poolForm = this.fb.group({
    startIp: ['', Validators.required],
    endIp: ['', Validators.required],
    lease: [1, [Validators.required, Validators.min(1)]],
    unit: this.fb.control<number>(86400),
  });

  protected readonly reservationForm = this.fb.group({
    mac: ['', [Validators.required, Validators.pattern(MAC)]],
    ip: ['', Validators.required],
  });

  protected deviceName(mac: string): string | null {
    const device = this.devices().find((d) => d.macAddress === mac.toLowerCase());
    return device ? (device.customName ?? device.hostName) : null;
  }

  protected fieldError(path: string): string | null {
    return this.fieldErrors().find((issue) => issue.path === path)?.message ?? null;
  }

  protected startPoolEdit() {
    const server = this.dhcp.value()!.server;
    const unit = UNITS.find((u) => server.leaseSeconds % u.seconds === 0) ?? UNITS[3];
    this.poolForm.reset({
      startIp: server.startIp,
      endIp: server.endIp,
      lease: server.leaseSeconds / unit.seconds,
      unit: unit.seconds,
    });
    this.resetErrors();
    this.editing.set(null);
    this.editingPool.set(true);
  }

  protected async savePool() {
    if (this.poolForm.invalid) {
      this.poolForm.markAllAsTouched();
      return;
    }
    const value = this.poolForm.getRawValue();
    const input = {
      startIp: value.startIp.trim(),
      endIp: value.endIp.trim(),
      leaseSeconds: Math.round(value.lease * Number(value.unit)),
    };
    const ok = await this.confirm.ask({
      title: 'Change the DHCP pool on the router?',
      message:
        `Devices get addresses ${input.startIp}–${input.endIp} for ${formatDuration(input.leaseSeconds)}. ` +
        'Devices keep their current address until their lease renews; a device outside the new range then gets a new one.',
      confirmLabel: 'Save pool',
    });
    if (!ok) return;
    this.submit(this.api.changeDhcpServer(input), () => this.editingPool.set(false));
  }

  protected startCreate() {
    this.reservationForm.reset();
    this.resetErrors();
    this.editingPool.set(false);
    this.editing.set('new');
  }

  protected startEdit(reservation: DhcpReservation) {
    this.reservationForm.reset({ mac: reservation.mac, ip: reservation.ip });
    this.resetErrors();
    this.editingPool.set(false);
    this.editing.set(reservation);
  }

  /** Fills the form from a device the router knows. */
  protected pickDevice(mac: string) {
    const device = this.devices().find((d) => d.macAddress === mac);
    if (device)
      this.reservationForm.patchValue({ mac: device.macAddress, ip: device.ipAddress ?? '' });
  }

  protected async saveReservation() {
    if (this.reservationForm.invalid) {
      this.reservationForm.markAllAsTouched();
      return;
    }
    const input = {
      mac: this.reservationForm.controls.mac.value.trim(),
      ip: this.reservationForm.controls.ip.value.trim(),
    };
    const editing = this.editing();
    const name = this.deviceName(input.mac) ?? input.mac;
    const ok = await this.confirm.ask({
      title: editing === 'new' ? 'Reserve this address?' : 'Change this reservation?',
      message: `${name} always gets ${input.ip}. A device that is online now gets it when its lease renews or it reconnects.`,
      confirmLabel: editing === 'new' ? 'Reserve' : 'Save reservation',
    });
    if (!ok) return;
    const request =
      editing === 'new' || editing === null
        ? this.api.addDhcpReservation(input)
        : this.api.updateDhcpReservation(index(editing), input);
    this.submit(request, () => this.editing.set(null));
  }

  protected async remove(reservation: DhcpReservation) {
    const ok = await this.confirm.ask({
      title: `Delete the reservation for ${reservation.ip}?`,
      message:
        'The device keeps its address until the lease ends, then may get another one. The reservation stays in the audit log.',
      confirmLabel: 'Delete reservation',
      danger: true,
    });
    if (!ok) return;
    this.actionError.set(null);
    this.saving.set(true);
    this.api.deleteDhcpReservation(index(reservation)).subscribe({
      next: () => this.done(),
      error: (err: unknown) => {
        this.actionError.set(toApiError(err).message);
        this.done();
      },
    });
  }

  private submit(request: Observable<unknown>, onSuccess: () => void) {
    this.saving.set(true);
    this.resetErrors();
    request.subscribe({
      next: () => {
        onSuccess();
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

  private done() {
    this.saving.set(false);
    this.dhcp.reload();
  }

  private resetErrors() {
    this.formError.set(null);
    this.fieldErrors.set([]);
    this.actionError.set(null);
  }
}

function index(reservation: DhcpReservation): number {
  return Number(reservation.domain.split('.').pop());
}
