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
  'Occurence date': Date; // Adjusted to Date type for better type safety
  Opened: Date; // Adjusted to Date type for better type safety
  'Opened By': string;
  Status: string;
  'Status Date': Date; // Adjusted to Date type for better type safety
  'Status User': string;
  Closed: Date | null; // Adjusted to Date type for better type safety and nullability
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
