import { Pool } from 'pg';
import { config } from '@b2b-tickets/config';

export const pgB2Bpool = new Pool({
  user: config.postgres_b2b_database.username,
  password: process.env['POSTGRES_B2B_PASSWORD'],
  host: config.postgres_b2b_database.host,
  port: config.postgres_b2b_database.port,
  database: config.postgres_b2b_database.db,
});

// Function to set the search path to the desired schema
export const setSchema = async (pool: Pool, schema: string) => {
  try {
    await pool.query(`SET search_path TO ${schema}`);
  } catch (error) {
    console.error(`Error setting schema: ${error}`);
  }
};

// Set the schema right after pool creation
// (async () => {
//   await setSchema(pgB2Bpool, 'b2btickets_dev');
// })();

// (async () => {
//   try {
//     const res = await pgB2Bpool.query('SELECT NOW()');
//     console.log(res.rows[0]); // Output: { now: '2024-07-09T12:34:56.789Z' }
//   } catch (err) {
//     console.error(err);
//   } finally {
//     await pgB2Bpool.end();
//   }
// })();
