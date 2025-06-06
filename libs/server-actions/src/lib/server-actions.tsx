'use server';

import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import { Session } from '@b2b-tickets/shared-models';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { pgB2Bpool, setSchemaAndTimezone } from '@b2b-tickets/db-access';
import { config } from '@b2b-tickets/config';
import {
  toFormState,
  fromErrorToFormState,
  userHasRole,
  userHasPermission,
  columnAllowedForFilter,
  sanitizeInput,
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
  EmailNotificationType,
  TicketStatusIsFinal,
  TicketDetailForTicketCreator,
  AllowedColumnsForFilteringType,
} from '@b2b-tickets/shared-models';

import {
  convertTo24HourFormat,
  mapToTicketCreator,
  allowedColumnsForFiltering,
} from '@b2b-tickets/utils';
import { redirect } from 'next/navigation';
import { execSync } from 'child_process';
import { getRequestLogger } from '@b2b-tickets/server-actions/server';

import { CustomLogger } from '@b2b-tickets/logging';

import { TransportName, EmailTemplate } from '@b2b-tickets/shared-models';
import { sendEmailOnTicketUpdate } from '@b2b-tickets/email-service/server';

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

export const getUniqueItemsForColumn = async (
  columnName: AllowedColumnsForFilteringType
) => {
  try {
    const session = await verifySecurityRole(AppRoleTypes.B2B_TicketHandler);

    // Filter Applied only for Specific Columns
    if (!allowedColumnsForFiltering.includes(columnName)) {
      throw new Error(`Invalid column name: ${columnName}`);
    }

    await setSchemaAndTimezone(pgB2Bpool);
    let sqlQuery = '';

    const sqlQueryForCustomers = `select distinct cust.customer_id as id, cust.customer_name as value 
                                  from customers as cust
                                  inner join tickets as tick
                                  on cust.customer_id = tick.customer_id;`;

    const sqlQueryForCustType = `select ct.customer_type_id as id, ct.customer_type as value from customer_types as ct`;

    const sqlQueryForTicketNumber = `select distinct tick.ticket_id as id, tick.ticket_number as value from tickets as tick;`;

    const sqlQueryForTitle = `select distinct tick.ticket_id as id, tick.title as value from tickets as tick;`;

    const sqlQueryForOpenedBy = `select distinct u.user_id as id, u.username as value
                                  from tickets as tick
                                  inner join users as u
                                  on tick.open_user_id = u.user_id`;

    switch (columnName) {
      case AllowedColumnsForFilteringType.CUSTOMER:
        sqlQuery = sqlQueryForCustomers;
        break;
      case AllowedColumnsForFilteringType.TICKET_NUMBER:
        sqlQuery = sqlQueryForTicketNumber;
        break;
      case AllowedColumnsForFilteringType.CUST_TYPE:
        sqlQuery = sqlQueryForCustType;
        break;
      case AllowedColumnsForFilteringType.TITLE:
        sqlQuery = sqlQueryForTitle;
        break;
      case AllowedColumnsForFilteringType.OPENED_BY:
        sqlQuery = sqlQueryForOpenedBy;
        break;
      default:
        break;
    }

    // Construct and execute the SQL query
    const res = await pgB2Bpool.query(sqlQuery);
    return { data: res.rows };
  } catch (error) {
    throw error;
  }
};

export const OLD_getFilteredTicketsForCustomer = async (
  currentPage: number,
  query: string,
  filters: Record<string, string[]> = {}, // Added filters as an input
  allPages: boolean = false
) => {
  try {
    const session = await verifySecurityPermission(
      AppPermissionTypes.Tickets_Page
    );
    await setSchemaAndTimezone(pgB2Bpool);

    const offset = (currentPage - 1) * config.TICKET_ITEMS_PER_PAGE;
    const customerId = session.user.customer_id;

    // Check if the user belongs to the Ticket Handler role
    const isTicketHandler = userHasRole(
      session,
      AppRoleTypes.B2B_TicketHandler
    );

    // Check if the user belongs to the Ticket Creator role
    const isTicketCreator = userHasRole(
      session,
      AppRoleTypes.B2B_TicketCreator
    );

    // Sanitize the query
    query = sanitizeInput(query) || '';
    // Create SQL expressions based on the query
    let sqlExpression: string | null = null;
    switch (query) {
      case FilterTicketsStatus.Open:
        sqlExpression = `"Is Final Status" = '${TicketStatusIsFinal.NO}'`;
        break;
      case FilterTicketsStatus.Closed:
        sqlExpression = `"Is Final Status" = '${TicketStatusIsFinal.YES}'`;
        break;
      case FilterTicketsStatus.SeverityHigh:
        sqlExpression = `"Severity" = 'High' AND "Is Final Status" = '${TicketStatusIsFinal.NO}'`;
        break;
      case FilterTicketsStatus.SeverityMedium:
        sqlExpression = `"Severity" = 'Medium' AND "Is Final Status" = '${TicketStatusIsFinal.NO}'`;
        break;
      case FilterTicketsStatus.SeverityLow:
        sqlExpression = `"Severity" = 'Low' AND "Is Final Status" = '${TicketStatusIsFinal.NO}'`;
        break;
      case FilterTicketsStatus.StatusNew:
        sqlExpression = `"Status" = 'New'`;
        break;
      case FilterTicketsStatus.Escalated:
        sqlExpression = `"Escalated" = 'Yes' AND "Is Final Status" = '${TicketStatusIsFinal.NO}'`;
        break;
      case '':
        sqlExpression = null; // No default filter applied
        break;
      default:
        throw new Error('Invalid query parameter. ' + query);
    }

    // If The role is Ticket Handler Return all Tickets
    if (isTicketHandler) {
      // Build dynamic column filters
      let columnFilters = Object.keys(filters)
        .filter((column) =>
          columnAllowedForFilter(column as AllowedColumnsForFilteringType)
        )
        .map((column) => {
          let sanitizedColumn = sanitizeInput(column);
          if (!sanitizedColumn) return null;
          const values = filters[sanitizedColumn] || [];
          const sanitizedValues = values.map((value) => sanitizeInput(value));

          // Ticket Number = Ticket (in database)
          if (
            sanitizedColumn === AllowedColumnsForFilteringType.TICKET_NUMBER
          ) {
            sanitizedColumn = 'Ticket';
          }
          if (sanitizedValues.length > 0) {
            const valueList = sanitizedValues
              .map((value) => `'${value}'`)
              .join(', ');
            return `"${sanitizedColumn}" IN (${valueList})`;
          }
          return null;
        })
        .filter(Boolean) // Remove null/empty filters
        .join(' AND '); // Combine with AND

      // Construct the WHERE clause
      const whereConditions = [sqlExpression, columnFilters]
        .filter(Boolean) // Remove null/empty values
        .join(' AND ');

      // Construct the final query
      const sqlQuery = `
                        SELECT *, COUNT(1) over () total_records 
                        FROM tickets_v 
                        ${whereConditions ? `WHERE ${whereConditions}` : ''} 
                        ${
                          allPages
                            ? ''
                            : `LIMIT ${config.TICKET_ITEMS_PER_PAGE} OFFSET ${offset}`
                        }
                        `;

      const res = await pgB2Bpool.query(sqlQuery);
      const tickets = res?.rows;

      if (!tickets || tickets.length === 0) {
        return { pageData: [], totalRows: 0 };
      }

      const numOfTotalRows = tickets[0]?.total_records;
      return { pageData: res?.rows, totalRows: numOfTotalRows };
    }

    // Filter Tickets View by Customer Name
    const sqlQuery = `SELECT *, COUNT(1) over () total_records FROM tickets_v where "customer_id" = $1 ${
      sqlExpression ? `AND ${sqlExpression}` : ''
    }
    ${allPages ? '' : `LIMIT ${config.TICKET_ITEMS_PER_PAGE} OFFSET ${offset}`}
      `;

    const res = await pgB2Bpool.query(sqlQuery, [customerId]);
    const tickets = res?.rows;

    if (!tickets || tickets.length === 0) {
      return { pageData: [], totalRows: 0 };
    }

    const numOfTotalRows = tickets[0].total_records;

    // If Ticket Creator, filter and map the result to TicketDetailForTicketCreator
    if (isTicketCreator) {
      return {
        pageData: tickets.map((ticket) => mapToTicketCreator(ticket)),
        totalRows: numOfTotalRows,
      };
    }

    return { pageData: tickets, totalRows: numOfTotalRows };
  } catch (error) {
    throw error;
  }
};

export const getFilteredTicketsForCustomer = async (
  currentPage: number,
  query: string,
  filters: Record<string, string[]> = {}, // Added filters as an input
  allPages: boolean = false
) => {
  try {
    const session = await verifySecurityPermission(
      AppPermissionTypes.Tickets_Page
    );
    await setSchemaAndTimezone(pgB2Bpool);

    const offset = (currentPage - 1) * config.TICKET_ITEMS_PER_PAGE;
    const customerId = session.user.customer_id;

    // Check if the user belongs to the Ticket Handler role
    const isTicketHandler = userHasRole(
      session,
      AppRoleTypes.B2B_TicketHandler
    );

    // Check if the user belongs to the Ticket Creator role
    const isTicketCreator = userHasRole(
      session,
      AppRoleTypes.B2B_TicketCreator
    );

    // Define allowed columns for filtering
    const allowedColumns = [
      'Customer',
      'Cust. Type',
      'Ticket Number',
      'Title',
      'Opened By',
      'Escalated',
    ];

    // Build SQL expression based on the query (using parameterized approach)
    const sqlExpressions: string[] = [];
    const queryParams: any[] = [];

    switch (query) {
      case FilterTicketsStatus.Open:
        sqlExpressions.push(`"Is Final Status" = $${queryParams.length + 1}`);
        queryParams.push(TicketStatusIsFinal.NO);
        break;
      case FilterTicketsStatus.Closed:
        sqlExpressions.push(`"Is Final Status" = $${queryParams.length + 1}`);
        queryParams.push(TicketStatusIsFinal.YES);
        break;
      case FilterTicketsStatus.SeverityHigh:
        sqlExpressions.push(`"Severity" = $${queryParams.length + 1}`);
        queryParams.push('High');
        sqlExpressions.push(`"Is Final Status" = $${queryParams.length + 1}`);
        queryParams.push(TicketStatusIsFinal.NO);
        break;
      case FilterTicketsStatus.SeverityMedium:
        sqlExpressions.push(`"Severity" = $${queryParams.length + 1}`);
        queryParams.push('Medium');
        sqlExpressions.push(`"Is Final Status" = $${queryParams.length + 1}`);
        queryParams.push(TicketStatusIsFinal.NO);
        break;
      case FilterTicketsStatus.SeverityLow:
        sqlExpressions.push(`"Severity" = $${queryParams.length + 1}`);
        queryParams.push('Low');
        sqlExpressions.push(`"Is Final Status" = $${queryParams.length + 1}`);
        queryParams.push(TicketStatusIsFinal.NO);
        break;
      case FilterTicketsStatus.StatusNew:
        sqlExpressions.push(`"Status" = $${queryParams.length + 1}`);
        queryParams.push('New');
        break;
      case FilterTicketsStatus.Escalated:
        sqlExpressions.push(`"Escalated" = $${queryParams.length + 1}`);
        queryParams.push('Yes');
        sqlExpressions.push(`"Is Final Status" = $${queryParams.length + 1}`);
        queryParams.push(TicketStatusIsFinal.NO);
        break;
      case '':
        break;
      default:
        throw new Error(`Invalid query parameter.${query}`);
    }

    // Example Values
    // sqlExpressions [ '"Is Final Status" = $1' ]
    // filters { Customer: [ 'Customer 1', 'Nova' ] }
    // placeholders [ '$2', '$3' ]
    // queryParams [ 'n', 'Customer 1', 'Nova' ]
    // whereConditions "Is Final Status" = $1 AND "Customer" IN ($2, $3)

    // If the role is Ticket Handler, return all tickets
    if (isTicketHandler) {
      const filterConditions = Object.entries(filters)
        .filter(([column]) => allowedColumns.includes(column))
        .map(([column, values]) => {
          if (column === 'Ticket Number') {
            column = 'Ticket';
          }
          const placeholders = values.map((val) => {
            queryParams.push(val);
            return `$${queryParams.length}`;
          });
          return `"${column}" IN (${placeholders.join(', ')})`;
        });

      const whereConditions = [...sqlExpressions, ...filterConditions]
        .filter(Boolean)
        .join(' AND ');

      const sqlQuery = `
        SELECT *, COUNT(1) OVER () AS total_records 
        FROM tickets_v 
        ${
          whereConditions
            ? `WHERE ${whereConditions} ORDER BY "Status Date" DESC`
            : ''
        }

        ${
          allPages
            ? ''
            : `LIMIT $${queryParams.length + 1} OFFSET $${
                queryParams.length + 2
              }`
        }
      `;
      if (!allPages) {
        queryParams.push(config.TICKET_ITEMS_PER_PAGE, offset);
      }

      const res = await pgB2Bpool.query(sqlQuery, queryParams);
      const tickets = res?.rows;

      if (!tickets || tickets.length === 0) {
        return { pageData: [], totalRows: 0 };
      }

      const numOfTotalRows = tickets[0]?.total_records;
      return { pageData: tickets, totalRows: numOfTotalRows };
    }

    // If not a Ticket Handler, filter tickets by customer
    sqlExpressions.push(`"customer_id" = $${queryParams.length + 1}`);
    queryParams.push(customerId);

    const whereConditions = sqlExpressions.join(' AND ');
    const sqlQuery = `
      SELECT *, COUNT(1) OVER () AS total_records 
      FROM tickets_v 
      ${
        whereConditions
          ? `WHERE ${whereConditions} ORDER BY "Status Date" DESC`
          : ''
      } 
      ${
        allPages
          ? ''
          : `LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`
      }
    `;
    if (!allPages) {
      queryParams.push(config.TICKET_ITEMS_PER_PAGE, offset);
    }

    const res = await pgB2Bpool.query(sqlQuery, queryParams);
    const tickets = res?.rows;

    if (!tickets || tickets.length === 0) {
      return { pageData: [], totalRows: 0 };
    }

    const numOfTotalRows = tickets[0]?.total_records;

    // If Ticket Creator, map the result
    if (isTicketCreator) {
      return {
        pageData: tickets.map((ticket) => mapToTicketCreator(ticket)),
        totalRows: numOfTotalRows,
      };
    }

    return { pageData: tickets, totalRows: numOfTotalRows };
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

export const getTicketDetailsForTicketNumber = async ({
  ticketNumber,
}: {
  ticketNumber: string;
}) => {
  try {
    const session = await verifySecurityPermission(
      AppPermissionTypes.Tickets_Page
    );

    await setSchemaAndTimezone(pgB2Bpool);

    // Check if the user belongs to the Ticket Handler role
    const isTicketHandler = userHasRole(
      session,
      AppRoleTypes.B2B_TicketHandler
    );

    // Check if the user belongs to the Ticket Creator role
    const isTicketCreator = userHasRole(
      session,
      AppRoleTypes.B2B_TicketCreator
    );

    // Define queries
    const queryForTicketsCategoriesAndTypes = isTicketHandler
      ? `SELECT * FROM tickets_v WHERE "Ticket" = $1`
      : `SELECT * FROM tickets_v WHERE customer_id = $1 AND "Ticket" = $2`;

    const queryForComments =
      'SELECT * FROM ticket_comments_v WHERE "Ticket Number" = $1 order by "Comment Date" DESC';

    // Execute ticket query
    const ticketQueryParams = isTicketHandler
      ? [ticketNumber]
      : [session.user.customer_id, ticketNumber];

    const queryRes1 = await pgB2Bpool.query(
      queryForTicketsCategoriesAndTypes,
      ticketQueryParams
    );

    if (queryRes1.rows.length === 0) {
      notFound();
    }

    // Additional validation for Ticket Creator - Avoid Ticket Handlers from Openning Other customer tickets (!)
    if (
      isTicketCreator &&
      session?.user.customer_id !== Number(queryRes1.rows[0].customer_id)
    ) {
      // Only Nova Customer Can See Ticket Details for All Tickets
      if (session?.user.customer_id !== -1) notFound();
    }

    // Execute comments query
    const queryRes2 = await pgB2Bpool.query(queryForComments, [ticketNumber]);
    queryRes1.rows[0]['comments'] = queryRes2.rows;

    // Filter results for Ticket Creator role
    if (isTicketCreator) {
      return queryRes1.rows.map((ticket) => mapToTicketCreator(ticket));
    }

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
    sendEmailOnTicketUpdate(EmailNotificationType.TICKET_CREATION, newTicketId);

    revalidatePath('/tickets');
    return toFormState('SUCCESS', 'Ticket Created!', newTicketId);
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

    const resp = await pgB2Bpool.query(
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

    const escalationId = resp.rows[0].tck_escalate;

    // Send E-mail Notifications asynchronously
    sendEmailOnTicketUpdate(
      EmailNotificationType.TICKET_ESCALATION,
      ticketId,
      escalationId
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

      // Send E-mail Notifications asynchronously
      sendEmailOnTicketUpdate(EmailNotificationType.TICKET_CLOSURE, ticketId);

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

      // Send E-mail Notifications asynchronously
      sendEmailOnTicketUpdate(EmailNotificationType.TICKET_CLOSURE, ticketId);

      revalidatePath(`/ticket/${ticketNumber}`);
      return toFormState('SUCCESS', 'Ticket was Cancelled');
    }

    if (
      modalAction !== TicketDetailsModalActions.CLOSE &&
      modalAction !== TicketDetailsModalActions.CANCEL &&
      userHasRole(session, AppRoleTypes.B2B_TicketHandler)
    ) {
      // Send E-mail Notifications asynchronously
      sendEmailOnTicketUpdate(
        EmailNotificationType.NEW_HANDLER_COMMENT,
        ticketId
      );
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
  data: Session | null;
  error?: string;
}> => {
  try {
    const session = await getServerSession(options);

    if (!session) {
      redirect(`/api/auth/signin?callbackUrl=/`);
    }

    return {
      data: session,
    };
  } catch (error: unknown) {
    return {
      data: null,
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

export async function logCookieConsent(
  userId: string,
  userName: string,
  consentGiven: boolean
) {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
  try {
    const session = await getServerSession(options);

    if (!session) {
      redirect(`/api/auth/signin?callbackUrl=/`);
    }

    logRequest.info(
      `User ${userName} (${userId}) cookie consented: ${consentGiven} ${
        consentGiven && `for ${config.cookieConsentValidityInDays} days`
      }`
    );
  } catch (error: any) {
    logRequest.error('Error logging cookie consent:', error);
  }
}
