import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { RouterDdnsState } from '../../core/models/router.model';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { RouterDdns } from './router-ddns';

const WAN = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANIPConnection.1';
const STATE: RouterDdnsState = {
  writesEnabled: true,
  internetWan: WAN,
  entries: [
    {
      domain: `${WAN}.X_HW_DDNSConfiguration.2`,
      index: 2,
      enabled: false,
      provider: 'dyndns',
      username: 'me',
      port: 80,
      domainName: 'home.example.com',
      serverHost: 'members.dyndns.org',
      status: 'Unconfigured',
      lastError: '',
    },
  ],
};

async function render() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ConfirmService, useValue: { ask: () => Promise.resolve(true) } },
    ],
  });
  const fixture = TestBed.createComponent(RouterDdns);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/router/ddns')).flush(STATE);
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  return { fixture, http, el, button };
}

describe('RouterDdns', () => {
  it('edits an entry without sending a password when the field stays empty', async () => {
    const { fixture, http, el, button } = await render();

    button('Edit')!.click();
    fixture.detectChanges();
    const domain = el.querySelector<HTMLInputElement>('#ddns-domain')!;
    domain.value = 'home2.example.com';
    domain.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const put = http.expectOne((req) => req.url.endsWith('/router/ddns/2'));
    expect(put.request.body).toEqual({
      enabled: false,
      provider: 'dyndns',
      username: 'me',
      domainName: 'home2.example.com',
      serverHost: 'members.dyndns.org',
      port: 80,
    });
  });

  it('requires a password for a new entry', async () => {
    const { fixture, http, el, button } = await render();

    button('New DDNS entry')!.click();
    fixture.detectChanges();
    for (const [id, v] of [
      ['#ddns-domain', 'x.example.com'],
      ['#ddns-user', 'me'],
    ]) {
      const input = el.querySelector<HTMLInputElement>(id!)!;
      input.value = v!;
      input.dispatchEvent(new Event('input'));
    }
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectNone((req) => req.method === 'POST');
    expect(el.textContent).toContain('password is required');
  });
});
