import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../api/http';
import { AuthService } from './auth.service';

/** A 401 from any API call (except the session probe) means the session ended: go to sign-in. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isSessionProbe = req.url.endsWith('/auth/me') || req.url.endsWith('/auth/login');
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        req.url.startsWith(API_URL) &&
        !isSessionProbe
      ) {
        auth.markSignedOut();
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
