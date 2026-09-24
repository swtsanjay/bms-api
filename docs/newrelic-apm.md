# New Relic APM

The New Relic Node.js agent is initialized in `src/app.ts` after environment
loading and before Express, Knex, Axios, Redis, and Winston are imported. This
ordering is required for automatic instrumentation.

## Required runtime environment

Copy the relevant values from `.env.newrelic.example` into the environment that
runs `bms-api`:

```sh
NEW_RELIC_ENABLED=true
NEW_RELIC_APP_NAME=BMS API - Production
NEW_RELIC_LICENSE_KEY=replace-with-your-license-key
NEW_RELIC_LOG=stdout
NEW_RELIC_LOG_LEVEL=info
```

Do not commit the license key. Production should provide it through the same
secret/environment mechanism used for database, Razorpay, Mailgun, and AWS
credentials.

Use distinct application names, such as `BMS API - Local`, `BMS API - Staging`,
and `BMS API - Production`, so telemetry from different environments is not
merged.

## Application logs

Application-log forwarding is disabled by default to limit sensitive-data and
ingest risk. Enable it explicitly only when required:

```sh
NEW_RELIC_APPLICATION_LOGGING_FORWARDING_ENABLED=true
NEW_RELIC_APPLICATION_LOGGING_FORWARDING_MAX_SAMPLES_STORED=2000
```

Do not enable in-agent log forwarding when the same logs are already sent to
New Relic by another forwarder.

## Local verification

1. Add the New Relic variables to `.env.dev`.
2. Build and restart the API.
3. Call a few API routes.
4. Wait a few minutes, then open **APM & Services** in New Relic and select the
   configured application name.

If data does not appear, inspect the process output for New Relic agent messages
and confirm that the license key is the ingest/license key, not a user API key.

## Docker/production

The agent is a production dependency and is installed during the existing
Docker `npm install` step. The image uses Node.js 22 because New Relic agent v14
does not support Node.js 20. Pass all `NEW_RELIC_*` values to the container at
runtime and restart the container after changing them. No license key is baked
into the image. Production must run with `NODE_ENV=prod`; do not override it
with `local`.
