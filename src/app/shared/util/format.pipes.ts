import { Pipe, PipeTransform } from '@angular/core';
import {
  formatBytes,
  formatDateTime,
  formatEndpoint,
  formatNumber,
  formatRelative,
} from './format';

@Pipe({ name: 'dateTime' })
export class DateTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatDateTime(value);
  }
}

// Pure: the text updates when the underlying data reloads, not on a timer.
@Pipe({ name: 'relative' })
export class RelativePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatRelative(value);
  }
}

@Pipe({ name: 'num' })
export class NumberPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatNumber(value);
  }
}

@Pipe({ name: 'bytes' })
export class BytesPipe implements PipeTransform {
  transform(value: number): string {
    return formatBytes(value);
  }
}

@Pipe({ name: 'endpoint' })
export class EndpointPipe implements PipeTransform {
  transform(ip: string, port: number | null): string {
    return formatEndpoint(ip, port);
  }
}

export const FORMAT_PIPES = [DateTimePipe, RelativePipe, NumberPipe, BytesPipe, EndpointPipe];
