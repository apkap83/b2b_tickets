'use client';
import React, { useState, useEffect } from 'react';
import { getGreekDateFormat } from '@b2b-tickets/utils';
import { TicketComment } from '@b2b-tickets/shared-models';
import { TicketsUiComments } from '@b2b-tickets/tickets/ui/comments';
import { NewCommentModal } from './new-comment-modal';

import Button from '@mui/material/Button';
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
import { updateTicketStatus } from '@b2b-tickets/server-actions';
import toast from 'react-hot-toast';
import styles from './css/ticket-details.module.scss';

export function TicketDetails({ ticketDetails }: { ticketDetails: any }) {
  // const theme = useTheme();
  // const colors = tokens(theme.palette.mode);
  const { data: session, status } = useSession();
  //@ts-ignore
  const userId = session?.user.user_id;

  const [showNewComment, setShowNewComment] = useState(false);
  // const [ticketStatus, setTicketStatus] = useState(ticketDetails[0].status_id);
  const [modalAction, setModalAction] = useState<TicketDetailsModalActions>(
    TicketDetailsModalActions.NO_ACTION
  );

  const ticketStatus = ticketDetails[0].status_id;

  // Custom Hook for ESC Key Press
  useEscKeyListener(() => setShowNewComment(false));

  if (ticketDetails.length === 0) return;

  const ticketNumber = ticketDetails[0]['ticket_number'] as string;
  const title = ticketDetails[0]['title'];
  const category = ticketDetails[0]['category_name'];
  const serviceName = ticketDetails[0]['service_name'];
  const equipment_id = ticketDetails[0]['equipment_id'];
  const contact_person = ticketDetails[0]['contact_person'];
  const contact_phone = ticketDetails[0]['contact_phone_number'];
  const sid = ticketDetails[0]['sid'];
  const cid = ticketDetails[0]['cid'];
  const userName = ticketDetails[0]['username'];
  const cliValue = ticketDetails[0]['cli'];
  const occurrenceDate = ticketDetails[0]['occurrence_date'];
  const greekOpenDate = getGreekDateFormat(ticketDetails[0]['open_date']);
  const greekOccurrenceDate = getGreekDateFormat(occurrenceDate);
  const problemDescription = ticketDetails[0]['description'];
  const commentsArray: TicketComment[] = ticketDetails[0]['comments'];
  const ticketId = ticketDetails[0].ticket_id;

  const customButtonBasedOnTicketStatus = () => {
    if (userHasRole(session, AppRoleTypes.Admin)) {
      if (
        ticketStatus === TicketStatus.CLOSED ||
        ticketStatus === TicketStatus.CANCELLED
      ) {
        return (
          <Button
            onClick={async () => {
              const statusId = '1'; // Working

              const response = await updateTicketStatus({
                ticketId,
                ticketNumber,
                statusId,
                comment: `Re-Openning Ticket`,
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
            ADMINISTRATIVE <br />
            ReOpen Ticket
          </Button>
        );
      }
    }
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
        return (
          <Button
            onClick={() => {
              setModalAction(TicketDetailsModalActions.NO_ACTION);
              setShowNewComment(true);
            }}
            variant="outlined"
          >
            Add New Comment
          </Button>
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
          {ticketDetails[0].status_name}
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="w-full flex-col justify-start items-center gap-5 inline-flex mb-[75px]">
        <div
          className={`${styles.header} w-full h-[92px] px-6 pb-[9px] border-b border-black justify-between items-center inline-flex`}
        >
          <div className="self-stretch flex-col justify-center items-center inline-flex">
            <div className="text-black/90 text-5xl font-bold leading-[57.60px]">
              Ticket Details
            </div>
            <div className="pt-2 self-stretch h-[17px] text-center text-[#6870fa] text-[15px] font-medium font-['Roboto'] leading-[4px] tracking-widest">
              {ticketNumber}
            </div>
          </div>
          <div className="flex gap-2">{customButtonBasedOnTicketStatus()}</div>
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
              <div className="w-full justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Status
                </div>
                <StatusBadge />
              </div>
              <div className="w-full justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Ticket Creation
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {greekOpenDate}
                </div>
              </div>
              <div className="w-full justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Title
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight text-right">
                  {title}
                </div>
              </div>
              <div className="w-full justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Category
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {category}
                </div>
              </div>
              <div className="w-full justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Service Name
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {serviceName}
                </div>
              </div>
              <div className="w-full justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Equipment ID
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {equipment_id}
                </div>
              </div>
              <div className="w-full justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Contact Person
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {contact_person}
                </div>
              </div>
              <div className="w-full justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Contact Phone
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {contact_phone}
                </div>
              </div>
              <div className="w-full h-[0px] border border-black/20"></div>
              <div className="w-full justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  SID
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {sid}
                </div>
              </div>

              <div className="w-full justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  CID
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {cid}
                </div>
              </div>
              <div className="w-full justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  User Name
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {userName}
                </div>
              </div>
              <div className="w-full justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  CLI Value
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {cliValue}
                </div>
              </div>
              <div className="w-full h-[0px] border border-black/20"></div>
              <div className="w-full justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Occurence Date
                </div>
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
      {showNewComment ? (
        <NewCommentModal
          modalAction={modalAction}
          userId={String(userId)}
          closeModal={setShowNewComment}
          ticketDetail={ticketDetails}
        />
      ) : null}
    </>
  );
}
