import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { pollWhileVisible } from '../../core/polling';
import { SystemService } from '../../core/services/system.service';
import { EmptyState, LoadError, Loading } from '../../shared/ui/feedback';
import { PageHeader } from '../../shared/ui/page-header';
import { StateBadge } from '../../shared/ui/state-badge';
import { formatDuration } from '../../shared/util/format';
import { DateTimePipe, NumberPipe, RelativePipe } from '../../shared/util/format.pipes';

@Component({
  selector: 'app-overview-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeader,
    StateBadge,
    LoadError,
    Loading,
    EmptyState,
    NumberPipe,
    RelativePipe,
    DateTimePipe,
  ],
  templateUrl: './overview.page.html',
  styleUrl: './overview.page.scss',
})
export class OverviewPage {
  protected readonly overview = inject(SystemService).overviewResource();
  protected readonly formatDuration = formatDuration;

  constructor() {
    pollWhileVisible(() => this.overview.reload(), 30_000);
  }
}
