import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { RouterMacFilterState } from '../../core/models/router.model';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { RouterMacFilter } from './router-mac-filter';

const SEC = 'InternetGatewayDevice.X_HW_Security';
const STATE: RouterMacFilterState = {
  writesEnabled: true,
  lan: {
    enabled: false,
    mode: 'blacklist',
    entries: [{ domain: `${SEC}.MacFilter.2`, mac: 'aa:bb:cc:00:00:50', name: '' }],
  },
  wifi: { enabled: false, mode: 'whitelist', entries: [] },
  wifiNetworks: [
    { id: 'SSID-1', ssid: 'Home', band: '2.4 GHz' },
    { id: 'SSID-5', ssid: 'Home 5g', band: '5 GHz' },
  ],
};

async function render(state: RouterMacFilterState) {
  const ask = vi.fn(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ConfirmService, useValue: { ask } },
    ],
  });
  const fixture = TestBed.createComponent(RouterMacFilter);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/router/mac-filter')).flush(state);
  http
    .expectOne((req) => req.url.endsWith('/router/clients'))
    .flush({
      capturedAt: '2026-11-16T10:00:00Z',
      clients: [
        {
          macAddress: 'aa:bb:cc:00:00:50',
          ipAddress: '192.168.100.50',
          hostName: 'tablet',
          customName: null,
        },
      ],
    });
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const buttons = (label: string) =>
    [...el.querySelectorAll('button')].filter((b) => b.textContent?.trim() === label);
  return { fixture, http, el, buttons, ask };
}

describe('RouterMacFilter', () => {
  it('names entries after known devices and leaves a whitelist read-only', async () => {
    const { el, buttons } = await render(STATE);

    expect(el.textContent).toContain('tablet');
    expect(el.textContent).toContain('whitelist mode');
    // Only the LAN list (blacklist) offers changes.
    expect(buttons('Add device')).toHaveLength(1);
  });

  it('warns before turning on a list that blocks devices', async () => {
    const { fixture, http, buttons, ask } = await render(STATE);

    buttons('Turn on')[0]!.click();
    await fixture.whenStable();

    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    const patch = http.expectOne((req) => req.url.endsWith('/router/mac-filter/lan'));
    expect(patch.request.body).toEqual({ enabled: true });
  });

  it('adds a Wi-Fi entry for the chosen network', async () => {
    const { fixture, http, el, buttons } = await render({
      ...STATE,
      wifi: { ...STATE.wifi, mode: 'blacklist' },
    });

    buttons('Add device')[1]!.click();
    fixture.detectChanges();
    const mac = el.querySelector<HTMLInputElement>('#mf-mac-wifi')!;
    mac.value = '02:4e:56:00:00:01';
    mac.dispatchEvent(new Event('input'));
    const ssid = el.querySelector<HTMLSelectElement>('#mf-ssid')!;
    ssid.value = 'SSID-5';
    ssid.dispatchEvent(new Event('change'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const post = http.expectOne((req) => req.url.endsWith('/router/mac-filter/wifi/entries'));
    expect(post.request.body).toEqual({ mac: '02:4e:56:00:00:01', name: '', ssid: 'SSID-5' });
  });
});
