import knex, { Knex } from 'knex';
import knexConfig from '../config/knex';
import config from '../config';

class KnexDB {
  private static instance: Knex | undefined;

  static connect(): Knex {
    if (!KnexDB.instance) {
      KnexDB.instance = knex(knexConfig);
      KnexDB.instance.on('connection-error', (err) => {
        console.error('Database connection error:', err.message);
        process.exit(1);
      });
      if (config.IsLocal) KnexDB.instance.on('query', ({ sql }) => console.log('[db]', sql));
    }
    return KnexDB.instance;
  }

  static async disconnect(): Promise<void> {
    if (KnexDB.instance) {
      await KnexDB.instance.destroy();
      KnexDB.instance = undefined;
    }
    return Promise.resolve();
  }
}

export default KnexDB;
