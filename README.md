# Hydrate

Local-first hydration accountability PWA.

## Included
- Scheduled Yes/No check-ins and exact-time quick check-ins; no volume tracking
- Configurable daily start/end times with hourly slots
- Monthly calendar and Yes-rate summary
- Local browser storage and JSON export/import backup
- PWA manifest and offline shell caching

## Important
The Cloudflare Worker is currently a Hello World placeholder. This repository does not yet send scheduled push notifications. iOS web push requires a push subscription, VAPID credentials, backend subscription storage, and scheduled delivery. Notification action buttons and background behaviour must be tested on the target iPhone before relying on them.

Check-in history stays in browser localStorage and is not sent to the backend by this version. Export backups regularly. Clearing Safari website data or removing the installed web app can erase local history.

GitHub Pages project-site paths are relative so the app can run at /Hydrate/.


## Cloudflare deployment
The `worker.js` entry point and `wrangler.jsonc` configuration are deployed through Cloudflare Workers Builds. Push notifications require the Cloudflare D1 binding and VAPID runtime variables configured on the Worker.
