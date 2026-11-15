import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { DEVICE_TYPES, DEVICE_TYPE_LABELS, type DeviceType } from '../../core/models/device.model';
import { DevicesService } from '../../core/services/devices.service';
import { LoadError, Loading } from '../../shared/ui/feedback';
import { Icon, deviceIcon } from '../../shared/ui/icon';
import { StateBadge } from '../../shared/ui/state-badge';
import { DateTimePipe, RelativePipe } from '../../shared/util/format.pipes';

/** Side panel with one device's identity, editable notes and scan history. */
@Component({
  selector: 'app-device-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LoadError,
    Loading,
    StateBadge,
    Icon,
    DateTimePipe,
    RelativePipe,
  ],
  templateUrl: './device-panel.html',
  styleUrl: './device-panel.scss',
})
export class DevicePanel {
  private readonly devices = inject(DevicesService);

  readonly deviceId = input.required<number>();
  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly device = this.devices.detailResource(() => this.deviceId());
  protected readonly deviceTypes = DEVICE_TYPES;
  protected readonly typeLabels = DEVICE_TYPE_LABELS;
  protected readonly iconFor = deviceIcon;

  protected readonly form = inject(NonNullableFormBuilder).group({
    customName: ['', Validators.maxLength(100)],
    deviceType: ['' as DeviceType | ''],
    notes: ['', Validators.maxLength(5000)],
  });
  protected readonly saving = signal(false);
  protected readonly savedAt = signal<Date | null>(null);
  protected readonly saveError = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.device.hasValue()) return;
      const device = this.device.value();
      this.form.reset({
        customName: device.customName ?? '',
        deviceType: device.deviceType ?? '',
        notes: device.notes ?? '',
      });
    });
  }

  protected save() {
    if (this.form.invalid || !this.device.hasValue()) return;
    const { customName, deviceType, notes } = this.form.getRawValue();
    this.saving.set(true);
    this.saveError.set(null);
    this.devices
      .update(this.device.value().id, {
        customName: customName.trim() || null,
        deviceType: deviceType || null,
        notes: notes.trim() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.savedAt.set(new Date());
          this.device.reload();
          this.saved.emit();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.saveError.set(toApiError(err).message);
        },
      });
  }
}
