import pg from 'pg';
const { Pool, Client } = pg;

export const pgB2Bpool = new Pool({
  user: process.env.POSTGRES_B2B_USER_NAME,
  password: process.env.POSTGRES_B2B_PASSWORD,
  host: process.env.POSTGRES_B2B_HOST,
  port: Number.parseInt(process.env.POSTGRES_B2B_PORT || '12345', 10),
  database: process.env.POSTGRES_B2B_DB,
});

// Function to set the search path to the desired schema
const setSchema = async (pool: pg.Pool, schema: string) => {
  try {
    await pool.query(`SET search_path TO ${schema}`);
  } catch (error) {
    console.error(`Error setting schema: ${error}`);
  }
};

// Set the schema right after pool creation
(async () => {
  await setSchema(pgB2Bpool, 'b2btickets_dev');
})();

// (async () => {
//   try {
//     const res = await pool.query('SELECT NOW()');
//     console.log(res.rows[0]); // Output: { now: '2024-07-09T12:34:56.789Z' }
//   } catch (err) {
//     console.error(err);
//   } finally {
//     await pool.end();
//   }
// })();
