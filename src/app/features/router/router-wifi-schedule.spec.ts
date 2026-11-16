import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { inPeriod, RouterWifiSchedule } from './router-wifi-schedule';

describe('inPeriod', () => {
  const periods = [{ start: '01:00', end: '06:00', days: [1, 7] }];
  it('matches the day and time, Sunday as 7', () => {
    expect(inPeriod(periods, new Date(2026, 10, 16, 2, 0))).toBe(true); // Monday 02:00
    expect(inPeriod(periods, new Date(2026, 10, 15, 5, 59))).toBe(true); // Sunday 05:59
    expect(inPeriod(periods, new Date(2026, 10, 16, 6, 0))).toBe(false);
    expect(inPeriod(periods, new Date(2026, 10, 17, 2, 0))).toBe(false); // Tuesday
  });
});

describe('RouterWifiSchedule', () => {
  it('saves the edited periods and switch', async () => {
    const ask = vi.fn(() => Promise.resolve(true));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfirmService, useValue: { ask } },
      ],
    });
    const fixture = TestBed.createComponent(RouterWifiSchedule);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/router/wifi-schedule'))
      .flush({ writesEnabled: true, enabled: false, periods: [] });
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const button = (label: string) =>
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;

    button('Add period').click();
    fixture.detectChanges();
    const sun = [...el.querySelectorAll('label.checkbox')].find(
      (l) => l.textContent?.trim() === 'Sun',
    )!;
    sun.querySelector('input')!.click();
    button('Save schedule').click();
    await fixture.whenStable();

    const put = http.expectOne((req) => req.method === 'PUT');
    expect(put.request.body).toEqual({
      enabled: false,
      periods: [{ start: '01:00', end: '06:00', days: [1, 2, 3, 4, 5, 6] }],
    });
  });
});
