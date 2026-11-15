import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { ConfirmDialog } from '../shared/ui/confirm-dialog';
import { ThemeService } from './theme.service';

interface NavItem {
  path: string;
  label: string;
}

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialog],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly navOpen = signal(false);
  protected readonly nav: NavItem[] = [
    { path: '/overview', label: 'Overview' },
    { path: '/devices', label: 'Devices' },
    { path: '/firewall', label: 'Firewall' },
    { path: '/monitoring', label: 'Monitoring' },
    { path: '/dns', label: 'DNS' },
    { path: '/settings', label: 'Settings' },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.navOpen.set(false));
  }

  protected signOut() {
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
