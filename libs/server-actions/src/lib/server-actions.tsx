'use server';

import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { pgB2Bpool, setSchemaAndTimezone } from '@b2b-tickets/db-access';
import { config } from '@b2b-tickets/config';
import {
  toFormState,
  fromErrorToFormState,
  userHasRole,
  userHasPermission,
} from '@b2b-tickets/utils';
import {
  TicketCategory,
  ServiceType,
  TicketFormState,
  AppRoleTypes,
  TicketStatus,
  TicketStatusName,
  FilterTicketsStatus,
  AppPermissionTypes,
  Severity,
  TicketDetail,
  TicketDetailsModalActions,
} from '@b2b-tickets/shared-models';

import { convertTo24HourFormat } from '@b2b-tickets/utils';
import { redirect } from 'next/navigation';
import { execSync } from 'child_process';
import { getRequestLogger } from '@b2b-tickets/server-actions/server';

import { CustomLogger } from '@b2b-tickets/logging';

import { TransportName, EmailTemplate } from '@b2b-tickets/shared-models';
import { sendEmail } from '@b2b-tickets/email-service/server';

const verifySecurityPermission = async (
  permissionName: AppPermissionTypes | AppPermissionTypes[]
) => {
  try {
    const session = await getServerSession(options);

    if (!session) {
      redirect(`/api/auth/signin?callbackUrl=/`);
    }

    if (!userHasPermission(session, permissionName)) {
      throw new Error(
        'Unauthorized access: User is not authorized for this action'
      );
    }

    // Return the session if authorized
    return session;
  } catch (error) {
    throw error;
  }
};

const verifySecurityRole = async (roleName: AppRoleTypes | AppRoleTypes[]) => {
  try {
    const session = await getServerSession(options);

    if (!session) {
      redirect(`/api/auth/signin?callbackUrl=/`);
    }

    if (!userHasRole(session, roleName)) {
      throw new Error(
        'Unauthorized access: User is not authorized for this action'
      );
    }

    // Return the session if authorized
    return session;
  } catch (error) {
    throw error;
  }
};

export const getCcValuesForTicket = async ({
  ticketId,
}: {
  ticketId: string;
}): Promise<{
  data?: {
    ccEmails: string;
    ccPhones: string;
  };
  error?: string;
}> => {
  try {
    const session = await verifySecurityRole([
      AppRoleTypes.B2B_TicketCreator,
      AppRoleTypes.B2B_TicketHandler,
    ]);

    // await setSchemaAndTimezone(pgB2Bpool);
    await setSchemaAndTimezone(pgB2Bpool);
    //@ts-ignore
    const customerId = session.user.customer_id;

    //@ts-ignore
    const customerName = session.user.customer_name;

    // Artificial Delay
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Get Cc Emails & Cc Phones
    const sqlQueryForCcEmails = `SELECT email_addresses FROM ticket_cc_users_v where "ticket_id" = $1`;
    const res_emails = await pgB2Bpool.query(sqlQueryForCcEmails, [ticketId]);

    const sqlQueryForCcPhones = `SELECT cc_phones FROM ticket_cc_phone_numbers_v where "ticket_id" = $1`;
    const res_phones = await pgB2Bpool.query(sqlQueryForCcPhones, [ticketId]);

    return {
      data: {
        ccEmails:
          res_emails.rows?.length > 0 ? res_emails.rows[0].email_addresses : [],
        ccPhones:
          res_phones.rows?.length > 0 ? res_phones.rows[0].cc_phones : [],
      },
    };
  } catch (error: any) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const getTotalNumOfTicketsForCustomer = async () => {
  try {
    const session = await verifySecurityPermission(
      AppPermissionTypes.Tickets_Page
    );

    await setSchemaAndTimezone(pgB2Bpool);
    //@ts-ignore
    const customerId = session.user.customer_id;

    //@ts-ignore
    const customerName = session.user.customer_name;

    // Artificial Delay
    await new Promise((resolve) => setTimeout(resolve, 250));

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
    // logRequest.error(error);
    return fromErrorToFormState(error);
  }
};

export const getFilteredTicketsForCustomer = async (
  query: string,
  currentPage: number,
  allPages: boolean = false
) => {
  try {
    const session = await verifySecurityPermission(
      AppPermissionTypes.Tickets_Page
    );
    await setSchemaAndTimezone(pgB2Bpool);

    const offset = (currentPage - 1) * config.TICKET_ITEMS_PER_PAGE;

    //@ts-ignore
    const customerId = session.user.customer_id;

    //@ts-ignore
    const customerName = session.user.customer_name;

    // Artificial Delay
    await new Promise((resolve) => setTimeout(resolve, 250));

    // In case there is no Customer Id then return all
    if (customerId === -1) {
      let sqlExpression = '';
      if (query === FilterTicketsStatus.Open)
        sqlExpression = `WHERE "Status" IN ('${TicketStatusName.NEW}','${TicketStatusName.WORKING}')`;
      if (query === FilterTicketsStatus.Closed)
        sqlExpression = `WHERE "Status" IN ('${TicketStatusName.CLOSED}','${TicketStatusName.CANCELLED}')`;

      const sqlQuery = `SELECT * FROM tickets_v ${sqlExpression}
      ${
        allPages ? '' : `LIMIT ${config.TICKET_ITEMS_PER_PAGE} OFFSET ${offset}`
      }
      `;
      const res = await pgB2Bpool.query(sqlQuery);
      return res?.rows as TicketDetail[];
    }

    let sqlExpression = '';
    if (query === FilterTicketsStatus.Open)
      sqlExpression = `AND "Status" IN ('${TicketStatusName.NEW}','${TicketStatusName.WORKING}')`;
    if (query === FilterTicketsStatus.Closed)
      sqlExpression = `AND "Status" IN ('${TicketStatusName.CLOSED}','${TicketStatusName.CANCELLED}')`;

    // Filter Tickets View by Customer Name
    const sqlQuery = `SELECT * FROM tickets_v where "customer_id" = $1 ${sqlExpression}
    ${allPages ? '' : `LIMIT ${config.TICKET_ITEMS_PER_PAGE} OFFSET ${offset}`}
      `;

    const res = await pgB2Bpool.query(sqlQuery, [customerId]);

    return res?.rows as TicketDetail[];
  } catch (error) {
    throw error;
  }
};

export const getNumOfTickets = async (query: string): Promise<number> => {
  try {
    const session = await verifySecurityPermission(
      AppPermissionTypes.Tickets_Page
    );

    await setSchemaAndTimezone(pgB2Bpool);
    //@ts-ignore
    const customerId = session.user.customer_id;

    //@ts-ignore
    const customerName = session.user.customer_name;

    // Artificial Delay
    await new Promise((resolve) => setTimeout(resolve, 250));

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
  try {
    const session = await verifySecurityPermission(
      AppPermissionTypes.Tickets_Page
    );

    await setSchemaAndTimezone(pgB2Bpool);

    const queryForTicketsCategoriesAndTypes = `SELECT * FROM tickets_v WHERE "Ticket" = $1`;

    // const queryForComments = `
    //   SELECT tc.comment_id,
    //   tc.ticket_id,
    //   tc.comment_date,
    //   tc.comment_user_id,
    //   tc.comment,
    //   tc.is_closure,
    //   tc.creation_date,
    //   tc.creation_user,
    //   u.username,
    //   u.first_name,
    //   u.last_name,
    //   c.customer_name
    //   FROM tickets as t
    //   INNER JOIN ticket_comments as tc
    //   ON t.ticket_id = tc.ticket_id
    //   INNER JOIN users as u
    //   ON u.user_id = tc.comment_user_id
    //   INNER JOIN customers as c
    //   ON u.customer_id = c.customer_id
    //   WHERE t.ticket_number = $1 and tc.deletion_date is null
    //   ORDER BY tc.comment_date DESC
    // `;

    const queryForComments =
      'SELECT * FROM ticket_comments_v WHERE "Ticket Number" = $1 order by "Comment Date" DESC';

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

export const getServiceTypes = async (): Promise<ServiceType[]> => {
  try {
    const session = await verifySecurityPermission(
      AppPermissionTypes.Tickets_Page
    );

    await setSchemaAndTimezone(pgB2Bpool);

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
    severity: z.string().nonempty('Severity is required'),
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
    const session = await verifySecurityPermission(
      AppPermissionTypes.Create_New_Ticket
    );

    await client.query(
      `SET search_path TO ${config.postgres_b2b_database.schemaName}`
    );
    await setSchemaAndTimezone(pgB2Bpool);

    let {
      title,
      description,
      severity,
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
      severity: formData.get('severity'),
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

    const res = await pgB2Bpool.query(
      'SELECT category_service_type_id from ticket_category_service_types_v where category_id = $1 and service_type_id = $2',
      [category, service]
    );

    const categoryServiceTypeId = res.rows[0].category_service_type_id;

    if (!categoryServiceTypeId) {
      throw new Error('Category Service Type ID was not found!');
    }
    // Convert string to number where applicable and handle empty strings as null
    const argsForTicketNew = [
      title, // pvch_title: string
      description, // pvch_description: string
      severity ? Number(severity) : null, // severity_id: number | null
      // category ? Number(category) : null, // pnum_category_id: number | null
      // service ? Number(service) : null, // pnum_service_id: number | null
      categoryServiceTypeId,
      equipmentId ? Number(equipmentId) : null, // pnum_equipment_id: number | null
      sid || null, // pvch_sid: string | null
      cid || null, // pvch_cid: string | null
      userName || null, // pvch_username: string | null
      cliValue || null, // pvch_cli: string | null
      contactPerson, // pvch_contact_person: string
      contactPhoneNum, // pvch_contact_phone_number: string
      standardizedDate, // ptmsp_occurrence_date: timestamp
      session?.user.user_id, // pnum_user_id: number
      session.user.userName, // pvch_api_user: string
      config.api.process, // pvch_api_process: string
      config.postgres_b2b_database.debugMode, // pbln_debug_mode: boolean
    ];

    await client.query('BEGIN');

    // TODO: Define proper user Id and api User from session
    const result = await client.query(
      `SELECT tck_new
        (
          pvch_Title                    => $1,
          pvch_Description              => $2,
          pnum_Severity_ID              => $3,
          pnum_Category_Service_Type_ID => $4,
          pnum_Equipment_ID             => $5,
          pvch_SID                      => $6,
          pvch_CID                      => $7,
          pvch_Username                 => $8,
          pvch_CLI                      => $9,
          pvch_Contact_Person           => $10,
          pvch_Contact_Phone_Number     => $11,
          pts_Occurrence_Date           => $12,
          pnum_User_ID                  => $13,
          pvch_API_User                 => $14,
          pvch_API_Process              => $15,
          pbln_Debug_Mode               => $16
        )
       `,
      argsForTicketNew
    );

    const newTicketId = result.rows[0].tck_new;
    if (!newTicketId) {
      throw new Error('New Ticket Id cannot be retrieved during insertion');
    }

    if (ccEmails && ccEmails.length > 0) {
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

    // Send E-mail Notifications asynchronously
    sendEmail(EmailTemplate.NEW_TICKET, newTicketId);

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/tickets');
    return toFormState('SUCCESS', 'Ticket Created!');
  } catch (error) {
    // Rollback the transaction in case of an error
    await client.query('ROLLBACK');
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

export const setRemedyIncidentIDForTicket = async ({
  ticketId,
  remedyIncId,
  ticketNumber,
}: {
  ticketId: string;
  remedyIncId: string;
  ticketNumber: string;
}) => {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
  try {
    const session = await verifySecurityPermission(
      AppPermissionTypes.Set_Remedy_INC
    );

    logRequest.info(
      `Serv.A.F. ${session.user.userName} - Setting Remedy Incident ${remedyIncId} for Ticket Number ${ticketNumber}`
    );
    await setSchemaAndTimezone(pgB2Bpool);

    if (!userHasRole(session, AppRoleTypes.B2B_TicketHandler)) {
      return {
        status: 'ERROR',
        message: 'You do not have permission for this action',
      };
    }

    // Ensure session.user.user_id is a number
    const userId =
      typeof session.user.user_id === 'string'
        ? parseInt(session.user.user_id)
        : session.user.user_id;

    if (isNaN(userId)) {
      return {
        status: 'ERROR',
        message: 'Invalid user ID',
      };
    }

    await pgB2Bpool.query(
      `call tck_set_rmd_inc
      (
        pnum_Ticket_ID      => $1,
        pvch_Remedy_Ticket  => $2,
        pnum_User_ID        => $3,
        pvch_API_User       => $4,
        pvch_API_Process    => $5,
        pbln_debug_mode     => $6
      )`,
      [
        parseInt(ticketId),
        remedyIncId,
        session.user.user_id,
        //@ts-ignore
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]
    );
    revalidatePath(`/ticket/${ticketNumber}`);

    return {
      status: 'SUCCESS',
      message: 'Remedy Incident Id was set',
    };
  } catch (error) {
    logRequest.error(
      `Failed to set Remedy Incident ID for ticket: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      { error }
    );
    return fromErrorToFormState(error);
  }
};

export const deleteExistingComment = async ({
  commentId,
  ticketNumber,
}: {
  commentId: string;
  ticketNumber: string;
}) => {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
  try {
    const session = await verifySecurityPermission(
      AppPermissionTypes.Delete_Comments
    );

    logRequest.info(
      `Serv.A.F. ${session.user.userName} - Deleting Existing comment with id ${commentId} for Ticket Number ${ticketNumber}`
    );

    await setSchemaAndTimezone(pgB2Bpool);

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
    logRequest.error(
      `Failed to delete existing Comment: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      { error }
    );
    return {
      status: 'ERROR',
      message: error?.message,
    };
  }
};

export const escalateTicket = async (formState: any, formData: FormData) => {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
  try {
    const session = await verifySecurityPermission(
      AppPermissionTypes.Escalate_Ticket
    );
    const userId = session.user.user_id;

    await setSchemaAndTimezone(pgB2Bpool);

    let ticketId = formData.get('ticketId') as string;
    const ticketNumber = formData.get('ticketNumber');
    const comment = formData.get('comment');

    logRequest.info(
      `Serv.A.F. ${session.user.userName} - Escalating Ticket with id ${ticketId}`
    );

    const escalation_id = await pgB2Bpool.query(
      `
        SELECT tck_escalate
        (
          pnum_Ticket_ID   => $1,
          pnum_User_ID     => $2,
          pvch_Comment     => $3,
          pvch_API_User    => $4,
          pvch_API_Process => $5,
          pbln_Debug_Mode  => $6
        )
      `,
      [
        ticketId,
        userId,
        comment,
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]
    );

    revalidatePath(`/ticket/${ticketNumber}`);

    return {
      status: 'SUCCESS',
      message: 'Ticket was escalated!',
    };
  } catch (error: any) {
    logRequest.error(
      `Failed to Escalate ticket: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      { error }
    );
    return {
      status: 'ERROR',
      message: error?.message,
    };
  }
};

export const alterTicketSeverity = async ({
  ticketNumber,
  ticketId,
  newSeverityId,
}: any) => {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
  try {
    const session = await verifySecurityPermission(
      AppPermissionTypes.Alter_Ticket_Severity
    );
    await setSchemaAndTimezone(pgB2Bpool);

    logRequest.info(
      `Serv.A.F. ${session.user.userName} - Altering Ticket Serverity for ticket with id ${ticketId} to ${newSeverityId}`
    );

    await new Promise((resolve) => setTimeout(resolve, 250));

    await pgB2Bpool.query(
      `
        CALL tck_change_severity
        (
          pnum_Ticket_ID   => $1,
          pnum_User_ID     => $2,
          pnum_Severity_ID => $3,
          pvch_API_User    => $4,
          pvch_API_Process => $5,
          pbln_Debug_Mode  => $6
        )
      `,
      [
        parseInt(ticketId),
        session.user.user_id,
        newSeverityId,
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]
    );

    revalidatePath(`/ticket/${ticketNumber}`);

    return {
      status: 'SUCCESS',
      message: 'Ticket was escalated!',
    };
  } catch (error: any) {
    logRequest.error(
      `Failed to Alter Ticket Severity: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      { error }
    );
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
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );

  try {
    const session = await verifySecurityPermission(
      AppPermissionTypes.Ticket_Details_Page
    );

    //@ts-ignore
    const userId = session.user.user_id;
    await setSchemaAndTimezone(pgB2Bpool);

    const { comment, ticketId, ticketNumber, modalAction } =
      commentSchema_zod.parse({
        ticketId: formData.get('ticketId'),
        comment: formData.get('comment'),
        ticketNumber: formData.get('ticketNumber'),
        modalAction: formData.get('modalAction'),
      });

    if (modalAction === TicketDetailsModalActions.CLOSE) {
      logRequest.info(
        `Serv.A.F. ${session.user.userName} - Creating new closing comment for ticket with id ${ticketId}`
      );
      await pgB2Bpool.query(
        `
          CALL tck_close
          (
            pnum_Ticket_ID   => $1,
            pnum_User_ID     => $2,
            pvch_Comment     => $3,
            pvch_Root_Cause  => $4,
            pvch_API_User    => $5,
            pvch_API_Process => $6,
            pbln_Debug_Mode  => $7
          )
        `,
        [
          ticketId,
          userId,
          comment,
          comment,
          config.api.user,
          config.api.process,
          config.postgres_b2b_database.debugMode,
        ]
      );

      await new Promise((resolve) => setTimeout(resolve, 250));
      revalidatePath(`/ticket/${ticketNumber}`);
      return toFormState('SUCCESS', 'Ticket was closed');
    }

    if (modalAction === TicketDetailsModalActions.CANCEL) {
      logRequest.info(
        `Serv.A.F. ${session.user.userName} - Creating new cancelling comment for ticket with id ${ticketId}`
      );
      await pgB2Bpool.query(
        `CALL tck_cancel
        (
          pnum_Ticket_ID   => $1,
          pnum_User_ID     => $2,
          pvch_Comment     => $3,
          pvch_API_User    => $4,
          pvch_API_Process => $5,
          pbln_Debug_Mode  => $6
        )`,
        [
          ticketId,
          userId,
          comment,
          config.api.user,
          config.api.process,
          config.postgres_b2b_database.debugMode,
        ]
      );

      await new Promise((resolve) => setTimeout(resolve, 250));
      revalidatePath(`/ticket/${ticketNumber}`);
      return toFormState('SUCCESS', 'Ticket was Cancelled');
    }

    logRequest.info(
      `Serv.A.F. ${session.user.userName} - Creating new comment for ticket with id ${ticketId}`
    );

    await pgB2Bpool.query(
      `CALL cmt_add_simple
      (
          pnum_Ticket_ID   => $1,
          pvch_Comment     => $2,
          pnum_User_ID     => $3,
          pvch_API_User    => $4,
          pvch_API_Process => $5,
          pbln_Debug_Mode  => $6
      )`,
      [
        ticketId,
        comment,
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
    logRequest.error(
      `Failed to Create new Comment: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      { error }
    );
    return fromErrorToFormState(error);
  }
};

export async function setTicketWorking({
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
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
  try {
    const session = await verifySecurityRole(AppRoleTypes.B2B_TicketHandler);

    await setSchemaAndTimezone(pgB2Bpool);

    const userId = session.user.user_id;

    logRequest.info(
      `Serv.A.F. ${session.user.userName} - Altering Ticket To Working state ticket with id ${ticketId}`
    );

    await pgB2Bpool.query(
      `
        CALL tck_working
        (
          pnum_Ticket_ID   => $1,
          pnum_User_ID     => $2,
          pvch_API_User    => $3,
          pvch_API_Process => $4,
          pbln_Debug_Mode  => $5
        )
      `,
      [
        ticketId,
        userId,
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
    logRequest.error(
      `Failed to set Ticket to Working status: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      { error }
    );
    return fromErrorToFormState(error);
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
    throw error;
  }
};

export const getAppVersion = async (): Promise<{
  data: string;
  error?: string;
}> => {
  try {
    const session = await getServerSession(options);

    if (!session) {
      redirect(`/api/auth/signin?callbackUrl=/`);
    }

    // Run the git command to get the latest commit hash
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

    // Send the commit hash as a response
    return { data: commitHash };
  } catch (error: unknown) {
    return {
      data: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const extendSessionAction = async (): Promise<{
  data: string;
  error?: string;
}> => {
  try {
    const session = await getServerSession(options);

    if (!session) {
      redirect(`/api/auth/signin?callbackUrl=/`);
    }

    return {
      data: 'Session Extended',
    };
  } catch (error: unknown) {
    return {
      data: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const getTicketSeverities = async (): Promise<{
  data: Severity[];
  error?: string;
}> => {
  try {
    const session = await verifySecurityRole(AppRoleTypes.B2B_TicketCreator);

    await setSchemaAndTimezone(pgB2Bpool);

    const queryForSeverities = `SELECT severity_id, severity FROM severities`;
    const queryRes = await pgB2Bpool.query(queryForSeverities);
    return { data: queryRes.rows };
  } catch (error: unknown) {
    return {
      data: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const getTicketCategories = async (): Promise<{
  data: TicketCategory[];
  error?: string;
}> => {
  try {
    const session = await verifySecurityRole([
      AppRoleTypes.B2B_TicketHandler,
      AppRoleTypes.B2B_TicketCreator,
    ]);

    await setSchemaAndTimezone(pgB2Bpool);

    const queryForSeverities = `SELECT category_id, "Category" FROM ticket_categories_v`;
    const queryRes = await pgB2Bpool.query(queryForSeverities);
    return { data: queryRes.rows };
  } catch (error: unknown) {
    return {
      data: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const getServicesForCategorySelected = async ({
  category_id,
}: {
  category_id: string;
}): Promise<{ data: ServiceType[]; error?: string }> => {
  try {
    const session = await verifySecurityRole([
      AppRoleTypes.B2B_TicketHandler,
      AppRoleTypes.B2B_TicketCreator,
    ]);

    if (!category_id) return { data: [], error: 'No category_id was provided' };
    await setSchemaAndTimezone(pgB2Bpool);

    const queryForSeverities = `
    SELECT category_service_type_id, service_type_id, service_type_name 
    from ticket_category_service_types_v where category_id = $1`;

    const queryRes = await pgB2Bpool.query(queryForSeverities, [category_id]);
    return { data: queryRes.rows };
  } catch (error: unknown) {
    return {
      data: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export async function getNextEscalationLevel({
  ticketId,
  ticketNumber,
}: {
  ticketId: string;
  ticketNumber: string;
}): Promise<{ data: string; error?: string }> {
  try {
    const session = await verifySecurityRole(AppRoleTypes.B2B_TicketCreator);

    await setSchemaAndTimezone(pgB2Bpool);

    const nextEscalationLevel = await pgB2Bpool.query(
      `
        select tck_get_next_escalation_level
        (
          pnum_Ticket_ID    => $1,
          pvch_API_User     => $2,
          pvch_API_Process  => $3,
          pbln_Debug_Mode   => $4
        )
      `,
      [
        ticketId,
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]
    );

    const { tck_get_next_escalation_level } = nextEscalationLevel.rows[0];

    revalidatePath(`/ticket/${ticketNumber}`);
    return { data: tck_get_next_escalation_level as string };
  } catch (error: any) {
    return {
      data: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getCategoryAndServiceTypeById({
  categoryServiceTypeId,
}: {
  categoryServiceTypeId: string;
}): Promise<{
  data?: { category_name: string; service_type_name: string };
  error?: string;
}> {
  try {
    const session = await verifySecurityRole([
      AppRoleTypes.B2B_TicketCreator,
      AppRoleTypes.B2B_TicketHandler,
    ]);
    await setSchemaAndTimezone(pgB2Bpool);

    // Filter Tickets View by Customer Name
    const sqlQuery = `SELECT * FROM ticket_category_service_types_v where "category_service_type_id" = $1`;

    const res = await pgB2Bpool.query(sqlQuery, [categoryServiceTypeId]);

    if (res.rows.length === 0) {
      throw new Error('No data found for the given categoryServiceTypeId.');
    }

    const { category_name, service_type_name } = res.rows[0]; // Access properties directly

    return {
      data: { category_name, service_type_name },
    };
  } catch (error: any) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const setNewCategoryServiceTypeForTicket = async (
  formState: any,
  formData: FormData
) => {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
  try {
    const session = await verifySecurityRole(AppRoleTypes.B2B_TicketHandler);

    await setSchemaAndTimezone(pgB2Bpool);

    const ticketId = formData.get('ticketId') as string;
    const categoryServiceTypeId = formData.get('categoryServiceTypeId');
    const ticketNumber = formData.get('ticketNumber');

    logRequest.info(
      `Serv.A.F. ${session.user.userName} - Setting new Category and Service for ticket with id ${ticketId}`
    );

    await pgB2Bpool.query(
      `
        CALL tck_change_category_service_type
        (
          pnum_Ticket_ID                => $1,
          pnum_Category_Service_Type_ID => $2,
          pnum_User_ID                  => $3,
          pvch_API_User                 => $4,
          pvch_API_Process              => $5,
          pbln_Debug_Mode               => $6
        )
      `,
      [
        parseInt(ticketId),
        categoryServiceTypeId,
        session.user.user_id,
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]
    );

    revalidatePath(`/ticket/${ticketNumber}`);

    return {
      status: 'SUCCESS',
      message: 'Ticket category/service type was updated!',
    };
  } catch (error: any) {
    logRequest.error(
      `Failed to Set New Category and Service: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      { error }
    );
    return fromErrorToFormState(error);
  }
};
