/** Angular Imports */
import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

/** Local Imports */
import { SupabaseService } from '../../supabase/supabase.service';

export const guestGuard: CanMatchFn = async (): Promise<boolean | UrlTree> => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  // During SSR, the browser Supabase client is not available.
  // Allow the guest route to match and let the browser decide after hydration.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const supabase = inject(SupabaseService);

  try {
    const { data, error } = await supabase.client().auth.getSession();

    if (error || !data.session) {
      return true;
    }

    return router.createUrlTree(['/']);
  } catch {
    return true;
  }
};