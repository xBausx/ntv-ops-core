import { Routes } from '@angular/router';

import { WorkDetailPageComponent } from '../work-detail-page.component';

export const WORK_ITEMS_ROUTES: Routes = [
  {
    path: ':work_id',
    component: WorkDetailPageComponent,
  },
];