import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Routes } from '@angular/router';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'app-firewall-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PageHeader],
  template: `
    <div class="page">
      <app-page-header
        title="Firewall"
        description="Events from the Huawei router's firewall log (imported by hand) and the firewall rules you intend to apply."
      />
      <nav class="tabs" aria-label="Firewall sections">
        @for (tab of tabs; track tab.path) {
          <a [routerLink]="tab.path" routerLinkActive="is-active" ariaCurrentWhenActive="page">{{
            tab.label
          }}</a>
        }
      </nav>
      <router-outlet />
    </div>
  `,
  styles: `
    .tabs {
      display: flex;
      gap: var(--space-1);
      border-bottom: 1px solid var(--color-border);
      overflow-x: auto;
    }
    .tabs a {
      padding: var(--space-2) var(--space-3);
      margin-bottom: -1px;
      border-bottom: 2px solid transparent;
      color: var(--color-text-secondary);
      font-size: var(--text-sm);
      white-space: nowrap;
    }
    .tabs a:hover {
      color: var(--color-text);
    }
    .tabs a.is-active {
      border-bottom-color: var(--color-accent);
      color: var(--color-text);
    }
  `,
})
export class FirewallLayout {
  protected readonly tabs = [
    { path: 'events', label: 'Events' },
    { path: 'insights', label: 'Insights' },
    { path: 'imports', label: 'Log imports' },
    { path: 'policies', label: 'Rules' },
  ];
}

export const FIREWALL_ROUTES: Routes = [
  {
    path: '',
    component: FirewallLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'events' },
      {
        path: 'events',
        title: 'Firewall events · Nuvytrix',
        loadComponent: () => import('./events.page').then((m) => m.EventsPage),
      },
      {
        path: 'insights',
        title: 'Firewall insights · Nuvytrix',
        loadComponent: () => import('./insights.page').then((m) => m.InsightsPage),
      },
      {
        path: 'imports',
        title: 'Firewall log imports · Nuvytrix',
        loadComponent: () => import('./imports.page').then((m) => m.ImportsPage),
      },
      {
        path: 'policies',
        title: 'Firewall rules · Nuvytrix',
        loadComponent: () => import('./policies.page').then((m) => m.PoliciesPage),
      },
    ],
  },
];
