import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { RouterFirewallState } from '../../core/models/router.model';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { RouterFirewall } from './router-firewall';

const STATE: RouterFirewallState = {
  writesEnabled: true,
  enabled: true,
  mode: 'blacklist',
  firewallLevel: 'Custom',
  rules: [
    {
      domain: 'InternetGatewayDevice.X_HW_Security.IpFilterIn.3',
      name: 'Cameras',
      priority: null,
      protocol: 'TCP',
      direction: 'Bidirectional',
      sourceIpStart: '192.168.100.200',
      sourceIpEnd: '',
      destIpStart: '',
      destIpEnd: '',
      action: '',
      lanTcpPorts: '80',
      lanUdpPorts: '',
      wanTcpPorts: '',
      wanUdpPorts: '',
    },
  ],
};

async function render(state: RouterFirewallState) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ConfirmService, useValue: { ask: () => Promise.resolve(true) } },
    ],
  });
  const fixture = TestBed.createComponent(RouterFirewall);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/router/firewall')).flush(state);
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  return { fixture, http, el, button };
}

describe('RouterFirewall', () => {
  it('shows rules read-only when writes are turned off on the server', async () => {
    const { el, button } = await render({ ...STATE, writesEnabled: false });

    expect(el.textContent).toContain('Cameras');
    expect(el.textContent).toContain('ROUTER_WRITES_ENABLED');
    expect(button('New rule')).toBeUndefined();
    expect(button('Edit')).toBeUndefined();
  });

  it('edits a rule and sends only the ports that belong to the chosen protocol', async () => {
    const { fixture, http, el, button } = await render(STATE);

    button('Edit')!.click();
    fixture.detectChanges();
    const protocol = el.querySelector<HTMLSelectElement>('#rf-protocol')!;
    protocol.value = 'UDP';
    protocol.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const udp = el.querySelector<HTMLInputElement>('#rf-lan-udp')!;
    udp.value = '53';
    udp.dispatchEvent(new Event('input'));
    expect(el.querySelector('#rf-lan-tcp')).toBeNull();

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const put = http.expectOne((req) => req.url.endsWith('/router/firewall/rules/3'));
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toMatchObject({
      name: 'Cameras',
      protocol: 'UDP',
      lanTcpPorts: '',
      lanUdpPorts: '53',
    });
  });
});
