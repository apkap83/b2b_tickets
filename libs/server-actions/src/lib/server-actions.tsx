'use server';

import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import * as yup from 'yup';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  pgB2Bpool,
  setSchema,
  setSchemaAndTimezone,
} from '@b2b-tickets/db-access';
import { config } from '@b2b-tickets/config';
import {
  toFormState,
  fromErrorToFormState,
  userHasRole,
} from '@b2b-tickets/utils';
import {
  Ticket,
  TicketCategory,
  ServiceType,
  TicketFormState,
  AppRoleTypes,
  TicketStatus,
  TicketStatusName,
  FilterTicketsStatus,
} from '@b2b-tickets/shared-models';

import {
  TicketDetail,
  TicketDetailsModalActions,
} from '@b2b-tickets/shared-models';

import { syncDatabaseAlterTrue } from '@b2b-tickets/db-access';
import { populateDB } from '@b2b-tickets/db-access';
import { convertTo24HourFormat } from '@b2b-tickets/utils';
import { redirect } from 'next/navigation';
import { QueryResult } from 'pg';

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

export const getAllTicketsForCustomer = async (): Promise<Ticket[]> => {
  await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);

  //@ts-ignore
  const session = await getServerSession(options);

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/`);
  }
  //@ts-ignore
  const userId = session.user.user_id;

  //@ts-ignore
  const customerId = session.user.customer_id;

  //@ts-ignore
  const customerName = session.user.customer_name;

  try {
    // Artificial Delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // In case there is no Customer Id then return all
    if (customerId === '-1') {
      const query = 'SELECT * FROM tickets_v order by "Opened" DESC';
      const res = await pgB2Bpool.query(query);
      return res?.rows as Ticket[];
    }

    // Filter Tickets View by Customer Name
    const query =
      'SELECT * FROM tickets_v where "Customer" = $1 order by "Opened" DESC';
    const res = await pgB2Bpool.query(query, [customerName]);

    return res?.rows as Ticket[];
  } catch (error) {
    throw error;
  }
};

export const getFilteredTicketsForCustomer = async (
  query: string,
  currentPage: number
) => {
  await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);
  const offset = (currentPage - 1) * config.TICKET_ITEMS_PER_PAGE;

  //@ts-ignore
  const session = await getServerSession(options);

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/`);
  }
  //@ts-ignore
  const userId = session.user.user_id;

  //@ts-ignore
  const customerId = session.user.customer_id;

  //@ts-ignore
  const customerName = session.user.customer_name;

  try {
    // Artificial Delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // In case there is no Customer Id then return all
    if (customerId === '-1') {
      let sqlExpression = '';
      if (query === FilterTicketsStatus.Open)
        sqlExpression = `WHERE "Status" IN ('${TicketStatusName.NEW}','${TicketStatusName.WORKING}')`;
      if (query === FilterTicketsStatus.Closed)
        sqlExpression = `WHERE "Status" IN ('${TicketStatusName.CLOSED}','${TicketStatusName.CANCELLED}')`;

      const sqlQuery = `SELECT * FROM tickets_v ${sqlExpression} order by "Opened" DESC 
      LIMIT ${config.TICKET_ITEMS_PER_PAGE} OFFSET ${offset}
      `;
      const res = await pgB2Bpool.query(sqlQuery);
      return res?.rows as Ticket[];
    }

    let sqlExpression = '';
    if (query === FilterTicketsStatus.Open)
      sqlExpression = `AND "Status" IN ('${TicketStatusName.NEW}','${TicketStatusName.WORKING}')`;
    if (query === FilterTicketsStatus.Closed)
      sqlExpression = `AND "Status" IN ('${TicketStatusName.CLOSED}','${TicketStatusName.CANCELLED}')`;

    // Filter Tickets View by Customer Name
    const sqlQuery = `SELECT * FROM tickets_v where "Customer" = $1 ${sqlExpression} order by "Opened" DESC 
       LIMIT ${config.TICKET_ITEMS_PER_PAGE} OFFSET ${offset}
      `;

    const res = await pgB2Bpool.query(sqlQuery, [customerName]);

    return res?.rows as Ticket[];
  } catch (error) {
    throw error;
  }
};

export const getNumOfTickets = async (query: string): Promise<number> => {
  await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);

  //@ts-ignore
  const session = await getServerSession(options);

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/`);
  }
  //@ts-ignore
  const userId = session.user.user_id;

  //@ts-ignore
  const customerId = session.user.customer_id;

  //@ts-ignore
  const customerName = session.user.customer_name;

  try {
    // Artificial Delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // In case there is no Customer Id then return all
    if (customerId === '-1') {
      let sqlExpression = '';
      if (query === FilterTicketsStatus.Open)
        sqlExpression = `WHERE "Status" IN ('${TicketStatusName.NEW}','${TicketStatusName.WORKING}')`;
      if (query === FilterTicketsStatus.Closed)
        sqlExpression = `WHERE "Status" IN ('${TicketStatusName.CLOSED}','${TicketStatusName.CANCELLED}')`;

      const sqlQuery = `SELECT count(*) FROM tickets_v ${sqlExpression}`;
      const res = await pgB2Bpool.query(sqlQuery);
      return res?.rows[0].count as number;
    }

    let sqlExpression = '';
    if (query === FilterTicketsStatus.Open)
      sqlExpression = `AND "Status" IN ('${TicketStatusName.NEW}','${TicketStatusName.WORKING}')`;
    if (query === FilterTicketsStatus.Closed)
      sqlExpression = `AND "Status" IN ('${TicketStatusName.CLOSED}','${TicketStatusName.CANCELLED}')`;

    // Filter Tickets View by Customer Name
    const sqlQuery = `SELECT count(*) FROM tickets_v where "Customer" = $1 ${sqlExpression}`;
    const res = await pgB2Bpool.query(sqlQuery, [customerName]);

    return res?.rows[0].count as number;
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

  //@ts-ignore
  const session = await getServerSession(options);

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/ticket/${ticketNumber}`);
  }

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
      ORDER BY tc.comment_date DESC
    `;
    const queryRes1 = await pgB2Bpool.query(queryForTicketsCategoriesAndTypes, [
      ticketNumber,
    ]);

    if (queryRes1.rows.length === 0) {
      notFound();
    }

    // If Role is Admin or Ticket Handler you can see the details for every ticket
    if (
      userHasRole(session, AppRoleTypes.Admin) ||
      userHasRole(session, AppRoleTypes.B2B_TicketHandler)
    ) {
      const queryRes2 = await pgB2Bpool.query(queryForComments, [ticketNumber]);
      queryRes1.rows[0]['comments'] = queryRes2.rows;

      await new Promise((resolve) => setTimeout(resolve, 250));
      return queryRes1.rows;
    }

    // If Roles is not Ticket Creator Ticket Details cannot be seen
    if (!userHasRole(session, AppRoleTypes.B2B_TicketCreator)) {
      notFound();
    }

    // Check if the specific ticket belongs to the customer that requests it
    // Compare session.user.customer_id with ticketDetails[0].customer_id
    if (session?.user.customer_id !== queryRes1.rows[0].customer_id) {
      notFound();
    }

    const queryRes2 = await pgB2Bpool.query(queryForComments, [ticketNumber]);
    queryRes1.rows[0]['comments'] = queryRes2.rows;

    await new Promise((resolve) => setTimeout(resolve, 250));
    return queryRes1.rows;
  } catch (error) {
    throw error;
  }
};

export const getTicketCategories = async (): Promise<TicketCategory[]> => {
  await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);

  //@ts-ignore
  const session = await getServerSession(options);

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/`);
  }

  //@ts-ignore
  const userId = session.user.user_id;

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
  //@ts-ignore
  const session = await getServerSession(options);

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/`);
  }

  try {
    const query =
      'SELECT service_id, "Service Name" from service_types_v where start_date < CURRENT_TIMESTAMP and end_date is null';
    const res = await pgB2Bpool.query(query);
    return res.rows;
  } catch (error) {
    throw error;
  }
};

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
    equipmentId: z.string(),
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
    //@ts-ignore
    const session = await getServerSession(options);

    if (!session) {
      redirect(`/api/auth/signin?callbackUrl=/`);
    }

    await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);

    let {
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

    if (equipmentId === '') {
      equipmentId = '0';
    }
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

    const standardizedDate = convertTo24HourFormat(occurrenceDate);

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
  ticketNumber: z.string(),
  modalAction: z.string(),
});

export const createNewComment = async (
  formState: TicketFormState,
  formData: FormData
): Promise<any> => {
  try {
    //@ts-ignore
    const session = await getServerSession(options);

    if (!session) {
      redirect(`/api/auth/signin?callbackUrl=/`);
    }

    //@ts-ignore
    const userId = session.user.user_id;

    await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);

    const { comment, ticketId, ticketNumber, modalAction } =
      commentSchema_zod.parse({
        ticketId: formData.get('ticketId'),
        comment: formData.get('comment'),
        ticketNumber: formData.get('ticketNumber'),
        modalAction: formData.get('modalAction'),
      });

    if (modalAction === TicketDetailsModalActions.CLOSE) {
      const statusId = TicketStatus.CLOSED;

      const response = await updateTicketStatus({
        ticketId,
        ticketNumber,
        statusId,
        userId,
        comment,
      });

      if (response.status === 'ERROR') {
        throw new Error(response.message);
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
      revalidatePath(`/ticket/${ticketNumber}`);
      return toFormState('SUCCESS', 'Ticket was closed');
    }

    if (modalAction === TicketDetailsModalActions.CANCEL) {
      const statusId = TicketStatus.CANCELLED;

      const response: { status: string; message: string } =
        await updateTicketStatus({
          ticketId,
          ticketNumber,
          statusId,
          userId,
          comment,
        });

      if (response.status === 'ERROR') {
        throw new Error(response.message);
      }

      const result = await pgB2Bpool.query(
        'CALL b2btickets_dev.cmt_insert($1, $2, $3, $4, $5, $6, $7)',
        [
          ticketId,
          comment,
          'y', // isClosure -> y for Cancel
          userId,
          //@ts-ignore
          config.api.user,
          config.api.process,
          config.postgres_b2b_database.debugMode,
        ]
      );

      await new Promise((resolve) => setTimeout(resolve, 250));
      revalidatePath(`/ticket/${ticketNumber}`);
      return toFormState('SUCCESS', 'Ticket was Cancelled');
    }

    const result = await pgB2Bpool.query(
      'CALL b2btickets_dev.cmt_insert($1, $2, $3, $4, $5, $6, $7)',
      [
        ticketId,
        comment,
        'n',
        userId,
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

export async function updateTicketStatus({
  ticketId,
  ticketNumber,
  statusId,
  comment,
}: {
  ticketId: string;
  ticketNumber: string;
  statusId: string;
  comment: string;
}) {
  try {
    await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);

    const session = await getServerSession(options);
    if (!session) {
      redirect(`/api/auth/signin?callbackUrl=/`);
    }

    //@ts-ignore
    const userId = session.user.user_id;

    // Only Admin and Ticket Handler Can Update Status
    if (
      !userHasRole(session, AppRoleTypes.Admin) &&
      !userHasRole(session, AppRoleTypes.B2B_TicketHandler)
    ) {
      redirect(`/api/auth/signin?callbackUrl=/ticket/${ticketNumber}`);
    }

    const result = await pgB2Bpool.query(
      'CALL b2btickets_dev.tck_ticket_status_update($1, $2, $3, $4, $5, $6, $7)',
      [
        ticketId,
        statusId,
        userId,
        comment,
        //@ts-ignore
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]
    );

    revalidatePath(`/ticket/${ticketNumber}`);
    return {
      status: `SUCCESS`,
      message: `Ticket was updated successfuly`,
    };
  } catch (error: any) {
    return { status: 'ERROR', message: error.message };
  }
}

export const validateReCaptcha = async (token: string) => {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    throw new Error('reCAPTCHA secret key is missing.');
  }

  const params = new URLSearchParams();
  params.append('secret', secretKey);
  params.append('response', token);

  try {
    const response = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      { method: 'POST', body: params }
    );

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error verifying reCAPTCHA', error);
    throw error;
  }
};

// import { Server } from 'socket.io';
// export const UpdateTicketStatus = async () => {
//   const response = await fetch('http://localhost:3000/api/socket', {
//     method: 'POST',
//     body: JSON.stringify({}),
//     headers: {
//       'Content-Type': 'application/json',
//     },
//   });

//   if (!response.ok) {
//     throw new Error('Failed to trigger ticket update');
//   }

//   return await response.json();
// };
