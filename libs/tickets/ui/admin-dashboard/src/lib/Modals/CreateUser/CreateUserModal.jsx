import React, { useState, useEffect } from 'react';
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

import {
  createUser,
  getCustomersList,
} from '@b2b-tickets/admin-server-actions';
import { FormStateError } from '@b2b-tickets/tickets/ui/admin-dashboard';

function CreateUserModal({ closeModal }) {
  const [customersList, setCustomersList] = useState([]);
  const [formState, action] = useFormState(createUser, EMPTY_FORM_STATE);

  const noScriptFallback = useToastMessage(formState);
  const formik = useFormik({
    initialValues: {
      company: '',
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      username: faker.internet.userName(),
      password: faker.internet.password(),
      email: faker.internet.email(),
      mobile_phone: faker.phone.number(),
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
      console.log('customerList', customerList);

      setCustomersList(customerList);
    };

    getCustList();
  }, []);

  console.log('Formik errors', formik?.errors);
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white px-8 py-3 rounded-lg">
        <h3 className="font-bold text-lg text-center">Create User Form</h3>

        <form className="flex flex-col gap-3 pt-3" action={action}>
          <select
            name="company"
            className="text-left select max-w-xs"
            value={formik.values.company}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          >
            <option value="" disabled hidden>
              Company
            </option>
            {customersList.map((item) => {
              return (
                <option key={item.customer_id} value={item.customer_id}>
                  {item.customer_name}
                </option>
              );
            })}
          </select>
          <FieldError formik={formik} name="company" />

          <label className="input input-bordered flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-4 h-4 opacity-70"
            >
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
            </svg>
            <input
              type="text"
              name="first_name"
              value={formik.values.first_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="grow"
              placeholder="First Name"
            />
          </label>
          <FieldError formik={formik} name="first_name" />

          <label className="input input-bordered flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-4 h-4 opacity-70"
            >
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
            </svg>
            <input
              type="text"
              name="last_name"
              value={formik.values.last_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="grow"
              placeholder="Last Name"
            />
          </label>
          <FieldError formik={formik} name="last_name" />

          <label className="input input-bordered flex items-center gap-2">
            <CgNametag className="w-4 h-4 opacity-70" />
            <input
              type="text"
              name="username"
              value={formik.values.username}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="grow"
              placeholder="User Name"
            />
          </label>
          <FieldError formik={formik} name="username" />

          <label className="input input-bordered flex items-center gap-2">
            <FaKey className="w-4 h-4 opacity-70" />
            <input
              type="password"
              name="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="grow"
              placeholder="Password"
            />
          </label>
          <FieldError formik={formik} name="password" />

          <label className="input input-bordered flex items-center gap-2">
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
              placeholder="Email"
            />
          </label>
          <FieldError formik={formik} name="email" />

          <label className="input input-bordered flex items-center gap-2">
            <FaMobileRetro className="w-4 h-4 opacity-70" />

            <input
              type="text"
              name="mobile_phone"
              value={formik.values.mobile_phone}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="grow"
              placeholder="Mobile Phone"
            />
          </label>

          <FieldError formik={formik} name="mobile_phone" />

          <div
            className="flex h-8 items-end space-x-1"
            aria-live="polite"
            aria-atomic="true"
          >
            <FormStateError formState={formState} />
          </div>
          <div className="mt-5 flex justify-around">
            <SubmitButton
              label="Create"
              loading="Creating ..."
              isValid={formik.isValid}
              isDirty={formik.dirty}
            />

            <button className="btn btn-" onClick={closeModal}>
              Close
            </button>

            {noScriptFallback}
          </div>
        </form>
      </div>
    </div>
  );
}

const validationSchema = Yup.object({
  company: Yup.string().min(1, '').required('Company is required'),
  first_name: Yup.string().required('First name is required'),
  last_name: Yup.string().required('Last name is required'),
  username: Yup.string().required('User name is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters long')
    .required('Password is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  mobile_phone: Yup.string()
    // .matches(/^\d{10}$/, "Mobile phone must be 10 digits")
    .required('Mobile phone is required'),
});

export default CreateUserModal;
