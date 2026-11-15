import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .checkSession()
    .pipe(
      map((signedIn) =>
        signedIn
          ? true
          : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }),
      ),
    );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .checkSession()
    .pipe(map((signedIn) => (signedIn ? router.createUrlTree(['/']) : true)));
};

/** Only same-app paths are accepted, so a crafted link cannot redirect off-site after login. */
export function safeReturnUrl(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}
