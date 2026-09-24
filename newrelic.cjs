'use strict';

function enabled(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const environment = process.env.NODE_ENV || 'dev';

module.exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || `BMS API - ${environment}`],
  license_key: process.env.NEW_RELIC_LICENSE_KEY || '',

  // Monitoring is explicitly opt-in so local/test environments do not report
  // telemetry accidentally. Set NEW_RELIC_ENABLED=true in the runtime.
  agent_enabled: enabled(process.env.NEW_RELIC_ENABLED),

  distributed_tracing: {
    enabled: enabled(process.env.NEW_RELIC_DISTRIBUTED_TRACING_ENABLED, true),
  },

  // Logs can contain business or customer context and also consume additional
  // ingest. Metrics stay enabled, while forwarding is explicitly opt-in.
  application_logging: {
    enabled: true,
    metrics: {
      enabled: true,
    },
    forwarding: {
      enabled: enabled(process.env.NEW_RELIC_APPLICATION_LOGGING_FORWARDING_ENABLED),
      max_samples_stored: positiveInteger(
        process.env.NEW_RELIC_APPLICATION_LOGGING_FORWARDING_MAX_SAMPLES_STORED,
        2000,
      ),
    },
    local_decorating: {
      enabled: enabled(process.env.NEW_RELIC_APPLICATION_LOGGING_LOCAL_DECORATING_ENABLED),
    },
  },

  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
    filepath: process.env.NEW_RELIC_LOG || 'stdout',
  },
};
