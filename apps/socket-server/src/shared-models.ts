export enum WebSocketMessage {
  NEW_TICKET_CREATED = 'NewTicketCreated',
  NEW_COMMENT_ADDED = 'NewCommentAdded',
  TICKET_STARTED_WORK = 'TicketStartedWorking',
  TICKET_ESCALATED = 'TicketEscalated',
  TICKET_ALTERED_SEVERITY = 'TicketAlteredSeverity',
  TICKET_ALTERED_REMEDY_INC = 'TicketAlteredRemedyInc',
  TICKET_ALTERED_CATEGORY_SERVICE_TYPE = 'TicketAlteredCategoryServiceType',
  TICKET_CLOSED = 'TicketClosed',
  TICKET_CANCELED = 'TicketCancelled',
  NEW_FILE_ATTACHMENT_FOR_TICKET = 'NewFileAttachmentForTicket',
  DELETE_FILE_ATTACHMENT_FOR_TICKET = 'DeleteFileAttachmentForTicket',
}

export interface WebSocketData {
  [WebSocketMessage.NEW_TICKET_CREATED]: {
    ticket_id: string;
  };
  [WebSocketMessage.NEW_COMMENT_ADDED]: {
    ticket_id: string;
    isTicketCreator: boolean;
    date: Date;
  };

  [WebSocketMessage.TICKET_STARTED_WORK]: {
    ticket_id: string;
  };

  [WebSocketMessage.TICKET_ESCALATED]: {
    ticket_id: string;
  };

  [WebSocketMessage.TICKET_ALTERED_SEVERITY]: {
    ticket_id: string;
    // severityId: string;
  };

  [WebSocketMessage.TICKET_ALTERED_REMEDY_INC]: {
    ticket_id: string;
  };

  [WebSocketMessage.TICKET_ALTERED_CATEGORY_SERVICE_TYPE]: {
    ticket_id: string;
  };

  [WebSocketMessage.TICKET_CLOSED]: {
    ticket_id: string;
  };

  [WebSocketMessage.TICKET_CANCELED]: {
    ticket_id: string;
  };

  [WebSocketMessage.NEW_FILE_ATTACHMENT_FOR_TICKET]: {
    ticket_id: string;
  };

  [WebSocketMessage.DELETE_FILE_ATTACHMENT_FOR_TICKET]: {
    ticket_id: string;
    attachment_id: string;
    filename: string;
  };
}
