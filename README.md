# Nuvytrix — Frontend

Angular client for **Nuvytrix**, a personal platform for monitoring and administering a home
network: device discovery, firewall log analysis, availability monitoring, DNS statistics and
firewall rule tracking.

The REST API, database and deployment files live in the separate `nuvytrix-backend` repository.

## Principles

- **Only real data.** Every number comes from the API. When something has not been measured,
  imported or configured, the UI says so ("Not checked yet", "Not configured", "Requires hardware")
  instead of showing placeholders or zeros. Charts break where no measurement exists.
- **Observations, not verdicts.** Firewall insights describe patterns and carry the API's
  disclaimer. Nothing is labelled an attack.
- **No pretend control of the router.** Firewall rules are intended state with manual instructions.
  "Marked applied" is the administrator's statement and is shown as unverified.

## Stack

Angular 22 (standalone components, signals, `httpResource`, reactive forms, functional
interceptors), SCSS with design tokens, Vitest, ESLint (angular-eslint) and Prettier. No UI or
state-management libraries.

## Structure

```
src/app/
  core/
    api/        API base path, query params, error normalization (ApiError)
    auth/       session state, guards, 401 interceptor
    models/     API response types
    services/   all HTTP access (components never call HttpClient directly)
    polling.ts  refresh while the tab is visible
  shared/
    ui/         state badge, page header, pagination, empty/error/loading states,
                confirmation dialog, SVG line chart
    util/       formatting helpers and pipes
  layout/       app shell (sidebar, responsive navigation), theme
  features/     overview, devices, firewall (events, insights, imports, rules),
                monitoring, dns, settings, auth
src/styles/     tokens, base styles, shared component classes
```

Pages read data through resource factories in `core/services` (for example
`DevicesService.listResource(query)`), which re-request automatically when the signals they depend
on change.

## Visual language

Dark theme by default, with a light theme toggle. Neutral grey surfaces, one blue accent, and
status colors (green, amber, red, grey) reserved for states, always paired with a text label.
Dense 32 px table rows, monospace for addresses and ports, no gradients, glass effects or
decorative icons. Design tokens are in `src/styles/_tokens.scss`.

## Development

Requirements: Node.js 22+ and a running backend (see `nuvytrix-backend`).

```bash
npm install
npm start            # http://localhost:4200, /api is proxied to http://127.0.0.1:4000
```

The app always calls the same-origin path `/api`. In development `proxy.conf.json` forwards it to
the backend; in production nginx does. The session cookie therefore stays first-party, and there
is no CORS configuration. There are no frontend environment variables or secrets.

```bash
npm test             # Vitest
npm run lint
npm run format:check
npm run build
```

## Deployment

The production image builds the app and serves it with nginx, which also proxies `/api` and
`/api-docs` to the backend (`API_UPSTREAM`) and sets security headers (CSP, frame denial,
no-sniff). It is built and started by the backend repository's `docker-compose.yml`, which expects
this repository checked out next to it:

```
~/nuvytrix/
  nuvytrix-backend/     docker compose up -d --build
  nuvytrix-frontend/
```

See the backend README for the full deployment, backup and update instructions.
