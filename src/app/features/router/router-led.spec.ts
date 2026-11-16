import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RouterLed } from './router-led';

describe('RouterLed', () => {
  it('shows the mode and switches the lights', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(RouterLed);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/router/led'))
      .flush({ writesEnabled: true, mode: 'on' });
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Off')!.click();

    const put = http.expectOne((req) => req.method === 'PUT');
    expect(put.request.body).toEqual({ mode: 'off' });
  });
});
