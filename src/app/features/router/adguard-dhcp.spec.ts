import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdguardDhcp, type AdguardDhcpState } from './adguard-dhcp';

const STATE: AdguardDhcpState = {
  enabled: true,
  interface: 'enp4s0',
  gateway: '192.168.100.1',
  subnetMask: '255.255.255.0',
  rangeStart: '192.168.100.30',
  rangeEnd: '192.168.100.254',
  leaseSeconds: 86400,
  leases: [
    {
      mac: 'aa:bb:cc:00:00:99',
      ip: '192.168.100.99',
      hostname: 'phone',
      deviceName: null,
      expires: '2026-11-20T10:00:00Z',
    },
  ],
  staticLeases: [
    {
      mac: 'aa:bb:cc:00:00:02',
      ip: '192.168.100.2',
      hostname: 'pc',
      deviceName: 'Admin PC',
      expires: null,
    },
  ],
};

async function render(state: AdguardDhcpState) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(AdguardDhcp);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/dns/dhcp')).flush(state);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('AdguardDhcp', () => {
  it('lists static and dynamic leases by device name, else host name', async () => {
    const el = await render(STATE);
    expect(el.textContent).toContain('192.168.100.30 – 192.168.100.254');
    const rows = [...el.querySelectorAll('tbody tr')].map((r) => r.textContent);
    expect(rows[0]).toContain('Admin PC');
    expect(rows[0]).toContain('fixed');
    expect(rows[1]).toContain('phone');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('warns when the DHCP server is off', async () => {
    const el = await render({ ...STATE, enabled: false });
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('get no');
  });
});
