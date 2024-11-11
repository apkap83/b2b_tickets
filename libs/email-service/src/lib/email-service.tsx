'use server';
import fs from 'fs';
import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import { redirect } from 'next/navigation';
import { userHasRole } from '@b2b-tickets/utils';

import { getRequestLogger } from '@b2b-tickets/server-actions/server';

import { CustomLogger } from '@b2b-tickets/logging';

import {
  TransportName,
  EmailTemplate,
  AppRoleTypes,
  TicketDetail,
  TemplateVariables,
  EmailTemplateSubject,
  EmailNotificationType,
  EmailListOfHandlers,
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

const populateTemplate = <T extends keyof TemplateVariables>(
  template: string,
  variables: TemplateVariables[T]
): string => {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    if (!(key in variables)) {
      throw new Error(`Missing variable: ${key}`);
    }
    return String(variables[key as keyof TemplateVariables[T]]);
  });
};

const populateSubject = (
  subjectTemplate: EmailTemplateSubject,
  ticketNumber: string
): string => {
  return subjectTemplate.replace('{{ticketNumber}}', ticketNumber);
};

// Load the HTML template
const loadTemplate = (templateName: EmailTemplate): string => {
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

export const sendEmail = async (
  emailNotificationType: EmailNotificationType,
  ticketId: string
): Promise<void> => {
  if (!config.SendEmails) return;
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );

  try {
    const session = await verifySecurityRole([
      AppRoleTypes.B2B_TicketCreator,
      AppRoleTypes.B2B_TicketHandler,
    ]);

    // Load and populate the template
    let template = '';
    let populatedHtml = '';

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
    const ticketCreatorUserName = session.user.userName;
    const ccEmails = res.data?.ccEmails as string;
    const ccPhones = res.data?.ccPhones as string;
    const ticketNumber = ticket.Ticket;
    const customer = ticket.Customer;
    const ticketSubject = ticket.Title;
    const currentEscalationLevel = String(ticket['Current Escalation Level']);

    if (emailNotificationType === EmailNotificationType.TICKET_CREATION) {
      // Load and populate the template
      const templateForHandlerPopulated = populateTemplate(
        loadTemplate(EmailTemplate.NEW_TICKET_HANDLER),
        {
          webSiteUrl: config.webSiteUrl,
          ticketNumber: ticketNumber,
          customerName: customer,
          ticketSubject: ticketSubject,
        } as TemplateVariables[EmailTemplate.NEW_TICKET_HANDLER]
      );

      const templateForCustomerPopulated = populateTemplate(
        loadTemplate(EmailTemplate.NEW_TICKET_CUSTOMER),
        {
          webSiteUrl: config.webSiteUrl,
          userName: ticketCreatorUserName,
          ticketNumber: ticketNumber,
          ticketSubject: ticketSubject,
        } as TemplateVariables[EmailTemplate.NEW_TICKET_CUSTOMER]
      );

      // Send Email for Handler
      await transporter.sendMail({
        from: '"Nova Platinum Ticketing" <no-reply@nova.gr>',
        to: EmailListOfHandlers,
        subject: populateSubject(
          EmailTemplateSubject.NEW_TICKET_HANDLER,
          ticketNumber
        ),
        text: 'options.text',
        html: templateForHandlerPopulated,
      });
      logRequest.info(
        `Serv.A.F. ${
          session.user.userName
        } - Sent E-mail To Handlers: ${EmailListOfHandlers} with subject ${populateSubject(
          EmailTemplateSubject.NEW_TICKET_HANDLER,
          ticketNumber
        )}`
      );

      // Send E-mail for Customer && CC People
      await transporter.sendMail({
        from: '"Nova Platinum Ticketing" <no-reply@nova.gr>',
        to: [ticketCreatorEmail, ccEmails],
        subject: populateSubject(
          EmailTemplateSubject.NEW_TICKET_CUSTOMER,
          ticketNumber
        ),
        text: 'options.text',
        html: templateForCustomerPopulated,
      });

      logRequest.info(
        `Serv.A.F. ${session.user.userName} - Sent E-mail To Customer: ${[
          ticketCreatorEmail,
          ccEmails,
        ]} with subject ${populateSubject(
          EmailTemplateSubject.NEW_TICKET_CUSTOMER,
          ticketNumber
        )}`
      );
    }

    if (emailNotificationType === EmailNotificationType.TICKET_ESCALATION) {
      // Load and populate the template
      const templateForHandlerPopulated = populateTemplate(
        loadTemplate(EmailTemplate.TICKET_ESCALATION_HANDLER),
        {
          ticketNumber: ticketNumber,
          customerName: customer,
          escalationComment: 'Escalation Comment',
          escalationLevel: currentEscalationLevel,
          ticketSubject: ticketSubject,
        } as TemplateVariables[EmailTemplate.TICKET_ESCALATION_HANDLER]
      );

      const templateForCustomerPopulated = populateTemplate(
        loadTemplate(EmailTemplate.TICKET_ESCALATION_CUSTOMER),
        {
          ticketNumber: ticketNumber,
          escalationLevel: currentEscalationLevel,
          ticketSubject: ticketSubject,
          userName: ticketCreatorUserName,
        } as TemplateVariables[EmailTemplate.TICKET_ESCALATION_CUSTOMER]
      );

      // Send Email for Handler
      await transporter.sendMail({
        from: '"Nova Platinum Ticketing" <no-reply@nova.gr>',
        to: EmailListOfHandlers,
        subject: populateSubject(
          EmailTemplateSubject.TICKET_ESCALATION_HANDLER,
          ticketNumber
        ),
        text: 'options.text',
        html: templateForHandlerPopulated,
      });
      logRequest.info(
        `Serv.A.F. ${
          session.user.userName
        } - Sent E-mail To Handlers: ${EmailListOfHandlers} with subject ${populateSubject(
          EmailTemplateSubject.TICKET_ESCALATION_HANDLER,
          ticketNumber
        )}`
      );

      // Send E-mail for Customer && CC People
      await transporter.sendMail({
        from: '"Nova Platinum Ticketing" <no-reply@nova.gr>',
        to: [ticketCreatorEmail, ccEmails],
        subject: populateSubject(
          EmailTemplateSubject.TICKET_ESCALATION_CUSTOMER,
          ticketNumber
        ),
        text: 'options.text',
        html: templateForCustomerPopulated,
      });

      logRequest.info(
        `Serv.A.F. ${session.user.userName} - Sent E-mail To Customer: ${[
          ticketCreatorEmail,
          ccEmails,
        ]} with subject ${populateSubject(
          EmailTemplateSubject.TICKET_ESCALATION_CUSTOMER,
          ticketNumber
        )}`
      );
    }
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
