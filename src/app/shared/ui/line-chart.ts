import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { formatDateTime, formatTime } from '../util/format';

export interface ChartPoint {
  at: string;
  value: number | null;
  /** Optional upper bound for the bucket (e.g. max latency), drawn as a band above the line. */
  max?: number | null;
}

const HEIGHT = 180;
const PAD = { top: 12, right: 12, bottom: 22, left: 46 };

/**
 * SVG time-series chart for measured values. Gaps (null values, or missing buckets longer than
 * twice the bucket size) break the line instead of being interpolated, so it never implies data
 * that was not recorded. Hovering shows the exact bucket.
 */
@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + width + ' ' + height()"
      preserveAspectRatio="none"
      role="img"
      [attr.aria-label]="label()"
      (mousemove)="hover($event)"
      (mouseleave)="hovered.set(null)"
    >
      @for (tick of geometry().yTicks; track tick.value) {
        <line
          class="grid"
          [attr.x1]="pad.left"
          [attr.x2]="width - pad.right"
          [attr.y1]="tick.y"
          [attr.y2]="tick.y"
        />
        <text class="axis" [attr.x]="pad.left - 8" [attr.y]="tick.y + 3" text-anchor="end">
          {{ tick.value }}
        </text>
      }
      @for (tick of geometry().xTicks; track tick.x) {
        <text
          class="axis"
          [attr.x]="tick.x"
          [attr.y]="height() - 6"
          [attr.text-anchor]="tick.anchor"
        >
          {{ tick.label }}
        </text>
      }
      <path class="band" [attr.d]="geometry().band" />
      <path class="line" [attr.d]="geometry().path" />
      @if (hoveredPoint(); as point) {
        <line
          class="cursor"
          [attr.x1]="point.x"
          [attr.x2]="point.x"
          [attr.y1]="pad.top"
          [attr.y2]="height() - pad.bottom"
        />
        <circle class="dot" [attr.cx]="point.x" [attr.cy]="point.y" r="3" />
      }
    </svg>
    @if (hoveredPoint(); as point) {
      <div
        class="readout"
        [style.left.%]="(point.x / width) * 100"
        [class.flip]="point.x > width * 0.7"
      >
        <span class="readout__time">{{ point.time }}</span>
        <span class="mono">{{ point.value }}{{ unit() }}</span>
        @if (point.max !== null) {
          <span class="readout__max mono">max {{ point.max }}{{ unit() }}</span>
        }
      </div>
    }
    <span class="unit">{{ unit().trim() }}</span>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      overflow: visible;
    }
    .grid {
      stroke: var(--chart-grid);
      stroke-width: 1;
    }
    .axis {
      fill: var(--color-text-tertiary);
      font-size: 10px;
      font-family: var(--font-mono);
    }
    .line {
      fill: none;
      stroke: var(--chart-line);
      stroke-width: 1.5;
      vector-effect: non-scaling-stroke;
    }
    .band {
      fill: var(--chart-band);
      stroke: none;
    }
    .cursor {
      stroke: var(--color-text-tertiary);
      stroke-dasharray: 2 3;
      vector-effect: non-scaling-stroke;
    }
    .dot {
      fill: var(--color-surface);
      stroke: var(--chart-line);
      stroke-width: 1.5;
      vector-effect: non-scaling-stroke;
    }
    .unit {
      position: absolute;
      top: 0;
      left: 0;
      font-size: 10px;
      font-family: var(--font-mono);
      color: var(--color-text-tertiary);
    }
    .readout {
      position: absolute;
      top: 4px;
      display: grid;
      gap: 1px;
      margin-left: 10px;
      padding: 5px 8px;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius);
      background: var(--color-surface-raised);
      font-size: var(--text-xs);
      pointer-events: none;
      white-space: nowrap;
    }
    .readout.flip {
      transform: translateX(calc(-100% - 20px));
    }
    .readout__time,
    .readout__max {
      color: var(--color-text-tertiary);
    }
  `,
  host: { '[style.height.px]': 'height()' },
})
export class LineChart {
  readonly points = input.required<ChartPoint[]>();
  readonly bucketMinutes = input(1);
  readonly unit = input('');
  readonly label = input('Chart');
  readonly height = input(HEIGHT);

  protected readonly width = 900;
  protected readonly pad = PAD;
  protected readonly hovered = signal<number | null>(null);

  private readonly measured = computed(
    () =>
      this.points()
        .filter((point) => point.value !== null)
        .map((point) => ({ ...point, time: new Date(point.at).getTime() })) as {
        at: string;
        value: number;
        max?: number | null;
        time: number;
      }[],
  );

  private readonly scale = computed(() => {
    const points = this.measured();
    const minTime = Math.min(...points.map((point) => point.time));
    const maxTime = Math.max(...points.map((point) => point.time), minTime + 1);
    const top = niceCeiling(Math.max(...points.map((point) => point.max ?? point.value)));
    const bottom = this.height() - PAD.bottom;
    return {
      x: (time: number) =>
        PAD.left + ((time - minTime) / (maxTime - minTime)) * (this.width - PAD.left - PAD.right),
      y: (value: number) => bottom - (value / top) * (bottom - PAD.top),
      minTime,
      maxTime,
      top,
    };
  });

  protected readonly geometry = computed(() => {
    const points = this.measured();
    if (points.length === 0) return { path: '', band: '', xTicks: [], yTicks: [] };
    const { x, y, minTime, maxTime, top } = this.scale();
    const gapMs = this.bucketMinutes() * 60_000 * 2;

    // Split into runs of consecutive buckets; every run is drawn on its own.
    const runs: (typeof points)[] = [];
    points.forEach((point, index) => {
      if (index === 0 || point.time - points[index - 1]!.time > gapMs) runs.push([]);
      runs[runs.length - 1]!.push(point);
    });

    const line = (run: typeof points, pick: (p: (typeof points)[number]) => number) =>
      run
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.time).toFixed(1)},${y(pick(p)).toFixed(1)}`)
        .join('');

    const path = runs.map((run) => line(run, (p) => p.value)).join('');
    const band = runs
      .filter((run) => run.some((p) => p.max != null))
      .map((run) => {
        const upper = line(run, (p) => p.max ?? p.value);
        const lower = [...run]
          .reverse()
          .map((p) => `L${x(p.time).toFixed(1)},${y(p.value).toFixed(1)}`)
          .join('');
        return `${upper}${lower}Z`;
      })
      .join('');

    const spansDays = maxTime - minTime > 36 * 3_600_000;
    const label = (time: number) =>
      spansDays ? formatDateTime(new Date(time)).slice(5, 16) : formatTime(new Date(time));
    return {
      path,
      band,
      yTicks: [0, top / 2, top].map((value) => ({ value: round(value), y: y(value) })),
      xTicks: [
        { x: x(minTime), label: label(minTime), anchor: 'start' },
        { x: x((minTime + maxTime) / 2), label: label((minTime + maxTime) / 2), anchor: 'middle' },
        { x: x(maxTime), label: label(maxTime), anchor: 'end' },
      ],
    };
  });

  protected readonly hoveredPoint = computed(() => {
    const index = this.hovered();
    const point = index === null ? undefined : this.measured()[index];
    if (!point) return null;
    const { x, y } = this.scale();
    return {
      x: x(point.time),
      y: y(point.value),
      value: round(point.value),
      max: point.max == null ? null : round(point.max),
      time: formatDateTime(point.at),
    };
  });

  protected hover(event: MouseEvent) {
    const points = this.measured();
    if (points.length === 0) return;
    const svg = event.currentTarget as SVGSVGElement;
    const ratio =
      (event.clientX - svg.getBoundingClientRect().left) / svg.getBoundingClientRect().width;
    const { x } = this.scale();
    const target = ratio * this.width;
    let nearest = 0;
    points.forEach((point, index) => {
      if (Math.abs(x(point.time) - target) < Math.abs(x(points[nearest]!.time) - target))
        nearest = index;
    });
    this.hovered.set(nearest);
  }
}

function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
