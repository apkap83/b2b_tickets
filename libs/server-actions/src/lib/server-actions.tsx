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

interface TicketCategory {
  category_id: string;
  Category: string;
}

export const getTicketCategoriesForUserId = async ({
  userId,
}: {
  userId: number;
}): Promise<TicketCategory[]> => {
  await setSchema(pgB2Bpool, config['postgresSchemaName']);
  try {
    const query =
      'SELECT category_id, "Category" FROM ticket_categories_v WHERE user_id = $1';
    const res = await pgB2Bpool.query(query, [userId]);
    return res.rows;
  } catch (error) {
    throw error;
  }
};

interface ServiceType {
  service_id: string;
  'Service Name': string;
}

export const getServiceTypes = async (): Promise<ServiceType[]> => {
  await setSchema(pgB2Bpool, config['postgresSchemaName']);
  try {
    const query =
      'SELECT service_id, "Service Name" from service_types_v where start_date < CURRENT_TIMESTAMP and end_date is null';
    const res = await pgB2Bpool.query(query);
    return res.rows;
  } catch (error) {
    throw error;
  }
};
