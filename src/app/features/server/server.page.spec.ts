import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ServerPage } from './server.page';

describe('ServerPage', () => {
  it('shows the measured values and a power outage', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(ServerPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne((r) => r.url.endsWith('/server/status'))
      .flush({
        sampledAt: new Date().toISOString(),
        cpuPercent: 12.5,
        load1: 0.4,
        loadCores: 4,
        memoryPercent: 40,
        memoryAvailableBytes: 4e9,
        swapPercent: 10,
        uptimeSeconds: 3600,
        temperatureC: 55,
        onBattery: true,
        batteryPercent: 80,
        disks: [{ name: 'System', totalBytes: 100e9, usedBytes: 50e9, percent: 50 }],
        netErrors: 0,
        db: { up: true, connections: 5, sizeBytes: 1e7, longestQuerySeconds: 0, error: null },
      });
    http.expectOne((r) => r.url.endsWith('/server/history')).flush({ hours: 24, points: [] });
    http
      .expectOne((r) => r.url.endsWith('/docker/containers'))
      .flush({
        enabled: true,
        checkedAt: new Date().toISOString(),
        error: null,
        containers: [
          {
            id: 'abc',
            name: 'remly-web-1',
            project: 'remly',
            service: 'web',
            image: 'remly-web',
            state: 'exited',
            health: null,
            status: 'Exited (137) 2 minutes ago',
            uptimeSeconds: null,
            cpuPercent: null,
            memoryBytes: null,
            memoryLimitBytes: null,
            exitCode: 137,
          },
        ],
      });
    http
      .expectOne((r) => r.url.endsWith('/server/backups'))
      .flush({
        enabled: true,
        checkedAt: new Date().toISOString(),
        error: null,
        projects: [
          { project: 'homewise', files: 0, latest: null, ageHours: null, state: 'missing' },
        ],
      });
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('12.5');
    expect(text).toContain('On battery');
    expect(text).toContain('System');
    expect(text).toContain('exited (137)');
    expect(text).toContain('No backup');
  });
});
