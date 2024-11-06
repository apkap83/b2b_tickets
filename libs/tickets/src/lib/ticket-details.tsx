'use client';
import React, { useState, useEffect } from 'react';
import { getGreekDateFormat, getStatusColor } from '@b2b-tickets/utils';
import { TicketComment, TicketDetail } from '@b2b-tickets/shared-models';
import { TicketsUiComments } from '@b2b-tickets/tickets/ui/comments';
import { NewCommentModal } from './new-comment-modal';
import { EscalateModal } from './escalate-modal';

import { useSession } from 'next-auth/react';
import { useEscKeyListener } from '@b2b-tickets/react-hooks';

import { userHasRole } from '@b2b-tickets/utils';
import {
  AppRoleTypes,
  TicketDetailsModalActions,
  TicketStatus,
} from '@b2b-tickets/shared-models';
import {
  setTicketWorking,
  getNextEscalationLevel,
} from '@b2b-tickets/server-actions';
import toast from 'react-hot-toast';
import styles from './css/ticket-details.module.scss';
import {
  EscalationFillColor,
  EscalationBorderColor,
} from '@b2b-tickets/shared-models';
import Button from '@mui/material/Button';
import { formatDate } from '@b2b-tickets/utils';
import { ChangeCategoryPopup } from './change-category-popup';
import { RemedyIncidentRow } from './remedy-incident-row';
import { RemedyIncPopup } from './remedy-incident-popup';
import { SeverityPopup } from './severity-popup';
import { SeverityRow } from './severity-row';
import { CcFields } from './cc-fields-in-ticket-details';
import { PiGreaterThanFill } from 'react-icons/pi';
import clsx from 'clsx';
import { Tooltip as ReactTooltip } from 'react-tooltip';

const detailsRowClass =
  'w-full justify-center items-center gap-2.5 inline-flex text-md';

const detailsRowHeaderClass =
  "grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] ";

export function TicketDetails({
  ticketDetails,
}: {
  ticketDetails: TicketDetail[];
}) {
  // const theme = useTheme();
  // const colors = tokens(theme.palette.mode);
  const { data: session, status } = useSession();
  //@ts-ignore
  const userId = session?.user.user_id;

  const [showNewComment, setShowNewComment] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [showRemedyIncDialog, setShowRemedyIncDialog] = useState(false);
  const [showSeverityDialog, setShowSeverityDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  // const [ticketStatus, setTicketStatus] = useState(ticketDetails[0].status_id);
  const [modalAction, setModalAction] = useState<TicketDetailsModalActions>(
    TicketDetailsModalActions.NO_ACTION
  );

  const [nextEscalationLevel, setNextEscalationLevel] = useState<string>('');

  // Custom Hook for ESC Key Press
  useEscKeyListener(() => {
    setShowNewComment(false);
    setShowEscalateDialog(false);
    setShowRemedyIncDialog(false);
    setShowSeverityDialog(false);
    setShowCategoryDialog(false);
  });

  const ticketStatus = ticketDetails[0].status_id;
  // const escalatedStatusDate = ticketDetails[0].escalation_date;

  if (ticketDetails.length === 0) return;

  const ticketId = ticketDetails[0].ticket_id;
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
  const severity = ticketDetails[0].Severity;
  const categoryServiceTypeId = ticketDetails[0].category_service_type_id;
  const customerType = ticketDetails[0]['Cust. Type'];
  const customer = ticketDetails[0].Customer;
  const category = ticketDetails[0].Category;
  const serviceType = ticketDetails[0].Service;
  const statusHTMLColor = getStatusColor(ticketStatus);
  const currentEscalationLevel = ticketDetails[0]['Current Escalation Level'];
  const isFinalStatus =
    ticketDetails[0]['Is Final Status'] === 'y' ? true : false;

  const startWorkPressed = ticketStatus !== '1';

  useEffect(() => {
    const nextEscLevel = async () => {
      const resp = await getNextEscalationLevel({
        ticketId,
        ticketNumber,
      });
      setNextEscalationLevel(resp.data);
    };

    nextEscLevel();
  }, []);

  const customButtonBasedOnTicketStatus = () => {
    if (userHasRole(session, AppRoleTypes.B2B_TicketHandler)) {
      if (ticketStatus === TicketStatus.NEW) {
        return (
          <Button
            onClick={async () => {
              const statusId = TicketStatus.WORKING;

              const response = await setTicketWorking({
                ticketId,
                ticketNumber,
                statusId,
                comment: `Started Working On Ticket: ${ticketNumber}`,
              });
              if (response.status === 'ERROR')
                return toast.error(response.message);

              toast.success(response.message);
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
          <>
            {nextEscalationLevel && (
              <EscalateButton nextEscalationLevel={nextEscalationLevel} />
            )}
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

  const EscalateButton = ({
    nextEscalationLevel,
  }: {
    nextEscalationLevel: string;
  }) => {
    return (
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
        Escalate Level {nextEscalationLevel}
      </Button>
    );
  };

  const StatusBadge = () => {
    return (
      // <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
      <span
        className={`px-2 py-1 text-white`}
        style={{
          // border: `1px solid ${statusHTMLColor}30`,
          // backgroundColor: getStatusColor(ticketStatus),
          color: statusHTMLColor,
        }}
      >
        {ticketDetails[0].Status}
      </span>
      // </div>
    );
  };

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
          </div>
          <div className="flex gap-2">{customButtonBasedOnTicketStatus()}</div>
        </div>
        <div
          className={`self-stretch pl-8 pr-6 pt-3.5 flex-col justify-start items-start gap-6 flex`}
        >
          <div
            className={`${styles.statusAndDescriptionDiv} self-stretch justify-start items-center gap-5 inline-flex`}
          >
            <div
              className={`${styles.statusDiv} flex flex-col gap-1 min-h-full shadow-lg px-2 py-2 bg-white rounded-lg border border-black/25 justify-start items-start`}
            >
              {userHasRole(session, AppRoleTypes.B2B_TicketHandler) && (
                <div className={detailsRowClass}>
                  <div className={detailsRowHeaderClass}>Customer</div>
                  {customer}
                </div>
              )}
              {userHasRole(session, AppRoleTypes.B2B_TicketHandler) && (
                <div className={detailsRowClass}>
                  <div className={detailsRowHeaderClass}>Customer Type</div>
                  {customerType}
                </div>
              )}
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Ticket</div>
                {ticketNumber}
              </div>
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Title</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight text-right">
                  {title}
                </div>
              </div>
              <div
                className={`mt-1 mb-1 ${detailsRowClass}`}
                style={{
                  borderTop: `1px solid ${statusHTMLColor}40`,
                  borderBottom: `1px solid ${statusHTMLColor}40`,
                }}
              >
                <div className={detailsRowHeaderClass}>Status</div>
                <StatusBadge />
              </div>

              <SeverityRow
                session={session}
                ticketDetails={ticketDetails}
                setShowSeverityDialog={setShowSeverityDialog}
              />
              {currentEscalationLevel && (
                <div className={detailsRowClass}>
                  <div
                    className={`${detailsRowHeaderClass} flex gap-1 justify-left items-center`}
                  >
                    Escalation Level
                    {/* {userHasRole(session, AppRoleTypes.B2B_TicketHandler) && ( */}
                    <div>
                      <PiGreaterThanFill />
                    </div>
                    {/* )} */}
                  </div>
                  <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight text-right">
                    Level {currentEscalationLevel}
                  </div>
                </div>
              )}
              <div
                data-tooltip-id={
                  userHasRole(session, AppRoleTypes.B2B_TicketHandler) &&
                  !isFinalStatus &&
                  startWorkPressed
                    ? 'editCategoryAndService'
                    : undefined // Only add tooltip ID if the condition is met
                }
                className={clsx('w-full', {
                  'w-full hover:scale-[1.01] hover:bg-blue-50 transition-all duration-200 ease-in-out hover:cursor-pointer':
                    userHasRole(session, AppRoleTypes.B2B_TicketHandler) &&
                    !isFinalStatus &&
                    startWorkPressed,
                })}
                onClick={() => {
                  setShowCategoryDialog(true);
                }}
              >
                <div className={`${detailsRowClass} mb-1`}>
                  <div className={detailsRowHeaderClass}>
                    <div className="flex gap-1 justify-start items-center">
                      Category
                    </div>
                  </div>
                  <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                    {category}
                  </div>
                </div>
                <div className={detailsRowClass}>
                  <div className={detailsRowHeaderClass}>Service Type</div>
                  <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                    {serviceType}
                  </div>
                </div>
              </div>
              <div className="py-1 w-full border-t border-b border-gray-200">
                {sid && (
                  <div className={detailsRowClass}>
                    <div className={detailsRowHeaderClass}>SID</div>
                    <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                      {sid}
                    </div>
                  </div>
                )}
                {cid && (
                  <div className={detailsRowClass}>
                    <div className={detailsRowHeaderClass}>CID</div>
                    <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                      {cid}
                    </div>
                  </div>
                )}
                {userName && (
                  <div className={detailsRowClass}>
                    <div className={detailsRowHeaderClass}>User Name</div>
                    <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                      {userName}
                    </div>
                  </div>
                )}
                {cliValue && (
                  <div className={detailsRowClass}>
                    <div className={detailsRowHeaderClass}>CLI Value</div>
                    <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                      {cliValue}
                    </div>
                  </div>
                )}
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

              <RemedyIncidentRow
                session={session}
                ticketDetails={ticketDetails}
                setShowRemedyIncDialog={setShowRemedyIncDialog}
              />
              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Occurence Date</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {formatDate(occurrenceDate)}
                </div>
              </div>

              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>Ticket Creation</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {formatDate(ticketDetails[0]['Opened'])}
                </div>
              </div>

              {equipment_id && (
                <div className={detailsRowClass}>
                  <div className={detailsRowHeaderClass}>Equipment ID</div>
                  <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                    {equipment_id}
                  </div>
                </div>
              )}
              <CcFields ticketId={ticketId} />
            </div>
            <div className="shadow-lg grow shrink basis-0 rounded-md self-stretch bg-[#6870fa]/0 flex-col justify-start items-center gap-4 inline-flex">
              <div className="self-stretch p-2.5 border rounded-t-md border-black/20 justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 self-stretch text-center text-black text-2xl font-extrabold font-['Roboto'] leading-[17.16px] tracking-tight">
                  Problem Description
                </div>
              </div>
              <div className="w-full rounded-b-md h-full overflow-y-auto font-['Roboto'] px-[13px] py-[17px] bg-white border border-[#ebebeb]">
                <div className="overflow-y-auto self-stretch text-black text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  <pre
                    style={{
                      fontFamily: 'Roboto',
                      whiteSpace: 'break-spaces',
                    }}
                  >
                    {problemDescription}
                  </pre>
                </div>
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
            ticketDetails={ticketDetails}
            nextEscalationLevel={nextEscalationLevel}
            setNextEscalationLevel={setNextEscalationLevel}
          />
        ) : null}
        {showRemedyIncDialog && (
          <RemedyIncPopup
            ticketDetails={ticketDetails}
            setShowRemedyIncDialog={setShowRemedyIncDialog}
          />
        )}

        {showSeverityDialog && (
          <SeverityPopup
            ticketDetails={ticketDetails}
            setShowSeverityDialog={setShowSeverityDialog}
          />
        )}

        {showCategoryDialog &&
          userHasRole(session, AppRoleTypes.B2B_TicketHandler) && (
            <ChangeCategoryPopup
              ticketDetails={ticketDetails}
              setShowCategoryDialog={setShowCategoryDialog}
            />
          )}
      </>
      <ReactTooltip
        id="editCategoryAndService"
        place="bottom"
        content="Edit Category/Service Type"
      />
    </>
  );
}
