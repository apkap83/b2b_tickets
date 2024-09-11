'use server';

import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import { redirect } from 'next/navigation';
import * as yup from 'yup';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { pgB2Bpool, setSchema } from '@b2b-tickets/db-access';
import { config } from '@b2b-tickets/config';
import { toFormState, fromErrorToFormState } from '@b2b-tickets/utils';
import { getEnvVariable } from '@b2b-tickets/utils';
import {
  Ticket,
  TicketCategory,
  ServiceType,
  TicketFormState,
} from '@b2b-tickets/shared-models';
import { sequelize } from '@b2b-tickets/db-access';

import { TicketDetail } from '@b2b-tickets/shared-models';

import { syncDatabaseAlterTrue } from '@b2b-tickets/db-access';
import { populateDB } from '@b2b-tickets/db-access';
import { convertToISODate } from '@b2b-tickets/utils';

export const seedDB = async () => {
  // TODO Session & Authorization Enabled Action
  await populateDB();
};
export const syncDBAlterTrueAction = async () => {
  // TODO Session & Authorization Enabled Action
  // const session = await getServerSession(options);
  // if (!session) {
  //   throw new Error('Unauthenticated access: User is not authenticated');
  // }
  // if (!userHasPermission(session, 'Sync DB (Alter True)')) {
  //   throw new Error(
  //     'Unauthorized access: User is not authorized for this action (Sync DB (Alter True))'
  //   );
  // }
  await syncDatabaseAlterTrue();
};

export const getAllTicketsForCustomerId = async ({
  userId,
}: {
  userId: number;
}): Promise<Ticket[]> => {
  await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);

  try {
    // const query =
    //   'SELECT category_id, "Category" FROM ticket_categories_v WHERE user_id = $1';
    // const res = await pgB2Bpool.query(query, [userId]);

    // Find Customer ID for User
    const queryForCustomerId =
      'SELECT customer_id FROM users WHERE user_id = $1';
    const customerIdRes = await pgB2Bpool.query(queryForCustomerId, [userId]);

    const customerId = customerIdRes.rows[0]['customer_id'];

    // Find Customer Name from Customer ID
    const queryForCustomerName =
      'SELECT customer_name FROM customers WHERE customer_id = $1';
    const customerNameRes = await pgB2Bpool.query(queryForCustomerName, [
      customerId,
    ]);

    const customerName = customerNameRes.rows[0]['customer_name'];

    // Artificial Delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // In case there is no Customer Id then return all
    if (customerId === '-1') {
      const query = 'SELECT * FROM tickets_v order by "Opened" DESC';
      const res = await pgB2Bpool.query(query);
      return res?.rows as Ticket[]; // Type assertion to ensure res.rows is of type Ticket[]
    }

    // Filter Tickets View by Customer Name
    const finalQuery =
      'SELECT * FROM tickets_v where "Customer" = $1 order by "Opened" DESC';
    const res = await pgB2Bpool.query(finalQuery, [customerName]);

    return res?.rows as Ticket[]; // Type assertion to ensure res.rows is of type Ticket[]
  } catch (error) {
    throw error;
  }
};

export const getTicketDetailsForTicketId = async ({
  ticketNumber,
}: {
  ticketNumber: string;
}): Promise<TicketDetail[]> => {
  await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);

  try {
    const queryForTicketsCategoriesAndTypes = `
    SELECT 
        ticket_id,
        t.customer_id,
        ticket_number,
        title,
        description,
        t.category_id,
        t.service_id,
        equipment_id,
        sid,
        cid,
        username,
        cli,
        contact_person,
        contact_phone_number,
        occurrence_date,
        open_date,
        open_user_id,
        t.status_id,
        status_date,
        status_user_id,
        close_date,
        close_user_id,
        root_cause,
        t.creation_date,
        t.creation_user,
        category_name,
        service_name,
        start_date,
        end_date,
        statuses.status_name
    FROM tickets as t
    INNER JOIN ticket_categories as tc
    ON t.category_id = tc.category_id
    INNER JOIN service_types as s
    ON t.service_id = s.service_id
    INNER JOIN statuses as statuses
    ON statuses.status_id = t.status_id
    WHERE t.ticket_number = $1
    
    `;

    const queryForComments = `
      SELECT tc.comment_id,
      tc.ticket_id,
      tc.comment_date,
      tc.comment_user_id,
      tc.comment,
      tc.is_closure,
      tc.creation_date,
      tc.creation_user,
      u.username,
      u.first_name,
      u.last_name,
      c.customer_name
      FROM tickets as t
      INNER JOIN ticket_comments as tc
      ON t.ticket_id = tc.ticket_id
      INNER JOIN users as u
      ON u.user_id = tc.comment_user_id
      INNER JOIN customers as c
      ON u.customer_id = c.customer_id
      WHERE t.ticket_number = $1
    `;
    const queryRes1 = await pgB2Bpool.query(queryForTicketsCategoriesAndTypes, [
      ticketNumber,
    ]);
    const queryRes2 = await pgB2Bpool.query(queryForComments, [ticketNumber]);
    queryRes1.rows[0]['comments'] = queryRes2.rows;

    await new Promise((resolve) => setTimeout(resolve, 250));
    return queryRes1.rows;
  } catch (error) {
    throw error;
  }
};

export const getTicketCategoriesForUserId = async ({
  userId,
}: {
  userId: number;
}): Promise<TicketCategory[]> => {
  await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);
  try {
    const query =
      'SELECT category_id, "Category" FROM ticket_categories_v WHERE user_id = $1';
    const res = await pgB2Bpool.query(query, [userId]);
    return res.rows;
  } catch (error) {
    throw error;
  }
};

export const getServiceTypes = async (): Promise<ServiceType[]> => {
  await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);
  try {
    const query =
      'SELECT service_id, "Service Name" from service_types_v where start_date < CURRENT_TIMESTAMP and end_date is null';
    const res = await pgB2Bpool.query(query);
    return res.rows;
  } catch (error) {
    throw error;
  }
};

const ticketSchema = yup.object().shape({
  title: yup.string().required('Title is required'),
  description: yup.string().required('Description is required'),
  category: yup
    .string()
    .required('Category is required')
    .test(
      'is-valid-number',
      'Category cannot be empty',
      (value) => value !== '' && !isNaN(Number(value))
    ),
  service: yup
    .string()
    .required('Service name is required')
    .test(
      'is-valid-number',
      'Service cannot be empty',
      (value) => value !== '' && !isNaN(Number(value))
    ),
  equipmentId: yup.string().required('Equipment Id is required'),
  sid: yup.string(),
  cid: yup.string(),
  userName: yup.string(),
  cliValue: yup.string(),
  contactPerson: yup.string().required('Contact Person is required'),
  contactPhoneNum: yup
    .string()
    .required('Contact Phone Number is required')
    .matches(/^[0-9]+$/, 'Contact Phone Number must be numeric')
    .min(10, 'Contact Phone Number must be at least 10 characters long'),
  occurrenceDate: yup
    .string()
    .required('Occurrence date is required')
    .test(
      'at-least-one',
      'At least one of SID, CID, User Name, or CLI Value is required',
      function (value) {
        return (
          this.parent.sid ||
          this.parent.cid ||
          this.parent.userName ||
          this.parent.cliValue
        );
      }
    ),
});

const ticketSchema_zod = z
  .object({
    title: z.string().nonempty('Title is required'),
    description: z.string().nonempty('Description is required'),
    category: z
      .string()
      .nonempty('Category is required')
      .refine((value) => value !== '' && !isNaN(Number(value)), {
        message: 'Category cannot be empty',
      }),
    service: z
      .string()
      .nonempty('Service name is required')
      .refine((value) => value !== '' && !isNaN(Number(value)), {
        message: 'Service cannot be empty',
      }),
    equipmentId: z.string().nonempty('Equipment Id is required'),
    sid: z.string().optional(),
    cid: z.string().optional(),
    userName: z.string().optional(),
    cliValue: z.string().optional(),
    contactPerson: z.string().nonempty('Contact Person is required'),
    contactPhoneNum: z
      .string()
      .nonempty('Contact Phone Number is required')
      .regex(/^[0-9]+$/, 'Contact Phone Number must be numeric')
      .min(10, 'Contact Phone Number must be at least 10 characters long'),
    occurrenceDate: z.string().nonempty('Occurrence date is required'),
  })
  .refine((data) => data.sid || data.cid || data.userName || data.cliValue, {
    message: 'At least one of SID, CID, User Name, or CLI Value is required',
    path: ['occurrenceDate'], // This points to the field where the error will be shown
  });

export const createNewTicket = async (
  formState: TicketFormState,
  formData: FormData
): Promise<any> => {
  try {
    const session = await getServerSession(options);
    await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);

    const {
      title,
      description,
      category,
      service,
      equipmentId,
      sid,
      cid,
      userName,
      cliValue,
      contactPerson,
      contactPhoneNum,
      occurrenceDate,
    } = ticketSchema_zod.parse({
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      service: formData.get('service'),
      equipmentId: formData.get('equipmentId'),
      sid: formData.get('sid'),
      cid: formData.get('cid'),
      userName: formData.get('userName'),
      cliValue: formData.get('cliValue'),
      contactPerson: formData.get('contactPerson'),
      contactPhoneNum: formData.get('contactPhoneNum'),
      occurrenceDate: formData.get('occurrenceDate'),
    });

    // const title = formData.get('title');
    // const description = formData.get('description');
    // const category = formData.get('category');
    // const service = formData.get('service');
    // const equipmentId = formData.get('equipmentId');
    // const sid = formData.get('sid');
    // const cid = formData.get('cid');
    // const userName = formData.get('userName');
    // const cliValue = formData.get('cliValue');
    // const contactPerson = formData.get('contactPerson');
    // const contactPhoneNum = formData.get('contactPhoneNum');
    // const occurrenceDate = formData.get('occurrenceDate');

    const standardizedDate = convertToISODate(occurrenceDate);

    const ticketData = {
      title,
      description,
      category,
      service,
      equipmentId,
      sid,
      cid,
      userName,
      cliValue,
      contactPerson,
      contactPhoneNum,
      occurrenceDate: standardizedDate,
    };

    // Validate input data with yup
    // await ticketSchema.validate(ticketData, { abortEarly: false });

    // TODO: Define proper user Id and api User from session
    const result = await pgB2Bpool.query(
      'SELECT b2btickets_dev.tck_ticket_new($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)',
      [
        title,
        description,
        category,
        service,
        equipmentId,
        sid,
        cid,
        userName,
        cliValue,
        contactPerson,
        contactPhoneNum,
        standardizedDate,
        //@ts-ignore
        session.user.user_id,
        // TODO: What to set for config.api.user/process in production ?
        //@ts-ignore
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]
    );

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/tickets');
    return toFormState('SUCCESS', 'Ticket Created!');
  } catch (error) {
    console.log('ERROR', error);
    return fromErrorToFormState(error);
  }
};

const commentSchema_zod = z.object({
  ticketId: z.string(),
  comment: z.string().min(1),
  isClosure: z.string(),
  ticketNumber: z.string(),
});

export const createNewComment = async (
  formState: TicketFormState,
  formData: FormData
): Promise<any> => {
  try {
    const session = await getServerSession(options);
    await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);

    const { comment, ticketId, ticketNumber, isClosure } =
      commentSchema_zod.parse({
        ticketId: formData.get('ticketId'),
        comment: formData.get('comment'),
        isClosure: formData.get('isClosure'),
        ticketNumber: formData.get('ticketNumber'),
      });

    const result = await pgB2Bpool.query(
      'CALL b2btickets_dev.cmt_insert($1, $2, $3, $4, $5, $6, $7)',
      [
        ticketId,
        comment,
        isClosure,
        session.user.user_id,
        //@ts-ignore
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]
    );

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath(`/ticket/${ticketNumber}`);
    return toFormState('SUCCESS', 'Comment Created!');
  } catch (error) {
    console.log('ERROR', error);
    return fromErrorToFormState(error);
  }
};

export async function updateTicketStatus({ ticketId, statusId, userId }: any) {
  try {
    // TODO Enable below line
    // await checkAuthenticationAndAdminRole();

    const session = await getServerSession(options);
    await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);

    const result = await pgB2Bpool.query(
      'CALL b2btickets_dev.tck_ticket_status_update($1, $2, $3, $4, $5, $6, $7)',
      [
        ticketId,
        statusId,
        userId,
        'No Comment',
        //@ts-ignore
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]
    );

    revalidatePath('/tickets');

    return {
      status: `SUCCESS`,
      message: `Ticket was updated successfuly`,
    };
  } catch (error: any) {
    return { status: 'ERROR', message: error.message };
  }
}
