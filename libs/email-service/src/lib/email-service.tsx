'use server';
import fs from 'fs';
import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import { redirect } from 'next/navigation';
import { userHasRole } from '@b2b-tickets/utils';

import {
  CustomLogger,
  getRequestLogger,
} from '@b2b-tickets/server-actions/server';

import {
  TransportName,
  EmailTemplate,
  AppRoleTypes,
  TicketDetail,
} from '@b2b-tickets/shared-models';
import config from '@b2b-tickets/config';
import { pgB2Bpool, setSchemaAndTimezone } from '@b2b-tickets/db-access';

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

// Function to replsace template variables with actual values
const populateTemplate = (
  template: string,
  variables: Record<string, string>
): string => {
  return template.replace(/{{(.*?)}}/g, (_, key) => variables[key] || '');
};

// Load the HTML template
const loadTemplate = (templateName: string): string => {
  const rootPath = path.resolve();

  return fs.readFileSync(
    path.join(rootPath, 'templates', 'email', templateName),
    'utf8'
  );
};

// Define transporter using SMTPTransport options
const transporter: Transporter = nodemailer.createTransport({
  host: config.EmailRelayServerIP,
  port: Number(config.EmailRelayServerTCPPort),
  secure: false,
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates if used
  },
} as SMTPTransport.Options);

// Send email notification
// await sendEmail({
//   to: 'apostolos.kapetanios@nova.gr',
//   subject: 'Your Ticket Has Been Created',
//   type: EmailTemplate.NEW_TICKET,
//   emailVariables: {
//     customerName: session.user.customer_name,
//     ticketNumber: newTicketId,
//     escalationLevel: '1',
//   },
// });

export const sendEmail = async (
  emailtype: EmailTemplate,
  ticketId: string
): Promise<void> => {
  if (!config.SendEmails) return;
  const logRequest: CustomLogger = getRequestLogger(TransportName.ACTIONS);

  try {
    const session = await verifySecurityRole([
      AppRoleTypes.B2B_TicketCreator,
      AppRoleTypes.B2B_TicketHandler,
    ]);

    // Load and populate the template
    let template = '';
    let populatedHtml = '';

    // Ticket Number

    if (emailtype === EmailTemplate.NEW_TICKET) {
      await setSchemaAndTimezone(pgB2Bpool);
      // Find Ticket from ticketId
      const result = await pgB2Bpool.query(
        'SELECT * from tickets_v where ticket_id = $1',
        [ticketId]
      );

      // Type assertion for the rows returned by the query
      const ticket: TicketDetail = result.rows[0] as TicketDetail;

      // Find Cc Users
      const res = await getCcValuesForTicket({ ticketId });
      const ticketCreatorEmail = session.user.email as string;
      console.log(119, ticketCreatorEmail);
      const ccEmails = res.data?.ccEmails as string;
      const ccPhones = res.data?.ccPhones as string;

      // Load and populate the template
      template = loadTemplate(EmailTemplate.NEW_TICKET);
      populatedHtml = populateTemplate(template, {
        customerName: ticket.Customer,
        ticketNumber: ticket.Ticket,
      });

      // await transporter.sendMail({
      //   from: '"Nova Platinum Ticketing" <no-reply@nova.gr>',
      //   to: options.to,
      //   subject: options.subject,
      //   text: 'options.text',
      //   html: populatedHtml,
      // });
    }

    // await transporter.sendMail({
    //   from: '"Nova Platinum Ticketing" <no-reply@nova.gr>',
    //   to: options.to,
    //   subject: options.subject,
    //   text: 'options.text',
    //   html: populatedHtml,
    // });

    // logRequest.info(
    //   `Serv.A.F. ${session.user.userName} - Sent E-mail to ${options.to} with subject ${options.subject}`
    // );
  } catch (error) {
    logRequest.error(error);
  }
};

// React server components are async so you make database or API calls.
export async function sendEmailsForTicketCreation({
  ticketId,
}: {
  ticketId: string;
}) {
  return <h1>Hello Server</h1>;
}

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
        ccEmails: res_emails.rows[0].email_addresses,
        ccPhones: res_phones.rows[0].cc_phones,
      },
    };
  } catch (error: any) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
