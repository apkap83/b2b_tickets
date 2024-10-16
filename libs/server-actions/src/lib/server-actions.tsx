'use server';

import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { pgB2Bpool, setSchema } from '@b2b-tickets/db-access';
import { config } from '@b2b-tickets/config';
import {
  toFormState,
  fromErrorToFormState,
  userHasRole,
  userHasPermission,
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
  AppPermissionTypes,
} from '@b2b-tickets/shared-models';

import {
  TicketDetail,
  TicketDetailsModalActions,
} from '@b2b-tickets/shared-models';

import { convertTo24HourFormat } from '@b2b-tickets/utils';
import { redirect } from 'next/navigation';

// export const seedDB = async () => {
//   // TODO Session & Authorization Enabled Action
//   await populateDB();
// };
// export const syncDBAlterTrueAction = async () => {
//   // TODO Session & Authorization Enabled Action
//   // const session = await getServerSession(options);
//   // if (!session) {
//   //   throw new Error('Unauthenticated access: User is not authenticated');
//   // }
//   // if (!userHasPermission(session, 'Sync DB (Alter True)')) {
//   //   throw new Error(
//   //     'Unauthorized access: User is not authorized for this action (Sync DB (Alter True))'
//   //   );
//   // }
//   await syncDatabaseAlterTrue();
// };

export const getTotalNumOfTicketsForCustomer = async (): Promise<number> => {
  await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);

  //@ts-ignore
  const session = await getServerSession(options);

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/`);
  }
  //@ts-ignore
  const customerId = session.user.customer_id;

  //@ts-ignore
  const customerName = session.user.customer_name;

  try {
    // Artificial Delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // In case there is no Customer Id then return all
    if (customerId === -1) {
      const sqlQuery = `SELECT count(*) FROM tickets_v`;
      const res = await pgB2Bpool.query(sqlQuery);
      return res?.rows[0].count as number;
    }
    // Filter Tickets View by Customer Name
    const sqlQuery = `SELECT count(*) FROM tickets_v where "Customer" = $1`;
    const res = await pgB2Bpool.query(sqlQuery, [customerName]);

    return res?.rows[0].count as number;
  } catch (error) {
    throw error;
  }
};

export const getFilteredTicketsForCustomer = async (
  query: string,
  currentPage: number,
  allPages: boolean = false
) => {
  await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);
  const offset = (currentPage - 1) * config.TICKET_ITEMS_PER_PAGE;

  //@ts-ignore
  const session = await getServerSession(options);
  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/`);
  }
  //@ts-ignore
  const customerId = session.user.customer_id;

  //@ts-ignore
  const customerName = session.user.customer_name;

  try {
    // Artificial Delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // In case there is no Customer Id then return all
    if (customerId === -1) {
      let sqlExpression = '';
      if (query === FilterTicketsStatus.Open)
        sqlExpression = `WHERE "Status" IN ('${TicketStatusName.NEW}','${TicketStatusName.WORKING}')`;
      if (query === FilterTicketsStatus.Closed)
        sqlExpression = `WHERE "Status" IN ('${TicketStatusName.CLOSED}','${TicketStatusName.CANCELLED}')`;

      const sqlQuery = `SELECT * FROM tickets_v ${sqlExpression} order by "Status Date" DESC 
      ${
        allPages ? '' : `LIMIT ${config.TICKET_ITEMS_PER_PAGE} OFFSET ${offset}`
      }
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
    ${allPages ? '' : `LIMIT ${config.TICKET_ITEMS_PER_PAGE} OFFSET ${offset}`}
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
  const customerId = session.user.customer_id;

  //@ts-ignore
  const customerName = session.user.customer_name;

  try {
    // Artificial Delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // In case there is no Customer Id then return all
    if (customerId === -1) {
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
        CAST(t.customer_id AS INTEGER) AS customer_id,
        ticket_number,
        title,
        description,
        t.category_id,
        t.service_id,
        equipment_id,
        sid,
        cid,
        u.username,
        u.first_name,
        u.last_name,
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
        statuses.status_name,
        t.escalation_date,
        t.escalation_user_id,
        t.remedy_ticket_id

    FROM tickets as t
    INNER JOIN ticket_categories as tc
    ON t.category_id = tc.category_id
    INNER JOIN service_types as s
    ON t.service_id = s.service_id
    INNER JOIN statuses as statuses
    ON statuses.status_id = t.status_id
    LEFT JOIN users as u
    ON u.user_id = t.escalation_user_id
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
      WHERE t.ticket_number = $1 and tc.deletion_date is null
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

    // This check ensures that a customer cannot see other customers tickets
    // Check if the specific ticket belongs to the customer ID that was requested it
    // Compare session.user.customer_id with ticketDetails[0].customer_id
    if (session?.user.customer_id !== Number(queryRes1.rows[0].customer_id)) {
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
    equipmentId: z.union([z.string(), z.null()]),
    sid: z.string().optional(),
    cid: z.string().optional(),
    userName: z.string().optional(),
    cliValue: z.string().optional(),
    contactPerson: z.string().nonempty('Contact Person is required'),
    contactPhoneNum: z
      .string()
      .nonempty('Contact Phone Number is required')
      .refine((value) => {
        const phones = value.split(',').map((phone) => phone.trim());
        const phoneRegex = /^[0-9]{10,15}$/; // Adjust the regex as needed for your phone number format
        return phones.every((phone) => phoneRegex.test(phone));
      }, 'Must be a comma-separated list of valid Mobile Phone numbers'),
    ccEmails: z.union([z.string(), z.null()]).refine((value) => {
      if (!value) return true; // Allow empty since it is not required
      const emails = value.split(',').map((email) => email.trim());
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
      return emails.every((email) => emailRegex.test(email));
    }, 'Must be a comma-separated list of valid email addresses'),
    ccPhones: z.union([z.string(), z.null()]).refine((value) => {
      if (!value) return true; // Allow empty since it is not required
      const phones = value.split(',').map((phone) => phone.trim());
      const phoneRegex = /^\d{10,12}$/; // Basic email regex
      return phones.every((phone) => phoneRegex.test(phone));
    }, 'Must be a comma-separated list of valid phone numbers'),
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
  const client = await pgB2Bpool.connect(); // Acquire a client connection
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
      ccEmails,
      ccPhones,
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
      ccEmails: formData.get('ccEmails'),
      ccPhones: formData.get('ccPhones'),
      occurrenceDate: formData.get('occurrenceDate'),
    });

    const standardizedDate = convertTo24HourFormat(occurrenceDate);

    if (equipmentId === '') equipmentId = null;
    // Start a transaction
    await client.query('BEGIN');
    console.log({ equipmentId });
    // TODO: Define proper user Id and api User from session
    const result = await client.query(
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

    const newTicketId = result.rows[0].tck_ticket_new;
    if (!newTicketId) {
      throw new Error('New Ticket Id cannot be retrieved during insertion');
    }

    if (ccEmails && ccEmails.length > 0) {
      console.log(494);
      await client.query('CALL tck_set_cc_users($1, $2, $3, $4, $5)', [
        newTicketId,
        ccEmails,
        //@ts-ignore
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]);
    }

    if (ccPhones && ccPhones.length > 0) {
      console.log(506);
      await client.query('CALL tck_set_cc_phones($1, $2, $3, $4, $5)', [
        newTicketId,
        ccPhones,
        //@ts-ignore
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]);
    }

    // Commit the transaction
    await client.query('COMMIT');

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/tickets');
    return toFormState('SUCCESS', 'Ticket Created!');
  } catch (error) {
    // Rollback the transaction in case of an error
    await client.query('ROLLBACK');
    console.log('ERROR', error);
    return fromErrorToFormState(error);
  } finally {
    client.release();
  }
};

const commentSchema_zod = z.object({
  ticketId: z.string(),
  comment: z.string().min(1),
  ticketNumber: z.string(),
  modalAction: z.string(),
});

export const setRemedyIDForTicket = async ({
  commentId,
  ticketNumber,
}: {
  commentId: string;
  ticketNumber: string;
}) => {
  try {
    const session = await getServerSession(options);
    if (!session) {
      redirect(`/api/auth/signin?callbackUrl=/`);
    }

    console.log({ commentId });
    if (!userHasPermission(session, AppPermissionTypes.Delete_Comments)) {
      return {
        status: 'ERROR',
        message: 'You do not have permission for this action',
      };
    }

    //     call tck_set_rmd_inc
    // (
    //    pnum_ticket_id => 70,
    //    pvch_Remedy_Ticket => 'inc000998',
    //    pnum_Remedy_User_ID => 8,
    //    pvch_api_user => 'dioan',
    //    pvch_api_process => 'test',
    //    pbln_debug_mode => false
    // )

    await pgB2Bpool.query('CALL tck_set_rmd_inc($1, $2, $3, $4, $5)', [
      commentId,
      session.user.user_id,
      //@ts-ignore
      config.api.user,
      config.api.process,
      config.postgres_b2b_database.debugMode,
    ]);

    revalidatePath(`/ticket/${ticketNumber}`);

    return {
      status: 'SUCCESS',
      message: 'Comment was deleted successfully',
    };
  } catch (error: any) {
    return {
      status: 'ERROR',
      message: error?.message,
    };
  }
};

export const deleteExistingComment = async ({
  commentId,
  ticketNumber,
}: {
  commentId: string;
  ticketNumber: string;
}) => {
  try {
    const session = await getServerSession(options);
    if (!session) {
      redirect(`/api/auth/signin?callbackUrl=/`);
    }

    console.log({ commentId });
    if (!userHasPermission(session, AppPermissionTypes.Delete_Comments)) {
      return {
        status: 'ERROR',
        message: 'You do not have permission for this action',
      };
    }

    await pgB2Bpool.query('CALL cmt_delete($1, $2, $3, $4, $5)', [
      commentId,
      session.user.user_id,
      //@ts-ignore
      config.api.user,
      config.api.process,
      config.postgres_b2b_database.debugMode,
    ]);

    revalidatePath(`/ticket/${ticketNumber}`);

    return {
      status: 'SUCCESS',
      message: 'Comment was deleted successfully',
    };
  } catch (error: any) {
    return {
      status: 'ERROR',
      message: error?.message,
    };
  }
};

export const escalateTicket = async (formState: any, formData: FormData) => {
  try {
    const session = await getServerSession(options);
    if (!session || !session.user) {
      return redirect(`/api/auth/signin?callbackUrl=/`);
    }

    if (!userHasRole(session, AppRoleTypes.B2B_TicketCreator)) {
      return {
        status: 'ERROR',
        message: 'You do not have permission for this action',
      };
    }

    let ticketId = formData.get('ticketId') as string;
    const ticketNumber = formData.get('ticketNumber');

    if (!ticketId || !ticketNumber) {
      return {
        status: 'ERROR',
        message: 'Ticket ID or Ticket Number is missing.',
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    await pgB2Bpool.query('CALL tck_ticket_escalate($1, $2, $3, $4, $5)', [
      parseInt(ticketId),
      session.user.user_id,
      //@ts-ignore
      config.api.user,
      config.api.process,
      config.postgres_b2b_database.debugMode,
    ]);

    revalidatePath(`/ticket/${ticketNumber}`);

    return {
      status: 'SUCCESS',
      message: 'Ticket was escalated!',
    };
  } catch (error: any) {
    return {
      status: 'ERROR',
      message: error?.message,
    };
  }
};

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
  // TODO - Production requires Internet for reCaptcha to work
  // if (process.env.NODE_ENV !== 'production') return true;

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
    console.log('data', data);
    return data.success;
  } catch (error) {
    throw new Error(
      'Cannot connect to https://www.google.com/recaptcha/api/siteverify for reCaptcha verification'
    );
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
