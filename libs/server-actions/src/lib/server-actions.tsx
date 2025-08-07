'use server';

import { writeFile, mkdir, unlink, readFile } from 'fs/promises';
import { dirname } from 'path';
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
  TicketAttachmentDetails,
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
import {
  sendEmailOnTicketUpdate,
  sendEmailForNewHandlerComment,
} from '@b2b-tickets/email-service/server';

const path = require('path');

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

// Updated server action with proper date handling
export const createNewTicket = async (
  formState: TicketFormState | null,
  formData: FormData
): Promise<any> => {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
  const client = await pgB2Bpool.connect();
  try {
    const session = await verifySecurityPermission(
      AppPermissionTypes.Create_New_Ticket
    );

    await client.query(
      `SET search_path TO ${config.postgres_b2b_database.schemaName}`
    );
    await setSchemaAndTimezone(pgB2Bpool);

    let validatedData;
    try {
      validatedData = ticketSchema_zod.parse({
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
      logRequest.debug('✅ Zod validation passed');
    } catch (zodError: any) {
      logRequest.debug('❌ Zod validation failed:', zodError);
      throw new Error(`Validation failed: ${zodError.message}`);
    }

    const {
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
    } = validatedData;

    // Fix the date formatting issue
    let standardizedDate;
    try {
      if (occurrenceDate) {
        // Try different approaches to format the date
        if (typeof convertTo24HourFormat === 'function') {
          standardizedDate = convertTo24HourFormat(occurrenceDate);
        } else {
          // Fallback: use the ISO string directly or format it
          const dateObj = new Date(occurrenceDate);
          standardizedDate = dateObj
            .toISOString()
            .replace('T', ' ')
            .replace('Z', '');
        }
      }

      if (!standardizedDate) {
        throw new Error('Failed to format occurrence date');
      }
    } catch (dateError: any) {
      logRequest.error(`❌ Date formatting error: ${dateError}`);
      throw new Error(`Date formatting failed: ${dateError.message}`);
    }

    const res = await pgB2Bpool.query(
      'SELECT category_service_type_id from ticket_category_service_types_v where category_id = $1 and service_type_id = $2',
      [category, service]
    );

    const categoryServiceTypeId = res.rows[0]?.category_service_type_id;

    if (!categoryServiceTypeId) {
      throw new Error('Category Service Type ID was not found!');
    }

    const argsForTicketNew = [
      title,
      description,
      severity ? Number(severity) : null,
      categoryServiceTypeId,
      equipmentId ? Number(equipmentId) : null,
      sid || null,
      cid || null,
      userName || null,
      cliValue || null,
      contactPerson,
      contactPhoneNum,
      standardizedDate,
      session?.user.user_id,
      session.user.userName,
      config.api.process,
      config.postgres_b2b_database.debugMode,
    ];

    await client.query('BEGIN');

    logRequest.debug('🔄 Creating new ticket...');
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

    const newTicketId = result.rows[0]?.tck_new;
    if (!newTicketId) {
      throw new Error('New Ticket Id cannot be retrieved during insertion');
    }

    logRequest.info('✅ New ticket created with ID:', newTicketId);

    if (ccEmails && ccEmails.length > 0) {
      await client.query('CALL tck_set_cc_users($1, $2, $3, $4, $5)', [
        newTicketId,
        ccEmails,
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]);
    }

    if (ccPhones && ccPhones.length > 0) {
      logRequest.debug('🔄 Setting CC phones...');
      await client.query('CALL tck_set_cc_phones($1, $2, $3, $4, $5)', [
        newTicketId,
        ccPhones,
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]);
    }

    await client.query('COMMIT');

    logRequest.info('🔄 Sending email notification for ticket creation...');
    sendEmailOnTicketUpdate(EmailNotificationType.TICKET_CREATION, newTicketId);

    revalidatePath('/tickets');

    const successResponse = toFormState(
      'SUCCESS',
      'Ticket Created!',
      newTicketId
    );

    return successResponse;
  } catch (error) {
    await client.query('ROLLBACK');
    const errorResponse = fromErrorToFormState(error);
    return errorResponse;
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
      userHasRole(session, AppRoleTypes.B2B_TicketHandler)
    ) {
      // Send E-mail Notifications asynchronously
      sendEmailForNewHandlerComment(
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
    console.log('session.user.customer_id,', session.user.customer_id);
    // Get Category Per Customer
    const query2ForSeverities = `SELECT CATEGORY_ID, CATEGORY_NAME "Category" FROM CUSTOMER_TICKET_CATEGORIES_V CTC where CTC.CUSTOMER_ID = $1 and is_available_for_tickets = 'y'`;

    const queryRes = await pgB2Bpool.query(query2ForSeverities, [
      session.user.customer_id,
    ]);
    console.log('queryRes', queryRes.rows);
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

export async function uploadFilesToServer({
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

interface BuildAttachmentFilenameParams {
  ticketId: string;
  attachmentFilename: string;
  apiUser: string;
  apiProcess: string;
  debugMode?: boolean;
}

interface AttachmentInsertParams {
  ticketId: string;
  attachmentFullPath: string;
  originalFilename: string;
}

/**
 * Server action to build attachment filename using database function
 */
export async function buildAttachmentFilename(
  params: BuildAttachmentFilenameParams
): Promise<{
  data: string;
  error?: string;
}> {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );

  try {
    const session = await getServerSession(options);
    if (!session?.user) {
      return {
        data: '',
        error: 'ERROR - Unauthorized access',
      };
    }

    const { ticketId, attachmentFilename, apiUser, apiProcess } = params;

    // Validate required parameters
    if (!ticketId || !attachmentFilename || !apiUser || !apiProcess) {
      return {
        data: '',
        error: 'ERROR: Missing required parameters',
      };
    }

    await setSchemaAndTimezone(pgB2Bpool);

    const buildAttachmentFileName = await pgB2Bpool.query(
      `
        SELECT build_attachment_filename($1,$2,$3,$4,$5) as filename
      `,
      [
        ticketId,
        attachmentFilename,
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]
    );

    return {
      data: buildAttachmentFileName.rows[0].filename,
      error: '',
    };
  } catch (error) {
    logRequest.error(`Error building attachment filename: ${error}`);
    return {
      data: '',
      error: 'ERROR - Internal server error while building attachment filename',
    };
  }
}

/**
 * Server action to insert attachment record using database function
 */
async function insertAttachment(params: AttachmentInsertParams): Promise<{
  data: string;
  error?: string;
}> {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );

  try {
    const session = await getServerSession(options);
    if (!session?.user) {
      return {
        error: 'Unauthorized access',
        data: '',
      };
    }

    const { ticketId, attachmentFullPath, originalFilename } = params;

    // Validate required parameters
    if (!ticketId || !attachmentFullPath || !originalFilename) {
      return {
        data: '',
        error: 'ERROR - Missing required parameters',
      };
    }

    const apiUser =
      session.user.userName ||
      session.user.email ||
      session.user.user_id?.toString();
    const apiProcess = 'file_attachment';

    const buildAttachmentFileName = await pgB2Bpool.query(
      `
      SELECT att_insert($1,$2,$3,$4,$5,$6,$7) as result
    `,
      [
        ticketId,
        attachmentFullPath,
        originalFilename,
        session.user.user_id,
        apiUser,
        apiProcess,
        config.postgres_b2b_database.debugMode,
      ]
    );

    return {
      data: 'SUCCESS - Attachment record inserted successfully',
      error: '',
    };
  } catch (error) {
    logRequest.error(`Error inserting attachment: ${error}`);
    return {
      data: '',
      error: 'ERROR - Internal server error while inserting attachment',
    };
  }
}

const getAttachmentFullPath = ({ pathFromDB }: { pathFromDB: string }) => {
  const isProdEnv = process.env['NODE_ENV'] === 'production';
  const isStagingEnv = process.env['NEXT_PUBLIC_APP_ENV'] === 'staging';
  const isDevelopmentEnv = process.env['NODE_ENV'] === 'development';

  // In staging get Path from DB (dev or prod schema)
  if (isProdEnv || isStagingEnv) {
    return pathFromDB;
  }

  // If development then development config will get the right path using config.attachmentsPrefixPath
  if (isDevelopmentEnv) {
    const fileNameOnly = path.basename(pathFromDB);
    return path.join(config.attachmentsPrefixPath, fileNameOnly);
  }
};

/**
 * Combined server action to handle the complete file attachment process
 */
export async function processFileAttachment(formData: FormData): Promise<{
  data: string;
  error?: string;
}> {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
  try {
    const session = await getServerSession(options);
    if (!session?.user) {
      return {
        data: '',
        error: 'Cannot Upload file - User is not logged in',
      };
    }

    // Extract data from FormData
    const file = formData.get('file') as File;
    const ticketId = formData.get('ticketId') as string;
    const originalFilename = formData.get('originalFilename') as string;

    // Validate inputs
    if (!file || !ticketId || !originalFilename) {
      return {
        data: '',
        error:
          'Missing required parameters: file, ticketId, or originalFilename',
      };
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    // Convert array back to Buffer
    const buffer = Buffer.from(arrayBuffer);

    // Get API user from session (adjust based on your session structure)
    //@ts-ignore
    const apiUser =
      session.user.userName ||
      session.user.email ||
      session.user.user_id?.toString();
    const apiProcess = 'file_attachment';

    // Step 1: Build the attachment filename
    const filenameResult = await buildAttachmentFilename({
      ticketId,
      attachmentFilename: originalFilename,
      apiUser,
      apiProcess,
      debugMode: config.postgres_b2b_database.debugMode,
    });

    if (filenameResult.error) {
      return {
        data: '',
        error: filenameResult.error,
      };
    }

    const attachmentFullPath = getAttachmentFullPath({
      pathFromDB: filenameResult.data,
    });

    // Step 2: Save file to disk first (before database)
    try {
      // Ensure directory exists
      const dir = dirname(attachmentFullPath);
      await mkdir(dir, { recursive: true });

      // Write file to disk
      await writeFile(attachmentFullPath, buffer);

      logRequest.info(`File saved successfully: ${attachmentFullPath}`);
    } catch (fileError) {
      logRequest.error(`Error saving file: ${fileError}`);
      return {
        data: '',
        error: `ERROR: Failed to save file to disk: ${
          fileError instanceof Error ? fileError.message : 'Unknown error'
        }`,
      };
    }

    // Step 3: Insert the attachment record (after successful file save)
    const insertResult = await insertAttachment({
      ticketId,
      attachmentFullPath,
      originalFilename,
    });

    if (insertResult.error) {
      // If database insert fails, try to clean up the file
      try {
        await unlink(attachmentFullPath);
        logRequest.info(
          `Cleaned up file after database error: ${attachmentFullPath}`
        );
      } catch (cleanupError) {
        logRequest.error(
          `Error cleaning up file after database error: ${cleanupError}`
        );
      }

      return {
        data: '',
        error: insertResult.error,
      };
    }

    return {
      data: originalFilename,
      error: '',
    };
  } catch (error) {
    logRequest.error(`Error processing file attachment: ${error}`);
    return {
      data: '',
      error: 'ERROR: Internal server error while processing file attachment',
    };
  }
}

/**
 * Server action to get attachments for a ticket
 */
export async function getTicketAttachments({
  ticketId,
}: {
  ticketId: string;
}): Promise<{
  data?: TicketAttachmentDetails[];
  error?: string;
}> {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );

  try {
    await verifySecurityRole([
      AppRoleTypes.B2B_TicketCreator,
      AppRoleTypes.B2B_TicketHandler,
    ]);

    if (!ticketId) {
      return {
        error: 'ERROR: Ticket ID is required',
      };
    }

    await setSchemaAndTimezone(pgB2Bpool);

    const sqlQueryForAttachments = `SELECT
                                      ATTACHMENT_ID,
                                      TICKET_ID,
                                      "Ticket Number",
                                      "Filename",
                                      "Attachment Date",
                                      ATTACHMENT_USER_ID,
                                      "Username",
                                      "First Name",
                                      "Last Name",
                                      USER_CUSTOMER_ID,
                                      "User Customer Name"
                                    FROM TICKET_ATTACHMENTS_V
                                    WHERE TICKET_ID = $1`;

    const res_attachments = await pgB2Bpool.query(sqlQueryForAttachments, [
      ticketId,
    ]);

    const ticketAttachDetails: TicketAttachmentDetails[] = res_attachments.rows;

    return {
      data: ticketAttachDetails,
      error: '',
    };
  } catch (error) {
    logRequest.error(`Error getting ticket attachments: ${error}`);
    return {
      error: 'ERROR: Internal server error while retrieving attachments',
    };
  }
}

export interface ServerActionResponse<T = any> {
  status: 'SUCCESS' | 'ERROR';
  message: string;
  data?: T;
}

/**
 * Server action to download and attachment file
 */
export async function downloadAttachment(params: {
  attachmentId: string;
}): Promise<
  ServerActionResponse<{
    fileBuffer: Buffer;
    mimeType: string;
    filename: string;
  }>
> {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );

  try {
    const session = await verifySecurityRole([
      AppRoleTypes.B2B_TicketCreator,
      AppRoleTypes.B2B_TicketHandler,
    ]);

    const { attachmentId } = params;

    // Validate parameters
    if (!attachmentId) {
      return {
        status: 'ERROR',
        message: 'Missing required parameters for file download',
      };
    }

    await setSchemaAndTimezone(pgB2Bpool);

    // Get Details for attachmentId
    const sqlQueryForAttachments = `SELECT
                                      ATTACHMENT_ID,
                                      TICKET_ID,
                                      "Ticket Number",
                                      ATTACHMENT_FULL_PATH,
                                      "Filename",
                                      "Attachment Date",
                                      ATTACHMENT_USER_ID,
                                      "Username",
                                      "First Name",
                                      "Last Name",
                                      USER_CUSTOMER_ID,
                                      "User Customer Name"
                                    FROM TICKET_ATTACHMENTS_V
                                    WHERE attachment_id = $1`;

    const resp = await pgB2Bpool.query(sqlQueryForAttachments, [attachmentId]);

    const attachmentDetails = resp.rows[0] as TicketAttachmentDetails;

    try {
      await setSchemaAndTimezone(pgB2Bpool);

      await pgB2Bpool.query(
        `
      CALL att_check_user_has_access(
        pnum_Attachment_ID => $1,
        pnum_User_ID => $2,
        pvch_Action => 'Download Attachment',
        pvch_API_User => $3,
        pvch_API_Process => $4,
        pbln_Debug_Mode => $5
      );
    `,
        [
          attachmentDetails.attachment_id,
          session.user.user_id,
          config.api.user,
          config.api.process,
          config.postgres_b2b_database.debugMode,
        ]
      );
    } catch (error) {
      logRequest.error(`Permission check failed: ${error}`);

      // Return permission denied error
      return {
        status: 'ERROR',
        message:
          'Access denied: You do not have permission to download this attachment',
      };
    }

    const fullPath = getAttachmentFullPath({
      pathFromDB: attachmentDetails.attachment_full_path!,
    });

    // Check if file exists and read it
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(fullPath);
    } catch (fileError) {
      logRequest.error(`File read error: ${fileError}`);
      return {
        status: 'ERROR',
        message: 'File not found or cannot be accessed',
      };
    }

    // Determine MIME type based on file extension
    const getMimeType = (filename: string): string => {
      const extension = filename.split('.').pop()?.toLowerCase();

      const mimeTypes: { [key: string]: string } = {
        // Images
        jpg: 'image/jpeg',
        jfif: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',

        // Documents
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        txt: 'text/plain',
        csv: 'text/csv',

        // Archives
        zip: 'application/zip',
        rar: 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        tar: 'application/x-tar',
        gz: 'application/gzip',

        // Audio/Video
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        mp4: 'video/mp4',
        avi: 'video/x-msvideo',
        mov: 'video/quicktime',

        // Default
        default: 'application/octet-stream',
      };

      return mimeTypes[extension || ''] || mimeTypes.default;
    };

    const mimeType = getMimeType(attachmentDetails.Filename);

    // Log the download activity (optional)
    logRequest.info(
      `File download requested: ${attachmentDetails.Filename} (${attachmentId}) for ticket ${attachmentDetails.ticket_id}`
    );

    return {
      status: 'SUCCESS',
      message: 'File retrieved successfully',
      data: {
        fileBuffer,
        mimeType,
        filename: attachmentDetails.Filename,
      },
    };
  } catch (error) {
    logRequest.error(`Download attachment error: ${error}`);
    return {
      status: 'ERROR',
      message: 'An error occurred while downloading the file',
    };
  }
}

/**
 * Server action to delete an attachment
 */
export async function deleteAttachment(params: {
  attachmentId: string;
}): Promise<ServerActionResponse> {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
  try {
    const session = await verifySecurityRole([
      AppRoleTypes.B2B_TicketCreator,
      AppRoleTypes.B2B_TicketHandler,
    ]);

    const { attachmentId } = params;

    // Validate parameters
    if (!attachmentId) {
      return {
        status: 'ERROR',
        message: 'Missing required parameter: attachmentId',
      };
    }

    await setSchemaAndTimezone(pgB2Bpool);

    // First, get attachment details to know the file path for cleanup
    const sqlQueryForAttachments = `SELECT
                                      ATTACHMENT_ID,
                                      TICKET_ID,
                                      "Ticket Number",
                                      ATTACHMENT_FULL_PATH,
                                      "Filename",
                                      "Attachment Date",
                                      ATTACHMENT_USER_ID,
                                      "Username",
                                      "First Name",
                                      "Last Name",
                                      USER_CUSTOMER_ID,
                                      "User Customer Name"
                                    FROM TICKET_ATTACHMENTS_V
                                    WHERE ATTACHMENT_ID = $1`;

    const resp = await pgB2Bpool.query(sqlQueryForAttachments, [attachmentId]);

    if (resp.rows.length === 0) {
      return {
        status: 'ERROR',
        message: 'Attachment not found',
      };
    }

    const attachmentDetails = resp.rows[0] as TicketAttachmentDetails;

    // Call the stored procedure to delete the attachment
    try {
      await pgB2Bpool.query(
        `
        CALL att_delete(
          pnum_Attachment_ID => $1,
          pnum_User_ID => $2,
          pvch_API_User => $3,
          pvch_API_Process => $4,
          pbln_Debug_Mode => $5
        );
      `,
        [
          parseInt(attachmentId),
          session.user.user_id,
          config.api.user,
          config.api.process,
          config.postgres_b2b_database.debugMode,
        ]
      );

      logRequest.info(
        `Attachment deleted from database: AttachmentID: ${attachmentId} - File Name: ${attachmentDetails.Filename}`
      );
    } catch (dbError) {
      logRequest.error(`Database deletion failed: ${dbError}`);

      // Check if it's a permission error or other database error
      const errorMessage =
        dbError instanceof Error ? dbError.message : 'Unknown database error';

      if (
        errorMessage.includes('permission') ||
        errorMessage.includes('access')
      ) {
        return {
          status: 'ERROR',
          message:
            'Access denied: You do not have permission to delete this attachment',
        };
      }

      return {
        status: 'ERROR',
        message: 'Failed to delete attachment from database',
      };
    }

    // After successful database deletion, try to delete the physical file
    const fullPath = getAttachmentFullPath({
      pathFromDB: attachmentDetails.attachment_full_path!,
    });

    try {
      const normalizedPath = path.normalize(fullPath);

      // Security Check that path contains b2b_tickets
      if (!normalizedPath.includes('b2b_tickets')) {
        logRequest.error(
          `Refusing to delete file outside b2b_tickets directory: ${fullPath}`
        );
        throw new Error(
          `Refusing to delete file outside b2b_tickets directory: ${fullPath}`
        );
      }

      await unlink(normalizedPath);

      logRequest.info(`Physical file deleted successfully: ${normalizedPath}`);
    } catch (fileError) {
      logRequest.error(`Error deleting physical file: ${fileError}`);

      // Log the warning but don't fail the operation since database deletion succeeded
      logRequest.warn(
        `Database record deleted but physical file cleanup failed for: ${fullPath}. Manual cleanup may be required.`
      );
    }

    return {
      status: 'SUCCESS',
      message: `Attachment "${attachmentDetails.Filename}" deleted successfully`,
    };
  } catch (error) {
    logRequest.error(`Delete attachment error: ${error}`);
    return {
      status: 'ERROR',
      message: 'An error occurred while deleting the attachment',
    };
  }
}

/**
 * Server action to get Company Cc Users in comma separated list
 */
export async function buildTicketCcUsers({
  userId,
}: {
  userId: string;
}): Promise<{
  data?: {
    build_ticket_cc_users: string;
  };
  error?: string;
}> {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );

  try {
    await verifySecurityRole([
      AppRoleTypes.B2B_TicketCreator,
      AppRoleTypes.B2B_TicketHandler,
    ]);

    if (!userId) {
      return {
        error: 'ERROR: User ID is required',
      };
    }

    await setSchemaAndTimezone(pgB2Bpool);

    const ccEmailsText = await pgB2Bpool.query(
      `SELECT build_ticket_cc_users($1, $2, $3, $4)`,
      [
        userId,
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]
    );

    return {
      data: ccEmailsText.rows[0],
      error: '',
    };
  } catch (error: any) {
    logRequest.error('Error getting ticket cc users:', error);
    return {
      error: 'ERROR: Internal server error while retrieving cc users',
    };
  }
}

/**
 * Server action to set Cc Users Set on DB
 */
export async function updateCcUsers({
  ticketId,
  ccEmails,
}: {
  ticketId: string;
  ccEmails: string;
}): Promise<ServerActionResponse> {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );

  try {
    await verifySecurityRole([
      AppRoleTypes.B2B_TicketCreator,
      AppRoleTypes.B2B_TicketHandler,
    ]);

    if (!ticketId) {
      return {
        status: 'ERROR',
        message: 'ERROR: Ticket ID is required for updating Cc Users',
      };
    }

    // Normalize empty ccEmails
    const normalizedCcEmails = ccEmails?.trim() || '';

    await setSchemaAndTimezone(pgB2Bpool);

    // Check if Ticket is finalized
    const finalStatusQuery =
      'SELECT "Is Final Status" FROM tickets_v where ticket_id = $1';
    const status = await pgB2Bpool.query(finalStatusQuery, [ticketId]);
    const isFinalStatus = status.rows[0]['Is Final Status'] as 'y' | 'n';

    if (isFinalStatus === 'y') {
      return {
        status: 'ERROR',
        message: 'You cannot alter CC mail list on a finalized ticket',
      };
    }

    await pgB2Bpool.query('CALL tck_set_cc_users($1, $2, $3, $4, $5)', [
      ticketId,
      normalizedCcEmails,
      //@ts-ignore
      config.api.user,
      config.api.process,
      config.postgres_b2b_database.debugMode,
    ]);

    logRequest.info(`Ticket Cc Users Updated for ticketId ${ticketId}`);
    return {
      status: 'SUCCESS',
      message: 'Ticket Cc Users Updated',
    };
  } catch (error) {
    logRequest.error(`Ticket Cc Users Not Updated for ticketId ${ticketId}`);
    return {
      status: 'ERROR',
      message: String(error),
    };
  }
}
