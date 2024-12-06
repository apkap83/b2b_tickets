import { Pool } from 'pg';
import { config } from '@b2b-tickets/config';

export * from './sequelize';
export * from './sequelize/seeders/seedDB';

export const pgB2Bpool = new Pool({
  user: config.postgres_b2b_database.username,
  password: process.env['POSTGRES_B2B_PASSWORD'],
  host: config.postgres_b2b_database.host,
  port: config.postgres_b2b_database.port,
  database: config.postgres_b2b_database.db,
  min: config.postgres_b2b_database.minConnections,
  max: config.postgres_b2b_database.maxConnections,
  application_name: config.postgres_b2b_database.applicationName,
  connectionTimeoutMillis: config.postgres_b2b_database.connectionTimeout,
  idleTimeoutMillis: config.postgres_b2b_database.idleTimeout,
  keepAlive: true,
});

// Set timezone for each connection
pgB2Bpool.on('connect', (client) => {
  client.query("SET TIME ZONE 'Europe/Athens';").catch((err) => {
    console.error('Error setting timezone:', err);
  });
});

// Function to set the search path to the desired schema
// const setSchema = async (pool: Pool, schema: string) => {
//   try {
//     await pool.query(`SET search_path TO ${schema}`);
//   } catch (error) {
//     console.error(`Error setting schema: ${error}`);
//   }
// };

// Function to set the search path to the desired schema and timezone
const setSchemaAndTimezoneFunction = async (
  pool: Pool,
  schema: string,
  timezone: string
) => {
  try {
    // Set timezone
    await pool.query(`SET TIME ZONE '${timezone}'`);
    // Set search path
    await pool.query(`SET search_path TO ${schema}`);
  } catch (error) {
    console.error(`Error setting schema or timezone: ${error}`);
  }
};

// Example usage
export const setSchemaAndTimezone = async (pool: any) => {
  await setSchemaAndTimezoneFunction(
    pool,
    config.postgres_b2b_database.schemaName,
    config.TimeZone
  );
};
