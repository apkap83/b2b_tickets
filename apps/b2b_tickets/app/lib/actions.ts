'use server';
import { pgB2Bpool } from '@/b2b_tickets_app/(db)';

export const getAllTickets = async () => {
  try {
    const query = 'SELECT * FROM tickets';
    const res = await pgB2Bpool.query(query);
    return res.rows;
  } catch (error) {}
};
