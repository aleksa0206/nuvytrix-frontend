import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RouterMaintenance } from './router-maintenance';

describe('RouterMaintenance', () => {
  it('runs a ping from the router and shows the output and the log', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(RouterMaintenance);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/router/user-log'))
      .flush({ entries: ['2026-11-16 [Config-Log] login'] });
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('[Config-Log] login');

    const host = el.querySelector<HTMLInputElement>('#diag-host')!;
    host.value = '1.1.1.1';
    host.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

    const post = http.expectOne((req) => req.url.endsWith('/router/diagnostics'));
    expect(post.request.body).toEqual({ kind: 'ping', host: '1.1.1.1' });
    post.flush({ state: 'Complete', output: '4 packets received' });
    fixture.detectChanges();
    expect(el.textContent).toContain('4 packets received');
  });
});
