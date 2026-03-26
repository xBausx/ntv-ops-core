/** Angular Imports */
import { Routes } from '@angular/router';

/** Local Imports */
import { AuthenticatedShellComponent } from './authenticated-shell.component';

export const AUTHENTICATED_ROUTES: Routes = [
  {
    path: '',
    component: AuthenticatedShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('@features/dashboard').then((m) => m.DashboardComponent),
      },

      {
        path: 'installations',
        loadChildren: () =>
          import('@features/installations/shell/installations.routes').then(
            (m) => m.INSTALLATIONS_ROUTES,
          ),
      },
      {
        path: 'incidents',
        loadChildren: () =>
          import('@features/incidents/shell/incidents.routes').then(
            (m) => m.INCIDENTS_ROUTES,
          ),
      },
      {
        path: 'players',
        loadChildren: () =>
          import('@features/players/shell/players.routes').then(
            (m) => m.PLAYERS_ROUTES,
          ),
      },
      {
        path: 'admin',
        loadChildren: () =>
          import('@features/admin/shell/admin.routes').then(
            (m) => m.ADMIN_ROUTES,
          ),
      },
      {
        path: 'work',
        loadChildren: () =>
          import('@features/work/shell/work-items.routes').then(
            (m) => m.WORK_ITEMS_ROUTES,
          ),
      },

      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];