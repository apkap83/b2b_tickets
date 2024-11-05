export interface AppPermissionType {
  permissionName: AppPermissionTypes;
  permissionEndPoint: string;
  permissionDescription: string;
}

export type FormState = {
  status: 'UNSET' | 'SUCCESS' | 'ERROR';
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
  timestamp: number;
};

// Define transport names using TypeScript enum
export enum TransportName {
  AUTH = 'auth',
  ACTIONS = 'actions',
  EVENTS = 'events',
  ERROR = 'error',
  COMBINED = 'combined',
}

// export interface Ticket {
//   ticket_id: string;
//   Customer: string;
//   Ticket: string;
//   Title: string;
//   Description: string;
//   Severity: string;
//   Category: string;
//   Service: string;
//   Equipment: string;
//   Sid: string;
//   Cid: string;
//   Username: string;
//   Cli: string;
//   'Contact person': string;
//   'Contact phone number': string;
//   'Occurence date': Date;
//   Opened: Date;
//   'Opened By': string;
//   status_id: string;
//   Status: string;
//   'Status Date': Date;
//   'Status User': string;
//   Closed: Date | null;
//   'Closed By': string | null;
// }

export interface TicketCategory {
  category_id: string;
  Category: string;
}

export interface ServiceType {
  category_service_type_id: string;
  service_type_id: string;
  service_type_name: string;
}

export interface Severity {
  severity_id: string;
  severity: string;
}

export interface TicketFormState {
  title: string;
  equipmentId: string;
  sid: string;
  cid: string;
  userName: string;
  cliValue: string;
  contactPerson: string;
  contactPhoneNum: string;
  occurrenceDate: string;
  ticketCategory: string;
  serviceType: string;
}

export interface TicketComment {
  comment_id: string;
  ticket_id: string;
  'Ticket Number': string;
  'Comment Date': Date;
  Username: string;
  'First Name': string;
  'Last Name': string;
  user_customer_id: string;
  'User Customer Name': string;
  Comment: string;
  is_closure: string | null;
  by_system: string | null;
  escalation_level: string | null;
}

export interface TicketDetail {
  ticket_id: string;
  severity_id: string;
  Customer: string;
  'Cust. Type': string;
  Ticket: string;
  Title: string;
  Description: string;
  Severity: string;
  category_service_type_id: string;
  Category: string;
  Service: string;
  Equipment: string;
  Sid: string;
  Cid: string | null;
  Username: string | null;
  Cli: string | null;
  'Contact person': string;
  'Contact phone number': string;
  'Occurence date': Date; // Changed to Date type
  Opened: Date; // Changed to Date type
  'Opened By': string;
  Status: string;
  status_id: string;
  'Status Date': Date; // Changed to Date type
  'Status User': string;
  Closed: Date | null; // Changed to Date type
  'Closed By': string | null;
  escalation_info: string | null;
  last_comment_info: string;
  'Hours Passed': number | null;
  'Remedy Ticket': string | null;
  Escalated: string;
  'First Escalation User': string | null;
  'First Escalation Date': Date | null; // Changed to Date type
  'Last Escalation User': string | null;
  'Last Escalation Date': Date | null; // Changed to Date type
  'Curernt Escalation Level': number | null;
  last_comment_customer_type_id: number;
  'Last Comment Date': Date; // Changed to Date type
  'Last Cust. Comment Date': Date | null; // Changed to Date type
  'Hours Since Last Cust. Comment': number;
  'Delayed Response': string | null;
  comments: TicketComment[];
  'Is Final Status': string;
}

export enum AppRoleTypes {
  Admin = 'Admin',
  Security_Admin = 'Security Admin',
  B2B_TicketHandler = 'B2B Ticket Handler',
  B2B_TicketCreator = 'B2B Ticket Creator',
  User_Creator = 'User Creator',
}

export enum AppPermissionTypes {
  API_Admin = 'API_Admin',
  API_Security_Management = 'API_Security_Management',
  Tickets_Page = 'Tickets Page',
  Delete_Comments = 'Delete Comments',
  Ticket_Details_Page = 'Ticket Details Page',
  Users_List_Page = 'Users List Page',
  Create_New_Ticket = 'Create New Ticket',
  Set_Remedy_INC = 'Set Remedy INC',
  Escalate_Ticket = 'Escalate Ticket',
  Alter_Ticket_Severity = 'Alter Ticket Severity',
  Create_New_App_User = 'Create New App User',
  Edit_User = 'Edit User',
}

export enum AuthenticationTypes {
  LOCAL = 'LOCAL',
  LDAP = 'LDAP',
}

export enum TicketDetailsModalActions {
  NO_ACTION = 'No Action',
  CLOSE = 'Close',
  CANCEL = 'Cancel',
  ESCALATE = 'Escalate',
}

export enum TicketStatus {
  NEW = '1',
  WORKING = '2',
  CANCELLED = '3',
  CLOSED = '4',
}

export enum TicketStatusName {
  NEW = 'New',
  WORKING = 'Working',
  CANCELLED = 'Cancelled',
  CLOSED = 'Closed',
}

export enum TicketStatusColors {
  NEW = '#6870fa',
  WORKING = '#916430',
  CANCELLED = '#dc5743',
  CLOSED = '#3d8d52',
}

export enum TicketSeverityLevels {
  Low = '1',
  Medium = '2',
  High = '3',
}

export enum TicketSeverityColors {
  Low = '#28a745',
  Medium = '#ffc107',
  High = '#dc3545',
}

export enum FilterTicketsStatus {
  All = 'All Tickets',
  Open = 'Open Tickets',
  Closed = 'Resolved Tickets',
}

export enum ErrorCode {
  IncorrectUsernameOrPassword = 'incorrect-username-or-password',
  NoCredentialsProvided = 'no-credentials-provided',
  UserNotFound = 'user-not-found',
  UserIsLocked = 'user-is-locked',
  IncorrectPassword = 'incorrect-password',
  UserMissingPassword = 'missing-password',
  TwoFactorDisabled = 'two-factor-disabled',
  TwoFactorAlreadyEnabled = 'two-factor-already-enabled',
  TwoFactorSetupRequired = 'two-factor-setup-required',
  SecondFactorRequired = 'second-factor-required',
  IncorrectTwoFactorCode = 'incorrect-two-factor-code',
  InternalServerError = 'internal-server-error',

  NewPasswordMatchesOld = 'new-password-matches-old',

  CaptchaJWTTokenRequired = 'captcha-jwt-token-required',
  CaptchaJWTTokenInvalid = 'captcha-jwt-token-invalid',

  EmailIsRequired = 'email-is-required',

  IncorrectEmailProvided = 'incorrect-email-provided',

  TotpJWTTokenRequired = 'totp-jwt-token-required',
  TotpJWTTokenInvalid = 'totp-jwt-token-invalid',

  TokenForEmailRequired = 'token-for-email-required',

  IncorrectPassResetTokenProvided = 'incorrect-pass-reset-token-provided',
  EmailJWTTokenRequired = 'email-jwt-token-required',
  EmailJWTTokenInvalid = 'email-jwt-token-invalid',

  NewPasswordRequired = 'new-password-required',
  NoRoleAssignedToUser = 'no-role-assigned-to-user',
}

export enum EscalationStatus {
  ESCALATED = 'Escalated',
}

export const EscalationFillColor = '#6a2424';
export const EscalationBorderColor = '#6a2424';

export enum EmailTemplate {
  NEW_TICKET = 'NewTicket.html',
  TICKET_ESCALATION = 'Escalate_Ticket.html',
  TICKET_CLOSURE = 'CloseTicket.html',
}

export interface EmailVariableTypes {
  customerName: string;
  ticketNumber: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  type: EmailTemplate;
  emailVariables:
    | EmailVariablesForTicketCreation
    | EmailVariablesForTicketEscalation
    | EmailVariablesForTicketClosure;
}

export interface EmailVariablesForTicketCreation {
  customerName: string;
  ticketNumber: string;
}

export interface EmailVariablesForTicketEscalation {
  customerName: string;
  ticketNumber: string;
  escalationLevel: string;
}

export interface EmailVariablesForTicketClosure {
  customerName: string;
  ticketNumber: string;
}
