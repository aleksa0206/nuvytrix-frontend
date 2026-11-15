// Shapes returned by the Nuvytrix API (see the backend's /api-docs).

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export type HealthState = 'operational' | 'warning' | 'error' | 'unknown' | 'not_configured';
