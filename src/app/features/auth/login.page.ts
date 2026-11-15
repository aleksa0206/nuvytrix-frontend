import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { safeReturnUrl } from '../../core/auth/auth.guard';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <main class="login">
      <form class="panel" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="panel__body stack">
          <div>
            <p class="brand">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M3 16V4l7 8V4M10 16l7-12M14 16h3"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="square"
                />
              </svg>
              Nuvytrix
            </p>
            <h1>Sign in</h1>
          </div>
          @if (error()) {
            <p class="notice notice--error" role="alert">{{ error() }}</p>
          }
          <div class="field">
            <label for="username">Username</label>
            <input id="username" class="input" formControlName="username" autocomplete="username" />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input
              id="password"
              class="input"
              type="password"
              formControlName="password"
              autocomplete="current-password"
            />
          </div>
          <button type="submit" class="btn btn--primary" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Signing in…' : 'Sign in' }}
          </button>
        </div>
      </form>
      <p class="hint">
        Local network administration. Access from outside the LAN should go through a VPN.
      </p>
    </main>
  `,
  styles: `
    .login {
      display: grid;
      place-content: center;
      gap: var(--space-4);
      min-height: 100vh;
      padding: var(--space-4);
    }
    form {
      width: min(360px, calc(100vw - 32px));
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: var(--space-4);
      color: var(--color-text);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.03em;
    }
    .brand svg {
      width: 20px;
      height: 20px;
      color: var(--color-accent);
    }
    .btn {
      justify-content: center;
    }
    .hint {
      max-width: 360px;
      color: var(--color-text-tertiary);
      font-size: var(--text-xs);
      text-align: center;
    }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = inject(NonNullableFormBuilder).group({
    username: ['', [Validators.required, Validators.maxLength(64)]],
    password: ['', [Validators.required, Validators.maxLength(256)]],
  });
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit() {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(safeReturnUrl(returnUrl));
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.form.controls.password.reset();
        this.error.set(toApiError(err).message);
      },
    });
  }
}
