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
import { SubmitButton } from '@b2b-tickets/ui';
import { faker } from '@faker-js/faker';

import customParseFormat from 'dayjs/plugin/customParseFormat';
import updateLocale from 'dayjs/plugin/updateLocale';
import * as yup from 'yup';

import {
  TicketDetail,
  TicketDetailsModalActions,
} from '@b2b-tickets/shared-models';

import styles from './css/new-comment-modal.module.scss';

export function NewCommentModal({
  modalAction = TicketDetailsModalActions.NO_ACTION,
  userId,
  ticketDetail,
  closeModal,
}: {
  modalAction: TicketDetailsModalActions;
  userId: string;
  ticketDetail: TicketDetail[];
  closeModal: any;
}) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const { ticket_id, ticket_number } = ticketDetail[0];

  const [submitButtonLabel, setSubmitButtonLabel] = useState('Submit Comment');

  const [formState, action] = useFormState<any, any>(
    createNewComment,
    EMPTY_FORM_STATE
  );

  const noScriptFallback = useToastMessage(formState);

  useEffect(() => {
    if (formState.status === 'SUCCESS') closeModal();
  }, [formState.status, formState.timestamp]);

  useEffect(() => {
    if (modalAction === TicketDetailsModalActions.CLOSE)
      setSubmitButtonLabel('Submit Comment & Close Ticket');
    if (modalAction === TicketDetailsModalActions.CANCEL)
      setSubmitButtonLabel('Submit Comment & Cancel Ticket');
  }, [modalAction]);

  const getCorrectTitle = () => {
    if (modalAction === TicketDetailsModalActions.NO_ACTION) {
      return (
        <div
          className={`${styles.title} self-stretch text-gray-300 text-xl font-normal font-['Roboto'] leading-7 tracking-[2.40px]`}
        >
          {`B2B - New Comment for Ticket  ${ticket_number}`}
        </div>
      );
    }

    if (modalAction === TicketDetailsModalActions.CLOSE) {
      return (
        <div
          className={`${styles.title} self-stretch text-gray-300 text-xl font-normal font-['Roboto'] leading-7 tracking-[2.40px]`}
        >
          {`B2B - Closing Comment for Ticket ${ticket_number}`}
        </div>
      );
    }

    if (modalAction === TicketDetailsModalActions.CANCEL) {
      return (
        <div
          className={`${styles.title} self-stretch text-gray-300 text-xl font-normal font-['Roboto'] leading-7 tracking-[2.40px]`}
        >
          {`B2B - Cancel Comment for Ticket ${ticket_number}`}
        </div>
      );
    }
  };

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
              {getCorrectTitle()}
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
                    <input type="hidden" name="ticketId" value={ticket_id} />
                    <input
                      type="hidden"
                      name="ticketNumber"
                      value={ticket_number}
                    />
                    <input
                      type="hidden"
                      name="modalAction"
                      value={modalAction}
                    />
                  </div>
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
