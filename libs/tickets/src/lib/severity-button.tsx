'use client';

import { TicketComment, TicketDetail } from '@b2b-tickets/shared-models';

export const SeverityButton = ({
  btnLabel,
  ticketDetails,
  setShowSeverityDialog,
  clickable,
  ...rest
}: {
  btnLabel: string;
  ticketDetails: TicketDetail[];
  setShowSeverityDialog: (a: boolean) => void;
  clickable: boolean;
}) => {
  const severity = ticketDetails[0].Severity || '';
  const ticketIsFinal = ticketDetails[0]['Is Final Status'];
  return (
    <button
      {...rest}
      className="shadow-md border bg-[#4461ac] text-white px-2 py-1 rounded-md hover:bg-[#5c81e0] disabled:bg-gray-400 transform transition-transform duration-150 hover:scale-105"
      disabled={ticketIsFinal === 'y' || clickable === false ? true : false}
      onClick={async () => {
        setShowSeverityDialog(true);
        /*
          const remedyIncId = window.prompt(
            'Please enter Remedy Ticket ID:',
            remedyInc ? remedyInc : ''
          );
  
          if (remedyIncId) {
            const resp = await setRemedyIncidentIDForTicket({
              ticketId: ticketDetails[0].ticket_id,
              remedyIncId,
              ticketNumber: ticketDetails[0].Ticket,
            });
  
            if (!resp) {
              toast.error('An error occurred');
              return;
            }
  
            if (resp?.status === 'ERROR') {
              toast.error(resp.message);
              return;
            }
  
            toast.success(resp.message);
  
          }
          */
      }}
    >
      {severity ? severity : btnLabel}
    </button>
  );
};
