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

export interface TicketComment {
  comment_id: number;
  ticket_id: number;
  comment_date: Date;
  comment_user_id: Date;
  comment: string;
  is_closure: string;
  creation_user: string;
  username: string;
  first_name: string;
  last_name: string;
  customer_name: string;
}

export interface TicketDetail {
  ticket_id: string;
  customer_id: string;
  ticket_number: string;
  title: string;
  description: string;
  category_id: string;
  service_id: string;
  equipment_id: string;
  sid: string;
  cid: string;
  username: string;
  cli: string;
  contact_person: string;
  contact_phone_number: string;
  occurrence_date: Date;
  open_date: Date;
  open_user_id: string;
  status_id: string;
  status_date: Date;
  status_user_id: string;
  close_date: Date | null;
  close_user_id: string | null;
  root_cause: string | null;
  record_version: string;
  creation_date: Date;
  creation_user: string;
  last_update_date: Date | null;
  last_update_user: string | null;
  last_update_process: string;
  category_name: string;
  service_name: string;
  start_date: Date;
  end_date: Date | null;
  comments: TicketComment[];
}

export enum AppRoleTypes {
  Admin = 'Admin',
  SimpleUser = 'SimpleUser',
  B2B_TicketHandler = 'B2B Ticket Handler',
}

export enum AppPermissionTypes {
  API_Admin = 'API_Admin',
  API_Security_Management = 'API_Security_Management',
  Delete_Comments = 'Delete Comments',
}

export enum AuthenticationTypes {
  LOCAL = 'LOCAL',
  LDAP = 'LDAP',
}
