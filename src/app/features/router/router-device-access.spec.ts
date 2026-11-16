import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { RouterDeviceAccess } from './router-device-access';

describe('RouterDeviceAccess', () => {
  it('asks before blocking router admin from Wi-Fi', async () => {
    const ask = vi.fn(() => Promise.resolve(true));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfirmService, useValue: { ask } },
      ],
    });
    const fixture = TestBed.createComponent(RouterDeviceAccess);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/router/device-access'))
      .flush({ writesEnabled: true, httpFromWifi: true });
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Block')!.click();
    await fixture.whenStable();

    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    const put = http.expectOne((req) => req.method === 'PUT');
    expect(put.request.body).toEqual({ httpFromWifi: false });
  });
});
