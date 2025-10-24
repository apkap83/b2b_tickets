'use client';
import {
  TicketDetail,
  TicketDetailForTicketCreator,
} from '@b2b-tickets/shared-models';
import { userHasRole } from '@b2b-tickets/utils';
import { AppRoleTypes } from '@b2b-tickets/shared-models';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { formatDate } from '@b2b-tickets/utils';
import { FaPencilAlt } from 'react-icons/fa';
import Tooltip from '@mui/material/Tooltip';

const detailsRowClass =
  'w-full justify-center items-center gap-2.5 inline-flex text-md';

const detailsRowHeaderClass =
  "grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-8";

export const ActualResolutionRow = ({
  session,
  ticketDetails,
  setShowActualResolutionDateDialog,
}: {
  session: any;
  ticketDetails: TicketDetail[] | TicketDetailForTicketCreator[];
  setShowActualResolutionDateDialog: (a: boolean) => void;
}) => {
  const actualResolutionTimestamp =
    ticketDetails[0]['Actual Resolution Timestamp'] || null;
  if (ticketDetails[0].status_id === '1') return null;
  const isFinalStatus =
    ticketDetails[0]['Is Final Status'] === 'y' ? true : false;

  if (!isFinalStatus) {
    return null;
  }

  if (isFinalStatus && userHasRole(session, AppRoleTypes.B2B_TicketHandler)) {
    return (
      <>
        <div className={detailsRowClass}>
          <div className={detailsRowHeaderClass}>Actual Resolution Date </div>
          <div
            data-tooltip-id={
              userHasRole(session, AppRoleTypes.B2B_TicketHandler) &&
              !isFinalStatus
                ? 'editActualResolutionDate'
                : undefined // Only add tooltip ID if the condition is met
            }
            className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight"
          >
            <AlterButton
              ticketDetails={ticketDetails}
              btnLabel=""
              setShowActualResolutionDateDialog={
                setShowActualResolutionDateDialog
              }
            />
          </div>
        </div>
        <ReactTooltip
          id="editActualResolutionDate"
          place="bottom"
          content="Edit Actual Resolution Date"
        />
      </>
    );
  }

  if (isFinalStatus) {
    return (
      <div className={detailsRowClass}>
        <div className={detailsRowHeaderClass}>Actual Resolution Date</div>
        <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
          {actualResolutionTimestamp ? (
            <span className="text-black">
              {formatDate(actualResolutionTimestamp)}
            </span>
          ) : (
            'Not Defined'
          )}
        </div>
      </div>
    );
  }
};

const AlterButton = ({
  btnLabel,
  ticketDetails,
  setShowActualResolutionDateDialog,
}: {
  btnLabel: string;
  ticketDetails: TicketDetail[] | TicketDetailForTicketCreator[];
  setShowActualResolutionDateDialog: (a: boolean) => void;
}) => {
  const actualResolutionTimestamp =
    ticketDetails[0]['Actual Resolution Timestamp'] || null;
  const ticketIsFinal = ticketDetails[0]['Is Final Status'];

  return (
    <div className="bg-[#4461ac] hover:bg-[#5c81e0] shadow-md rounded-md transform transition-transform duration-150">
      <Tooltip
        title={'Edit Resolution Date'}
        slotProps={{
          popper: {
            modifiers: [
              {
                name: 'offset',
                options: {
                  offset: [0, -10],
                },
              },
            ],
          },
        }}
      >
        <button
          className="w-full h-full flex justify-center items-center gap-2 rounded-md text-white px-2 py-1 disabled:bg-gray-400 "
          disabled={ticketIsFinal === 'n' ? true : false}
          onClick={async () => {
            setShowActualResolutionDateDialog(true);
          }}
        >
          {formatDate(actualResolutionTimestamp)}
        </button>
      </Tooltip>
    </div>
  );
};
