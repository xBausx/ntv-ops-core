/** Angular Imports */
import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

/** Local Imports */
import { SupabaseService } from '../../supabase/supabase.service';

export const authGuard: CanMatchFn = async (): Promise<boolean | UrlTree> => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  // During SSR, the browser Supabase client is not available.
  // Allow the route to match and let client-side auth + RLS enforce access after hydration.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const supabase = inject(SupabaseService);

  try {
    const { data, error } = await supabase.client().auth.getSession();

    if (error || !data.session) {
      return router.createUrlTree(['/login']);
    }

    return true;
  } catch {
    return router.createUrlTree(['/login']);
  }
};