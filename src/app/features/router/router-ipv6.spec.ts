import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RouterIpv6 } from './router-ipv6';

describe('RouterIpv6', () => {
  it('shows the IPv6 LAN state without any controls', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(RouterIpv6);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/router/ipv6'))
      .flush({
        prefix: { prefix: '2001:db8:1::/64', mode: 'WANDelegated' },
        routerAdvertisement: { enabled: true, managed: false, otherConfig: true, mtu: 1500 },
        dhcpv6Server: { enabled: true },
        dns: { mode: 'HGWProxy', servers: ['fe80::1'] },
      });
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('2001:db8:1::/64');
    expect(text).toContain('Automatic (SLAAC)');
    expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();
  });
});
