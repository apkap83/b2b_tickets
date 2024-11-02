'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useFormState } from 'react-dom';
import {
  getGreekDateFormat,
  getSeverityStatusColor,
  getStatusColor,
  EMPTY_FORM_STATE,
} from '@b2b-tickets/utils';
import {
  TicketComment,
  TicketDetail,
  TicketCategory,
  ServiceType,
} from '@b2b-tickets/shared-models';
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
  TicketSeverityColors,
  TicketSeverityLevels,
} from '@b2b-tickets/shared-models';
import {
  sendTestEmail,
  setTicketWorking,
  alterTicketSeverity,
  setRemedyIncidentIDForTicket,
  getNextEscalationLevel,
  getCategoryAndServiceTypeById,
  getTicketCategories,
  getServicesForCategorySelected,
  setNewCategoryServiceTypeForTicket,
} from '@b2b-tickets/server-actions';
import toast from 'react-hot-toast';
import styles from './css/ticket-details.module.scss';
import { Span } from 'next/dist/trace';
import {
  EscalationFillColor,
  EscalationBorderColor,
} from '@b2b-tickets/shared-models';
import Button from '@mui/material/Button';
import { Typography, useTheme } from '@mui/material';
import { tokens } from '@b2b-tickets/ui-theme';
import { SubmitButton } from '@b2b-tickets/ui';
import { formatDate } from '@b2b-tickets/utils';

import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';

import Select, { SelectChangeEvent } from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useToastMessage } from '@b2b-tickets/react-hooks';

const detailsRowClass =
  'w-full justify-center items-center gap-2.5 inline-flex text-md';

const detailsRowHeaderClass =
  "grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-8";

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
  const statusHTMLColor = getStatusColor(ticketStatus);

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
            {/* <div className="pt-2 self-stretch h-[17px] text-center text-[#6870fa] text-[15px] font-medium font-['Roboto'] leading-[4px] tracking-widest">
              {ticketNumber}
            </div> */}
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
              className={`${styles.statusDiv} min-h-full shadow-lg px-2 py-2 bg-white rounded-lg border border-black/25 flex-col justify-start items-start inline-flex`}
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
              <div
                onClick={() => {
                  setShowCategoryDialog(true);
                }}
                className={detailsRowClass}
              >
                <div className={detailsRowHeaderClass}>Category</div>
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
              <div className="w-full border-t border-b border-gray-200">
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

              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>CC Users</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight"></div>
              </div>

              <div className={detailsRowClass}>
                <div className={detailsRowHeaderClass}>CC Phones</div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight"></div>
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

        {showCategoryDialog && (
          <ChangeCategoryPopup
            ticketDetails={ticketDetails}
            setShowCategoryDialog={setShowCategoryDialog}
          />
        )}
      </>
    </>
  );
}

const RemedyIncidentRow = ({
  session,
  ticketDetails,
  setShowRemedyIncDialog,
}: {
  session: any;
  ticketDetails: TicketDetail[];
  setShowRemedyIncDialog: (a: boolean) => void;
}) => {
  if (ticketDetails[0].status_id === '1') return null;

  if (userHasRole(session, AppRoleTypes.B2B_TicketHandler)) {
    return (
      <div className={detailsRowClass}>
        <div className={detailsRowHeaderClass}>Remedy Incident</div>
        <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
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

const RemedyIncPopup = ({
  ticketDetails,
  setShowRemedyIncDialog,
}: {
  ticketDetails: TicketDetail[];
  setShowRemedyIncDialog: (val: boolean) => void;
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const ticketNumber = ticketDetails[0].Ticket;
  const remedyInc = ticketDetails[0]['Remedy Ticket'];
  const inputBox = useRef<any>();

  const handleSubmit = async () => {
    if (inputBox && inputBox.current.value) {
      const remedyIncId = inputBox.current.value;
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
      setShowRemedyIncDialog(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center
       bg-black bg-opacity-50"
      >
        <div
          className={`bg-white rounded-lg justify-start items-center inline-flex min-w-[350px]`}
        >
          <div className="w-full flex flex-col items-start gap-2.5 pt-0 pb-[13px] px-0 relative bg-localhostwhite">
            <div className="flex flex-col items-start gap-[20.8px] relative self-stretch w-full flex-[0_0_auto]">
              <div className="text-white px-4 py-2 relative self-stretch w-full rounded-t-md [background:linear-gradient(0,rgb(2,0,90)_0%,rgba(55,55,66,0.5)_100%)]">
                {`Set Remedy Incident for ${ticketNumber}`}
              </div>

              <div className="flex max-h-[984.67px] items-center justify-center relative self-stretch w-full">
                <input
                  className="text-center inline-flex flex-col items-start px-[8.56px] py-[0.56px] relative self-stretch rounded-md overflow-hidden border border-solid"
                  type="text"
                  placeholder="Remedy Inc ID"
                  defaultValue={remedyInc ? remedyInc : ''}
                  ref={inputBox}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit();
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-center gap-20 relative self-stretch w-full flex-[0_0_auto]">
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowRemedyIncDialog(false);
                  }}
                >
                  CANCEL
                </Button>

                <Button
                  variant="contained"
                  sx={{
                    transition: 'transform 0.2s ease-in-out', // Smooth transition
                    '&:hover': {
                      transform: 'scale(1.05)', // Scale effect on hover
                    },
                  }}
                  onClick={handleSubmit}
                >
                  SUBMIT
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const SeverityButton = ({
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

const SeverityRow = ({
  session,
  ticketDetails,
  setShowSeverityDialog,
}: {
  session: any;
  ticketDetails: TicketDetail[];
  setShowSeverityDialog: (a: boolean) => void;
}) => {
  const severityDescriptive = ticketDetails[0].Severity || '';

  return (
    <div className={detailsRowClass}>
      <div className={detailsRowHeaderClass}>Severity</div>
      <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
        <SeverityButton
          clickable={
            userHasRole(session, AppRoleTypes.B2B_TicketHandler) ? true : false
          }
          ticketDetails={ticketDetails}
          btnLabel=""
          setShowSeverityDialog={setShowSeverityDialog}
          //@ts-ignore
          style={{
            backgroundColor: getSeverityStatusColor(
              ticketDetails[0].severity_id
            ),
            borderColor: getSeverityStatusColor(ticketDetails[0].severity_id),
          }}
        />
      </div>
    </div>
  );
};

const SeverityPopup = ({
  ticketDetails,
  setShowSeverityDialog,
}: {
  ticketDetails: TicketDetail[];
  setShowSeverityDialog: (val: boolean) => void;
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const ticketNumber = ticketDetails[0].Ticket;
  const inputSelect = useRef<any>();
  const severityId = ticketDetails[0].severity_id;

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center
       bg-black bg-opacity-50"
      >
        <div
          className={`bg-white rounded-lg justify-start items-center inline-flex min-w-[350px]`}
        >
          <div className="w-full flex flex-col items-start gap-2.5 pt-0 pb-[13px] px-0 relative bg-localhostwhite">
            <div className="flex flex-col items-start gap-[20.8px] relative self-stretch w-full flex-[0_0_auto]">
              <div className="text-white px-4 py-2 relative self-stretch w-full rounded-t-md [background:linear-gradient(0,rgb(2,0,90)_0%,rgba(55,55,66,0.5)_100%)]">
                {`Alter Severity for ${ticketNumber}`}
              </div>

              <div className="flex max-h-[984.67px] items-center justify-center relative self-stretch w-full">
                <select
                  ref={inputSelect}
                  className="pr-6 border bg-white shadow-md"
                  name=""
                  id=""
                  defaultValue={ticketDetails[0].severity_id}
                >
                  <option value="1">Low</option>
                  <option value="2">Medium</option>
                  <option value="3">High</option>
                </select>
              </div>

              <div className="flex items-center justify-center gap-20 relative self-stretch w-full flex-[0_0_auto]">
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowSeverityDialog(false);
                  }}
                >
                  CANCEL
                </Button>

                <Button
                  variant="contained"
                  sx={{
                    transition: 'transform 0.2s ease-in-out', // Smooth transition
                    '&:hover': {
                      transform: 'scale(1.05)', // Scale effect on hover
                    },
                  }}
                  onClick={async () => {
                    if (inputSelect && inputSelect.current.value) {
                      const resp = await alterTicketSeverity({
                        ticketNumber: ticketDetails[0].Ticket,
                        ticketId: ticketDetails[0].ticket_id,
                        newSeverityId: inputSelect.current.value,
                      });

                      if (resp && resp.status === 'SUCCESS') {
                        toast.success('Severity was altered');
                      }

                      setShowSeverityDialog(false);
                    }
                  }}
                >
                  SUBMIT
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const ChangeCategoryPopup = ({
  ticketDetails,
  setShowCategoryDialog,
}: {
  ticketDetails: TicketDetail[];
  setShowCategoryDialog: (val: boolean) => void;
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const ticketId = ticketDetails[0].ticket_id;
  const ticketNumber = ticketDetails[0].Ticket;

  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>(
    []
  );
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);

  const [selectedCategoryServiceTypeId, setSelectedCategoryServiceTypeId] =
    useState('');

  const [formState, action] = useFormState<any, any>(
    setNewCategoryServiceTypeForTicket,
    EMPTY_FORM_STATE
  );
  const noScriptFallback = useToastMessage(formState);
  const ticketSchema = yup.object().shape({
    category: yup
      .string()
      .required('Category is required')
      .test(
        'is-valid-number',
        'Category cannot be empty',
        (value) => value !== '' && !isNaN(Number(value))
      ),
    service: yup
      .string()
      .required('Service type is required')
      .test(
        'is-valid-number',
        'Service cannot be empty',
        (value) => value !== '' && !isNaN(Number(value))
      ),
  });

  const formik = useFormik<any>({
    initialValues: {
      category: '',
      service: '',
    },
    validateOnMount: true,
    validationSchema: ticketSchema,
    onSubmit: async (values, { setSubmitting }) => {},
  });

  useEffect(() => {
    if (formState.status === 'SUCCESS') setShowCategoryDialog(false);
  }, [formState.status, formState.timestamp]);

  // Get Ticket Categories
  useEffect(() => {
    const getCategories = async () => {
      const result = await getTicketCategories();

      if (result.error) return toast.error(result.error);

      // If no error, set the ticket categories with the returned data
      setTicketCategories(result.data);
    };

    getCategories();
  }, []);

  // Set The Ticket's Selected Category
  useEffect(() => {
    const initCategoryIdSelected = ticketCategories.filter(
      (i) => i.Category === ticketDetails[0].Category
    )[0]?.category_id;

    if (!formik.values.category && ticketCategories.length > 0) {
      formik.setFieldValue('category', initCategoryIdSelected);
    }
  }, [ticketCategories]);

  // Get Available Service Types after category is selected
  useEffect(() => {
    const getServices = async () => {
      const result = await getServicesForCategorySelected({
        category_id: formik.values['category'],
      });

      if (result.error) return toast.error(result.error);

      setServiceTypes(result.data);
    };
    const categoryIdSelected = formik.values['category'];
    if (categoryIdSelected) getServices();
  }, [formik.values['category']]);

  // Set The Ticket's Selected Category
  useEffect(() => {
    const serviceIdSelected = serviceTypes.filter(
      (i) => i.service_type_name === ticketDetails[0].Service
    )[0]?.service_type_id;

    const categoryServiceTypeId = serviceTypes.filter(
      (i) => i.service_type_id === formik.values.service
    )[0]?.category_service_type_id;

    if (!formik.values.service && serviceTypes.length > 0) {
      formik.setFieldValue('service', serviceIdSelected);
    }

    setSelectedCategoryServiceTypeId(categoryServiceTypeId);
  }, [serviceTypes, formik.values.service]);

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center
       bg-black bg-opacity-50"
      >
        <div
          className={`bg-white rounded-lg justify-start items-center inline-flex min-w-[350px]`}
        >
          <div className="w-full flex flex-col items-start gap-2.5 pt-0 pb-[13px] px-0 relative bg-localhostwhite">
            <div className="flex flex-col items-start gap-[20.8px] relative self-stretch w-full flex-[0_0_auto]">
              <div className="text-white px-4 py-2 relative self-stretch w-full rounded-t-md [background:linear-gradient(0,rgb(2,0,90)_0%,rgba(55,55,66,0.5)_100%)]">
                {`Alter Category/Service for ${ticketNumber}`}
              </div>

              <form action={action}>
                <div className="w-full px-10 flex flex-col">
                  <FormControl
                    sx={{
                      width: '323px',
                      marginTop: '16px',
                      marginBottom: '10px',
                    }}
                  >
                    <InputLabel
                      id="category"
                      sx={{
                        top: '-7px',
                      }}
                    >
                      Category
                    </InputLabel>
                    <Select
                      labelId="category"
                      id="category"
                      name="category"
                      value={formik.values.category}
                      onChange={(val) => {
                        formik.handleChange(val);
                        // formik.setFieldValue('service', '');
                      }}
                      onBlur={formik.handleBlur}
                      autoWidth
                      label="Categories *"
                      required
                      sx={{
                        '& .MuiSelect-select': {
                          paddingTop: '8px',
                          paddingBottom: '8px',
                        },
                      }}
                    >
                      {ticketCategories.map((item) => {
                        return (
                          <MenuItem
                            key={item.category_id}
                            value={item.category_id}
                            sx={{
                              width: '270px',
                            }}
                          >
                            {item.Category}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  <FieldError formik={formik} name="category" />
                  <>
                    <FormControl
                      sx={{
                        marginTop: '20px',
                        marginBottom: '10px',
                        width: '323px',
                      }}
                    >
                      <InputLabel
                        id="service"
                        sx={{
                          top: '-7px',
                        }}
                      >
                        Service Type
                      </InputLabel>
                      <Select
                        labelId="service"
                        id="service"
                        name="service"
                        value={formik.values.service}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        autoWidth
                        label="Service Type"
                        sx={{
                          '& .MuiSelect-select': {
                            paddingTop: '8px',
                            paddingBottom: '8px',
                          },
                        }}
                        // onChangeCapture={(s) => {
                        //   setSelectedServiceType(formik.values.);
                        // }}
                      >
                        {serviceTypes.map((item: ServiceType) => {
                          return (
                            <MenuItem
                              key={item.service_type_id}
                              value={item.service_type_id}
                              sx={{
                                width: '270px',
                              }}
                            >
                              {item.service_type_name}
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                    <FieldError formik={formik} name="service" />
                    <input type="hidden" name="ticketId" value={ticketId} />
                    <input
                      type="hidden"
                      name="categoryServiceTypeId"
                      value={selectedCategoryServiceTypeId}
                    />
                    <input
                      type="hidden"
                      name="ticketNumber"
                      value={ticketNumber}
                    />
                  </>
                </div>

                <div className="flex items-center justify-center gap-20 relative self-stretch w-full flex-[0_0_auto]">
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setShowCategoryDialog(false);
                    }}
                  >
                    CANCEL
                  </Button>

                  <Button
                    type="submit"
                    variant="contained"
                    sx={{
                      transition: 'transform 0.2s ease-in-out', // Smooth transition
                      '&:hover': {
                        transform: 'scale(1.05)', // Scale effect on hover
                      },
                    }}
                    disabled={
                      !(
                        formik.touched['category'] || formik.touched['service']
                      ) ||
                      !(
                        formik.dirty &&
                        (formik.values.category !==
                          formik.initialValues.category ||
                          formik.values.service !==
                            formik.initialValues.service)
                      )
                    }
                  >
                    SUBMIT
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const FieldError = ({ formik, name, ...rest }: any) => {
  if (!formik?.touched[name] || !formik?.errors[name]) {
    return null;
  }

  return (
    <p className="text-wrap text-red-500 text-xs -mt-2" {...rest}>
      {formik?.errors[name]}
    </p>
  );
};
