'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { getGreekDateFormat, getStatusColor } from '@b2b-tickets/utils';
import {
  TicketComment,
  TicketDetail,
  TicketDetailForTicketCreator,
  WebSocketMessage,
} from '@b2b-tickets/shared-models';
import { TicketsUiComments } from '@b2b-tickets/tickets/ui/comments';
import { NewCommentModal } from './new-comment-modal';
import { EscalateModal } from './escalate-modal';

import { useSession } from 'next-auth/react';
import { useEscKeyListener } from '@b2b-tickets/react-hooks';

import { userHasRole, isPreviewableFile } from '@b2b-tickets/utils';
import {
  AppRoleTypes,
  TicketDetailsModalActions,
  TicketStatus,
  TicketAttachmentDetails,
} from '@b2b-tickets/shared-models';
import {
  setTicketWorking,
  getNextEscalationLevel,
  getTicketDetailsForTicketNumber,
  getTicketAttachments,
  deleteAttachment,
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
import clsx from 'clsx';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { EscalationBars } from '@b2b-tickets/ui';
import { useWebSocketContext } from '@b2b-tickets/contexts';
import { IoCloudUploadOutline } from 'react-icons/io5';
import { FileAttachmentModal } from '@b2b-tickets/file-attachment-modal';
import { LiaCommentDotsSolid } from 'react-icons/lia';
import { TicketAttachments } from './ticket-attachments';
import { FilePreviewModal } from './file-preview-modal';

const detailsRowClass =
  'w-full justify-center items-center gap-2.5 inline-flex text-md';

const detailsRowHeaderClass =
  "grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] ";

export function TicketDetails({
  theTicketDetails,
  theTicketNumber,
}: {
  theTicketDetails: TicketDetail[] | TicketDetailForTicketCreator[];
  theTicketNumber: string;
}) {
  const { data: session, status } = useSession();
  //@ts-ignore
  const userId = session?.user.user_id;

  const [showNewComment, setShowNewComment] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [showRemedyIncDialog, setShowRemedyIncDialog] = useState(false);
  const [showSeverityDialog, setShowSeverityDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showFileAttachmentDialog, setShowFileAttachmentDialog] =
    useState(false);

  const [showFilePreviewDialog, setShowFilePreviewDialog] = useState(false);
  const [selectedFileForPreview, setSelectedFileForPreview] =
    useState<TicketAttachmentDetails | null>(null);

  // const [ticketStatus, setTicketStatus] = useState(ticketDetails[0].status_id);
  const [modalAction, setModalAction] = useState<TicketDetailsModalActions>(
    TicketDetailsModalActions.NO_ACTION
  );

  const [nextEscalationLevel, setNextEscalationLevel] = useState<string>('');

  const [ticketAttachments, setTicketAttachments] = useState<
    TicketAttachmentDetails[] | undefined
  >([]);

  const [ticketDetails, setTicketDetails] = useState<
    TicketDetail[] | TicketDetailForTicketCreator[]
  >(theTicketDetails);

  // Web Socket Connection
  const { emitEvent, latestEventEmitted, resetLatestEventEmitted } =
    useWebSocketContext();

  const getMyNextEscalationLevel = async () => {
    try {
      const resp = await getNextEscalationLevel({
        ticketId: ticketDetails[0].ticket_id,
        ticketNumber: theTicketNumber,
      });

      setNextEscalationLevel(resp.data);
    } catch (error) {
      console.error('Error fetching next escalation level:', error);
    }
  };

  const getMyTicketAttachments = async () => {
    try {
      const resp = await getTicketAttachments({
        ticketId: ticketDetails[0].ticket_id,
      });
      setTicketAttachments(resp.data);
    } catch (error) {
      console.error('Error fetching Ticket attachments file details:', error);
    }
  };

  // Get next Escalation Level and Attachment Files
  useEffect(() => {
    getMyNextEscalationLevel();
    getMyTicketAttachments();
  }, [theTicketNumber]);

  // Define event types that trigger ticket details refresh
  const TICKET_UPDATE_EVENTS = [
    WebSocketMessage.TICKET_ALTERED_SEVERITY,
    WebSocketMessage.TICKET_ALTERED_REMEDY_INC,
    WebSocketMessage.TICKET_ALTERED_CATEGORY_SERVICE_TYPE,
    WebSocketMessage.NEW_COMMENT_ADDED,
    WebSocketMessage.TICKET_STARTED_WORK,
    WebSocketMessage.TICKET_ESCALATED,
    WebSocketMessage.TICKET_CANCELED,
    WebSocketMessage.TICKET_CLOSED,
  ] as const;

  // Helper function to refresh ticket data
  const refreshTicketData = async (
    currentTicketId: string,
    currentTicketNumber: string
  ) => {
    try {
      // Get updated ticket details
      const updatedTicketDetails: TicketDetail[] =
        await getTicketDetailsForTicketNumber({
          ticketNumber: currentTicketNumber,
        });
      setTicketDetails(updatedTicketDetails);

      // Get updated escalation level
      const escalationResponse = await getNextEscalationLevel({
        ticketId: currentTicketId,
        ticketNumber: currentTicketNumber,
      });
      setNextEscalationLevel(escalationResponse.data);

      resetLatestEventEmitted();
    } catch (error) {
      console.error('Error refreshing ticket data:', error);
    }
  };

  // Helper function to check if event should trigger ticket refresh
  const shouldRefreshTicketDetails = (event: WebSocketMessage): boolean => {
    return TICKET_UPDATE_EVENTS.includes(event as any);
  };

  // WebSocket event handler
  useEffect(() => {
    const handleWebSocketEvent = async () => {
      if (!latestEventEmitted) return;

      const { event, data } = latestEventEmitted;
      const eventTicketId = data?.ticket_id;
      const currentTicketId = ticketDetails[0]?.ticket_id;

      // Early return if no current ticket
      if (!currentTicketId) return;

      // Handle ticket details refresh events
      if (
        shouldRefreshTicketDetails(event) &&
        eventTicketId === currentTicketId
      ) {
        const currentTicketNumber = ticketDetails[0].Ticket;
        await refreshTicketData(currentTicketId, currentTicketNumber);
        return;
      }

      // Handle file attachment events
      if (
        (event === WebSocketMessage.NEW_FILE_ATTACHMENT_FOR_TICKET ||
          event === WebSocketMessage.DELETE_FILE_ATTACHMENT_FOR_TICKET) &&
        eventTicketId === currentTicketId
      ) {
        await getMyTicketAttachments();
        return;
      }
    };

    handleWebSocketEvent();
  }, [latestEventEmitted, ticketDetails]);

  // Custom Hook for ESC Key Press
  useEscKeyListener(() => {
    setShowNewComment(false);
    setShowEscalateDialog(false);
    setShowRemedyIncDialog(false);
    setShowSeverityDialog(false);
    setShowCategoryDialog(false);
    setShowFileAttachmentDialog(false);
  });

  if (!ticketDetails || ticketDetails.length === 0) return null;

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
  const escalation_levels = ticketDetails[0]['escalation_levels'];
  const isFinalStatus =
    ticketDetails[0]['Is Final Status'] === 'y' ? true : false;

  const startWorkPressed = ticketStatus !== '1';
  // Button style constants
  const BUTTON_STYLES = {
    primary: {
      backgroundColor: '#474cae',
      color: 'white',
      paddingLeft: '1.2rem',
      paddingRight: '1.2rem',
      '&:hover': {
        backgroundColor: '#585ed6',
      },
    },
    primaryOutlined: {
      backgroundColor: '#474cae',
      color: 'white',
      '&:hover': {
        backgroundColor: '#585ed6',
      },
    },
    danger: {
      backgroundColor: '#cd5353',
      color: 'white',
      '&:hover': {
        backgroundColor: '#cd4343',
      },
    },
  } as const;

  // Individual button handlers
  const handleStartWork = async () => {
    const response = await setTicketWorking({
      ticketId,
      ticketNumber,
      statusId: TicketStatus.WORKING,
      comment: `Started Working On Ticket: ${ticketNumber}`,
    });

    if (response.status === 'ERROR') {
      return toast.error(response.message);
    }

    emitEvent(WebSocketMessage.TICKET_STARTED_WORK, { ticket_id: ticketId });
    toast.success(response.message);
  };

  const handleCloseTicket = () => {
    setModalAction(TicketDetailsModalActions.CLOSE);
    setShowNewComment(true);
  };

  const handleCancelTicket = () => {
    setModalAction(TicketDetailsModalActions.CANCEL);
    setShowNewComment(true);
  };

  const handleAttachFile = () => {
    setShowFileAttachmentDialog(true);
  };

  const handleNewComment = () => {
    setModalAction(TicketDetailsModalActions.NO_ACTION);
    setShowNewComment(true);
  };

  // Button components
  const StartWorkButton = () => (
    <Button onClick={handleStartWork} sx={BUTTON_STYLES.primary}>
      Start Work
    </Button>
  );

  const CloseTicketButton = () => (
    <Button
      onClick={handleCloseTicket}
      variant="outlined"
      sx={BUTTON_STYLES.primaryOutlined}
    >
      Close Ticket
    </Button>
  );

  const CancelTicketButton = () => (
    <Button
      onClick={handleCancelTicket}
      variant="outlined"
      sx={BUTTON_STYLES.danger}
    >
      Cancel Ticket
    </Button>
  );

  const AttachFileButton = () => (
    <Button onClick={handleAttachFile} variant="outlined">
      <IoCloudUploadOutline size="20" className="mr-2" />
      Attach File
    </Button>
  );

  const NewCommentButton = () => (
    <Button onClick={handleNewComment} variant="outlined">
      <LiaCommentDotsSolid size="20" className="mr-2" />
      New Comment
    </Button>
  );

  // Helper function to determine user permissions and ticket state
  const ticketPermissions = useMemo(() => {
    const isTicketHandler = userHasRole(
      session,
      AppRoleTypes.B2B_TicketHandler
    );
    const isTicketCreator = userHasRole(
      session,
      AppRoleTypes.B2B_TicketCreator
    );
    const isNewTicket = ticketStatus === TicketStatus.NEW;
    const isWorkingTicket = ticketStatus === TicketStatus.WORKING;
    const canEscalate =
      isTicketCreator &&
      (isNewTicket || isWorkingTicket) &&
      nextEscalationLevel;

    return {
      isTicketHandler,
      isTicketCreator,
      isNewTicket,
      isWorkingTicket,
      canEscalate,
    };
  }, [session, ticketStatus, nextEscalationLevel]);

  // Render functions for different user roles and ticket states
  const renderTicketHandlerButtons = () => {
    if (ticketPermissions.isNewTicket) {
      return <StartWorkButton />;
    }

    if (ticketPermissions.isWorkingTicket) {
      return (
        <div className="flex gap-2">
          <CloseTicketButton />
          <CancelTicketButton />
          <AttachFileButton />
          <NewCommentButton />
        </div>
      );
    }

    return null;
  };

  const renderTicketCreatorButtons = () => {
    if (ticketPermissions.isNewTicket || ticketPermissions.isWorkingTicket) {
      return (
        <div className="flex gap-2">
          {ticketPermissions.canEscalate && (
            <EscalateButton nextEscalationLevel={nextEscalationLevel} />
          )}
          <AttachFileButton />
          <NewCommentButton />
        </div>
      );
    }

    return null;
  };

  // Main function
  const customButtonBasedOnTicketStatus = () => {
    if (ticketPermissions.isTicketHandler) {
      return renderTicketHandlerButtons();
    }

    if (ticketPermissions.isTicketCreator) {
      return renderTicketCreatorButtons();
    }

    return null;
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
      <span
        className={`px-2 py-1 text-white`}
        style={{
          color: statusHTMLColor,
        }}
      >
        {ticketDetails[0].Status}
      </span>
    );
  };

  // Download handler function
  const handleAttachmentDownload = async (
    attachment: TicketAttachmentDetails
  ) => {
    try {
      // Show loading toast

      const loadingToast = toast.loading(
        `Downloading ${attachment.Filename}...`
      );

      // Create download URL with parameters
      const downloadUrl = new URL(
        '/api/download-attachment',
        window.location.origin
      );
      downloadUrl.searchParams.set('attachmentId', attachment.attachment_id);

      // Fetch the file
      const response = await fetch(downloadUrl.toString(), {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
      });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Show success toast
      // toast.success(`${attachment.Filename} downloaded successfully`);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Download failed' }));

        // Error Toast
        toast.error(`HTTP Error - status: ${response.status}`);

        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      // Get the file blob
      const blob = await response.blob();

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.Filename;

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to download file'
      );
    }
  };

  // Preview handler function
  const handleAttachmentPreview = async (
    attachment: TicketAttachmentDetails
  ) => {
    if (!isPreviewableFile(attachment.Filename)) {
      toast.error('File type not supported for preview');
      return;
    }

    setSelectedFileForPreview(attachment);
    setShowFilePreviewDialog(true);
  };

  // Add the delete handler function (add this inside your TicketDetails component)
  const handleAttachmentDelete = async (
    attachment: TicketAttachmentDetails
  ) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${attachment.Filename}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      // Show loading toast
      const loadingToast = toast.loading(`Deleting ${attachment.Filename}...`);

      // Call the delete server action
      const response = await deleteAttachment({
        attachmentId: attachment.attachment_id,
      });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (response.status === 'ERROR') {
        toast.error(response.message);
        return;
      }

      // Show success toast
      toast.success(response.message);

      // Refresh attachments list
      await getMyTicketAttachments();

      // Emit WebSocket event for real-time updates
      emitEvent(WebSocketMessage.DELETE_FILE_ATTACHMENT_FOR_TICKET, {
        ticket_id: ticketId,
        attachment_id: attachment.attachment_id,
        filename: attachment.Filename,
      });

      emitEvent(WebSocketMessage.NEW_COMMENT_ADDED, {
        ticket_id: ticketId,
        date: new Date(),
        isTicketCreator: true,
      });
    } catch (error) {
      console.error('Delete attachment error:', error);
      toast.error('Failed to delete attachment');
    }
  };

  return (
    <>
      <div className="w-full flex-col justify-start items-center gap-2 inline-flex mb-[75px]">
        <div
          className={`${styles.header} w-full h-[80px] px-6 border-b border-black justify-between items-center inline-flex`}
        >
          <div className="self-stretch flex-col justify-center items-center inline-flex mt-3 sm:mt-0">
            <div className="text-black/90 text-5xl font-bold text-nowrap">
              Ticket Details
            </div>
          </div>
          <div className="flex gap-2">{customButtonBasedOnTicketStatus()}</div>
        </div>
        <div
          className={`self-stretch pl-8 pr-6 pt-2 flex-col justify-start items-start gap-6 flex`}
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
                  </div>
                  <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight text-right">
                    <div className="flex justify-center items-center gap-1">
                      <EscalationBars
                        escalation_levels={Number(escalation_levels)}
                        level={currentEscalationLevel}
                        showNumbers={true}
                      />
                    </div>
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
          {ticketAttachments && ticketAttachments.length > 0 && (
            <TicketAttachments
              attachments={ticketAttachments}
              isPreviewable={isPreviewableFile}
              onPreview={handleAttachmentPreview}
              onDownload={handleAttachmentDownload}
              onDelete={handleAttachmentDelete}
              canDelete={
                ticketPermissions.isTicketHandler ||
                ticketPermissions.isTicketCreator
              }
            />
          )}
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

      {showFileAttachmentDialog && (
        <FileAttachmentModal
          ticketDetails={ticketDetails}
          setShowFileAttachmentDialog={setShowFileAttachmentDialog}
        />
      )}

      {showFilePreviewDialog && selectedFileForPreview && (
        <FilePreviewModal
          attachment={selectedFileForPreview}
          onClose={() => {
            setShowFilePreviewDialog(false);
            setSelectedFileForPreview(null);
          }}
          onDownload={() => handleAttachmentDownload(selectedFileForPreview)}
        />
      )}
    </>
  );
}
