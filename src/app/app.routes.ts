import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('@features/auth/login-page.component').then((m) => m.LoginPageComponent),
  },

  {
    path: '',
    loadChildren: () =>
      import('@layouts/authenticated/authenticated.routes').then(
        (m) => m.AUTHENTICATED_ROUTES,
      ),
  },

  { path: '**', redirectTo: '' },
];