import type { Knex } from 'knex';
import config from './index';
import path from 'path';

const knexConfig: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: config.database.host || 'localhost',
    user: config.database.user || 'root',
    password: config.database.password || '',
    database: config.database.name || 'bms',
    charset: 'utf8mb4',
  },
  pool: { min: 0, max: 50 },
  migrations: {
    directory: path.join(__dirname, '..', 'db-migrations'),
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: path.join(__dirname, '..', 'db/seeds'),
  },
  acquireConnectionTimeout: 60 * 1000 * 60,
  debug: false,
};

export default knexConfig;
