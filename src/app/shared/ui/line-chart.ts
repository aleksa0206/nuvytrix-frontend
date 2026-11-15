import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatDateTime, formatTime } from '../util/format';

export interface ChartPoint {
  at: string;
  value: number | null;
}

const WIDTH = 720;
const HEIGHT = 160;
const PAD = { top: 10, right: 12, bottom: 22, left: 44 };

/**
 * Minimal SVG line chart for measured series. Gaps (null values, or missing buckets longer than
 * twice the bucket size) break the line instead of being interpolated, so it never implies data
 * that was not recorded.
 */
@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      preserveAspectRatio="none"
      role="img"
      [attr.aria-label]="label()"
    >
      @for (tick of geometry().yTicks; track tick.value) {
        <line
          class="grid"
          [attr.x1]="pad.left"
          [attr.x2]="width - pad.right"
          [attr.y1]="tick.y"
          [attr.y2]="tick.y"
        />
        <text class="axis" [attr.x]="pad.left - 6" [attr.y]="tick.y + 3" text-anchor="end">
          {{ tick.value }}{{ unit() }}
        </text>
      }
      @for (tick of geometry().xTicks; track tick.label) {
        <text class="axis" [attr.x]="tick.x" [attr.y]="height - 6" text-anchor="middle">
          {{ tick.label }}
        </text>
      }
      <path class="line" [attr.d]="geometry().path" />
      @for (dot of geometry().dots; track dot.x) {
        <circle class="dot" [attr.cx]="dot.x" [attr.cy]="dot.y" r="2">
          <title>{{ dot.title }}</title>
        </circle>
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      height: 160px;
    }
    .grid {
      stroke: var(--color-border);
      stroke-width: 1;
    }
    .axis {
      fill: var(--color-text-tertiary);
      font-size: 10px;
      font-family: var(--font-mono);
    }
    .line {
      fill: none;
      stroke: var(--color-accent);
      stroke-width: 1.5;
      vector-effect: non-scaling-stroke;
    }
    .dot {
      fill: var(--color-accent);
    }
  `,
})
export class LineChart {
  readonly points = input.required<ChartPoint[]>();
  readonly bucketMinutes = input(1);
  readonly unit = input('');
  readonly label = input('Chart');

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly pad = PAD;

  protected readonly geometry = computed(() => {
    const points = this.points().filter((point) => point.value !== null) as {
      at: string;
      value: number;
    }[];
    if (points.length === 0) return { path: '', dots: [], xTicks: [], yTicks: [] };

    const times = points.map((point) => new Date(point.at).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times, minTime + 1);
    const maxValue = niceCeiling(Math.max(...points.map((point) => point.value)));
    const x = (time: number) =>
      PAD.left + ((time - minTime) / (maxTime - minTime)) * (WIDTH - PAD.left - PAD.right);
    const y = (value: number) =>
      HEIGHT - PAD.bottom - (value / maxValue) * (HEIGHT - PAD.top - PAD.bottom);

    const gapMs = this.bucketMinutes() * 60_000 * 2;
    let path = '';
    points.forEach((point, index) => {
      const time = times[index]!;
      const startsSegment = index === 0 || time - times[index - 1]! > gapMs;
      path += `${startsSegment ? 'M' : 'L'}${x(time).toFixed(1)},${y(point.value).toFixed(1)}`;
    });

    return {
      path,
      dots:
        points.length <= 60
          ? points.map((point, index) => ({
              x: x(times[index]!),
              y: y(point.value),
              title: `${formatDateTime(point.at)}: ${point.value}${this.unit()}`,
            }))
          : [],
      yTicks: [0, maxValue / 2, maxValue].map((value) => ({ value: round(value), y: y(value) })),
      xTicks: [minTime, (minTime + maxTime) / 2, maxTime].map((time) => ({
        x: x(time),
        label: formatTime(new Date(time)),
      })),
    };
  });
}

function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
