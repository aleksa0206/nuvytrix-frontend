import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SystemService } from '../../core/services/system.service';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { PageHeader } from '../../shared/ui/page-header';
import { StateBadge } from '../../shared/ui/state-badge';
import { NumberPipe } from '../../shared/util/format.pipes';

@Component({
  selector: 'app-dns-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, StateBadge, EmptyState, LoadError, Loading, NumberPipe],
  templateUrl: './dns.page.html',
  styles: `
    .figures {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-8);
    }
    .figures dt {
      color: var(--color-text-tertiary);
      font-size: var(--text-xs);
    }
    .figures dd {
      font-size: 1.5rem;
      font-weight: var(--weight-semibold);
    }
    .lists {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--space-4);
    }
    .steps {
      display: grid;
      gap: var(--space-1);
      padding-left: var(--space-5);
      list-style: decimal;
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }
  `,
})
export class DnsPage {
  private readonly system = inject(SystemService);
  protected readonly status = this.system.dnsStatusResource();
  private readonly reachable = computed(() => {
    const status = this.status.hasValue() ? this.status.value() : null;
    return status !== null && status.configured && status.reachable;
  });
  protected readonly stats = this.system.dnsStatsResource(this.reachable);
}
