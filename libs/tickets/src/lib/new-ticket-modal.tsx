'use client';

import * as React from 'react';
import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Typography, useTheme } from '@mui/material';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import { tokens } from '@b2b-tickets/ui-theme';
import {
  getTicketCategories,
  createNewTicket,
  getTicketSeverities,
  getServicesForCategorySelected,
  buildTicketCcUsers,
} from '@b2b-tickets/server-actions';
import { getSeverityStatusColor } from '@b2b-tickets/utils';
import { useFormik } from 'formik';
import { useSession } from 'next-auth/react';
import * as yup from 'yup';
import styles from './css/new-ticket-modal.module.scss';
import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import {
  TicketCategory,
  ServiceType,
  Severity,
  WebSocketMessage,
} from '@b2b-tickets/shared-models';
import toast from 'react-hot-toast';
import { useWebSocketContext } from '@b2b-tickets/contexts';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import 'react-quill/dist/quill.snow.css';

// Constants
const AUTO_COMPLETE = 'off';
const RIGHT_PANEL_MIN_WIDTH = '320px';

// Validation Schema
const createTicketSchema = () =>
  yup.object().shape({
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
          if (!value) return false;
          const phones = value.split(',').map((phone) => phone.trim());
          const phoneRegex = /^[0-9]{10,15}$/;
          return phones.every((phone) => phoneRegex.test(phone));
        }
      ),
    ccEmails: yup
      .string()
      .test(
        'is-valid-email-list',
        'Must be a comma-separated list of valid email addresses',
        (value) => {
          if (!value) return true;
          const emails = value.split(',').map((email) => email.trim());
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emails.every((email) => emailRegex.test(email));
        }
      ),
    ccPhones: yup
      .string()
      .test(
        'is-valid-phone-list',
        'Must be a comma-separated list of valid phone numbers',
        (value) => {
          if (!value) return true;
          const phones = value.split(',').map((phone) => phone.trim());
          const phoneRegex = /^\d{10,12}$/;
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

// Types
interface NewTicketModalProps {
  closeModal: () => void;
  userId: string;
}

interface FieldErrorProps {
  formik: any;
  name: string;
  style?: React.CSSProperties;
}

interface SubmitButtonProps {
  label: string;
  loadingText: string;
  isValid: boolean;
  isSubmitting: boolean;
  onClick: () => void;
}

interface ClarificationMessageProps {
  msg: string;
}

interface CcFieldsProps {
  showCcFields: boolean;
  setShowCcFields: (show: boolean) => void;
  formik: any;
  rightPanelMinWidthPx: string;
  autoComplete: string;
}

// Utility Components
const FieldError = memo<FieldErrorProps>(({ formik, name, style }) => {
  if (!formik?.touched[name] || !formik?.errors[name]) {
    return null;
  }

  return (
    <p className="text-wrap text-red-500 text-xs -mt-2" style={style}>
      {formik.errors[name]}
    </p>
  );
});

const ClarificationMessage = memo<ClarificationMessageProps>(({ msg }) => (
  <div style={{ fontSize: '9px', color: 'rgba(0,0,0,0.4)' }}>{msg}</div>
));

const SubmitButton = memo<SubmitButtonProps>(
  ({ label, loadingText, isValid, isSubmitting, onClick }) => {
    const handleClick = useCallback(
      async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (isSubmitting) return;
        onClick();
      },
      [isSubmitting, onClick]
    );

    const buttonStyles = useMemo(
      () => ({
        color: '#ddd7d7',
        backgroundColor: isValid && !isSubmitting ? '#1e197b' : '#5b5b5d',
      }),
      [isValid, isSubmitting]
    );

    return (
      <Button
        variant="contained"
        type="button"
        className="btn btn-primary"
        disabled={!isValid || isSubmitting}
        onClick={handleClick}
        style={buttonStyles}
      >
        {isSubmitting ? loadingText : label}
      </Button>
    );
  }
);

// Custom Hooks
const useTicketData = () => {
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>(
    []
  );
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [severities, setSeverities] = useState<Severity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [severitiesResult, categoriesResult] = await Promise.all([
          getTicketSeverities(),
          getTicketCategories(),
        ]);

        if (severitiesResult.error) {
          toast.error(severitiesResult.error);
        } else {
          setSeverities(severitiesResult.data);
        }

        if (categoriesResult.error) {
          toast.error(categoriesResult.error);
        } else {
          setTicketCategories(categoriesResult.data);
        }
      } catch (error) {
        toast.error('Failed to load ticket data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  return {
    ticketCategories,
    serviceTypes,
    setServiceTypes,
    severities,
    loading,
  };
};

const useServiceTypes = (categoryId: string) => {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);

  useEffect(() => {
    if (!categoryId) {
      setServiceTypes([]);
      return;
    }

    const loadServices = async () => {
      try {
        const result = await getServicesForCategorySelected({
          category_id: categoryId,
        });
        if (result.error) {
          toast.error(result.error);
        } else {
          setServiceTypes(result.data);
        }
      } catch (error) {
        toast.error('Failed to load services');
      }
    };

    loadServices();
  }, [categoryId]);

  return serviceTypes;
};

// Sub-components
const CcFields = memo<CcFieldsProps>(
  ({
    showCcFields,
    setShowCcFields,
    formik,
    rightPanelMinWidthPx,
    autoComplete,
  }) => {
    const { data: session } = useSession();
    const userId = String(session?.user.user_id!);

    const toggleFields = useCallback(() => {
      setShowCcFields(!showCcFields);
    }, [showCcFields, setShowCcFields]);

    const headerStyle: React.CSSProperties = useMemo(
      () => ({
        fontSize: '12px',
        border: '1px solid rgba(0,0,0,.4)',
        color: 'rgba(0,0,0,.5)',
        textAlign: 'center',
        paddingTop: '3px',
        paddingBottom: '3px',
        cursor: 'pointer',
      }),
      []
    );

    const handleCcCompanyClick = useCallback(async () => {
      try {
        const { data } = await buildTicketCcUsers({ userId });
        if (data) {
          formik.setFieldValue('ccEmails', data.build_ticket_cc_users);
        }
      } catch (error) {
        toast.error('Failed to load CC users');
      }
    }, [userId, formik]);

    return (
      <div className="flex-col">
        <div style={headerStyle} onClick={toggleFields}>
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
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            showCcFields ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="max-w-[320px] pt-1">
            <FormControl sx={{ width: '100%', mb: '10px' }}>
              <div className="flex justify-center items-center">
                <TextField
                  sx={{ flexGrow: '1' }}
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
                <button
                  type="button"
                  onClick={handleCcCompanyClick}
                  data-tooltip-id="cc-company-tooltip"
                  data-tooltip-content="Add Your company colleagues"
                  className="ml-3 bg-[#23599a] hover:bg-[#307bd7] active:bg-[#1e4f87] rounded shadow-md active:shadow-sm transition-all duration-150 cursor-pointer text-white flex items-center justify-center text-center leading-tight h-11 whitespace-pre-wrap w-[60px] active:translate-y-[1px] active:scale-[0.98] text-[12px]"
                >
                  CC Company
                </button>
                <ReactTooltip id="cc-company-tooltip" />
              </div>
              <ClarificationMessage msg="Comma separated list of E-mails" />
            </FormControl>
            <FieldError formik={formik} name="ccEmails" />

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
        </div>
      </div>
    );
  }
);

// Main Component
export const NewTicketModal = memo<NewTicketModalProps>(
  ({ closeModal, userId }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { data: session } = useSession();
    const { emitEvent } = useWebSocketContext();

    const [showCcFields, setShowCcFields] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const { ticketCategories, severities, loading } = useTicketData();
    const serviceTypes = useServiceTypes(selectedCategory);

    const ticketSchema = useMemo(() => createTicketSchema(), []);

    const getInitialValues = useCallback(
      () => ({
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
      }),
      [session]
    );

    const formik = useFormik({
      initialValues: getInitialValues(),
      validateOnMount: true,
      validationSchema: ticketSchema,
      onSubmit: async (values, { setSubmitting, setFieldError }) => {
        try {
          setSubmitting(true);

          const formData = new FormData();
          Object.entries(values).forEach(([key, value]) => {
            formData.append(key, String(value || ''));
          });

          const result = await createNewTicket(null, formData);

          if (result.status === 'SUCCESS') {
            const ticket_id = result.extraData;
            emitEvent(WebSocketMessage.NEW_TICKET_CREATED, { ticket_id });
            toast.success('Ticket created successfully!');
            closeModal();
          } else if (result.status === 'ERROR') {
            if (result.fieldErrors) {
              Object.entries(result.fieldErrors).forEach(([field, error]) => {
                setFieldError(field, error as string);
              });
            } else {
              toast.error(result.message || 'Failed to create ticket');
            }
          }
        } catch (error) {
          console.error('Error submitting form:', error);
          toast.error('An unexpected error occurred');
        } finally {
          setSubmitting(false);
        }
      },
    });

    const handleClose = useCallback(() => {
      closeModal();
    }, [closeModal]);

    const handleCategoryChange = useCallback(
      (event: any) => {
        const categoryValue = event.target.value;
        setSelectedCategory(categoryValue);
        formik.handleChange(event);
        formik.setFieldValue('service', '');
      },
      [formik]
    );

    const handleDateChange = useCallback(
      (value: any) => {
        if (value && dayjs(value).isValid()) {
          formik.setFieldValue('occurrenceDate', value.toISOString());
        }
      },
      [formik]
    );

    if (loading) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-65 z-10">
          <div className="text-white">Loading...</div>
        </div>
      );
    }

    return (
      <div
        className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-65 z-10 pointer-events-none`}
      >
        <div className="fixed inset-0 flex items-center justify-center z-20 pointer-events-auto">
          <div
            className={`pt-[1.3rem] pb-[1.3rem] px-[2rem] rounded-lg max-h-[95vh] overflow-hidden bg-gray-50 pointer-events-auto overflow-y-auto`}
          >
            <form autoComplete="off" className={styles.formContainer}>
              <Typography
                variant="h3"
                textAlign="left"
                mb="1.3rem"
                className="bg-gradient-to-r from-[#0f0b58] to-[rgba(55,55,66,0)] font-thin tracking-widest rounded-md py-2 text-gray-300 pl-3"
              >
                Create New Ticket
              </Typography>

              <div className={styles.fieldsMainContainer}>
                {/* Left Panel - Main Fields */}
                <div
                  className="flex-grow px-[1rem] pb-[1.5rem] overflow-x-hidden bg-white rounded-md border border-gray-200 shadow-lg"
                  style={{
                    border: `1px solid ${colors.blueAccent[900]}`,
                    backgroundColor: colors.grey[900],
                  }}
                >
                  <div className="p-1 flex flex-col gap-3 pt-3">
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
                        autoComplete={AUTO_COMPLETE}
                      />
                    </FormControl>
                    <FieldError formik={formik} name="title" />

                    <FormControl
                      sx={{
                        mt: '.5rem',
                        border: `1px solid ${colors.grey[700]}`,
                        padding: '10px',
                        outline: 'none',
                        '& > textarea': { outline: 'none' },
                      }}
                    >
                      {/* <TextArea */}
                      <TextareaAutosize
                        id="description"
                        name="description"
                        placeholder="Description..."
                        required
                        value={formik.values.description}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        style={{
                          backgroundColor: colors.grey[900],
                          color: colors.grey[100],
                          minHeight: '275px',
                        }}
                      />
                    </FormControl>
                    <FieldError formik={formik} name="description" />

                    {/* Four Fields Section */}
                    <Box
                      mt=".5rem"
                      mb=".5rem"
                      border={`1px dashed ${colors.blueAccent[800]}`}
                      p=".5rem"
                    >
                      <Typography
                        fontWeight="400"
                        fontSize="12.7143px"
                        color="rgba(0,0,0,.6)"
                      >
                        Please provide information for at least one field below
                      </Typography>
                      <Box>
                        <FormControl
                          className={styles.fourFieldsContainer}
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
                            autoComplete={AUTO_COMPLETE}
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
                            autoComplete={AUTO_COMPLETE}
                          />
                        </FormControl>
                        <FormControl
                          className={styles.fourFieldsContainer}
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
                            autoComplete={AUTO_COMPLETE}
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
                            autoComplete={AUTO_COMPLETE}
                          />
                        </FormControl>
                        <FieldError
                          formik={formik}
                          name="cliValue"
                          style={{ marginTop: '0px' }}
                        />
                      </Box>
                    </Box>
                  </div>
                </div>

                {/* Right Panel - Dropdown Fields */}
                <div
                  className="flex flex-col gap-1 bg-black rounded-md px-2 pt-3 pb-2 shadow-lg"
                  style={{
                    border: `1px solid ${colors.blueAccent[900]}`,
                    backgroundColor: colors.grey[900],
                  }}
                >
                  {/* Severity Select */}
                  <FormControl
                    sx={{
                      marginTop: '8px',
                      marginBottom: '8px',
                      minWidth: RIGHT_PANEL_MIN_WIDTH,
                    }}
                  >
                    <InputLabel id="severity" sx={{ top: '-7px' }}>
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
                      {severities.map((item: Severity) => (
                        <MenuItem
                          key={item.severity_id}
                          value={item.severity_id}
                          sx={{ minWidth: RIGHT_PANEL_MIN_WIDTH }}
                        >
                          <span
                            style={{
                              color: getSeverityStatusColor(item.severity_id),
                            }}
                          >
                            {item.severity}
                          </span>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FieldError
                    formik={formik}
                    name="severity"
                    style={{ marginTop: '-12px' }}
                  />

                  {/* Category Select */}
                  <FormControl
                    sx={{
                      marginTop: '10px',
                      marginBottom: '3px',
                      minWidth: RIGHT_PANEL_MIN_WIDTH,
                    }}
                  >
                    <InputLabel id="category" sx={{ top: '-7px' }}>
                      Category
                    </InputLabel>
                    <Select
                      labelId="category"
                      id="category"
                      name="category"
                      value={formik.values.category}
                      onChange={handleCategoryChange}
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
                      {ticketCategories.map((item) => (
                        <MenuItem
                          key={item.category_id}
                          value={item.category_id}
                          sx={{ minWidth: RIGHT_PANEL_MIN_WIDTH }}
                        >
                          {item.Category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FieldError formik={formik} name="category" />

                  {/* Service Type Select */}
                  {selectedCategory && (
                    <>
                      <FormControl
                        sx={{
                          marginTop: '10px',
                          marginBottom: '3px',
                          minWidth: RIGHT_PANEL_MIN_WIDTH,
                        }}
                      >
                        <InputLabel id="service" sx={{ top: '-7px' }}>
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
                          {serviceTypes.map((item: ServiceType) => (
                            <MenuItem
                              key={item.service_type_id}
                              value={item.service_type_id}
                              sx={{ minWidth: RIGHT_PANEL_MIN_WIDTH }}
                            >
                              {item.service_type_name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FieldError formik={formik} name="service" />
                    </>
                  )}

                  {/* Equipment ID */}
                  <FormControl
                    sx={{ marginTop: '-12px', minWidth: RIGHT_PANEL_MIN_WIDTH }}
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
                      autoComplete={AUTO_COMPLETE}
                    />
                  </FormControl>
                  <FieldError formik={formik} name="equipmentId" />

                  {/* Contact Person */}
                  <FormControl sx={{ minWidth: RIGHT_PANEL_MIN_WIDTH }}>
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
                      autoComplete={AUTO_COMPLETE}
                    />
                  </FormControl>
                  <FieldError formik={formik} name="contactPerson" />

                  {/* Contact Phone */}
                  <FormControl sx={{ minWidth: RIGHT_PANEL_MIN_WIDTH }}>
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
                      autoComplete={AUTO_COMPLETE}
                    />
                  </FormControl>
                  <FieldError formik={formik} name="contactPhoneNum" />

                  {/* CC Fields */}
                  <CcFields
                    showCcFields={showCcFields}
                    setShowCcFields={setShowCcFields}
                    formik={formik}
                    rightPanelMinWidthPx={RIGHT_PANEL_MIN_WIDTH}
                    autoComplete={AUTO_COMPLETE}
                  />

                  {/* Date Picker */}
                  <FormControl sx={{ mt: '.5rem' }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <span
                        style={{
                          color: 'rgba(0,0,0,.6)',
                          fontSize: '11.7143px',
                          fontWeight: '400',
                        }}
                      >
                        Occurrence Date *
                      </span>
                      <DateTimePicker
                        name="occurrenceDate"
                        value={dayjs(formik.values.occurrenceDate)}
                        onChange={handleDateChange}
                        format="DD/MM/YYYY hh:mm A"
                      />
                    </LocalizationProvider>
                  </FormControl>
                  <FieldError formik={formik} name="occurrenceDate" />
                </div>
              </div>

              {/* Action Buttons */}
              <div
                className={`${styles.buttonsDiv} flex justify-evenly mt-[1.3rem]`}
              >
                <Button
                  onClick={handleClose}
                  variant="outlined"
                  style={{
                    color: colors.grey[500],
                    border: `1px solid ${colors.grey[500]}`,
                  }}
                >
                  Cancel
                </Button>
                <SubmitButton
                  label="Submit Ticket"
                  loadingText="Creating..."
                  isValid={formik.dirty && formik.isValid}
                  isSubmitting={formik.isSubmitting}
                  onClick={formik.handleSubmit}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
);
