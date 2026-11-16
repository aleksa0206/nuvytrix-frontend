import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { RouterDhcpState } from '../../core/models/router.model';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { RouterDhcp } from './router-dhcp';

const STATE: RouterDhcpState = {
  writesEnabled: true,
  server: {
    enabled: true,
    lanIp: '192.168.100.1',
    subnetMask: '255.255.255.0',
    startIp: '192.168.100.2',
    endIp: '192.168.100.254',
    leaseSeconds: 86400,
    dnsServers: [],
  },
  reservations: [
    {
      domain: 'InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.DHCPStaticAddress.4',
      enabled: true,
      ip: '192.168.100.50',
      mac: 'aa:bb:cc:00:00:50',
    },
  ],
};

async function render(state: RouterDhcpState) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ConfirmService, useValue: { ask: () => Promise.resolve(true) } },
    ],
  });
  const fixture = TestBed.createComponent(RouterDhcp);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/router/dhcp')).flush(state);
  http
    .expectOne((req) => req.url.endsWith('/router/clients'))
    .flush({
      capturedAt: '2026-11-16T10:00:00Z',
      clients: [
        {
          macAddress: 'aa:bb:cc:00:00:50',
          ipAddress: '192.168.100.50',
          hostName: 'printer',
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

describe('RouterDhcp', () => {
  it('shows the pool and names reservations after known devices, read-only when writes are off', async () => {
    const { el, button } = await render({ ...STATE, writesEnabled: false });

    expect(el.textContent).toContain('192.168.100.2 – 192.168.100.254');
    expect(el.textContent).toContain('printer');
    expect(button('New reservation')).toBeUndefined();
    expect(button('Edit')).toBeUndefined();
  });

  it('edits a reservation with the index from its domain', async () => {
    const { fixture, http, el, button } = await render(STATE);

    button('Edit')!.click();
    fixture.detectChanges();
    const ip = el.querySelector<HTMLInputElement>('#dhcp-ip')!;
    ip.value = '192.168.100.60';
    ip.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const put = http.expectOne((req) => req.url.endsWith('/router/dhcp/reservations/4'));
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ mac: 'aa:bb:cc:00:00:50', ip: '192.168.100.60' });
  });

  it('sends the lease time in seconds', async () => {
    const { fixture, http, el, button } = await render(STATE);

    button('Change pool')!.click();
    fixture.detectChanges();
    const lease = el.querySelector<HTMLInputElement>('#dhcp-lease')!;
    lease.value = '12';
    lease.dispatchEvent(new Event('input'));
    const unit = el.querySelector<HTMLSelectElement>('#dhcp-unit')!;
    unit.selectedIndex = 2; // hours
    unit.dispatchEvent(new Event('change'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const patch = http.expectOne(
      (req) => req.url.endsWith('/router/dhcp') && req.method === 'PATCH',
    );
    expect(patch.request.body).toEqual({
      startIp: '192.168.100.2',
      endIp: '192.168.100.254',
      leaseSeconds: 43200,
    });
  });
});
