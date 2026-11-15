import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { DEVICE_TYPES, type DeviceType } from '../../core/models/device.model';
import { DevicesService } from '../../core/services/devices.service';
import { LoadError, Loading } from '../../shared/ui/feedback';
import { PageHeader } from '../../shared/ui/page-header';
import { StateBadge } from '../../shared/ui/state-badge';
import { DateTimePipe, RelativePipe } from '../../shared/util/format.pipes';

@Component({
  selector: 'app-device-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeader,
    StateBadge,
    LoadError,
    Loading,
    DateTimePipe,
    RelativePipe,
  ],
  templateUrl: './device-detail.page.html',
  styles: `
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: var(--space-4);
    }
    @media (width < 1000px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
    .back {
      font-size: var(--text-sm);
    }
    .saved {
      color: var(--color-ok);
      font-size: var(--text-sm);
    }
    .form-actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
  `,
})
export class DeviceDetailPage {
  private readonly devices = inject(DevicesService);

  readonly id = input.required<string>();
  protected readonly device = this.devices.detailResource(() => Number(this.id()) || undefined);
  protected readonly deviceTypes = DEVICE_TYPES;

  protected readonly form = inject(NonNullableFormBuilder).group({
    customName: ['', Validators.maxLength(100)],
    deviceType: ['' as DeviceType | ''],
    notes: ['', Validators.maxLength(5000)],
  });
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
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
    this.saved.set(false);
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
          this.saved.set(true);
          this.device.reload();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.saveError.set(toApiError(err).message);
        },
      });
  }
}
