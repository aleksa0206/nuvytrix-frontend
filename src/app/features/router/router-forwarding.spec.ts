import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { RouterDmzState, RouterPortTriggerState } from '../../core/models/router.model';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { RouterForwarding } from './router-forwarding';

const WAN = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANIPConnection.1';
const DMZ: RouterDmzState = {
  writesEnabled: true,
  internetWan: WAN,
  dmz: { domain: `${WAN}.X_HW_DMZ`, enabled: false, host: '192.168.100.50' },
};
const TRIGGERS: RouterPortTriggerState = {
  writesEnabled: true,
  internetWan: WAN,
  triggers: [
    {
      domain: `${WAN}.X_HW_PortTrigger.3`,
      enabled: true,
      triggerProtocol: 'TCP',
      triggerPortStart: 6660,
      triggerPortEnd: 6669,
      openProtocol: 'TCP',
      openPortStart: 113,
      openPortEnd: 113,
    },
  ],
};

async function render(dmz: RouterDmzState) {
  const ask = vi.fn(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ConfirmService, useValue: { ask } },
    ],
  });
  const fixture = TestBed.createComponent(RouterForwarding);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/router/dmz')).flush(dmz);
  http.expectOne((req) => req.url.endsWith('/router/port-triggers')).flush(TRIGGERS);
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
  return { fixture, http, el, button, ask };
}

describe('RouterForwarding', () => {
  it('shows the DMZ host by name and the triggers', async () => {
    const { el } = await render(DMZ);
    expect(el.textContent).toContain('nas');
    expect(el.textContent).toContain('TCP 6660–6669');
    expect(el.textContent).toContain('TCP 113');
  });

  it('warns before turning the DMZ on', async () => {
    const { fixture, http, button, ask } = await render(DMZ);

    button('Turn on')!.click();
    await fixture.whenStable();

    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    const put = http.expectOne((req) => req.url.endsWith('/router/dmz') && req.method === 'PUT');
    expect(put.request.body).toEqual({ host: '192.168.100.50', enabled: true });
  });

  it('edits a trigger with its index and single ports filled in', async () => {
    const { fixture, http, el, button } = await render({ ...DMZ, dmz: null });

    button('Edit')!.click();
    fixture.detectChanges();
    const end = el.querySelector<HTMLInputElement>('#pt-oend')!;
    end.value = '';
    end.dispatchEvent(new Event('input'));
    el.querySelectorAll('form')[0]!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const put = http.expectOne((req) => req.url.endsWith('/router/port-triggers/3'));
    expect(put.request.body).toMatchObject({ openPortStart: 113, openPortEnd: 113 });
  });
});
