import { Routes } from '@angular/router';

import { AdminPageComponent } from '../admin-page.component';
import { ImportPageComponent } from './import-page.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminPageComponent,
  },
  {
    path: 'import',
    component: ImportPageComponent,
  },
];