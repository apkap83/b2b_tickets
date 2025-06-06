'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useFormState } from 'react-dom';
import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Button from '@mui/material/Button';
import { Typography, useTheme } from '@mui/material';
import { tokens } from '@b2b-tickets/ui-theme';
import { createNewComment } from '@b2b-tickets/server-actions';
import { EMPTY_FORM_STATE, userHasRole } from '@b2b-tickets/utils';
import { useToastMessage } from '@b2b-tickets/react-hooks';
import { SubmitButton } from '@b2b-tickets/ui';
import { useWebSocketContext } from '@b2b-tickets/contexts';

import {
  TicketDetail,
  TicketDetailsModalActions,
  WebSocketMessage,
  AppRoleTypes,
} from '@b2b-tickets/shared-models';

import styles from './css/new-comment-modal.module.scss';

export const NewCommentModal = memo(
  ({
    modalAction = TicketDetailsModalActions.NO_ACTION,
    userId,
    ticketDetail,
    closeModal,
  }: {
    modalAction: TicketDetailsModalActions;
    userId: string;
    ticketDetail: TicketDetail[];
    closeModal: any;
  }) => {
    const { data: session, status } = useSession();
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    const { ticket_id, Ticket } = ticketDetail[0];

    const [submitButtonLabel, setSubmitButtonLabel] =
      useState('Submit Comment');

    const [formState, action] = useFormState<any, any>(
      createNewComment,
      EMPTY_FORM_STATE
    );

    // Web Socket Connection
    const { emitEvent } = useWebSocketContext();

    const noScriptFallback = useToastMessage(formState);

    // Create a memoized function for handling successful form submissions
    const handleSuccessfulSubmission = useCallback(() => {
      const isTicketCreator = userHasRole(
        session,
        AppRoleTypes.B2B_TicketCreator
      );

      if (modalAction === TicketDetailsModalActions.NO_ACTION)
        emitEvent(WebSocketMessage.NEW_COMMENT_ADDED, {
          ticket_id,
          isTicketCreator,
          date: new Date(),
        });

      if (modalAction === TicketDetailsModalActions.CLOSE)
        emitEvent(WebSocketMessage.TICKET_CLOSED, {
          ticket_id,
        });

      if (modalAction === TicketDetailsModalActions.CANCEL)
        emitEvent(WebSocketMessage.TICKET_CANCELED, {
          ticket_id,
        });

      if (modalAction === TicketDetailsModalActions.ESCALATE)
        emitEvent(WebSocketMessage.TICKET_ESCALATED, {
          ticket_id,
        });
      closeModal();
    }, [session, modalAction, ticket_id, emitEvent, closeModal]);

    useEffect(() => {
      if (formState.status === 'SUCCESS') {
        handleSuccessfulSubmission();
      }
    }, [formState.status, formState.timestamp, handleSuccessfulSubmission]);

    useEffect(() => {
      if (modalAction === TicketDetailsModalActions.CLOSE)
        setSubmitButtonLabel('Submit Comment & Close Ticket');
      if (modalAction === TicketDetailsModalActions.CANCEL)
        setSubmitButtonLabel('Submit Comment & Cancel Ticket');
    }, [modalAction]);

    // Memoize the close modal handler
    const handleCloseModal = useCallback(() => {
      closeModal();
    }, [closeModal]);

    const getCorrectTitle = useMemo(() => {
      const titleClass = `${styles.title} self-stretch text-gray-300 text-xl font-normal font-['Roboto'] leading-7 tracking-[2.40px]`;

      if (modalAction === TicketDetailsModalActions.NO_ACTION) {
        return (
          <div className={titleClass}>
            {`B2B - New Comment for Ticket  ${Ticket}`}
          </div>
        );
      }

      if (modalAction === TicketDetailsModalActions.CLOSE) {
        return (
          <div className={titleClass}>
            {`B2B - Closing Comment for Ticket ${Ticket}`}
          </div>
        );
      }

      if (modalAction === TicketDetailsModalActions.CANCEL) {
        return (
          <div className={titleClass}>
            {`B2B - Cancel Comment for Ticket ${Ticket}`}
          </div>
        );
      }

      return null;
    }, [modalAction, Ticket, styles.title]);

    return (
      <React.Fragment>
        <div
          className="fixed inset-0 flex items-center justify-center
       bg-black bg-opacity-50"
        >
          <div
            className={`${styles.mainDiv} px-8 pt-[20.80px] pb-[48.46px] bg-white rounded-lg justify-start items-center inline-flex`}
          >
            <div className="w-full self-stretch flex-col justify-start items-start gap-[20.80px] inline-flex">
              <div className="self-stretch  pl-3 py-2 bg-gradient-to-r from-[#020024] to-[#373742] rounded-md flex-col justify-start items-start flex">
                {getCorrectTitle}
              </div>
              <form
                action={action}
                className="grow shrink basis-0 self-stretch pl-[8.56px] pr-[16.56px] py-[0.56px] bg-white rounded-md shadow border border-[#c3c6fd] flex-col justify-start items-start inline-flex"
              >
                {/* <div className="grow shrink basis-0 self-stretch pl-[8.56px] pr-[16.56px] py-[0.56px] bg-white rounded-md shadow border border-[#c3c6fd] flex-col justify-start items-start inline-flex"> */}
                <div className="self-stretch h-[297.03px] px-1 pt-3 pb-4 flex-col justify-start items-start gap-3 flex">
                  <div className="self-stretch h-[269.05px] pt-2 flex-col justify-start items-start flex">
                    <div className="self-stretch h-[261.05px] p-[10.56px] border border-neutral-400 flex-col justify-start items-start flex">
                      <textarea
                        id="comment"
                        name="comment"
                        placeholder="Add your comment here..."
                        required
                        // value={formik.values.description}
                        // onChange={formik.handleChange}
                        // onBlur={formik.handleBlur}
                        style={useMemo(
                          () => ({
                            backgroundColor: colors.grey[900],
                            color: colors.grey[100],
                            width: '100%',
                            height: '100%',
                            resize: 'none',
                            boxSizing: 'border-box',
                            padding: '10px',
                            outline: 'none',
                          }),
                          [colors.grey]
                        )}
                      ></textarea>
                      <input type="hidden" name="ticketId" value={ticket_id} />
                      <input type="hidden" name="ticketNumber" value={Ticket} />
                      <input
                        type="hidden"
                        name="modalAction"
                        value={modalAction}
                      />
                    </div>
                  </div>
                </div>
                {userHasRole(session, AppRoleTypes.B2B_TicketHandler) && (
                  <p
                    className="text-xs text-gray-600"
                    style={{
                      transform: 'translate(5px, -14px)',
                    }}
                  >
                    * Customer will be notified by e-mail notification for this
                    comment
                  </p>
                )}

                {/* </div> */}
                <div
                  className={`${styles.buttonDiv} self-stretch justify-center items-center inline-flex`}
                >
                  <Button
                    onClick={handleCloseModal}
                    variant="outlined"
                    size="large"
                    style={useMemo(
                      () => ({
                        color: colors.grey[500],
                        border: `1px solid ${colors.grey[500]}`,
                      }),
                      [colors.grey]
                    )}
                  >
                    Cancel
                  </Button>
                  <SubmitButton
                    label={submitButtonLabel}
                    loadingText="Creating..."
                    // isValid={formik.isValid}
                    isValid={true}
                    action={modalAction}
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
);
