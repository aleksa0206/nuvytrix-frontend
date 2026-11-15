import { HttpParams } from '@angular/common/http';

// Always same-origin: nginx (production) and the dev-server proxy forward /api to the backend,
// which keeps the session cookie first-party and removes the need for CORS.
export const API_URL = '/api';

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

type QueryValue = string | number | boolean | undefined | null;

/** Skips empty values so an "All" filter does not end up as `?status=` in the URL. */
export function toParams(query: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query) as [string, QueryValue][]) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}
