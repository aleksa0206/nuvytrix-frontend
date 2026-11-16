import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { RouterUpnpSwitch } from './router-upnp-switch';

describe('RouterUpnpSwitch', () => {
  it('warns that monitoring loses UPnP data before turning it off', async () => {
    const ask = vi.fn(() => Promise.resolve(true));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfirmService, useValue: { ask } },
      ],
    });
    const fixture = TestBed.createComponent(RouterUpnpSwitch);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/router/upnp-settings'))
      .flush({ writesEnabled: true, enabled: true });
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Turn off')!.click();
    await fixture.whenStable();

    expect(ask).toHaveBeenCalledWith(
      expect.objectContaining({ danger: true, message: expect.stringContaining('Nuvytrix loses') }),
    );
    const patch = http.expectOne((req) => req.method === 'PATCH');
    expect(patch.request.body).toEqual({ enabled: false });
  });
});
