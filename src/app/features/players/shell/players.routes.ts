import { Routes } from '@angular/router';

import { PlayersPageComponent } from '../players-page.component';
import { PlayerProfilePageComponent } from './player-profile-page.component';

export const PLAYERS_ROUTES: Routes = [
  {
    path: '',
    component: PlayersPageComponent,
  },
  {
    path: ':license_uuid',
    component: PlayerProfilePageComponent,
  },
];