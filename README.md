# Nuvytrix Frontend

Angular client for [nuvytrix-backend](https://github.com/aleksa0206/nuvytrix-backend), the dashboard I use for my home network: devices, the router's firewall log, ping and DNS checks, and the firewall rules I want on the router.

## Screens

- Overview: health strip for router, server, devices, checks, firewall log and DNS; router latency with availability history; network map; a "needs attention" list; latest firewall events and recent changes
- Topology: the logical map that can actually be known (ISP uplink, router, LAN segment, hosts grouped by type), with the device panel on click
- Devices: everything nmap found, with status, type, IP, MAC and vendor, filters with counts, and a side panel for naming and notes
- Firewall: events with filters and details, insights (repeated denials, accepted inbound traffic, most denied ports), log upload with a report of skipped and rejected lines, and rules with step-by-step instructions for applying them on the router
- Monitoring: targets on the left, and for the selected one availability, latency and packet loss compared with the previous period, a latency chart with hover readout, an availability strip and a packet loss chart
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
  features/   overview, topology, devices, firewall, monitoring, dns, settings, auth
src/styles/   tokens, base styles, shared classes
```

Components never call `HttpClient` directly. Pages get their data from resource methods in `core/services` (built on `httpResource`), which reload by themselves when the filters they depend on change.

## Design

I wanted it to read like an instrument panel rather than an admin template. IBM Plex Sans and Plex Mono (self-hosted, so no external requests), a dark console palette with a light alternative, one indigo color for anything interactive, and green, amber and red used only for status, always with a label. Panels are flat with thin borders and small uppercase headers, tables are dense with monospace addresses, and the status bar at the top shows router latency, online devices and passing checks on every page.

Charts are plain SVG components: a time series that breaks wherever no data was recorded and shows the exact bucket on hover, and an availability strip where empty cells mean nothing was measured. Icons are a small custom set used only for navigation and device types. All tokens are in `src/styles/_tokens.scss`.

## Deployment

The Docker image builds the app and serves it with nginx, which also proxies `/api` and `/api-docs` to the backend and adds the security headers. It's started by `docker-compose.yml` in the backend repository, which expects this repo next to it. Setup steps are in the backend README.
