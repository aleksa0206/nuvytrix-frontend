# Nuvytrix Frontend

Angular client for [nuvytrix-backend](https://github.com/aleksa0206/nuvytrix-backend), the dashboard I use for my home network: devices, the router's firewall log, ping and DNS checks, and the firewall rules I want on the router.

## Screens

- Overview: is the router up, how many devices are online, new devices, recent firewall activity, failing checks
- Devices: everything nmap found, search and filters, a details page with custom name, type and notes, scan history
- Firewall: events with filters and details, insights (repeated denials, accepted inbound traffic, most denied ports), log upload with a report of skipped and rejected lines, and rules with step-by-step instructions for applying them on the router
- Monitoring: ping and DNS targets, latency, packet loss, uptime and a latency chart
- DNS: AdGuard Home status and stats
- Settings: what works on my hardware and what doesn't, current config, audit log

If something hasn't been measured or set up yet, the page says so ("Not checked yet", "Not configured", "Requires hardware") instead of showing zeros. Charts leave gaps where there's no data.

## Running locally

```bash
npm install
npm start          # http://localhost:4200
npm test
npm run lint
npm run build
```

The backend needs to run on `http://127.0.0.1:4000`. The app always calls `/api` on its own origin: in development `proxy.conf.json` forwards it to the backend, in production nginx does. That keeps the session cookie first-party, so there's no CORS setup and no frontend environment config.

## Structure

```
src/app/
  core/       API helpers and error handling, auth (session, guards, interceptor), models, services
  shared/     UI components (status badge, pagination, empty/error states, confirm dialog, chart) and formatting
  layout/     shell with sidebar, theme
  features/   overview, devices, firewall, monitoring, dns, settings, auth
src/styles/   tokens, base styles, shared classes
```

Components never call `HttpClient` directly. Pages get their data from resource methods in `core/services` (built on `httpResource`), which reload by themselves when the filters they depend on change.

## Design

Dark theme by default with a light one in the sidebar. Grey surfaces, one blue accent, and green, amber and red only for status, always with a text label next to the color. Dense tables, monospace for IPs and ports. All tokens are in `src/styles/_tokens.scss`.

## Deployment

The Docker image builds the app and serves it with nginx, which also proxies `/api` and `/api-docs` to the backend and adds the security headers. It's started by `docker-compose.yml` in the backend repository, which expects this repo next to it. Setup steps are in the backend README.
