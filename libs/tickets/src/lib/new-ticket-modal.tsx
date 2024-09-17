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
import {
  getTicketCategories,
  getServiceTypes,
  createNewTicket,
} from '@b2b-tickets/server-actions';
import { EMPTY_FORM_STATE } from '@b2b-tickets/utils';
import { useToastMessage } from '@b2b-tickets/react-hooks';
import { useFormik } from 'formik';
import { SubmitButton } from '@b2b-tickets/ui';
import { faker } from '@faker-js/faker';

import customParseFormat from 'dayjs/plugin/customParseFormat';
import updateLocale from 'dayjs/plugin/updateLocale';
import { useSession } from 'next-auth/react';

import * as yup from 'yup';
import styles from './css/new-ticket-modal.module.scss';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const FieldError = ({ formik, name }: any) => {
  if (!formik?.touched[name] || !formik?.errors[name]) {
    return null;
  }

  return (
    <p className="text-wrap text-red-500 text-xs -mt-1">
      {formik?.errors[name]}
    </p>
  );
};

export function NewTicketModal({ closeModal, userId }: any) {
  const autoComplete = 'off';
  const rightPanelMinWidthPx = '320px';
  const minWidth = '550px';
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const { data: session, status } = useSession();
  const [formState, action] = useFormState<any, any>(
    createNewTicket,
    EMPTY_FORM_STATE
  );

  const noScriptFallback = useToastMessage(formState);

  const [open, setOpen] = React.useState(false);

  type TicketCategory = { category_id: string; Category: string };

  const [ticketCategories, setticketCategories] = useState<TicketCategory[]>([
    { category_id: '', Category: '' },
  ]);

  type ServiceCategory = { service_id: string; 'Service Name': string };

  const [serviceTypes, setServiceTypes] = useState<ServiceCategory[]>([
    {
      service_id: '',
      'Service Name': '',
    },
  ]);

  useEffect(() => {
    const getCategories = async () => {
      const rows = await getTicketCategories();
      setticketCategories(rows);
    };

    const getCurrentServiceTypes = async () => {
      const rows = await getServiceTypes();
      setServiceTypes(rows);
    };

    getCategories();
    getCurrentServiceTypes();
  }, []);

  const ticketSchema = yup.object().shape({
    title: yup.string().required('Title is required'),
    description: yup.string().required('Description is required'),
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
      .required('Service name is required')
      .test(
        'is-valid-number',
        'Service cannot be empty',
        (value) => value !== '' && !isNaN(Number(value))
      ),
    equipmentId: yup.string(),
    sid: yup.string(),
    cid: yup.string(),
    userName: yup.string(),
    cliValue: yup.string(),
    contactPerson: yup.string().required('Contact Person is required'),
    contactPhoneNum: yup
      .string()
      .required('Contact Phone Number is required')
      .matches(/^[0-9]+$/, 'Contact Phone Number must be numeric')
      .min(10, 'Contact Phone Number must be at least 10 characters long'),
    occurrenceDate: yup
      .string()
      .required('Occurrence date is required')
      .test(
        'at-least-one',
        'At least one of SID, CID, User Name, or CLI Value is required',
        function (value) {
          return (
            this.parent.sid ||
            this.parent.cid ||
            this.parent.userName ||
            this.parent.cliValue
          );
        }
      ),
  });

  const formik = useFormik<any>({
    initialValues: {
      // Test Values
      // title: faker.commerce.product(),
      // description: faker.commerce.productDescription(),
      // category: '',
      // service: '',
      // equipmentId: 7,
      // sid: 123456,
      // cid: 1234,
      // userName: faker.internet.userName(),
      // cliValue: '2102012749',
      // contactPerson: faker.person.fullName(),
      // contactPhoneNum: '6936092138',
      // occurrenceDate: dayjs().toISOString(),

      // Final Initial Values
      title: '',
      description: '',
      category: '',
      service: '',
      equipmentId: '',
      sid: '',
      cid: '',
      userName: '',
      cliValue: '',
      contactPerson: '',
      contactPhoneNum: session?.user.mobilePhone || '',
      occurrenceDate: dayjs().toISOString(),
      // occurrenceDate: '',
    },
    validateOnMount: true,
    validationSchema: ticketSchema,
    onSubmit: async (values, { setSubmitting }) => {},
  });

  useEffect(() => {
    if (formState.status === 'SUCCESS') closeModal();
  }, [formState.status, formState.timestamp]);

  dayjs.extend(customParseFormat);
  dayjs.extend(updateLocale);

  // Update the locale to use Greek characters for AM/PM
  dayjs.updateLocale('en', {
    meridiem: (hour: any) => {
      return hour < 12 ? 'πμ' : 'μμ';
    },
    formats: {
      LT: 'h:mm A',
      LTS: 'h:mm:ss A',
      L: 'DD/MM/YYYY',
      LL: 'D MMMM YYYY',
      LLL: 'D MMMM YYYY h:mm A',
      LLLL: 'dddd, D MMMM YYYY h:mm A',
    },
  });

  return (
    <React.Fragment>
      <div
        className={`${styles.mainContainer} fixed inset-0 flex items-center justify-center
       bg-black bg-opacity-65 z-10`}
      >
        <div
          className={`${styles.mainContainer} bg-white pt-[1.3rem] pb-[1.3rem] px-[2rem] 
        rounded-lg max-h-[95vh]  overflow-hidden flow-root bg-gray-50`}
        >
          <form action={action} className={`${styles.formContainer}`}>
            <>
              <Typography
                variant="h3"
                textAlign={'left'}
                mb={'1.3rem'}
                className="
                bg-gradient-to-r from-[#020024] to-[rgba(55,55,66,0)]
                font-thin tracking-widest rounded-md py-2
                text-gray-300 pl-3
                "
              >
                B2B - New Ticket Form
              </Typography>

              <div className={`${styles.fieldsMainContainer}`}>
                <div
                  className="flex-grow  overflow-y-auto 
                 pr-[1rem] overflow-x-hidden
                 bg-white rounded-md pl-2 border border-gray-200
                 shadow-lg
                 
                 "
                  style={{
                    border: `1px solid ${colors.blueAccent[800]}`,
                    backgroundColor: `${colors.grey[900]}`,
                  }}
                >
                  <div className="p-1 flex flex-col gap-3 pt-3 ">
                    <FormControl>
                      <TextField
                        required
                        margin="dense"
                        id="title"
                        name="title"
                        label="Title"
                        type="text"
                        fullWidth
                        variant="standard"
                        value={formik.values.title}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        autoComplete={autoComplete}
                      />
                    </FormControl>
                    <FieldError formik={formik} name="title" />

                    <FormControl
                      sx={{
                        mt: '.5rem',
                        border: `1px solid ${colors.grey[700]}`,
                        padding: '10px',
                        outline: 'none',
                        '& > textarea': {
                          outline: 'none',
                        },
                      }}
                    >
                      <textarea
                        id="description"
                        name="description"
                        rows={10}
                        placeholder="Description..."
                        required
                        value={formik.values.description}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        style={{
                          backgroundColor: `${colors.grey[900]}`,
                          color: `${colors.grey[100]}`,
                        }}
                      ></textarea>
                    </FormControl>
                    <FieldError formik={formik} name="description" />

                    <Box
                      mt=".5rem"
                      mb=".5rem"
                      border={`1px dashed ${colors.grey[800]}`}
                      p=".5rem"
                    >
                      <Typography
                        fontWeight="400"
                        fontSize="11.7143px"
                        color="rgba(0,0,0,.6)"
                      >
                        Please provide at least 1 of 4 below fields:
                      </Typography>

                      <Box>
                        <FormControl
                          className={`${styles.fourFieldsContainer}`}
                          sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '5.3rem',
                          }}
                        >
                          <TextField
                            margin="dense"
                            id="sid"
                            name="sid"
                            label="SID"
                            type="text"
                            variant="standard"
                            value={formik.values.sid}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            autoComplete={autoComplete}
                          />
                          <TextField
                            margin="dense"
                            id="cid"
                            name="cid"
                            label="CID"
                            type="text"
                            variant="standard"
                            value={formik.values.cid}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            autoComplete={autoComplete}
                          />
                        </FormControl>

                        <FormControl
                          className={`${styles.fourFieldsContainer}`}
                          sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '5.3rem',
                          }}
                        >
                          <TextField
                            margin="dense"
                            id="userName"
                            name="userName"
                            label="User Name"
                            type="text"
                            variant="standard"
                            value={formik.values.userName}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            autoComplete={autoComplete}
                          />
                          <TextField
                            margin="dense"
                            id="cliValue"
                            name="cliValue"
                            label="CLI Value"
                            type="text"
                            variant="standard"
                            value={formik.values.cliValue}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            autoComplete={autoComplete}
                          />
                        </FormControl>
                      </Box>
                    </Box>
                    <span className="font-bold">{formState.message}</span>
                    {noScriptFallback}
                    {/* {formik.errors ? (
                  <div>{JSON.stringify(formik.errors, null, 2)}</div>
                ) : null} */}
                  </div>
                </div>
                <div
                  className={`flex flex-col gap-1 
                self-start bg-black 
                 rounded-md px-2 pt-3 pb-2
                shadow-lg
                self-stretch
                `}
                  style={{
                    border: `1px solid ${colors.blueAccent[800]}`,
                    backgroundColor: `${colors.grey[900]}`,
                  }}
                >
                  <FormControl sx={{ minWidth: rightPanelMinWidthPx }}>
                    <InputLabel id="category">Category</InputLabel>
                    <Select
                      labelId="category"
                      id="category"
                      name="category"
                      value={formik.values.category}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      autoWidth
                      label="Categories *"
                      required
                    >
                      {ticketCategories.map((item) => {
                        return (
                          <MenuItem
                            key={item.category_id}
                            value={item.category_id}
                            sx={{
                              minWidth: rightPanelMinWidthPx,
                            }}
                          >
                            {item.Category}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  <FieldError formik={formik} name="category" />
                  <FormControl
                    sx={{ mt: '.75rem', minWidth: rightPanelMinWidthPx }}
                  >
                    <InputLabel id="service">Service Name</InputLabel>
                    <Select
                      labelId="service"
                      id="service"
                      name="service"
                      value={formik.values.service}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      autoWidth
                      label="Service Name"
                    >
                      {serviceTypes.map((item) => {
                        return (
                          <MenuItem
                            key={item.service_id}
                            value={item.service_id}
                            sx={{
                              minWidth: rightPanelMinWidthPx,
                            }}
                          >
                            {item['Service Name']}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  <FieldError formik={formik} name="service" />

                  <FormControl sx={{ minWidth: rightPanelMinWidthPx }}>
                    <TextField
                      margin="dense"
                      id="equipmentId"
                      name="equipmentId"
                      label="Equipment ID"
                      fullWidth
                      variant="standard"
                      type="number"
                      value={formik.values.equipmentId}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      autoComplete={autoComplete}
                    />
                  </FormControl>
                  <FieldError formik={formik} name="equipmentId" />

                  <FormControl sx={{ minWidth: rightPanelMinWidthPx }}>
                    <TextField
                      required
                      margin="dense"
                      id="contactPerson"
                      name="contactPerson"
                      label="Contact Person"
                      type="text"
                      variant="standard"
                      value={formik.values.contactPerson}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      autoComplete={autoComplete}
                    />
                  </FormControl>
                  <FieldError formik={formik} name="contactPerson" />

                  <FormControl sx={{ minWidth: rightPanelMinWidthPx }}>
                    <TextField
                      required
                      margin="dense"
                      id="contactPhoneNum"
                      name="contactPhoneNum"
                      label="Contact Phone Number"
                      type="text"
                      variant="standard"
                      value={formik.values.contactPhoneNum}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      autoComplete={autoComplete}
                    />
                  </FormControl>
                  <FieldError formik={formik} name="contactPhoneNum" />
                  <FormControl sx={{ mt: '.5rem' }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <span
                        style={{
                          color: 'rgba(0,0,0,.6)',
                          fontSize: '11.7143px',
                          fontWeight: '400',
                        }}
                      >
                        Occurence Date *
                      </span>
                      <DateTimePicker
                        name="occurrenceDate"
                        value={dayjs(formik.values.occurrenceDate)} // Ensure the value is a dayjs object
                        onChange={(value) => {
                          if (value && dayjs(value).isValid()) {
                            formik.setFieldValue(
                              'occurrenceDate',
                              value.toISOString()
                            );
                          }
                        }}
                        format="DD/MM/YYYY hh:mm A" // European date format with 12-hour time and AM/PM
                      />
                      {/* </DemoContainer> */}
                    </LocalizationProvider>
                  </FormControl>
                  <FieldError formik={formik} name="occurrenceDate" />
                </div>
              </div>
              <div
                className={`${styles.buttonsDiv} flex justify-evenly mt-[1.3rem]`}
              >
                <Button
                  onClick={closeModal}
                  variant="outlined"
                  style={{
                    color: `${colors.grey[500]}`,
                    border: `1px solid ${colors.grey[500]}`,
                  }}
                >
                  Cancel
                </Button>

                <SubmitButton
                  label="Submit Ticket"
                  loadingText="Creating..."
                  isValid={formik.isValid}
                />
              </div>
            </>
          </form>
        </div>
      </div>
    </React.Fragment>
  );
}
