'use client';
import React, { useState, useEffect } from 'react';
import { getGreekDateFormat } from '@b2b-tickets/utils';
import { TicketComment, TicketDetail } from '@b2b-tickets/shared-models';
import { TicketsUiComments } from '@b2b-tickets/tickets/ui/comments';
import { NewCommentModal } from './new-comment-modal';
import { EscalateModal } from './escalate-modal';

import clsx from 'clsx';
import { useSession } from 'next-auth/react';
import { useEscKeyListener } from '@b2b-tickets/react-hooks';

import { userHasRole } from '@b2b-tickets/utils';
import {
  AppRoleTypes,
  TicketDetailsModalActions,
  TicketStatus,
  TicketStatusColors,
} from '@b2b-tickets/shared-models';
import { sendTestEmail, updateTicketStatus } from '@b2b-tickets/server-actions';
import toast from 'react-hot-toast';
import styles from './css/ticket-details.module.scss';
import { Span } from 'next/dist/trace';
import {
  EscalationFillColor,
  EscalationBorderColor,
} from '@b2b-tickets/shared-models';
import Button from '@mui/material/Button';
import { setRemedyIncidentIDForTicket } from '@b2b-tickets/server-actions';
const detailsRowClass =
  'w-full justify-center items-center gap-2.5 inline-flex text-md';

const detailsRowHeaderClass =
  "grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-8";

export function TicketDetails({
  ticketDetails,
}: {
  ticketDetails: TicketDetail[];
}) {
  console.log({ ticketDetails });

  // const theme = useTheme();
  // const colors = tokens(theme.palette.mode);
  const { data: session, status } = useSession();
  //@ts-ignore
  const userId = session?.user.user_id;

  const [showNewComment, setShowNewComment] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  // const [ticketStatus, setTicketStatus] = useState(ticketDetails[0].status_id);
  const [modalAction, setModalAction] = useState<TicketDetailsModalActions>(
    TicketDetailsModalActions.NO_ACTION
  );

  const ticketStatus = ticketDetails[0].status_id;
  console.log({ ticketStatus });
  // const escalatedStatusDate = ticketDetails[0].escalation_date;
  // Custom Hook for ESC Key Press
  useEscKeyListener(() => setShowNewComment(false));

  if (ticketDetails.length === 0) return;

  const ticketNumber = ticketDetails[0]['Ticket'] as string;
  const title = ticketDetails[0]['Title'];
  // const category = ticketDetails[0]['category_name'];
  // const serviceName = ticketDetails[0]['service_name'];
  const equipment_id = ticketDetails[0]['Equipment'];
  const contact_person = ticketDetails[0]['Contact person'];
  const contact_phone = ticketDetails[0]['Contact phone number'];
  const sid = ticketDetails[0]['Sid'];
  const cid = ticketDetails[0]['Cid'];
  const userName = ticketDetails[0]['Username'];
  const cliValue = ticketDetails[0]['Cli'];
  const occurrenceDate = ticketDetails[0]['Occurence date'];
  const greekOpenDate = getGreekDateFormat(ticketDetails[0]['Opened']);
  const greekOccurrenceDate = getGreekDateFormat(occurrenceDate);
  const problemDescription = ticketDetails[0]['Description'];
  const commentsArray: TicketComment[] = ticketDetails[0]['comments'];
  const ticketId = ticketDetails[0].ticket_id;
  const severity = ticketDetails[0].Severity;
  const customerType = ticketDetails[0]['Cust. Type'];

  const customButtonBasedOnTicketStatus = () => {
    // if (userHasRole(session, AppRoleTypes.Admin)) {
    //   if (
    //     ticketStatus === TicketStatus.CLOSED ||
    //     ticketStatus === TicketStatus.CANCELLED
    //   ) {
    //     return (
    //       <Button
    //         onClick={async () => {
    //           const statusId = '1'; // Working

    //           const response = await updateTicketStatus({
    //             ticketId,
    //             ticketNumber,
    //             statusId,
    //             comment: `Re-Openning Ticket`,
    //           });

    //           if (response.status === 'SUCCESS') {
    //             toast.success(response.message);
    //             await new Promise((res) => setTimeout(res, 500));
    //           }
    //           if (response.status === 'ERROR') toast.error(response.message);
    //         }}
    //         sx={{
    //           backgroundColor: '#474cae',
    //           color: 'white',
    //           paddingLeft: '1.2rem',
    //           paddingRight: '1.2rem',
    //           '&:hover': {
    //             backgroundColor: '#585ed6',
    //           },
    //         }}
    //       >
    //         ADMINISTRATIVE <br />
    //         ReOpen Ticket
    //       </Button>
    //     );
    //   }
    // }
    if (userHasRole(session, AppRoleTypes.B2B_TicketHandler)) {
      if (ticketStatus === TicketStatus.NEW) {
        return (
          <Button
            onClick={async () => {
              const statusId = TicketStatus.WORKING;

              const response = await updateTicketStatus({
                ticketId,
                ticketNumber,
                statusId,
                comment: `Started Working On Ticket: ${ticketNumber}`,
              });

              if (response.status === 'SUCCESS') {
                toast.success(response.message);
                await new Promise((res) => setTimeout(res, 500));
              }
              if (response.status === 'ERROR') toast.error(response.message);
            }}
            sx={{
              backgroundColor: '#474cae',
              color: 'white',
              paddingLeft: '1.2rem',
              paddingRight: '1.2rem',
              '&:hover': {
                backgroundColor: '#585ed6',
              },
            }}
          >
            Start Work
          </Button>
        );
      }

      if (ticketStatus === TicketStatus.WORKING) {
        return (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setModalAction(TicketDetailsModalActions.CLOSE);
                setShowNewComment(true);
              }}
              variant="outlined"
              sx={{
                backgroundColor: '#474cae',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#585ed6',
                },
              }}
            >
              Close Ticket
            </Button>
            <Button
              onClick={() => {
                setModalAction(TicketDetailsModalActions.CANCEL);
                setShowNewComment(true);
              }}
              variant="outlined"
              sx={{
                backgroundColor: '#cd5353',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#cd4343',
                },
              }}
            >
              Cancel Ticket
            </Button>
            <Button
              onClick={() => {
                setModalAction(TicketDetailsModalActions.NO_ACTION);
                setShowNewComment(true);
              }}
              variant="outlined"
            >
              Add New Comment
            </Button>
          </div>
        );
      }
    }

    if (userHasRole(session, AppRoleTypes.B2B_TicketCreator)) {
      if (
        ticketStatus === TicketStatus.NEW ||
        ticketStatus === TicketStatus.WORKING
      ) {
        // if (escalatedStatusDate !== null) {
        //   return (
        //     <Button
        //       onClick={() => {
        //         setModalAction(TicketDetailsModalActions.NO_ACTION);
        //         setShowNewComment(true);
        //       }}
        //       variant="outlined"
        //     >
        //       Add New Comment
        //     </Button>
        //   );
        // }

        return (
          <>
            <Button
              onClick={() => {
                setModalAction(TicketDetailsModalActions.ESCALATE);
                setShowEscalateDialog(true);
              }}
              variant="outlined"
              sx={{
                color: 'white',
                backgroundColor: `${EscalationFillColor}`,
                border: `1px solid ${EscalationBorderColor}`,

                '&:hover': {
                  backgroundColor: 'rgb(172, 74, 74)',
                  border: '1px solid rgb(151, 52, 52)',
                },
              }}
            >
              Escalate Ticket
            </Button>
            <Button
              onClick={() => {
                setModalAction(TicketDetailsModalActions.NO_ACTION);
                setShowNewComment(true);
              }}
              variant="outlined"
            >
              Add New Comment
            </Button>
          </>
        );
      }
    }
  };

  const StatusBadge = () => {
    const getStatusColor = () => {
      switch (ticketStatus) {
        case '1':
          return TicketStatusColors.NEW;
        case '2':
          return TicketStatusColors.WORKING;
        case '3':
          return TicketStatusColors.CANCELLED;
        case '4':
          return TicketStatusColors.CLOSED;
        default:
          return '#000'; // Fallback color
      }
    };

    return (
      <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
        <span
          className="px-2 text-white border rounded-md p-1"
          style={{
            backgroundColor: getStatusColor(),
            borderColor: getStatusColor(),
          }}
        >
          {ticketDetails[0].Status}
        </span>
      </div>
    );
  };

  // const EscalationBadge = () => {
  //   if (escalatedStatusDate == null) return;

  //   const escalationDate = ticketDetails[0].escalation_date || 'Unknown';
  //   const escalationUserFirstName = ticketDetails[0].first_name || 'Unknown';
  //   const escalationUserLastName = ticketDetails[0].last_name || 'Unknown';

  //   return (
  //     <div className="text-black/90 mt-2 mb-2 text-right text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
  //       <div
  //         className="text-white rounded-md px-1 py-2 shadow-md"
  //         style={{
  //           backgroundColor: `${EscalationFillColor}`,
  //           border: `1px solid ${EscalationBorderColor}`,
  //           fontSize: '16px',
  //           lineHeight: '12px',
  //           fontWeight: 100,
  //         }}
  //       >
  //         <div>
  //           &nbsp;
  //           {escalationDate && (
  //             <span>
  //               {escalationUserFirstName} {escalationUserLastName}
  //             </span>
  //           )}
  //         </div>
  //         <br />
  //         <div>{escalationDate && getGreekDateFormat(escalationDate)}</div>
  //       </div>
  //     </div>
  //   );
  // };

  return (
    <>
      <div className="w-full flex-col justify-start items-center gap-2 inline-flex mb-[75px]">
        <div
          className={`${styles.header} w-full h-[80px] px-6 border-b border-black justify-between items-center inline-flex`}
        >
          <div className="self-stretch mt-2 flex-col justify-center items-center inline-flex">
            <div className="text-black/90 text-5xl font-bold ">
              Ticket Details
            </div>
            {/* <div className="pt-2 self-stretch h-[17px] text-center text-[#6870fa] text-[15px] font-medium font-['Roboto'] leading-[4px] tracking-widest">
              {ticketNumber}
            </div> */}
          </div>
          <div className="flex gap-2">{customButtonBasedOnTicketStatus()}</div>
          {/* <button
            onClick={async () => {
              await sendTestEmail();
            }}
          >
            Send E-mail
          </button> */}
        </div>
        <div
          className={`self-stretch pl-8 pr-6 pt-3.5 flex-col justify-start items-start gap-6 flex`}
        >
          <div
            className={`${styles.statusAndDescriptionDiv} self-stretch justify-start items-center gap-6 inline-flex`}
          >
            <div
              className={`${styles.statusDiv} shadow-lg p-2 bg-white rounded-lg border border-black/25 flex-col justify-start items-start inline-flex`}
            >
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Status</div>
                <StatusBadge />
              </div>
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Ticket</div>
                {ticketNumber}
              </div>
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Severity</div>
                {severity}
              </div>
              {!userHasRole(session, AppRoleTypes.B2B_TicketCreator) && (
                <div className={detailsRowClass}>
                  <div className={detailsRowHeaderClass}>Customer Type</div>
                  {customerType}
                </div>
              )}
              <RemedyIncidentRow
                session={session}
                ticketDetails={ticketDetails}
              />
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Ticket Creation</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {greekOpenDate}
                </div>
              </div>
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Title</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight text-right">
                  {title}
                </div>
              </div>
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Category</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {/* {category} */}
                </div>
              </div>
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Service Name</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {/* {serviceName} */}
                </div>
              </div>
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Equipment ID</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {equipment_id}
                </div>
              </div>
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Contact Person</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {contact_person}
                </div>
              </div>
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Contact Phone</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {contact_phone}
                </div>
              </div>
              <div className="w-full h-[0px] border border-black/20"></div>
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>SID</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {sid}
                </div>
              </div>

              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>CID</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {cid}
                </div>
              </div>
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>User Name</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {userName}
                </div>
              </div>
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>CLI Value</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {cliValue}
                </div>
              </div>
              <div className="w-full h-[0px] border border-black/20"></div>
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Occurence Date</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {greekOccurrenceDate}
                </div>
              </div>
            </div>
            <div className="shadow-lg grow shrink basis-0 self-stretch bg-[#6870fa]/0 flex-col justify-start items-center gap-4 inline-flex">
              <div className="self-stretch p-2.5 border rounded-t-md border-black/20 justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 self-stretch text-center text-black text-2xl font-extrabold font-['Roboto'] leading-[17.16px] tracking-tight">
                  Problem Description
                </div>
              </div>
              <div className="w-full overflow-y-auto font-['Roboto'] h-[400px] px-[13px] py-[17px] bg-white border border-[#ebebeb]">
                {/* <div className="overflow-y-auto self-stretch text-black text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight"> */}
                <pre
                  style={{
                    fontFamily: 'Roboto',
                    whiteSpace: 'break-spaces',
                  }}
                >
                  {problemDescription}
                </pre>
                {/* </div> */}
              </div>
            </div>
          </div>
          <TicketsUiComments
            comments={commentsArray}
            ticketNumber={ticketNumber}
          />
        </div>
      </div>
      <>
        {showNewComment ? (
          <NewCommentModal
            modalAction={modalAction}
            userId={String(userId)}
            closeModal={setShowNewComment}
            ticketDetail={ticketDetails}
          />
        ) : null}
        {showEscalateDialog ? (
          <EscalateModal
            modalAction={modalAction}
            closeModal={setShowEscalateDialog}
            ticketDetail={ticketDetails}
          />
        ) : null}
      </>
    </>
  );
}

const RemedyIncidentRow = ({
  session,
  ticketDetails,
}: {
  session: any;
  ticketDetails: TicketDetail[];
}) => {
  if (ticketDetails[0].status_id === '1') return null;

  if (userHasRole(session, AppRoleTypes.B2B_TicketHandler)) {
    return (
      <div className={detailsRowClass}>
        <div className={detailsRowHeaderClass}>Remedy Incident</div>
        <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
          {!ticketDetails[0]['Remedy Ticket'] ? (
            <button
              className="shadow-md border bg-[#4461ac] text-white px-2 py-1 rounded-md hover:bg-[#5c81e0] disabled:bg-gray-400"
              disabled={
                ticketDetails[0]['Is Final Status'] === 'y' ? true : false
              }
              onClick={async () => {
                const remedyIncId = window.prompt(
                  'Please enter Remedy Ticket ID:'
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
              }}
            >
              Add Remedy Incident
            </button>
          ) : (
            <button
              className="shadow-md border bg-[#4461ac] text-white px-2 py-1 rounded-md hover:bg-[#5c81e0] disabled:bg-gray-400"
              disabled={
                ticketDetails[0]['Is Final Status'] === 'y' ? true : false
              }
              onClick={async () => {
                const remedyIncId = window.prompt(
                  'Please enter Remedy Ticket ID:'
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
              }}
            >
              {ticketDetails[0]['Remedy Ticket']}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (ticketDetails[0]['Remedy Ticket']) {
    return (
      <div className={detailsRowClass}>
        <div className={detailsRowHeaderClass}>Remedy Incident</div>
        <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
          {ticketDetails[0]['Remedy Ticket'] ? (
            <span className="text-blue-600">
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
