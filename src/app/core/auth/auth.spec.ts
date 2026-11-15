import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../api/api-error';
import { safeReturnUrl } from './auth.guard';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('safeReturnUrl', () => {
  it('only allows paths inside the app', () => {
    expect(safeReturnUrl('/devices?status=new')).toBe('/devices?status=new');
    expect(safeReturnUrl('//evil.example/login')).toBe('/');
    expect(safeReturnUrl('https://evil.example')).toBe('/');
    expect(safeReturnUrl(null)).toBe('/');
  });
});

describe('toApiError', () => {
  it('uses the server message for client errors but hides details of server errors', () => {
    const conflict = new HttpErrorResponse({
      status: 409,
      error: { code: 'SCAN_ALREADY_RUNNING', message: 'A discovery scan is already running' },
    });
    const crash = new HttpErrorResponse({
      status: 500,
      error: { code: 'INTERNAL_ERROR', message: 'relation "x" does not exist' },
    });

    expect(toApiError(conflict)).toMatchObject({
      code: 'SCAN_ALREADY_RUNNING',
      message: 'A discovery scan is already running',
    });
    expect(toApiError(crash).message).toBe('Something went wrong on the server.');
    expect(toApiError(new HttpErrorResponse({ status: 0 })).message).toContain('cannot be reached');
  });
});

describe('session handling', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  it('treats a rejected session probe as signed out without redirecting', async () => {
    const navigate = vi.spyOn(router, 'navigate');
    const result = firstValueFrom(auth.checkSession());

    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(await result).toBe(false);
    expect(auth.admin()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('signs out and goes to the login page when any other API call returns 401', async () => {
    auth.admin.set({ username: 'admin' });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const request = firstValueFrom(TestBed.inject(HttpClient).get('/api/devices'));

    http.expectOne('/api/devices').flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(request).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(auth.isSignedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });
});
