'use client';
import React, { useState, useEffect, useRef, useActionState } from 'react';
import { EMPTY_FORM_STATE } from '@b2b-tickets/utils';
import {
  TicketDetail,
  TicketCategory,
  ServiceType,
  WebSocketMessage,
} from '@b2b-tickets/shared-models';
import {
  getTicketCategories,
  getServicesForCategorySelected,
  setNewCategoryServiceTypeForTicket,
} from '@b2b-tickets/server-actions';
import toast from 'react-hot-toast';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';

import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useToastMessage } from '@b2b-tickets/react-hooks';
import { FieldError } from '@b2b-tickets/utils';
import { useWebSocketContext } from '@b2b-tickets/contexts';

export const ChangeCategoryPopup = ({
  ticketDetails,
  setShowCategoryDialog,
}: {
  ticketDetails: TicketDetail[];
  setShowCategoryDialog: (val: boolean) => void;
}) => {
  const ticketId = ticketDetails[0].ticket_id;
  const ticketNumber = ticketDetails[0].Ticket;

  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>(
    []
  );
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);

  const [selectedCategoryServiceTypeId, setSelectedCategoryServiceTypeId] =
    useState('');

  const [formState, action] = useActionState<any, any>(
    setNewCategoryServiceTypeForTicket,
    EMPTY_FORM_STATE
  );

  // Web Socket Connection
  const { emitEvent } = useWebSocketContext();

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
    if (formState.status === 'SUCCESS') {
      setShowCategoryDialog(false);
      emitEvent(WebSocketMessage.TICKET_ALTERED_CATEGORY_SERVICE_TYPE, {
        ticket_id: ticketDetails[0].ticket_id,
      });
    }
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
      <div className="fixed inset-0 bg-black bg-opacity-50 pointer-events-none z-10">
        <div className="fixed inset-0 flex items-center justify-center z-20 pointer-events-auto">
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

                  <div className="flex items-center justify-center py-4 gap-20 relative self-stretch w-full flex-[0_0_auto]">
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
                          formik.touched['category'] ||
                          formik.touched['service']
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
      </div>
    </>
  );
};
