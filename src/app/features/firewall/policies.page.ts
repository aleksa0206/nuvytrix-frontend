import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toApiError } from '../../core/api/api-error';
import {
  DIRECTION_LABELS,
  POLICY_STATUS_LABELS,
  type FirewallDirection,
  type FirewallPolicy,
  type PolicyInput,
  type PolicyInstructions,
  type PolicyStatus,
} from '../../core/models/firewall.model';
import { FirewallService } from '../../core/services/firewall.service';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { StateBadge } from '../../shared/ui/state-badge';
import { RelativePipe } from '../../shared/util/format.pipes';

const ENDPOINT = /^(any|[0-9a-fA-F:.]+(\/\d{1,2})?)$/;
const PORTS = /^\d{1,5}(-\d{1,5})?$/;

// What each transition button says; the API decides which ones are allowed.
const TRANSITION_LABELS: Record<PolicyStatus, string> = {
  draft: 'Back to draft',
  pending_manual: 'Ready to apply',
  marked_applied: 'Mark as applied',
  apply_failed: 'Mark as failed',
  retired: 'Retire',
};

@Component({
  selector: 'app-firewall-policies-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StateBadge, EmptyState, LoadError, Loading, RelativePipe],
  templateUrl: './policies.page.html',
  styleUrl: './policies.page.scss',
})
export class PoliciesPage {
  private readonly firewall = inject(FirewallService);
  private readonly confirm = inject(ConfirmService);

  protected readonly policies = this.firewall.policiesResource();
  protected readonly directionLabels = DIRECTION_LABELS;
  protected readonly directions = Object.keys(DIRECTION_LABELS) as FirewallDirection[];
  protected readonly statusLabels = POLICY_STATUS_LABELS;
  protected readonly transitionLabels = TRANSITION_LABELS;

  protected readonly editing = signal<FirewallPolicy | 'new' | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly instructions = signal<PolicyInstructions | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(2000)],
    action: ['deny' as PolicyInput['action']],
    direction: ['internet_to_lan' as FirewallDirection],
    protocol: ['tcp' as PolicyInput['protocol']],
    source: ['any', [Validators.required, Validators.pattern(ENDPOINT)]],
    destination: ['any', [Validators.required, Validators.pattern(ENDPOINT)]],
    destinationPorts: ['', Validators.pattern(PORTS)],
  });

  protected startCreate() {
    this.form.reset();
    this.formError.set(null);
    this.editing.set('new');
  }

  protected startEdit(policy: FirewallPolicy) {
    this.form.reset({
      name: policy.name,
      description: policy.description ?? '',
      action: policy.action,
      direction: policy.direction,
      protocol: policy.protocol,
      source: policy.source,
      destination: policy.destination,
      destinationPorts: policy.destinationPorts ?? '',
    });
    this.formError.set(null);
    this.editing.set(policy);
  }

  protected save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const input: PolicyInput = {
      ...value,
      description: value.description.trim() || null,
      destinationPorts:
        value.protocol === 'tcp' || value.protocol === 'udp'
          ? value.destinationPorts.trim() || null
          : null,
    };
    const editing = this.editing();
    const request =
      editing === 'new' || editing === null
        ? this.firewall.createPolicy(input)
        : this.firewall.updatePolicy(editing.id, input);
    request.subscribe({
      next: () => {
        this.editing.set(null);
        this.policies.reload();
      },
      error: (err: unknown) => this.formError.set(toApiError(err).message),
    });
  }

  protected async changeStatus(policy: FirewallPolicy, status: PolicyStatus) {
    let confirmed: boolean | undefined;
    if (status === 'marked_applied') {
      confirmed = await this.confirm.ask({
        title: 'Mark as applied on the router?',
        message:
          'Nuvytrix cannot read the router configuration, so it will record your statement, not a verified fact. ' +
          'Confirm only after saving the rule in the router and checking that access still works.',
        confirmLabel: 'I applied it',
        warnings: policy.warnings,
      });
      if (!confirmed) return;
    } else if (status === 'retired') {
      confirmed = await this.confirm.ask({
        title: 'Retire this rule?',
        message:
          'It stops being tracked as active. Remove it from the router by hand if it is configured there.',
        confirmLabel: 'Retire',
        danger: true,
      });
      if (!confirmed) return;
    }
    this.actionError.set(null);
    this.firewall.changePolicyStatus(policy.id, status, undefined, confirmed).subscribe({
      next: () => this.policies.reload(),
      error: (err: unknown) => this.actionError.set(toApiError(err).message),
    });
  }

  protected async remove(policy: FirewallPolicy) {
    const confirmed = await this.confirm.ask({
      title: `Delete “${policy.name}”?`,
      message: 'The rule and its history are removed from Nuvytrix. Nothing changes on the router.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    this.firewall.deletePolicy(policy.id).subscribe({
      next: () => this.policies.reload(),
      error: (err: unknown) => this.actionError.set(toApiError(err).message),
    });
  }

  protected showInstructions(policy: FirewallPolicy) {
    this.firewall.policyInstructions(policy.id).subscribe({
      next: (instructions) => this.instructions.set(instructions),
      error: (err: unknown) => this.actionError.set(toApiError(err).message),
    });
  }

  protected portsEnabled(): boolean {
    const protocol = this.form.controls.protocol.value;
    return protocol === 'tcp' || protocol === 'udp';
  }
}
