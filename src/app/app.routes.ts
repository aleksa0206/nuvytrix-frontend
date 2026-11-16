import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { AppShell } from './layout/app-shell';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · Nuvytrix',
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        title: 'Overview · Nuvytrix',
        loadComponent: () =>
          import('./features/overview/overview.page').then((m) => m.OverviewPage),
      },
      {
        path: 'router',
        title: 'Router · Nuvytrix',
        loadComponent: () => import('./features/router/router.page').then((m) => m.RouterPage),
      },
      {
        path: 'topology',
        title: 'Topology · Nuvytrix',
        loadComponent: () =>
          import('./features/topology/topology.page').then((m) => m.TopologyPage),
      },
      {
        path: 'devices',
        title: 'Devices · Nuvytrix',
        loadComponent: () => import('./features/devices/devices.page').then((m) => m.DevicesPage),
      },
      {
        path: 'devices/:id',
        title: 'Device · Nuvytrix',
        loadComponent: () =>
          import('./features/devices/device-detail.page').then((m) => m.DeviceDetailPage),
      },
      {
        path: 'firewall',
        loadChildren: () =>
          import('./features/firewall/firewall.routes').then((m) => m.FIREWALL_ROUTES),
      },
      {
        path: 'security/ssh',
        title: 'SSH logins · Nuvytrix',
        loadComponent: () => import('./features/security/ssh.page').then((m) => m.SshPage),
      },
      {
        path: 'server',
        title: 'Server · Nuvytrix',
        loadComponent: () => import('./features/server/server.page').then((m) => m.ServerPage),
      },
      {
        path: 'monitoring',
        title: 'Monitoring · Nuvytrix',
        loadComponent: () =>
          import('./features/monitoring/monitoring.page').then((m) => m.MonitoringPage),
      },
      {
        path: 'dns',
        title: 'DNS · Nuvytrix',
        loadComponent: () => import('./features/dns/dns.page').then((m) => m.DnsPage),
      },
      {
        path: 'settings',
        title: 'Settings · Nuvytrix',
        loadComponent: () =>
          import('./features/settings/settings.page').then((m) => m.SettingsPage),
      },
      { path: '**', redirectTo: 'overview' },
    ],
  },
];
