import React, { useState, useEffect, useRef } from 'react';
import { useFormState } from 'react-dom';

import { useFormik } from 'formik';
import * as Yup from 'yup';
import { faker } from '@faker-js/faker';
import { FaMobileRetro } from 'react-icons/fa6';
import { CgNametag } from 'react-icons/cg';
import { FaKey } from 'react-icons/fa';

import { useToastMessage } from '@b2b-tickets/react-hooks';
import { FieldError } from '@b2b-tickets/tickets/ui/admin-dashboard';

import { EMPTY_FORM_STATE } from '@b2b-tickets/utils';
import { SubmitButton } from '../../common/SubmitButton';
import { CancelButton } from '../../common/CancelButton';

import { IoListCircle } from 'react-icons/io5';
import {
  createUser,
  getCustomersList,
} from '@b2b-tickets/admin-server-actions';
import { FormStateError } from '@b2b-tickets/tickets/ui/admin-dashboard';
import { passwordComplexitySchema } from '@b2b-tickets/utils';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import BusinessIcon from '@mui/icons-material/Business';
import { GiRank3 } from 'react-icons/gi';
import Select from 'react-select';

import { config } from '@b2b-tickets/config';

import styles from './CreateUserModal.module.scss';

function CreateUserModal({ rolesList, closeModal }) {
  const [loading, setLoading] = useState(false);
  const [customersList, setCustomersList] = useState([]);
  const [formState, action] = useFormState(createUser, EMPTY_FORM_STATE);

  const userRoleRef = useRef();

  const [roles, setRoles] = useState(rolesList);

  const noScriptFallback = useToastMessage(formState);

  const checkIfUserHasRole = (user, role) => {
    if (!userDetails.hasOwnProperty('AppRoles')) return false;

    for (let i = 0; i < user.AppRoles.length; i++) {
      if (role.id === userDetails.AppRoles[i].id) {
        return true;
      }
    }
    return false;
  };

  const validationSchema = Yup.object({
    // company: Yup.object().required('Company is required'),
    // role: Yup.object().required('Role is required'),

    company: Yup.object({
      value: Yup.string().required('Company value is required'),
      label: Yup.string().required('Company label is required'),
      isDisabled: Yup.boolean(),
    }).required('Company is required'),

    role: Yup.object({
      value: Yup.string().required('Role value is required'),
      label: Yup.string().required('Role label is required'),
      isDisabled: Yup.boolean(),
    }),

    first_name: Yup.string().required('First name is required'),
    last_name: Yup.string().required('Last name is required'),
    // username: Yup.string().required('User name is required'),
    // password: passwordComplexitySchema,
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    mobile_phone: Yup.string(),
    inform_user_for_new_account_by_email: Yup.boolean(),
  });

  const formik = useFormik({
    initialValues: {
      company: '',

      // Fake Values
      // first_name: faker.person.firstName(),
      // last_name: faker.person.lastName(),
      // username: faker.internet.userName(),
      // password: faker.internet.password(),
      // email: faker.internet.email(),
      // mobile_phone: faker.phone.number(),

      // Empty Values
      first_name: '',
      last_name: '',
      // username: '',
      // password: '',
      email: '',
      mobile_phone: '',
      role: '',
      inform_user_for_new_account_by_email: false,
    },
    validationSchema: validationSchema,
    // onSubmit: async (values, { setSubmitting }) => {},
  });

  useEffect(() => {
    if (formState.status === 'SUCCESS') closeModal();
  }, [formState.status, formState.timestamp]);

  useEffect(() => {
    const getCustList = async () => {
      const customerList = await getCustomersList();

      setTimeout(() => {
        setCustomersList(customerList);
        setLoading(false);
      }, 850);
    };

    setLoading(true);
    getCustList();
  }, []);

  // Update Available Roles Based on Company Selection
  useEffect(() => {
    // When formik.values.company is updated the Roles Select value is set to null to force the user to re-select the Role
    if (userRoleRef && userRoleRef.current) {
      userRoleRef.current.clearValue();
    }

    // If it is not "Nova" Company
    if (
      formik.values.company.value ===
      String(config.databaseIDOfTicketingSystemCompany)
    ) {
      setRoles(rolesList);
    } else {
      setRoles((prev) =>
        prev.filter((role) => role.roleName === 'B2B Ticket Creator')
      );
    }

    // Reset Role when Company is Updated
    formik.setFieldValue('role', null);
  }, [formik.values.company]);

  const customersSelectOptions = [
    ...customersList.map((item) => ({
      value: item.customer_id,
      label: item.customer_display_name,
      isDisabled: false,
    })),
  ];

  let rolesSelectOptions = [
    ...roles.map((role) => ({
      value: role.id,
      label: role.roleName,
      isDisabled: false,
    })),
  ];
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
      <div className="max-w-[695px] bg-white px-10 py-5 rounded-lg max-h-[80vh] overflow-y-auto">
        {loading ? (
          <Box className="flex flex-col gap-3 justify-center items-center">
            <CircularProgress />
            <p className="text-gray-500">Loading...</p>
          </Box>
        ) : (
          <>
            <h3 className="font-bold text-2xl text-center mb-2">
              Create User Form
            </h3>
            <form
              className="flex flex-col gap-2 pt-3 md:min-w-[500px]"
              action={action}
            >
              <div className="space-y-1.5">
                <label htmlFor="company" className={styles.inputDescription}>
                  Company Name
                </label>
                <div className="relative">
                  {/* Select with padding to make room for icon */}
                  <Select
                    id="company"
                    name="company"
                    value={customersSelectOptions.find(
                      (option) => option === formik.values.company
                    )}
                    onChange={(option) => {
                      formik.setFieldValue('company', option);
                    }}
                    onBlur={formik.handleBlur}
                    options={customersSelectOptions}
                    placeholder="Select Company"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        paddingLeft: '1.6rem',
                        borderColor: state.isFocused ? '#57575f' : '#d1d5db',
                        boxShadow: state.isFocused
                          ? '0 0 0 1px #57575f'
                          : 'none',
                        '&:hover': {
                          borderColor: '#9b9ba5',
                        },
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: '#9ca3af',
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected
                          ? '#57575f'
                          : state.isFocused
                          ? '#e5e5e7'
                          : 'white',
                        color: state.isSelected ? 'white' : '#374151',
                        cursor: 'pointer',
                        '&:active': {
                          backgroundColor: '#57575f',
                        },
                      }),
                      menu: (base) => ({
                        ...base,
                        borderRadius: '0.5rem',
                        marginTop: '4px',
                        boxShadow:
                          '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      }),
                    }}
                  />
                  {/* Icon positioned absolutely */}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none pr-1">
                    <BusinessIcon fontSize="medium" className="text-gray-500" />
                  </div>
                </div>
              </div>
              <FieldError formik={formik} name="company" />

              <div className="space-y-1.5">
                <label htmlFor="role" className={styles.inputDescription}>
                  App Role
                </label>
                <div className="relative">
                  {/* Select with padding to make room for icon */}
                  <Select
                    id="role"
                    name="role"
                    ref={userRoleRef}
                    value={rolesSelectOptions.find(
                      (option) => option === formik.values.role
                    )}
                    onChange={(option) => formik.setFieldValue('role', option)}
                    onBlur={formik.handleBlur}
                    options={rolesSelectOptions}
                    placeholder="Select Role"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        paddingLeft: '1.6rem', // Make room for icon
                        borderColor: state.isFocused ? '#57575f' : '#d1d5db',
                        boxShadow: state.isFocused
                          ? '0 0 0 1px #57575f'
                          : 'none',
                        '&:hover': {
                          borderColor: '#9b9ba5',
                        },
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: '#9ca3af',
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected
                          ? '#57575f'
                          : state.isFocused
                          ? '#e5e5e7'
                          : 'white',
                        color: state.isSelected ? 'white' : '#374151',
                        cursor: 'pointer',
                        '&:active': {
                          backgroundColor: '#57575f',
                        },
                      }),
                      menu: (base) => ({
                        ...base,
                        borderRadius: '0.5rem',
                        marginTop: '4px',
                        boxShadow:
                          '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      }),
                    }}
                  />
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <GiRank3 size={22} className="text-gray-500" />
                  </div>
                </div>
              </div>
              <FieldError formik={formik} name="role" />

              <div className="space-y-1.5">
                <label className={styles.inputDescription} htmlFor="first_name">
                  First Name
                </label>
                <div
                  className={`${styles.inputControl} input input-bordered flex items-center gap-2`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-4 h-4 opacity-70"
                  >
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                  </svg>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    value={formik.values.first_name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="grow"
                  />
                </div>
              </div>
              <FieldError formik={formik} name="first_name" />

              <div className="space-y-1.5">
                <label htmlFor="last_name" className={styles.inputDescription}>
                  Last Name
                </label>
                <div
                  className={`${styles.inputControl} input input-bordered flex items-center gap-2`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-4 h-4 opacity-70"
                  >
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                  </svg>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    value={formik.values.last_name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="grow"
                  />
                </div>
              </div>
              <FieldError formik={formik} name="last_name" />

              <div className="space-y-1.5">
                <label className={styles.inputDescription}>E-mail</label>
                <div
                  className={`${styles.inputControl} input input-bordered flex items-center gap-2`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-4 h-4 opacity-70"
                  >
                    <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
                    <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
                  </svg>
                  <input
                    type="text"
                    name="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="grow"
                  />
                </div>
              </div>
              <FieldError formik={formik} name="email" />

              <div className="space-y-1.5">
                <label className={styles.inputDescription}>
                  Mobile Phone (optional)
                </label>
                <div
                  className={`${styles.inputControl} input input-bordered flex items-center gap-2`}
                >
                  <FaMobileRetro className="w-4 h-4 opacity-70" />

                  <input
                    type="text"
                    name="mobile_phone"
                    value={formik.values.mobile_phone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="grow"
                  />
                </div>
              </div>
              <FieldError formik={formik} name="mobile_phone" />

              <div className="flex items-center mt-3 gap-2 ml-1">
                <input
                  id="inform_user_for_new_account_by_email"
                  type="checkbox"
                  name="inform_user_for_new_account_by_email"
                  value={formik.values.inform_user_for_new_account_by_email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="h-5 w-5 rounded border-gray-300 accent-black cursor-pointer"
                />

                <label
                  className="text-sm"
                  htmlFor="inform_user_for_new_account_by_email"
                >
                  Inform User by Email
                </label>
              </div>
              <FieldError formik={formik} name="mobile_phone" />

              <div
                className="flex my-3 items-end space-x-1"
                aria-live="polite"
                aria-atomic="true"
              >
                <FormStateError formState={formState} />
              </div>
              <div className="mt-1 mb-2 flex justify-around">
                <SubmitButton
                  label="Create User"
                  loading="Creating ..."
                  isValid={formik.dirty && formik.isValid}
                />

                <CancelButton onClick={closeModal} />

                {noScriptFallback}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default CreateUserModal;
