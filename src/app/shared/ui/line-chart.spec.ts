import { TestBed } from '@angular/core/testing';
import { LineChart } from './line-chart';

function render(points: { at: string; value: number | null }[], bucketMinutes = 1) {
  const fixture = TestBed.createComponent(LineChart);
  fixture.componentRef.setInput('points', points);
  fixture.componentRef.setInput('bucketMinutes', bucketMinutes);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).querySelector('path')!.getAttribute('d') ?? '';
}

describe('LineChart', () => {
  it('breaks the line where no measurement was recorded instead of interpolating', () => {
    const path = render([
      { at: '2026-11-14T10:00:00Z', value: 1 },
      { at: '2026-11-14T10:01:00Z', value: 2 },
      { at: '2026-11-14T10:30:00Z', value: 3 },
    ]);

    expect(path.match(/M/g)).toHaveLength(2);
  });

  it('skips null values and draws nothing when there is no data', () => {
    expect(render([{ at: '2026-11-14T10:00:00Z', value: null }])).toBe('');
    expect(render([])).toBe('');
  });
});
