import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { RouterPortMappingState } from '../../core/models/router.model';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { RouterPortMapping } from './router-port-mapping';

const WAN = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANIPConnection.1';
const STATE: RouterPortMappingState = {
  writesEnabled: true,
  internetWan: WAN,
  mappings: [
    {
      domain: `${WAN}.PortMapping.2`,
      enabled: true,
      name: 'Game',
      internalHost: '192.168.100.50',
      remoteHostStart: '',
      remoteHostEnd: '',
      ranges: [
        {
          domain: `${WAN}.PortMapping.2.X_HW_Portlist.1`,
          protocol: 'TCP',
          internalPort: '25565',
          externalPort: '25565:25570',
          externalSourcePort: '',
        },
      ],
    },
  ],
};

async function render(state: RouterPortMappingState) {
  const ask = vi.fn(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ConfirmService, useValue: { ask } },
    ],
  });
  const fixture = TestBed.createComponent(RouterPortMapping);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/router/port-mappings')).flush(state);
  http
    .expectOne((req) => req.url.endsWith('/router/clients'))
    .flush({
      capturedAt: '2026-11-16T10:00:00Z',
      clients: [
        {
          macAddress: 'aa:bb:cc:00:00:50',
          ipAddress: '192.168.100.50',
          hostName: 'xbox',
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

describe('RouterPortMapping', () => {
  it('shows forwards read-only when writes are off', async () => {
    const { el, button } = await render({ ...STATE, writesEnabled: false });
    expect(el.textContent).toContain('25565–25570');
    expect(el.textContent).toContain('xbox');
    expect(button('New port forward')).toBeUndefined();
  });

  it('turns a forward off with all its settings unchanged', async () => {
    const { fixture, http, button } = await render(STATE);

    button('Turn off')!.click();
    await fixture.whenStable();

    const put = http.expectOne((req) => req.url.endsWith('/router/port-mappings/2'));
    expect(put.request.body).toEqual({
      name: 'Game',
      enabled: false,
      protocol: 'TCP',
      internalHost: '192.168.100.50',
      internalPort: 25565,
      externalPortStart: 25565,
      externalPortEnd: 25570,
      remoteHostStart: '',
      remoteHostEnd: '',
    });
  });

  it('adds a forward with the device port defaulting to the external port, after a warning', async () => {
    const { fixture, http, el, button, ask } = await render(STATE);

    button('New port forward')!.click();
    fixture.detectChanges();
    const type = (id: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(id)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('#pm-name', 'Web');
    type('#pm-host', '192.168.100.50');
    type('#pm-ext-start', '8080');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    const post = http.expectOne(
      (req) => req.url.endsWith('/router/port-mappings') && req.method === 'POST',
    );
    expect(post.request.body).toMatchObject({
      name: 'Web',
      internalPort: 8080,
      externalPortStart: 8080,
      externalPortEnd: 8080,
      enabled: true,
    });
  });
});
