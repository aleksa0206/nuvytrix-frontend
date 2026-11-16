import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SshPage } from './ssh.page';

describe('SshPage', () => {
  it('shows counts, sources and events', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(SshPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne((r) => r.url.endsWith('/security/ssh'))
      .flush({
        hours: 24,
        enabled: true,
        lastRun: new Date().toISOString(),
        error: null,
        accepted: 3,
        failed: 6,
        sources: [
          {
            ip: '203.0.113.9',
            kind: 'internet',
            accepted: 0,
            failed: 6,
            lastAt: new Date().toISOString(),
          },
        ],
        recent: [
          {
            at: new Date().toISOString(),
            kind: 'failed',
            username: 'admin',
            ip: '203.0.113.9',
            source: 'internet',
            method: 'password',
          },
        ],
      });
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('203.0.113.9');
    expect(text).toContain('Internet');
    expect(text).toContain('FAILED');
  });
});
