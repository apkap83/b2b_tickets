'use client';
import { getSeverityStatusColor } from '@b2b-tickets/utils';
import { TicketDetail } from '@b2b-tickets/shared-models';
import { userHasRole } from '@b2b-tickets/utils';
import { AppRoleTypes } from '@b2b-tickets/shared-models';
import { SeverityButton } from './severity-button';
import { Tooltip as ReactTooltip } from 'react-tooltip';

const detailsRowClass =
  'w-full justify-center items-center gap-2.5 inline-flex text-md';

const detailsRowHeaderClass =
  "grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-8";

export const SeverityRow = ({
  session,
  ticketDetails,
  setShowSeverityDialog,
}: {
  session: any;
  ticketDetails: TicketDetail[];
  setShowSeverityDialog: (a: boolean) => void;
}) => {
  const statusColor = getSeverityStatusColor(ticketDetails[0].severity_id);
  const isFinalStatus =
    ticketDetails[0]['Is Final Status'] === 'y' ? true : false;
  return (
    <>
      {' '}
      <div className={`${detailsRowClass} mb-1`}>
        <div className={detailsRowHeaderClass}>Severity</div>
        <div
          data-tooltip-id={
            userHasRole(session, AppRoleTypes.B2B_TicketHandler) &&
            !isFinalStatus
              ? 'editSeverity'
              : undefined // Only add tooltip ID if the condition is met
          }
          className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight"
        >
          <SeverityButton
            clickable={
              userHasRole(session, AppRoleTypes.B2B_TicketHandler)
                ? true
                : false
            }
            ticketDetails={ticketDetails}
            btnLabel=""
            setShowSeverityDialog={setShowSeverityDialog}
            //@ts-ignore
            style={{
              backgroundColor: isFinalStatus ? 'gray' : statusColor,
              borderColor: isFinalStatus ? 'gray' : statusColor,
            }}
          />
        </div>
      </div>
      <ReactTooltip id="editSeverity" place="bottom" content="Edit Severity" />
    </>
  );
};
