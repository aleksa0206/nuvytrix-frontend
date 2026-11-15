import { HttpErrorResponse } from '@angular/common/http';

export interface FieldIssue {
  path: string;
  message: string;
}

/** Normalized API error: `message` is always safe to show to the user. */
export class ApiError {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly message: string,
    readonly details: FieldIssue[] = [],
  ) {}
}

const FALLBACK_MESSAGES: Record<number, string> = {
  0: 'The server cannot be reached. Check that the Nuvytrix API is running.',
  401: 'Your session has ended. Sign in again.',
  404: 'The requested item does not exist.',
  413: 'The file is too large.',
  429: 'Too many requests. Wait a moment and try again.',
  500: 'Something went wrong on the server.',
  503: 'The service is unavailable right now.',
};

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { code?: string; message?: string; details?: FieldIssue[] } | null;
    const message =
      (typeof body?.message === 'string' && error.status !== 500 ? body.message : null) ??
      FALLBACK_MESSAGES[error.status] ??
      'The request failed.';
    return new ApiError(error.status, body?.code ?? 'UNKNOWN', message, body?.details ?? []);
  }
  return new ApiError(0, 'UNKNOWN', 'Unexpected error.');
}
