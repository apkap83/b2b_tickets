'use client';

import * as React from 'react';
import { useFormState } from 'react-dom';
import { useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';

import Select, { SelectChangeEvent } from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Typography, useTheme } from '@mui/material';
import { tokens } from '@b2b-tickets/ui-theme';
import {
  getTicketCategories,
  getServiceTypes,
  createNewTicket,
  getTicketSeverities,
  getServicesForCategorySelected,
} from '@b2b-tickets/server-actions';
import { EMPTY_FORM_STATE, getSeverityStatusColor } from '@b2b-tickets/utils';
import { useToastMessage } from '@b2b-tickets/react-hooks';
import { useFormik } from 'formik';
// import { SubmitButton } from '@b2b-tickets/ui';
import { faker } from '@faker-js/faker';

import customParseFormat from 'dayjs/plugin/customParseFormat';
import updateLocale from 'dayjs/plugin/updateLocale';
import { useSession } from 'next-auth/react';

import * as yup from 'yup';
import styles from './css/new-ticket-modal.module.scss';
import { useFormStatus } from 'react-dom';
import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import { Span } from 'next/dist/trace';
import {
  TicketCategory,
  ServiceType,
  Severity,
  WebSocketMessage,
} from '@b2b-tickets/shared-models';
import toast from 'react-hot-toast';
import { useWebSocketContext } from '@b2b-tickets/contexts';
import 'react-quill/dist/quill.snow.css';

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

export function NewTicketModal({ closeModal, userId }: any) {
  const autoComplete = 'off';
  const rightPanelMinWidthPx = '320px';
  const [value, setValue] = useState('');

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const { data: session, status } = useSession();
  const [formState, action] = useFormState<any, any>(
    createNewTicket,
    EMPTY_FORM_STATE
  );

  // State to toggle the visibility of the fields
  const [showCcFields, setShowCcFields] = useState(false);

  const noScriptFallback = useToastMessage(formState);

  const [open, setOpen] = React.useState(false);

  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>(
    []
  );
  const [categoryIdSelected, setCategoryIdSelected] = useState('');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);

  const [severities, setSeverities] = useState<Severity[]>([]);

  const { emitEvent } = useWebSocketContext();

  // Get Severities
  useEffect(() => {
    const getSeverities = async () => {
      const result = await getTicketSeverities();

      if (result.error) return toast.error(result.error);

      setSeverities(result.data);
    };

    const getCategories = async () => {
      const result = await getTicketCategories();

      if (result.error) return toast.error(result.error);

      // If no error, set the ticket categories with the returned data
      setTicketCategories(result.data);
    };

    getSeverities();
    getCategories();
  }, []);

  const ticketSchema = yup.object().shape({
    title: yup.string().required('Title is required'),
    description: yup.string().required('Description is required'),
    severity: yup.string().required('Severity is required'),
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
    equipmentId: yup.string(),
    sid: yup.string(),
    cid: yup.string(),
    userName: yup.string(),
    cliValue: yup
      .string()
      .matches(/^\d{10}$/, 'CLI Value must be a 10-digit number'),
    contactPerson: yup.string().required('Contact Person is required'),
    contactPhoneNum: yup
      .string()

      .test(
        'is-valid-phone-list',
        'Must be a comma-separated list of valid Mobile Phone numbers',
        (value) => {
          if (!value) return false; // Does not Allow empty since it is required
          const phones = value.split(',').map((phone) => phone.trim());
          const phoneRegex = /^[0-9]{10,15}$/; // Adjust the regex as needed for your phone number format
          return phones.every((phone) => phoneRegex.test(phone));
        }
      ),
    ccEmails: yup
      .string()
      .test(
        'is-valid-email-list',
        'Must be a comma-separated list of valid email addresses',
        (value) => {
          if (!value) return true; // Allow empty since it is not required
          const emails = value.split(',').map((email) => email.trim());
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
          return emails.every((email) => emailRegex.test(email));
        }
      ),
    ccPhones: yup
      .string()
      .test(
        'is-valid-phone-list',
        'Must be a comma-separated list of valid phone numbers',
        (value) => {
          if (!value) return true; // Allow empty since it is not required
          const phones = value.split(',').map((phone) => phone.trim());
          const phoneRegex = /^\d{10,12}$/; // Basic phone regex
          return phones.every((phone) => phoneRegex.test(phone));
        }
      ),
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
      severity: '',
      category: '',
      service: '',
      equipmentId: '',
      sid: '',
      cid: '',
      userName: '',
      cliValue: '',
      contactPerson: `${session?.user.firstName} ${session?.user.lastName}`,
      contactPhoneNum: session?.user.mobilePhone || '',
      ccEmails: '',
      ccPhones: '',
      occurrenceDate: dayjs().toISOString(),
    },
    validateOnMount: true,
    validationSchema: ticketSchema,
    onSubmit: async (values, { setSubmitting }) => {},
  });

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

  useEffect(() => {
    if (formState.status === 'SUCCESS') {
      const ticket_id = formState.extraData;
      emitEvent(WebSocketMessage.NEW_TICKET_CREATED, { ticket_id });
      closeModal();
    }
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
       bg-black bg-opacity-65 z-10 pointer-events-none`}
      >
        <div className="fixed inset-0 flex items-center justify-center z-20 pointer-events-auto">
          <div
            className={`${styles.mainContainer} pt-[1.3rem] pb-[1.3rem] px-[2rem] 
        rounded-lg max-h-[95vh] overflow-hidden bg-gray-50 pointer-events-auto`}
          >
            <form
              action={action}
              autoComplete="off"
              className={`${styles.formContainer}`}
            >
              <>
                <Typography
                  variant="h4"
                  textAlign={'left'}
                  mb={'1.3rem'}
                  className={`
                bg-gradient-to-r from-[#0f0b58] to-[rgba(55,55,66,0)]
                font-thin tracking-widest rounded-md py-2
                text-gray-300 pl-3
                `}
                >
                  Create New Ticket
                </Typography>

                <div className={`${styles.fieldsMainContainer}`}>
                  <div
                    className="flex-grow  overflow-y-auto 
                 pr-[1rem] overflow-x-hidden
                 bg-white rounded-md pl-2 border border-gray-200
                 shadow-lg
                 
                 "
                    style={{
                      border: `1px solid ${colors.blueAccent[900]}`,
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
                            minHeight: '275px',
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
                          <FieldError
                            formik={formik}
                            name="cliValue"
                            style={{ marginTop: '0px' }}
                          />
                        </Box>
                      </Box>
                      <span className="font-bold">{formState.message}</span>
                      {noScriptFallback}
                    </div>
                  </div>
                  <div
                    className={`flex flex-col gap-1 
                 bg-black 
                 rounded-md px-2 pt-3 pb-2
                shadow-lg
                
                `}
                    style={{
                      border: `1px solid ${colors.blueAccent[900]}`,
                      backgroundColor: `${colors.grey[900]}`,
                    }}
                  >
                    <FormControl
                      sx={{
                        marginTop: '8px',
                        marginBottom: '8px',
                        minWidth: rightPanelMinWidthPx,
                      }}
                    >
                      <InputLabel
                        id="severity"
                        sx={{
                          top: '-7px',
                        }}
                      >
                        Severity
                      </InputLabel>
                      <Select
                        labelId="severity"
                        id="severity"
                        name="severity"
                        value={formik.values.severity}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        autoWidth
                        label="Severities *"
                        required
                        sx={{
                          '& .MuiSelect-select': {
                            paddingTop: '8px',
                            paddingBottom: '8px',
                          },
                        }}
                      >
                        {severities.map((item: Severity) => {
                          return (
                            <MenuItem
                              key={item.severity_id}
                              value={item.severity_id}
                              sx={{
                                minWidth: rightPanelMinWidthPx,
                              }}
                            >
                              {
                                <span
                                  style={{
                                    color: getSeverityStatusColor(
                                      item.severity_id
                                    ),
                                  }}
                                >
                                  {item.severity}
                                </span>
                              }
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                    <FieldError
                      formik={formik}
                      name="severity"
                      style={{ marginTop: '-12px' }}
                    />

                    <FormControl
                      sx={{
                        marginTop: '10px',
                        marginBottom: '3px',
                        minWidth: rightPanelMinWidthPx,
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
                          formik.setFieldValue('service', '');
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

                    {formik.values['category'] && (
                      <>
                        <FormControl
                          sx={{
                            marginTop: '10px',
                            marginBottom: '3px',
                            minWidth: rightPanelMinWidthPx,
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
                          >
                            {serviceTypes.map((item: ServiceType) => {
                              return (
                                <MenuItem
                                  key={item.service_type_id}
                                  value={item.service_type_id}
                                  sx={{
                                    minWidth: rightPanelMinWidthPx,
                                  }}
                                >
                                  {item.service_type_name}
                                </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>
                        <FieldError formik={formik} name="service" />
                      </>
                    )}

                    <FormControl
                      sx={{
                        marginTop: '-12px',
                        minWidth: rightPanelMinWidthPx,
                      }}
                    >
                      <TextField
                        margin="dense"
                        id="equipmentId"
                        name="equipmentId"
                        label="Equipment ID (optional)"
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
                        label="Contact Phone"
                        type="text"
                        variant="standard"
                        value={formik.values.contactPhoneNum}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        autoComplete={autoComplete}
                      />
                      {/* <ClarificationMessage msg="Comma separated list of Mobile Phones" /> */}
                    </FormControl>
                    <FieldError formik={formik} name="contactPhoneNum" />

                    <CcFields
                      showCcFields={showCcFields}
                      setShowCcFields={setShowCcFields}
                      formik={formik}
                      rightPanelMinWidthPx={rightPanelMinWidthPx}
                      autoComplete={autoComplete}
                    />

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
                    isValid={formik.dirty && formik.isValid}
                  />
                </div>
              </>
            </form>
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
};

export const SubmitButton = ({
  label,
  loadingText,
  isValid,
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
  let backgroundColor = '#1e197b';

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
      style={{
        color: `${letterColor}`,
        backgroundColor: `${backgroundColor}`,
      }}
    >
      {pending ? loadingText : label}
    </Button>
  );
};

const ClarificationMessage = ({ msg }: { msg: string }) => {
  return (
    <div
      style={{
        fontSize: '9px',
        color: 'rgba(0,0,0,0.4)',
      }}
    >
      {msg}
    </div>
  );
};

const CcFields = ({
  showCcFields,
  setShowCcFields,
  formik,
  rightPanelMinWidthPx,
  autoComplete,
}: any) => {
  // Function to toggle the state
  const toggleFields = () => {
    setShowCcFields(!showCcFields);
  };
  return (
    <div className="flex-col">
      <div>
        <div
          style={{
            fontSize: '12px',
            border: '1px solid rgba(0,0,0,.4)',
            color: 'rgba(0,0,0,.5)',
            textAlign: 'center',
            paddingTop: '3px',
            paddingBottom: '3px',
            cursor: 'pointer',
          }}
          onClick={toggleFields}
        >
          {showCcFields ? (
            <div className="flex justify-center items-center">
              <span>Hide Cc Fields</span>
              <RiArrowUpSLine size="20" />
            </div>
          ) : (
            <div className="flex justify-center items-center">
              <span>Show Extra Cc Fields</span>
              <RiArrowDownSLine size="20" />
            </div>
          )}
        </div>
      </div>
      {showCcFields && (
        <div>
          {/* Cc E-mails Field */}
          <FormControl sx={{ width: '100%', mb: '10px' }}>
            <TextField
              margin="dense"
              id="ccEmails"
              name="ccEmails"
              label="Cc E-mails"
              type="text"
              variant="standard"
              value={formik.values.ccEmails}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              autoComplete={autoComplete}
            />
            <ClarificationMessage msg="Comma separated list of E-mails" />
          </FormControl>
          <FieldError formik={formik} name="ccEmails" />

          {/* Cc Phones Field */}
          <FormControl sx={{ width: '100%', mb: '10px' }}>
            <TextField
              margin="dense"
              id="ccPhones"
              name="ccPhones"
              label="Cc Phones"
              type="text"
              variant="standard"
              value={formik.values.ccPhones}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              autoComplete={autoComplete}
            />
            <ClarificationMessage msg="Comma separated list of phones" />
          </FormControl>
          <FieldError formik={formik} name="ccPhones" />
        </div>
      )}
    </div>
  );
};
