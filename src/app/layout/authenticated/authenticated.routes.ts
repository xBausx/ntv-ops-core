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
        loadComponent: () =>
          import('@features/installations').then((m) => m.InstallationsPageComponent),
      },
      {
        path: 'incidents',
        loadComponent: () =>
          import('@features/incidents').then((m) => m.IncidentsPageComponent),
      },
      {
        path: 'players',
        loadComponent: () =>
          import('@features/players').then((m) => m.PlayersPageComponent),
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('@features/admin').then((m) => m.AdminPageComponent),
      },

      {
        path: 'work/:work_id',
        loadComponent: () =>
          import('@features/work').then((m) => m.WorkDetailPageComponent),
      },

      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];