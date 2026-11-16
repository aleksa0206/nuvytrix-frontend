import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { RouterWifiRadios } from './router-wifi-radios';

describe('RouterWifiRadios', () => {
  it('saves a manual channel and power for one band after a warning', async () => {
    const ask = vi.fn(() => Promise.resolve(true));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfirmService, useValue: { ask } },
      ],
    });
    const fixture = TestBed.createComponent(RouterWifiRadios);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/router/wifi-radios'))
      .flush({
        writesEnabled: true,
        radios: [
          {
            domain: 'd1',
            band: '2.4 GHz',
            channel: 0,
            autoChannel: true,
            power: 100,
            standard: '11ax',
            country: 'RS',
          },
          {
            domain: 'd5',
            band: '5 GHz',
            channel: 0,
            autoChannel: true,
            power: 100,
            standard: '11ax',
            country: 'RS',
          },
        ],
        channels: { '2.4 GHz': [1, 6, 11], '5 GHz': [36, 40] },
        powerLevels: [100, 80],
      });
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const save = () => [...el.querySelectorAll('tbody tr')][0]!.querySelector('button')!;
    expect(save().disabled).toBe(true);
    const channel = el.querySelector<HTMLSelectElement>('[aria-label="Channel 2.4 GHz"]')!;
    channel.value = '6';
    channel.dispatchEvent(new Event('change'));
    const power = el.querySelector<HTMLSelectElement>('[aria-label="Signal strength 2.4 GHz"]')!;
    power.value = '80';
    power.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    save().click();
    await fixture.whenStable();

    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    const put = http.expectOne((req) => req.method === 'PUT');
    expect(put.request.body).toEqual({ band: '2.4 GHz', channel: 6, power: 80 });
  });
});
