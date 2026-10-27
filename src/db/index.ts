import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  // eslint-disable-next-line no-var
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const requiredVariables = [
      'SQL_HOST',
      'SQL_DB_NAME',
      'SQL_USER',
      'SQL_PASSWORD',
    ] as const;
    const missingVariables = requiredVariables.filter(
      (name) => !process.env[name]?.trim()
    );
    if (missingVariables.length > 0) {
      throw new Error(
        `PostgreSQL runtime configuration is incomplete. Set: ${missingVariables.join(', ')}.`
      );
    }

    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      const errorFields = err as Error & { code?: string };
      console.error('Unexpected error on idle PostgreSQL client:', {
        code: errorFields.code,
        message: err.message
          .replace(/'(?:[^']|'')*'|"[^"]*"/g, '[redacted]')
          .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]'),
      });
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
