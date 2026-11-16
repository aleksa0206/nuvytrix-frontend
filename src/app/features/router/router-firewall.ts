import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toApiError, type FieldIssue } from '../../core/api/api-error';
import type { IpFilterRule, IpFilterRuleInput } from '../../core/models/router.model';
import { RouterService } from '../../core/services/router.service';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { StateBadge } from '../../shared/ui/state-badge';

const PROTOCOLS = ['ALL', 'TCP/UDP', 'TCP', 'UDP', 'ICMP'] as const;

/** The router's IPv4 filter, read live from the router, with add / edit / delete / on-off. */
@Component({
  selector: 'app-router-firewall',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StateBadge, EmptyState, LoadError, Loading],
  templateUrl: './router-firewall.html',
  styleUrl: './router-firewall.scss',
})
export class RouterFirewall {
  private readonly api = inject(RouterService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly filter = this.api.firewallResource();
  protected readonly editing = signal<IpFilterRule | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly fieldErrors = signal<FieldIssue[]>([]);
  protected readonly actionError = signal<string | null>(null);
  protected readonly protocols = PROTOCOLS;

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(31)]],
    protocol: this.fb.control<(typeof PROTOCOLS)[number]>('ALL'),
    lanIpStart: [''],
    lanIpEnd: [''],
    wanIpStart: [''],
    wanIpEnd: [''],
    lanTcpPorts: [''],
    lanUdpPorts: [''],
    wanTcpPorts: [''],
    wanUdpPorts: [''],
  });

  private readonly protocol = signal<string>('ALL');
  protected readonly tcp = computed(() => ['TCP', 'TCP/UDP'].includes(this.protocol()));
  protected readonly udp = computed(() => ['UDP', 'TCP/UDP'].includes(this.protocol()));

  protected readonly writable = computed(
    () =>
      this.filter.hasValue() &&
      this.filter.value().writesEnabled &&
      this.filter.value().mode === 'blacklist',
  );

  constructor() {
    this.form.controls.protocol.valueChanges.subscribe((value) => this.protocol.set(value));
  }

  protected fieldError(path: string): string | null {
    return this.fieldErrors().find((issue) => issue.path === path)?.message ?? null;
  }

  protected startCreate() {
    this.form.reset();
    this.protocol.set('ALL');
    this.formError.set(null);
    this.fieldErrors.set([]);
    this.editing.set('new');
  }

  protected startEdit(rule: IpFilterRule) {
    this.form.reset({
      name: rule.name,
      protocol: (PROTOCOLS as readonly string[]).includes(rule.protocol)
        ? (rule.protocol as (typeof PROTOCOLS)[number])
        : 'ALL',
      lanIpStart: rule.sourceIpStart,
      lanIpEnd: rule.sourceIpEnd,
      wanIpStart: rule.destIpStart,
      wanIpEnd: rule.destIpEnd,
      lanTcpPorts: rule.lanTcpPorts,
      lanUdpPorts: rule.lanUdpPorts,
      wanTcpPorts: rule.wanTcpPorts,
      wanUdpPorts: rule.wanUdpPorts,
    });
    this.protocol.set(this.form.controls.protocol.value);
    this.formError.set(null);
    this.fieldErrors.set([]);
    this.editing.set(rule);
  }

  protected async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const input: IpFilterRuleInput = {
      ...value,
      lanTcpPorts: this.tcp() ? value.lanTcpPorts.trim() : '',
      wanTcpPorts: this.tcp() ? value.wanTcpPorts.trim() : '',
      lanUdpPorts: this.udp() ? value.lanUdpPorts.trim() : '',
      wanUdpPorts: this.udp() ? value.wanUdpPorts.trim() : '',
    };
    const editing = this.editing();
    const ok = await this.confirm.ask({
      title: editing === 'new' ? 'Add this rule on the router?' : 'Change this rule on the router?',
      message:
        `Traffic between ${input.lanIpStart || 'any LAN address'}${input.lanIpEnd ? '–' + input.lanIpEnd : ''} ` +
        `and ${input.wanIpStart || 'the internet'} (${input.protocol}) will be blocked as soon as the router saves it.`,
      confirmLabel: editing === 'new' ? 'Add rule' : 'Save rule',
    });
    if (!ok) return;

    this.saving.set(true);
    this.formError.set(null);
    this.fieldErrors.set([]);
    const request =
      editing === 'new' || editing === null
        ? this.api.addFirewallRule(input)
        : this.api.updateFirewallRule(ruleIndex(editing), input);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.filter.reload();
      },
      error: (err: unknown) => {
        const error = toApiError(err);
        this.saving.set(false);
        this.formError.set(error.message);
        this.fieldErrors.set(error.details);
        this.filter.reload();
      },
    });
  }

  protected async remove(rule: IpFilterRule) {
    const ok = await this.confirm.ask({
      title: `Delete “${rule.name || rule.domain}” on the router?`,
      message:
        'The rule stops applying immediately. Its settings stay in the audit log, so it can be recreated.',
      confirmLabel: 'Delete rule',
      danger: true,
    });
    if (!ok) return;
    this.runAction(this.api.deleteFirewallRule(ruleIndex(rule)));
  }

  protected async toggle(enabled: boolean) {
    const ok = await this.confirm.ask({
      title: enabled ? 'Turn IPv4 filtering on?' : 'Turn IPv4 filtering off?',
      message: enabled
        ? 'All rules below start applying again.'
        : 'No rule below applies while filtering is off. The rules themselves are kept.',
      confirmLabel: enabled ? 'Turn on' : 'Turn off',
      danger: !enabled,
    });
    if (!ok) return;
    this.runAction(this.api.changeFirewall({ enabled }));
  }

  private runAction(request: ReturnType<RouterService['changeFirewall']>) {
    this.actionError.set(null);
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.filter.reload();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.actionError.set(toApiError(err).message);
        this.filter.reload();
      },
    });
  }
}

function ruleIndex(rule: IpFilterRule): number {
  return Number(rule.domain.split('.').pop());
}
