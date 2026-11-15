import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { apiUrl } from '../api/http';

interface Admin {
  username: string;
}

@Service()
export class AuthService {
  private http = inject(HttpClient);

  /** undefined = not checked yet, null = signed out. The cookie itself is httpOnly and unreadable here. */
  readonly admin = signal<Admin | null | undefined>(undefined);
  readonly isSignedIn = computed(() => !!this.admin());

  /** Asks the server whether the session cookie is still valid; never throws. */
  checkSession(): Observable<boolean> {
    if (this.admin() !== undefined) return of(this.isSignedIn());
    return this.http.get<{ admin: Admin }>(apiUrl('/auth/me')).pipe(
      tap((res) => this.admin.set(res.admin)),
      map(() => true),
      catchError(() => {
        this.admin.set(null);
        return of(false);
      }),
    );
  }

  login(username: string, password: string) {
    return this.http
      .post<{ admin: Admin }>(apiUrl('/auth/login'), { username, password })
      .pipe(tap((res) => this.admin.set(res.admin)));
  }

  logout() {
    return this.http.post<void>(apiUrl('/auth/logout'), {}).pipe(
      catchError(() => of(undefined)),
      tap(() => this.admin.set(null)),
    );
  }

  /** Called when any request comes back 401: the server already considers the session gone. */
  markSignedOut() {
    this.admin.set(null);
  }
}
