'use client';

import * as React from 'react';
import { useFormState } from 'react-dom';
import { useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Slide from '@mui/material/Slide';
import TextField from '@mui/material/TextField';

import Box from '@mui/material/Box';
import Backdrop from '@mui/material/Backdrop';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import FormControl from '@mui/material/FormControl';

import Select, { SelectChangeEvent } from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';

import { TransitionProps } from '@mui/material/transitions';

import { DemoContainer, DemoItem } from '@mui/x-date-pickers/internals/demo';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import Divider from '@mui/material/Divider';

import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Typography, useTheme } from '@mui/material';
import { tokens } from '@b2b-tickets/ui-theme';
import { createNewComment } from '@b2b-tickets/server-actions';
import { EMPTY_FORM_STATE } from '@b2b-tickets/utils';
import { useToastMessage } from '@b2b-tickets/react-hooks';
import { useFormik } from 'formik';
import { faker } from '@faker-js/faker';

import customParseFormat from 'dayjs/plugin/customParseFormat';
import updateLocale from 'dayjs/plugin/updateLocale';
import * as yup from 'yup';
import { useFormStatus } from 'react-dom';
import {
  escalateTicket,
  getNextEscalationLevel,
} from '@b2b-tickets/server-actions';
import {
  EscalationFillColor,
  EscalationBorderColor,
  TicketDetail,
  TicketDetailsModalActions,
  WebSocketMessage,
} from '@b2b-tickets/shared-models';
import { useWebSocket } from '@b2b-tickets/react-hooks';
import styles from './css/new-comment-modal.module.scss';

export function EscalateModal({
  modalAction = TicketDetailsModalActions.ESCALATE,
  ticketDetails,
  closeModal,
  nextEscalationLevel,
  setNextEscalationLevel,
}: {
  modalAction: TicketDetailsModalActions;
  ticketDetails: TicketDetail[];
  closeModal: any;
  nextEscalationLevel: string;
  setNextEscalationLevel: any;
}) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const ticketId = ticketDetails[0].ticket_id;
  const ticketNumber = ticketDetails[0]['Ticket'] as string;

  const [submitButtonLabel, setSubmitButtonLabel] = useState('Submit Comment');

  const [formState, action] = useFormState<any, any>(
    escalateTicket,
    EMPTY_FORM_STATE
  );

  const noScriptFallback = useToastMessage(formState);

  // Web Socket Connection
  const { emitEvent } = useWebSocket();

  useEffect(() => {
    const nextEscLevel = async () => {
      const resp = await getNextEscalationLevel({
        ticketId,
        ticketNumber,
      });
      setNextEscalationLevel(resp.data);
    };

    nextEscLevel();

    if (formState.status === 'SUCCESS') {
      emitEvent(WebSocketMessage.TICKET_ESCALATED, {
        ticket_id: ticketId,
      });
      closeModal();
    }
  }, [formState.status, formState.timestamp]);

  useEffect(() => {
    if (modalAction === TicketDetailsModalActions.ESCALATE)
      setSubmitButtonLabel(`Escalate Level ${nextEscalationLevel}`);
  }, [modalAction]);

  const getCorrectTitle = () => {
    if (modalAction === TicketDetailsModalActions.ESCALATE) {
      return (
        <div
          className={`${styles.title} self-stretch text-gray-300 text-xl font-normal font-['Roboto'] leading-7 tracking-[2.40px]`}
        >
          {`B2B - Escalate Ticket ${ticketNumber}`}
        </div>
      );
    }
  };

  return (
    <React.Fragment>
      <div className="fixed inset-0 bg-black bg-opacity-50 pointer-events-none z-10">
        <div className="fixed inset-0 flex items-center justify-center z-20 pointer-events-auto">
          <div
            className={`${styles.mainDiv} max-w-[700px] px-8 pt-[20.80px] pb-[48.46px] bg-white rounded-lg justify-start items-center inline-flex`}
          >
            <div className="w-full self-stretch flex-col justify-start items-start gap-[20.80px] inline-flex">
              <div className="self-stretch pl-3 py-2 bg-gradient-to-r from-[#020024] to-[#373742] rounded-md flex-col justify-start items-start flex">
                {getCorrectTitle()}
              </div>
              <form
                action={action}
                className="grow shrink basis-0 self-stretch pl-[8.56px] pr-[16.56px] py-[0.56px] bg-white rounded-md shadow border border-[#c3c6fd] flex-col justify-start items-start inline-flex"
              >
                {/* <div className="grow shrink basis-0 self-stretch pl-[8.56px] pr-[16.56px] py-[0.56px] bg-white rounded-md shadow border border-[#c3c6fd] flex-col justify-start items-start inline-flex"> */}
                <div className="w-full px-1 pt-3 pb-4 flex-col justify-start items-start gap-3 flex">
                  <div className="w-full pt-2 flex-col justify-center items-center flex">
                    <span>Are you sure you want to Escalate this ticket ?</span>

                    <textarea
                      id="comment"
                      name="comment"
                      placeholder="Add your comment here..."
                      required
                      // value={formik.values.description}
                      // onChange={formik.handleChange}
                      // onBlur={formik.handleBlur}
                      className="border mt-4 mb-2 p-2 max-w-[600px] min-h-[200px]"
                      style={{
                        backgroundColor: `${colors.grey[900]}`,
                        color: `${colors.grey[100]}`,
                        width: '100%',
                        height: '100%',
                        resize: 'none',
                        boxSizing: 'border-box',
                        padding: '10px',
                        outline: 'none',
                      }}
                    ></textarea>
                    <input
                      type="hidden"
                      name="ticketNumber"
                      value={ticketNumber}
                    />
                    <input type="hidden" name="ticketId" value={ticketId} />
                  </div>
                </div>
                {/* </div> */}
                <div
                  className={`${styles.buttonDiv} self-stretch justify-center items-center inline-flex`}
                >
                  <Button
                    onClick={() => {
                      closeModal();
                    }}
                    variant="outlined"
                    size="large"
                    style={{
                      color: `${colors.grey[500]}`,
                      border: `1px solid ${colors.grey[500]}`,
                    }}
                  >
                    Cancel
                  </Button>
                  <SubmitButton
                    label={submitButtonLabel}
                    loadingText="Escalating..."
                    // isValid={formik.isValid}
                    isValid={true}
                    action={modalAction}
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

type SubmitButtonProps = {
  label: string;
  loadingText: string;
  isValid: boolean;
  action?: TicketDetailsModalActions;
};

const SubmitButton = ({
  label,
  loadingText,
  isValid,
  action = TicketDetailsModalActions.NO_ACTION,
}: SubmitButtonProps) => {
  const { pending } = useFormStatus();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (pending) {
      event.preventDefault();
    }
  };

  let letterColor = '#ddd7d7';
  let backgroundColor = `${EscalationFillColor}`;
  let borderColor = `${EscalationBorderColor}`;

  if (!isValid || pending) {
    backgroundColor = '#5b5b5d';
  }

  return (
    <Button
      variant="contained"
      type="submit"
      className="btn btn-primary"
      disabled={!isValid || pending}
      aria-disabled={pending}
      onClick={handleClick}
      sx={{
        color: `${letterColor}`,
        backgroundColor: `${backgroundColor}`,
        border: `1px solid ${borderColor}`,

        '&:hover': {
          backgroundColor: 'rgb(172, 74, 74)',
          border: '1px solid rgb(151, 52, 52)',
        },
      }}
    >
      {pending ? loadingText : label}
    </Button>
  );
};
