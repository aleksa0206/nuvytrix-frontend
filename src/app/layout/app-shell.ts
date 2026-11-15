import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { pollWhileVisible } from '../core/polling';
import { SystemService } from '../core/services/system.service';
import { ConfirmDialog } from '../shared/ui/confirm-dialog';
import { Icon, type IconName } from '../shared/ui/icon';
import { StateBadge } from '../shared/ui/state-badge';
import { RelativePipe } from '../shared/util/format.pipes';
import { ThemeService } from './theme.service';

interface NavGroup {
  label: string;
  items: { path: string; label: string; icon: IconName }[];
}

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ConfirmDialog,
    Icon,
    StateBadge,
    RelativePipe,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  /** Feeds the status bar; the same data as the overview, refreshed every minute. */
  protected readonly status = inject(SystemService).overviewResource();
  protected readonly navOpen = signal(false);

  protected readonly nav: NavGroup[] = [
    {
      label: 'Network',
      items: [
        { path: '/overview', label: 'Overview', icon: 'overview' },
        { path: '/topology', label: 'Topology', icon: 'topology' },
        { path: '/devices', label: 'Devices', icon: 'devices' },
        { path: '/monitoring', label: 'Monitoring', icon: 'monitoring' },
      ],
    },
    {
      label: 'Security',
      items: [
        { path: '/firewall/events', label: 'Firewall events', icon: 'firewall' },
        { path: '/firewall/insights', label: 'Insights', icon: 'insights' },
        { path: '/firewall/policies', label: 'Rules', icon: 'rules' },
        { path: '/firewall/imports', label: 'Log imports', icon: 'imports' },
      ],
    },
    {
      label: 'Services',
      items: [
        { path: '/dns', label: 'DNS', icon: 'dns' },
        { path: '/settings', label: 'Settings', icon: 'settings' },
      ],
    },
  ];

  constructor() {
    pollWhileVisible(() => this.status.reload(), 60_000);
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.navOpen.set(false));
  }

  protected search(term: string) {
    const search = term.trim();
    this.router.navigate(['/devices'], { queryParams: search ? { search } : {} });
  }

  protected signOut() {
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
