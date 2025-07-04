'use server';
import fs from 'fs';
import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import { redirect } from 'next/navigation';
import {
  userHasRole,
  symmetricEncrypt,
  stripHtmlTags,
} from '@b2b-tickets/utils';

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
  // EmailListOfHandlers,
  TicketEscalation,
  TicketCommentDB,
  B2BUserType,
  NMS_Team_Email_Address,
  ApplicationEnvironment,
} from '@b2b-tickets/shared-models';
import config from '@b2b-tickets/config';
import { pgB2Bpool, setSchemaAndTimezone } from '@b2b-tickets/db-access';

import { B2BUser } from '@b2b-tickets/db-access';

import jwt, { JwtPayload } from 'jsonwebtoken';

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
  replacements: { [key: string]: string }
): string => {
  let subject = subjectTemplate as string;

  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = `{{${key}}}`;
    subject = subject.replace(new RegExp(placeholder, 'g'), value);
  }

  return subject;
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

export const sendEmailOnTicketUpdate = async (
  emailNotificationType: EmailNotificationType,
  ticketId?: string,
  escalationId?: string
): Promise<void> => {
  if (!config.SendEmails || !ticketId) return;
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

    // Find Ticket from ticketId
    const ticket: TicketDetail = await getTicketDetailsFromTicketId(ticketId);

    // Find Cc Users
    const res = await getCcValuesForTicket({ ticketId });

    const EmailListOfHandlers = config.emailListOfHandlers;

    const ticketCreatorEmail = ticket.ticket_creator_email;
    const ticketCreatorUserName = ticket['Opened By'];
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
          ticketNumber: ticketNumber,
          ticketSubject: ticketSubject,
        } as TemplateVariables[EmailTemplate.NEW_TICKET_CUSTOMER]
      );

      // Send Email for Handler
      await transporter.sendMail({
        from: config.EmailFromAddress,
        to: EmailListOfHandlers,
        subject: populateSubject(EmailTemplateSubject.NEW_TICKET_HANDLER, {
          ticketNumber,
        }),
        text: stripHtmlTags(templateForHandlerPopulated),
        html: templateForHandlerPopulated,
      });
      logRequest.info(
        `Serv.A.F. ${
          session.user.userName
        } - Sent E-mail To Handlers: ${EmailListOfHandlers} with subject ${populateSubject(
          EmailTemplateSubject.NEW_TICKET_HANDLER,
          { ticketNumber }
        )}`
      );

      // Send E-mail for Customer && CC People
      await transporter.sendMail({
        from: config.EmailFromAddress,
        to: [ticketCreatorEmail],
        cc: ccEmails ? [ccEmails] : [],
        subject: populateSubject(EmailTemplateSubject.NEW_TICKET_CUSTOMER, {
          ticketNumber,
        }),
        text: stripHtmlTags(templateForCustomerPopulated),
        html: templateForCustomerPopulated,
      });

      logRequest.info(
        `Serv.A.F. ${session.user.userName} - Sent E-mail To Customer: ${[
          ticketCreatorEmail,
          ccEmails,
        ]} with subject ${populateSubject(
          EmailTemplateSubject.NEW_TICKET_CUSTOMER,
          { ticketNumber }
        )}`
      );
    }

    if (emailNotificationType === EmailNotificationType.TICKET_ESCALATION) {
      // Get Escalation Comment Id
      const escalationResult = await pgB2Bpool.query(
        'SELECT * FROM TICKET_ESCALATIONS_V WHERE ESCALATION_ID = $1',
        [escalationId]
      );

      const escalation: TicketEscalation = escalationResult.rows[0];
      const escalationMailHandlerRecipients =
        escalation.escalation_email_recipients;
      const escalationComment = escalation.escalation_comment;

      // Load and populate the template
      const templateForHandlerPopulated = populateTemplate(
        loadTemplate(EmailTemplate.TICKET_ESCALATION_HANDLER),
        {
          webSiteUrl: config.webSiteUrl,
          ticketNumber: ticketNumber,
          escalationLevel: currentEscalationLevel,
          customerName: customer,
          ticketSubject: ticketSubject,
          escalationComment: escalationComment,
        } as TemplateVariables[EmailTemplate.TICKET_ESCALATION_HANDLER]
      );

      const templateForCustomerPopulated = populateTemplate(
        loadTemplate(EmailTemplate.TICKET_ESCALATION_CUSTOMER),
        {
          webSiteUrl: config.webSiteUrl,
          ticketNumber: ticketNumber,
          escalationLevel: currentEscalationLevel,
          ticketSubject: ticketSubject,
        } as TemplateVariables[EmailTemplate.TICKET_ESCALATION_CUSTOMER]
      );

      // Send Email for Handler
      await transporter.sendMail({
        from: config.EmailFromAddress,
        to: escalationMailHandlerRecipients.split(/[,;]/),
        subject: populateSubject(
          EmailTemplateSubject.TICKET_ESCALATION_HANDLER,
          { ticketNumber, currentEscalationLevel }
        ),
        text: stripHtmlTags(templateForHandlerPopulated),
        html: templateForHandlerPopulated,
      });

      logRequest.info(
        `Serv.A.F. ${
          session.user.userName
        } - Sent E-mail To Handlers: ${EmailListOfHandlers} with subject ${populateSubject(
          EmailTemplateSubject.TICKET_ESCALATION_HANDLER,
          { ticketNumber }
        )}`
      );

      // Send E-mail for Customer && CC People
      await transporter.sendMail({
        from: config.EmailFromAddress,
        to: [ticketCreatorEmail],
        cc: ccEmails ? [ccEmails] : [],
        subject: populateSubject(
          EmailTemplateSubject.TICKET_ESCALATION_CUSTOMER,
          { ticketNumber, currentEscalationLevel }
        ),
        text: stripHtmlTags(templateForCustomerPopulated),
        html: templateForCustomerPopulated,
      });

      logRequest.info(
        `Serv.A.F. ${session.user.userName} - Sent E-mail To Customer: ${[
          ticketCreatorEmail,
          ccEmails,
        ]} with subject ${populateSubject(
          EmailTemplateSubject.TICKET_ESCALATION_CUSTOMER,
          { ticketNumber }
        )}`
      );
    }

    if (emailNotificationType === EmailNotificationType.TICKET_CLOSURE) {
      // Load and populate the template
      const templateForHandlerPopulated = populateTemplate(
        loadTemplate(EmailTemplate.TICKET_CLOSURE_HANDLER),
        {
          webSiteUrl: config.webSiteUrl,
          ticketNumber: ticketNumber,
          customerName: customer,
          ticketSubject: ticketSubject,
        } as TemplateVariables[EmailTemplate.TICKET_CLOSURE_HANDLER]
      );

      const templateForCustomerPopulated = populateTemplate(
        loadTemplate(EmailTemplate.TICKET_CLOSURE_CUSTOMER),
        {
          webSiteUrl: config.webSiteUrl,
          ticketNumber: ticketNumber,
          ticketSubject: ticketSubject,
        } as TemplateVariables[EmailTemplate.TICKET_CLOSURE_CUSTOMER]
      );

      // Send Email for Handler
      await transporter.sendMail({
        from: config.EmailFromAddress,
        to: EmailListOfHandlers,
        subject: populateSubject(EmailTemplateSubject.TICKET_CLOSURE_HANDLER, {
          ticketNumber,
        }),
        text: stripHtmlTags(templateForHandlerPopulated),
        html: templateForHandlerPopulated,
      });
      logRequest.info(
        `Serv.A.F. ${
          session.user.userName
        } - Sent E-mail for Ticket Closure To Handlers: ${EmailListOfHandlers} with subject ${populateSubject(
          EmailTemplateSubject.TICKET_CLOSURE_HANDLER,
          { ticketNumber }
        )}`
      );

      // Send E-mail for Customer && CC People
      await transporter.sendMail({
        from: config.EmailFromAddress,
        to: [ticketCreatorEmail],
        cc: ccEmails ? [ccEmails] : [],
        subject: populateSubject(EmailTemplateSubject.TICKET_CLOSURE_CUSTOMER, {
          ticketNumber,
        }),
        text: stripHtmlTags(templateForCustomerPopulated),
        html: templateForCustomerPopulated,
      });

      logRequest.info(
        `Serv.A.F. ${
          session.user.userName
        } - Sent E-mail for Ticket Closure To Customer: ${[
          ticketCreatorEmail,
          ccEmails,
        ]} with subject ${populateSubject(
          EmailTemplateSubject.TICKET_CLOSURE_CUSTOMER,
          { ticketNumber }
        )}`
      );
    }
  } catch (error) {
    logRequest.error(error);
  }
};

export async function sendEmailsForUserCreation({
  emailNotificationType,
  email,
  userName,
}: {
  emailNotificationType: EmailNotificationType;
  email: string;
  userName: string;
}) {
  if (!config.SendEmails) return;

  const logRequest = await getRequestLogger(TransportName.AUTH);
  try {
    if (emailNotificationType === EmailNotificationType.USER_CREATION) {
      const env =
        process.env['APP_ENV'] === 'staging'
          ? ApplicationEnvironment.Staging
          : process.env['NODE_ENV'] === 'production'
          ? ApplicationEnvironment.Production
          : ApplicationEnvironment.Development;

      const secureLink = await generateSecureLinkForPasswordCreation(email);

      let emailTemplate = null;
      let subject = null;

      if (env === ApplicationEnvironment.Staging) {
        emailTemplate = EmailTemplate.NEW_USER_CREATION_NOTIFICATION_STAGING;
        subject = populateSubject(
          EmailTemplateSubject.NEW_USER_CREATION_STAGING,
          { appEnvironment: env }
        );
      }

      if (env === ApplicationEnvironment.Development) {
        emailTemplate =
          EmailTemplate.NEW_USER_CREATION_NOTIFICATION_DEVELOPMENT;
        subject = populateSubject(
          EmailTemplateSubject.NEW_USER_CREATION_DEVELOPMENT,
          { appEnvironment: env }
        );
      }

      if (env === ApplicationEnvironment.Production) {
        emailTemplate = EmailTemplate.NEW_USER_CREATION_NOTIFICATION_PRODUCTION;
        subject = EmailTemplateSubject.NEW_USER_CREATION_PRODUCTION;
      }

      // Load and populate the template
      const templateForUserCreation = populateTemplate(
        loadTemplate(emailTemplate as EmailTemplate),
        {
          secureLink,
          email,
          appEnvironment: env,
          appURL: config.webSiteUrl,
        } as
          | TemplateVariables[EmailTemplate.NEW_USER_CREATION_NOTIFICATION_STAGING]
          | TemplateVariables[EmailTemplate.NEW_USER_CREATION_NOTIFICATION_DEVELOPMENT]
          | TemplateVariables[EmailTemplate.NEW_USER_CREATION_NOTIFICATION_PRODUCTION]
      );

      // Send Email for Handler
      await transporter.sendMail({
        from: config.EmailFromAddress,
        to: [email],
        // cc: NMS_Team_Email_Address,
        subject: subject as string,
        text: stripHtmlTags(templateForUserCreation),
        html: templateForUserCreation,
      });

      logRequest.info(
        `Serv.A.F. - Sent E-mail for User creation Notification to ${email}`
      );
    }
  } catch (error) {
    logRequest.error(error);
  }
}

export async function sendEmailForPasswordReset(
  emailNotificationType: EmailNotificationType,
  email: string,
  verificationCode: string
) {
  if (!config.SendEmails) return;

  const logRequest = await getRequestLogger(TransportName.AUTH);
  try {
    if (emailNotificationType === EmailNotificationType.RESET_TOKEN) {
      const env =
        process.env['APP_ENV'] === 'staging'
          ? ApplicationEnvironment.Staging
          : process.env['NODE_ENV'] === 'production'
          ? ApplicationEnvironment.Production
          : ApplicationEnvironment.Development;

      let emailTemplate = EmailTemplate.EMAIL_TOKEN_NOTIFICATION;
      let subject = EmailTemplateSubject.EMAIL_TOKEN_NOTIFICATION;

      // Load and populate the template
      const templateForUserCreation = populateTemplate(
        loadTemplate(emailTemplate as EmailTemplate),
        {
          verificationCode,
          productNameTeam: process.env['PRODUCT_NAME_TEAM'],
          signatureEmail: process.env['SIGNATURE_EMAIL'],
        } as TemplateVariables[EmailTemplate.EMAIL_TOKEN_NOTIFICATION]
      );

      // Send Email for Handler
      await transporter.sendMail({
        from: config.EmailFromAddress,
        to: [email],
        // cc: NMS_Team_Email_Address,
        subject: subject as string,
        text: stripHtmlTags(templateForUserCreation),
        html: templateForUserCreation,
      });

      logRequest.info(
        `Serv.A.F. - Sent E-mail Notification for Password Reset to ${email}`
      );
    }
  } catch (error) {
    logRequest.error(error);
  }
}

export async function sendEmailForTOTPCode(
  emailNotificationType: EmailNotificationType,
  email: string,
  totpCode: string
) {
  if (!config.SendEmails) return;

  const logRequest = await getRequestLogger(TransportName.AUTH);
  try {
    if (emailNotificationType === EmailNotificationType.TOTP_BY_EMAIL) {
      const env =
        process.env['APP_ENV'] === 'staging'
          ? ApplicationEnvironment.Staging
          : process.env['NODE_ENV'] === 'production'
          ? ApplicationEnvironment.Production
          : ApplicationEnvironment.Development;

      let emailTemplate = EmailTemplate.TOTP_BY_EMAIL;
      let subject = EmailTemplateSubject.TOTP_BY_EMAIL_NOTIFICATION;

      // Load and populate the template
      const templateforTOTPByEmail = populateTemplate(
        loadTemplate(emailTemplate as EmailTemplate),
        {
          totpCode,
        } as TemplateVariables[EmailTemplate.TOTP_BY_EMAIL]
      );

      // Send Email for Handler
      await transporter.sendMail({
        from: config.EmailFromAddress,
        to: [email],
        // cc: NMS_Team_Email_Address,
        subject: subject as string,
        text: stripHtmlTags(templateforTOTPByEmail),
        html: templateforTOTPByEmail,
      });

      logRequest.info(
        `Serv.A.F. - Sent E-mail Notification for TOTP Code to ${email}`
      );
    }
  } catch (error) {
    logRequest.error(error);
  }
}

export async function sendEmailForNewHandlerComment(
  emailNotificationType: EmailNotificationType,
  ticketId: string
) {
  if (!config.SendEmails) return;

  const logRequest = await getRequestLogger(TransportName.AUTH);
  try {
    // Find Ticket from ticketId
    const ticket: TicketDetail = await getTicketDetailsFromTicketId(ticketId);

    // Find Cc Users
    const res = await getCcValuesForTicket({ ticketId });

    const ccEmails = res.data?.ccEmails as string;
    const ccPhones = res.data?.ccPhones as string;

    if (emailNotificationType === EmailNotificationType.NEW_HANDLER_COMMENT) {
      const env =
        process.env['APP_ENV'] === 'staging'
          ? ApplicationEnvironment.Staging
          : process.env['NODE_ENV'] === 'production'
          ? ApplicationEnvironment.Production
          : ApplicationEnvironment.Development;

      let emailTemplate = null;
      let subject = null;

      if (env === ApplicationEnvironment.Staging) {
        emailTemplate = EmailTemplate.NEW_HANDLER_COMMENT_NOTIFICATION_STAGING;
        subject = populateSubject(
          EmailTemplateSubject.NEW_HANDLER_COMMENT_STAGING,
          { appEnvironment: env }
        );
      }

      if (env === ApplicationEnvironment.Development) {
        emailTemplate =
          EmailTemplate.NEW_HANDLER_COMMENT_NOTIFICATION_DEVELOPMENT;
        subject = populateSubject(
          EmailTemplateSubject.NEW_HANDLER_COMMENT_DEVELOPMENT,
          { appEnvironment: env }
        );
      }

      if (env === ApplicationEnvironment.Production) {
        emailTemplate =
          EmailTemplate.NEW_HANDLER_COMMENT_NOTIFICATION_PRODUCTION;
        subject = EmailTemplateSubject.NEW_HANDLER_COMMENT_PRODUCTION;
      }

      // Load and populate the template
      const templateForUserCreation = populateTemplate(
        loadTemplate(emailTemplate as EmailTemplate),
        {
          appEnvironment: env,
          webSiteUrl: config.webSiteUrl,
          ticketNumber: ticket.Ticket,
          productCompanyName: process.env['PRODUCT_COMPANY_NAME'],
          signatureEmail: process.env['SIGNATURE_EMAIL'],
          productNameTeam: process.env['PRODUCT_NAME_TEAM'],
        } as
          | TemplateVariables[EmailTemplate.NEW_HANDLER_COMMENT_NOTIFICATION_DEVELOPMENT]
          | TemplateVariables[EmailTemplate.NEW_HANDLER_COMMENT_NOTIFICATION_STAGING]
          | TemplateVariables[EmailTemplate.NEW_HANDLER_COMMENT_NOTIFICATION_PRODUCTION]
      );

      // Send Email for Handler
      await transporter.sendMail({
        from: config.EmailFromAddress,
        to: [ticket.ticket_creator_email],
        cc: ccEmails ? [ccEmails] : [],
        subject: subject as string,
        text: stripHtmlTags(templateForUserCreation),
        html: templateForUserCreation,
      });

      logRequest.info(
        `Serv.A.F. - Sent E-mail for New Handler Comment To: ${ticket.ticket_creator_email} and Cc: ${ccEmails}`
      );
    }
  } catch (error) {
    logRequest.error(error);
  }
}

const getCcValuesForTicket = async ({
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

const generateSecureLinkForPasswordCreation = async (
  email: string
): Promise<string | undefined> => {
  if (!email) {
    return;
  }

  interface MyJwtPayload extends JwtPayload {
    userName: string;
    email: string;
    is_active: string;
    is_locked: string;
  }

  // Find User By email address
  const foundUser: B2BUserType = await B2BUser.findOne({
    where: {
      email: email,
    },
  });

  const payload = {
    userName: foundUser.username,
    email: foundUser.email as string,
    is_active: foundUser.is_active,
    is_locked: foundUser.is_locked,
  };

  // Generate a JWT token
  const secretKey = process.env['JWT_SECRET']!;
  //@ts-ignore
  const token = jwt.sign(
    payload, // Payload
    secretKey, // Secret key
    { expiresIn: config.userCreationSecureLinkValidity } // Token is valid for X days
  );

  const encryptedSecret = symmetricEncrypt(token);
  return `${config.webSiteUrl}/reset-pass/${encryptedSecret}`;
};

const getTicketDetailsFromTicketId = async (ticketId: string) => {
  await setSchemaAndTimezone(pgB2Bpool);
  // Find Ticket from ticketId
  const ticketResp = await pgB2Bpool.query(
    'SELECT * from tickets_v where ticket_id = $1',
    [ticketId]
  );

  return ticketResp.rows[0] as TicketDetail;
};
