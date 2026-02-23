import { Routes } from '@angular/router';

const loadDashboard = () =>
  import('@features/dashboard').then((m) => m.DashboardComponent);

export const routes: Routes = [
    // Default landing (MVP starts at Install Queue)
    { path: '', pathMatch: 'full', redirectTo: 'installations' },

    // Lazy-loaded placeholders (until each feature shell exists)
    { path: 'installations', 
        loadComponent: () => 
            import('@features/installations/shell/installations.page').then(m => m.InstallationsPageComponent), 
        title: 'Install Queue' },
    {
        path: 'incidents',
        loadComponent: () =>
            import('@features/incidents/shell/incidents.page').then((m) => m.IncidentsPageComponent),
        title: 'Incident Queue',
    },
    { path: 'players', loadComponent: () =>
            import('@features/players/shell/players-search.page').then((m) => m.PlayersSearchPageComponent),
        title: 'Player Search',
    },
    { path: 'players/:licenseUuid', loadComponent: () => 
            import('@features/players/shell/player-profile.page').then(m => m.PlayerProfilePageComponent),
        title: 'Player Profile',
    },
    { path: 'work-items/:workId', loadComponent: () => 
        import('@features/work-items/shell/work-item-detail.page').then(m => m.WorkItemDetailPageComponent), 
        title: 'Work Item' 
    },
    { path: 'admin', loadComponent: () => 
        import('@features/admin/shell/admin.page').then(m => m.AdminPageComponent), 
        title: 'Admin' 
    },
    // Keep this for compatibility with scaffold expectations (if any)
    { path: 'dashboard', loadComponent: loadDashboard, title: 'Dashboard' },

    // Fallback
    { path: '**', redirectTo: 'installations' },
    ];