import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet, Routes } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { PageHeader } from '../../shared/ui/page-header';

interface SectionData {
  heading: string;
  description: string;
}

/** Shared page frame for the firewall sections; each section has its own entry in the sidebar. */
@Component({
  selector: 'app-firewall-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, PageHeader],
  template: `
    <div class="page">
      @if (section(); as s) {
        <app-page-header [title]="s.heading" [description]="s.description" />
      }
      <router-outlet />
    </div>
  `,
})
export class FirewallLayout {
  private readonly route = inject(ActivatedRoute);
  protected readonly section = toSignal(
    inject(Router).events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.route.firstChild?.snapshot.data as SectionData | undefined),
    ),
  );
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
        data: {
          heading: 'Firewall events',
          description:
            "Entries from the Huawei router's firewall log, imported by hand. Each row is one logged packet decision.",
        },
        loadComponent: () => import('./events.page').then((m) => m.EventsPage),
      },
      {
        path: 'insights',
        title: 'Firewall insights · Nuvytrix',
        data: {
          heading: 'Insights',
          description:
            'Patterns in the imported log. Observations, not verdicts: a denied packet was blocked.',
        },
        loadComponent: () => import('./insights.page').then((m) => m.InsightsPage),
      },
      {
        path: 'imports',
        title: 'Firewall log imports · Nuvytrix',
        data: {
          heading: 'Log imports',
          description:
            'Upload the file downloaded from the router. Duplicates are skipped and unreadable lines are kept with a reason.',
        },
        loadComponent: () => import('./imports.page').then((m) => m.ImportsPage),
      },
      {
        path: 'policies',
        title: 'Firewall rules · Nuvytrix',
        data: {
          heading: 'Firewall rules',
          description:
            'Intended rules for the router, applied by hand. Status records what you did; the router is never queried.',
        },
        loadComponent: () => import('./policies.page').then((m) => m.PoliciesPage),
      },
    ],
  },
];
