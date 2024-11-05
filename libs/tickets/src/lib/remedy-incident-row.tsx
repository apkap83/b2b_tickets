'use client';
import { TicketDetail } from '@b2b-tickets/shared-models';
import { userHasRole } from '@b2b-tickets/utils';
import { AppRoleTypes } from '@b2b-tickets/shared-models';
import { Tooltip as ReactTooltip } from 'react-tooltip';

const detailsRowClass =
  'w-full justify-center items-center gap-2.5 inline-flex text-md';

const detailsRowHeaderClass =
  "grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-8";

export const RemedyIncidentRow = ({
  session,
  ticketDetails,
  setShowRemedyIncDialog,
}: {
  session: any;
  ticketDetails: TicketDetail[];
  setShowRemedyIncDialog: (a: boolean) => void;
}) => {
  if (ticketDetails[0].status_id === '1') return null;
  const isFinalStatus =
    ticketDetails[0]['Is Final Status'] === 'y' ? true : false;

  if (userHasRole(session, AppRoleTypes.B2B_TicketHandler)) {
    return (
      <>
        <div className={detailsRowClass}>
          <div className={detailsRowHeaderClass}>Remedy Incident</div>
          <div
            data-tooltip-id={
              userHasRole(session, AppRoleTypes.B2B_TicketHandler) &&
              !isFinalStatus
                ? 'editRemedyInc'
                : undefined // Only add tooltip ID if the condition is met
            }
            className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight"
          >
            {!ticketDetails[0]['Remedy Ticket'] ? (
              <RemedyIncidentButton
                ticketDetails={ticketDetails}
                btnLabel="Add Remedy Incident"
                setShowRemedyIncDialog={setShowRemedyIncDialog}
              />
            ) : (
              <RemedyIncidentButton
                ticketDetails={ticketDetails}
                btnLabel=""
                setShowRemedyIncDialog={setShowRemedyIncDialog}
              />
            )}
          </div>
        </div>
        <ReactTooltip
          id="editRemedyInc"
          place="bottom"
          content="Edit Remedy INC"
        />
      </>
    );
  }

  if (ticketDetails[0]['Remedy Ticket']) {
    return (
      <div className={detailsRowClass}>
        <div className={detailsRowHeaderClass}>Remedy Incident</div>
        <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
          {ticketDetails[0]['Remedy Ticket'] ? (
            <span className="text-black">
              {ticketDetails[0]['Remedy Ticket']}
            </span>
          ) : (
            'Not Defined'
          )}
        </div>
      </div>
    );
  }
};

const RemedyIncidentButton = ({
  btnLabel,
  ticketDetails,
  setShowRemedyIncDialog,
}: {
  btnLabel: string;
  ticketDetails: TicketDetail[];
  setShowRemedyIncDialog: (a: boolean) => void;
}) => {
  const remedyInc = ticketDetails[0]['Remedy Ticket'] || '';
  const ticketIsFinal = ticketDetails[0]['Is Final Status'];
  return (
    <button
      className="shadow-md border bg-[#4461ac] text-white px-2 py-1 rounded-md hover:bg-[#5c81e0] disabled:bg-gray-400 transform transition-transform duration-150 hover:scale-105"
      disabled={ticketIsFinal === 'y' ? true : false}
      onClick={async () => {
        setShowRemedyIncDialog(true);
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
      {remedyInc ? remedyInc : btnLabel}
    </button>
  );
};
