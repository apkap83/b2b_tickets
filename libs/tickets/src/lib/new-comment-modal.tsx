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
import { GoPencil } from 'react-icons/go';
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
          <div
            className={titleClass}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <GoPencil />
            <span>{`New Comment for Ticket ${Ticket}`}</span>
          </div>
        );
      }

      if (modalAction === TicketDetailsModalActions.CLOSE) {
        return (
          <div
            className={titleClass}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M7.5 10L9.16667 11.6667L12.5 8.33333"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{`Close Comment for Ticket ${Ticket}`}</span>
          </div>
        );
      }

      if (modalAction === TicketDetailsModalActions.CANCEL) {
        return (
          <div
            className={titleClass}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>{`Cancel Comment for Ticket ${Ticket}`}</span>
          </div>
        );
      }

      return null;
    }, [modalAction, Ticket, styles.title]);

    return (
      <React.Fragment>
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10"
          style={{
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            className={`${styles.mainDiv} px-8 pt-[20.80px] pb-[48.46px] bg-white rounded-lg justify-start items-center inline-flex`}
            style={{
              animation: 'slideUp 0.3s ease-out',
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div className="w-full self-stretch flex-col justify-start items-start gap-[20.80px] inline-flex">
              <div className="self-stretch pl-3 py-2 bg-gradient-to-r from-[#020024] to-[#373742] rounded-md flex-col justify-start items-start flex">
                {getCorrectTitle}
              </div>
              <form
                action={action}
                className="grow shrink basis-0 self-stretch pl-[8.56px] pr-[16.56px] py-[0.56px] bg-white rounded-md shadow border border-[#989ac6] flex-col justify-start items-start inline-flex"
              >
                <div className="self-stretch h-[297.03px] px-1 pt-3 pb-4 flex-col justify-start items-start gap-3 flex">
                  <div className="self-stretch h-[269.05px] pt-2 flex-col justify-start items-start flex">
                    <div className="self-stretch h-[261.05px] p-[5px] border rounded-md border-neutral-400 flex-col justify-start items-start flex">
                      <textarea
                        id="comment"
                        name="comment"
                        placeholder="Add your comment here..."
                        required
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
                            fontFamily: 'Roboto, sans-serif',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            transition: 'border-color 0.2s ease',
                          }),
                          [colors.grey]
                        )}
                        onFocus={(e) => {
                          if (e.target && e.target.parentElement) {
                            e.target.parentElement.style.borderColor =
                              '#c3c6fd';
                            e.target.parentElement.style.boxShadow =
                              '0 0 0 3px rgba(195, 198, 253, 0.1)';
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target && e.target.parentElement) {
                            e.target.parentElement.style.borderColor =
                              '#a3a3a3';
                            e.target.parentElement.style.boxShadow = 'none';
                          }
                        }}
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        width: '4px',
                        height: '4px',
                        backgroundColor: '#3b82f6',
                        borderRadius: '50%',
                        display: 'inline-block',
                      }}
                    ></span>
                    Customer will be notified by e-mail notification for this
                    comment
                  </p>
                )}

                <div
                  className={`${styles.buttonDiv} self-stretch justify-center items-center inline-flex`}
                  style={{
                    gap: '12px',
                  }}
                >
                  <Button
                    onClick={handleCloseModal}
                    variant="outlined"
                    size="large"
                    style={useMemo(
                      () => ({
                        color: colors.grey[500],
                        border: `1px solid ${colors.grey[500]}`,
                        textTransform: 'none',
                        fontWeight: 500,
                        padding: '8px 24px',
                        transition: 'all 0.2s ease',
                      }),
                      [colors.grey]
                    )}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Cancel
                  </Button>
                  <SubmitButton
                    label={submitButtonLabel}
                    loadingText="Creating..."
                    isValid={true}
                    action={modalAction}
                  />
                </div>
              </form>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </React.Fragment>
    );
  }
);

NewCommentModal.displayName = 'NewCommentModal';
