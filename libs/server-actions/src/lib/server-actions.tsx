'use server';
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

export const getAllTickets = async (): Promise<Ticket[]> => {
  await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);
  try {
    const query = 'SELECT * FROM tickets_v order by "Opened" DESC';
    const res = await pgB2Bpool.query(query);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    return res.rows as Ticket[]; // Type assertion to ensure res.rows is of type Ticket[]
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
const convertToISODate = (dateStr: string) => {
  // Replace Greek AM/PM with standard AM/PM
  let standardizedDateStr = dateStr.replace('πμ', 'AM').replace('μμ', 'PM');

  // Swap day and month
  const dateRegex = /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2} [AP]M)/;
  const match = standardizedDateStr.match(dateRegex);

  if (match) {
    const [, day, month, year, time] = match;
    standardizedDateStr = `${month}/${day}/${year} ${time}`;
  }

  // Parse the standardized date string to a JavaScript Date object
  const parsedDate = new Date(standardizedDateStr);

  // Convert the Date object to an ISO string
  return parsedDate.toISOString();
};

export const createNewTicket = async (
  formState: TicketFormState,
  formData: FormData
): Promise<any> => {
  try {
    // console.log('formData', formData);
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
    console.log('standardizedDate', standardizedDate);

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
        getEnvVariable('USER_ID'),
        //@ts-ignore
        config.api.user,
        config.api.process,
        config.postgres_b2b_database.debugMode,
      ]
    );

    await new Promise((resolve) => setTimeout(resolve, 750));
    revalidatePath('/tickets');
    throw new Error('Testing Errors!');

    console.log('SUCCESS: Ticket Created!');
    return toFormState('SUCCESS', 'Ticket Created!');
  } catch (error) {
    console.log('ERROR', error);
    return fromErrorToFormState(error);
  }
};
