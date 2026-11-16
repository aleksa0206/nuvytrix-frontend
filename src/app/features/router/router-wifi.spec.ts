import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { RouterWifiState } from '../../core/models/router.model';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { RouterWifi } from './router-wifi';

const LAN = 'InternetGatewayDevice.LANDevice.1';
const STATE: RouterWifiState = {
  writesEnabled: true,
  networks: [
    {
      domain: `${LAN}.WLANConfiguration.1`,
      instance: 1,
      band: '2.4 GHz',
      enabled: true,
      ssid: 'Home',
      visible: true,
      security: 'wpa2',
    },
    {
      domain: `${LAN}.WLANConfiguration.2`,
      instance: 2,
      band: '2.4 GHz',
      enabled: false,
      ssid: 'Guests',
      visible: true,
      security: 'open',
    },
  ],
};

async function render(state: RouterWifiState) {
  const ask = vi.fn(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ConfirmService, useValue: { ask } },
    ],
  });
  const fixture = TestBed.createComponent(RouterWifi);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/router/wifi')).flush(state);
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const buttons = (label: string) =>
    [...el.querySelectorAll('button')].filter((b) => b.textContent?.trim() === label);
  const type = (id: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(id)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  return { fixture, http, el, buttons, type, ask };
}

describe('RouterWifi', () => {
  it('marks the main network, which cannot be deleted, and flags open networks', async () => {
    const { el, buttons } = await render(STATE);
    expect(el.textContent).toContain('main');
    expect(el.textContent).toContain('Open (no password)');
    expect(buttons('Delete')).toHaveLength(1);
  });

  it('renames a network without sending a password when the field stays empty', async () => {
    const { fixture, http, el, buttons, type, ask } = await render(STATE);

    buttons('Edit')[0]!.click();
    fixture.detectChanges();
    type('#wifi-ssid', 'Home2');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    const put = http.expectOne((req) => req.url.endsWith('/router/wifi/1'));
    expect(put.request.body).toEqual({
      ssid: 'Home2',
      enabled: true,
      visible: true,
      security: 'wpa2',
    });
  });

  it('requires a password to secure an open network', async () => {
    const { fixture, http, el, buttons } = await render(STATE);

    buttons('Edit')[1]!.click();
    fixture.detectChanges();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectNone((req) => req.url.endsWith('/router/wifi/2'));
    expect(el.textContent).toContain('Set a password');
  });
});
