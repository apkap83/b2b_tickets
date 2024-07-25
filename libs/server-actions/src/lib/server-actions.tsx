'use server';
import { pgB2Bpool, setSchema } from '@b2b-tickets/db-access';
import { config } from '@b2b-tickets/config';

export const getAllTickets = async () => {
  await setSchema(pgB2Bpool, config['postgresSchemaName']);
  try {
    const query = 'SELECT * FROM tickets_v';
    const res = await pgB2Bpool.query(query);
    return res.rows;
  } catch (error) {
    throw error;
  }
};
