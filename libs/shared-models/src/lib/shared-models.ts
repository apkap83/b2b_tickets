export type FormState = {
  status: 'UNSET' | 'SUCCESS' | 'ERROR';
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
  timestamp: number;
};

export interface Ticket {
  ticket_id: string;
  Customer: string;
  Ticket: string;
  Title: string;
  Category: string;
  Service: string;
  Equipment: string;
  Sid: string;
  Cid: string;
  Username: string;
  Cli: string;
  'Contact person': string;
  'Contact phone number': string;
  'Occurence date': Date;
  Opened: Date;
  'Opened By': string;
  Status: string;
  'Status Date': Date;
  'Status User': string;
  Closed: Date | null;
  'Closed By': string | null;
}

export interface TicketCategory {
  category_id: string;
  Category: string;
}

export interface ServiceType {
  service_id: string;
  'Service Name': string;
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

export interface TicketComments {
  comment_id: number;
  ticket_id: number;
  comment_date: Date;
  comment_user_id: Date;
  comment: string;
  is_closure: string;
  creation_user: string;
  username: string;
  customer_name: string;
}

export enum AppRoleTypes {
  Admin = 'Admin',
  SimpleUser = 'SimpleUser',
}

export enum AppPermissionTypes {
  API_Admin = 'API_Admin',
  API_Security_Management = 'API_Security_Management',
}

export enum AuthenticationTypes {
  LOCAL = 'LOCAL',
  LDAP = 'LDAP',
}
