import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { RouterParentalState } from '../../core/models/router.model';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { RouterParental } from './router-parental';

const STATE: RouterParentalState = {
  writesEnabled: true,
  templates: [
    {
      index: 2,
      name: 'Kids',
      timeEnabled: true,
      timeMode: 'allow',
      urlEnabled: false,
      urlMode: 'block',
      periods: [],
      urls: [{ index: 1, url: 'example.com' }],
    },
  ],
  devices: [{ index: 1, mac: 'aa:bb:cc:00:00:50', description: '', template: 2 }],
};

async function render(state: RouterParentalState) {
  const ask = vi.fn(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ConfirmService, useValue: { ask } },
    ],
  });
  const fixture = TestBed.createComponent(RouterParental);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/router/parental')).flush(state);
  http
    .expectOne((req) => req.url.endsWith('/router/clients'))
    .flush({
      capturedAt: '2026-11-16T10:00:00Z',
      clients: [
        {
          macAddress: 'aa:bb:cc:00:00:50',
          ipAddress: '192.168.100.50',
          hostName: 'tablet',
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

describe('RouterParental', () => {
  it('names bound devices and warns that an empty allow-list blocks everything', async () => {
    const { el, button } = await render(STATE);
    expect(el.textContent).toContain('tablet');
    expect(el.textContent).toContain('no internet at all');
    // A template in use cannot be deleted.
    expect(button('Delete template')).toBeUndefined();
  });

  it('adds a time period with the selected days', async () => {
    const { fixture, http, el, button } = await render(STATE);

    button('Add time')!.click();
    fixture.detectChanges();
    const sat = [...el.querySelectorAll('label.checkbox')].find((l) =>
      l.textContent?.includes('Sat'),
    )!;
    sat.querySelector('input')!.click();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const post = http.expectOne((req) => req.url.endsWith('/router/parental/templates/2/periods'));
    expect(post.request.body).toEqual({ start: '08:00', end: '20:00', days: [1, 2, 3, 4, 5, 6] });
  });

  it('adds a template and a site from their one-field forms', async () => {
    const { fixture, http, el, button } = await render(STATE);

    const name = el.querySelector<HTMLInputElement>('#pc-new-template')!;
    name.value = 'Teens';
    name.dispatchEvent(new Event('input'));
    name.closest('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    http.expectOne((req) => req.url.endsWith('/router/parental/templates')).flush({});
    http.expectOne((req) => req.url.endsWith('/router/parental')).flush(STATE);
    await fixture.whenStable();
    fixture.detectChanges();

    button('Add site')!.click();
    fixture.detectChanges();
    const site = el.querySelector<HTMLInputElement>('#pc-url-2')!;
    site.value = 'example.org';
    site.dispatchEvent(new Event('input'));
    site.closest('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

    const post = http.expectOne((req) => req.url.endsWith('/router/parental/templates/2/urls'));
    expect(post.request.body).toEqual({ url: 'example.org' });
  });

  it('turns the time limits off after confirmation', async () => {
    const { fixture, http, el, ask } = await render(STATE);

    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Turn off')!.click();
    await fixture.whenStable();

    expect(ask).toHaveBeenCalled();
    const patch = http.expectOne((req) => req.url.endsWith('/router/parental/templates/2'));
    expect(patch.request.body).toEqual({ timeEnabled: false });
  });
});
