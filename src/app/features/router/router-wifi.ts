import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Observable } from 'rxjs';
import { toApiError, type FieldIssue } from '../../core/api/api-error';
import type {
  WifiNetworkConfig,
  WifiNetworkInput,
  WifiSecurity,
} from '../../core/models/router.model';
import { RouterService } from '../../core/services/router.service';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { StateBadge } from '../../shared/ui/state-badge';

const SECURITY_LABELS: Record<WifiSecurity, string> = {
  open: 'Open (no password)',
  wep: 'WEP (outdated)',
  wpa: 'WPA (outdated)',
  wpa2: 'WPA2',
  'wpa-wpa2': 'WPA/WPA2',
  wpa3: 'WPA3',
  other: 'Other',
};

const ASCII = /^[\x20-\x7e]*$/;

/** Wi-Fi networks on the router, read live, with confirmed changes. Keys are never shown. */
@Component({
  selector: 'app-router-wifi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StateBadge, EmptyState, LoadError, Loading],
  templateUrl: './router-wifi.html',
  styleUrl: './router-firewall.scss',
})
export class RouterWifi {
  private readonly api = inject(RouterService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly wifi = this.api.wifiResource();
  protected readonly labels = SECURITY_LABELS;

  protected readonly editing = signal<WifiNetworkConfig | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly fieldErrors = signal<FieldIssue[]>([]);
  protected readonly actionError = signal<string | null>(null);

  protected readonly writable = computed(
    () => this.wifi.hasValue() && this.wifi.value().writesEnabled,
  );

  /** The lowest instance on each band is the main network, which the router keeps. */
  protected readonly mainInstances = computed(() => {
    const networks = this.wifi.value()?.networks ?? [];
    return new Set(
      (['2.4 GHz', '5 GHz'] as const)
        .map((band) => Math.min(...networks.filter((n) => n.band === band).map((n) => n.instance)))
        .filter(Number.isFinite),
    );
  });

  protected readonly form = this.fb.group({
    band: this.fb.control<'2.4 GHz' | '5 GHz'>('2.4 GHz'),
    ssid: ['', [Validators.required, Validators.maxLength(32), Validators.pattern(ASCII)]],
    enabled: [true],
    visible: [true],
    security: this.fb.control<'wpa2' | 'wpa-wpa2'>('wpa2'),
    password: ['', [Validators.minLength(8), Validators.maxLength(63), Validators.pattern(ASCII)]],
  });

  /** A password is needed for a new network and when the current one has no WPA key. */
  protected passwordRequired(): boolean {
    const editing = this.editing();
    if (editing === 'new') return true;
    if (!editing) return false;
    return editing.security !== this.form.controls.security.value;
  }

  protected fieldError(path: string): string | null {
    return this.fieldErrors().find((issue) => issue.path === path)?.message ?? null;
  }

  protected startCreate() {
    this.form.reset({ band: '2.4 GHz', enabled: true, visible: true, security: 'wpa2' });
    this.resetErrors();
    this.showPassword.set(false);
    this.editing.set('new');
  }

  protected startEdit(network: WifiNetworkConfig) {
    this.form.reset({
      band: network.band,
      ssid: network.ssid,
      enabled: network.enabled,
      visible: network.visible,
      security: network.security === 'wpa-wpa2' ? 'wpa-wpa2' : 'wpa2',
      password: '',
    });
    this.resetErrors();
    this.showPassword.set(false);
    this.editing.set(network);
  }

  protected async save() {
    const editing = this.editing();
    if (!editing) return;
    const v = this.form.getRawValue();
    if (this.form.invalid || (this.passwordRequired() && !v.password)) {
      this.form.markAllAsTouched();
      if (this.passwordRequired() && !v.password) {
        this.fieldErrors.set([{ path: 'password', message: 'Set a password (8–63 characters)' }]);
      }
      return;
    }
    const input: WifiNetworkInput = {
      ssid: v.ssid,
      enabled: v.enabled,
      visible: v.visible,
      security: v.security,
      ...(v.password ? { password: v.password } : {}),
    };
    const isNew = editing === 'new';
    const ok = await this.confirm.ask({
      title: isNew ? `Add the Wi-Fi network “${input.ssid}”?` : `Change “${editing.ssid}”?`,
      message: isNew
        ? 'The router may restart its Wi-Fi for a moment, so devices on Wi-Fi can drop and reconnect.'
        : 'Devices on this network disconnect for a moment. If the name or password changes, they ' +
          'must be connected again with the new details. Wired devices are not affected.',
      confirmLabel: isNew ? 'Add network' : 'Save network',
      danger: !isNew,
    });
    if (!ok) return;
    const request = isNew
      ? this.api.addWifiNetwork({ ...input, band: v.band, password: v.password })
      : this.api.updateWifiNetwork(editing.instance, input);
    this.saving.set(true);
    this.resetErrors();
    request.subscribe({
      next: () => {
        this.editing.set(null);
        this.form.controls.password.reset('');
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

  protected async remove(network: WifiNetworkConfig) {
    const ok = await this.confirm.ask({
      title: `Remove the Wi-Fi network “${network.ssid}”?`,
      message: 'Devices on it disconnect. Its settings (not its password) stay in the audit log.',
      confirmLabel: 'Remove network',
      danger: true,
    });
    if (!ok) return;
    this.runAction(this.api.deleteWifiNetwork(network.instance));
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
    this.wifi.reload();
  }

  private resetErrors() {
    this.formError.set(null);
    this.fieldErrors.set([]);
    this.actionError.set(null);
  }
}
