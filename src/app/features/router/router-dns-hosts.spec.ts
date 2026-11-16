import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { RouterDnsHostsState } from '../../core/models/router.model';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { RouterDnsHosts } from './router-dns-hosts';

const STATE: RouterDnsHostsState = {
  writesEnabled: true,
  hosts: [
    {
      domain: 'InternetGatewayDevice.X_HW_DNS.HOSTS.3',
      index: 3,
      name: 'nas.lan',
      ip: '192.168.100.50',
    },
  ],
};

async function render(state: RouterDnsHostsState) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ConfirmService, useValue: { ask: () => Promise.resolve(true) } },
    ],
  });
  const fixture = TestBed.createComponent(RouterDnsHosts);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/router/dns-hosts')).flush(state);
  http
    .expectOne((req) => req.url.endsWith('/router/clients'))
    .flush({
      capturedAt: '2026-11-16T10:00:00Z',
      clients: [
        {
          macAddress: 'aa:bb:cc:00:00:50',
          ipAddress: '192.168.100.50',
          hostName: 'nas',
          customName: null,
        },
      ],
    });
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  return { fixture, http, el, button };
}

describe('RouterDnsHosts', () => {
  it('lists entries with the device name, read-only when writes are off', async () => {
    const { el, button } = await render({ ...STATE, writesEnabled: false });
    expect(el.textContent).toContain('nas.lan');
    expect(el.textContent).toContain('(nas)');
    expect(button('New entry')).toBeUndefined();
  });

  it('edits an entry by its index', async () => {
    const { fixture, http, el, button } = await render(STATE);

    button('Edit')!.click();
    fixture.detectChanges();
    const ip = el.querySelector<HTMLInputElement>('#dns-ip')!;
    ip.value = '192.168.100.51';
    ip.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));

    const put = http.expectOne((req) => req.url.endsWith('/router/dns-hosts/3'));
    expect(put.request.body).toEqual({ name: 'nas.lan', ip: '192.168.100.51' });
  });
});
