'use client';
import React, { useState } from 'react';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PasswordResetModal } from '@b2b-tickets/tickets/ui/admin-dashboard';
import { AuthenticationTypes } from '@b2b-tickets/shared-models';
import { FaUserLarge } from 'react-icons/fa6';

const MyProfile = () => {
  const [showPasswordResetModal, setShowPasswordResetModal] = useState({
    visible: false,
  });
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/api/auth/signin?callbackUrl=/profile');
    },
  });

  const userDetails = {
    firstName: session?.user.firstName,
    lastName: session?.user.lastName,
    userName: session?.user.userName,
    authenticationType: session?.user.authenticationType,
  };

  return (
    <div className="absolute inset-0 flex justify-center items-center -translate-y-5 bg-black bg-opacity-50">
      <div className="card lg:card-side bg-base-100 shadow-xl w-[550px] p-10">
        <figure className="w-1/3 m-3">
          <FaUserLarge />
        </figure>
        <div className="card-body py-1">
          <h2 className="card-title text-center">Profile Details</h2>
          <label className="inline">
            First Name: &nbsp;<span>{session?.user.firstName}</span>
          </label>
          <label className="inline">
            Last Name: &nbsp;<span>{session?.user.lastName}</span>
          </label>
          <label className="inline">
            User Name: &nbsp;<span>{session?.user.userName}</span>
          </label>
          <label className="inline">
            Account Type: &nbsp;<span>{session?.user.authenticationType}</span>
          </label>

          <ProfilePageButtons
            setShowPasswordResetModal={setShowPasswordResetModal}
            userDetails={userDetails}
          />
        </div>
      </div>
      {showPasswordResetModal.visible ? (
        <PasswordResetModal
          userDetails={showPasswordResetModal.userDetails}
          closeModal={() => setShowPasswordResetModal(false)}
        />
      ) : null}
    </div>
  );
};

const ProfilePageButtons = ({ setShowPasswordResetModal, userDetails }) => {
  const CloseButton = () => (
    <Link className="btn btn-tertiary" href="/">
      Close
    </Link>
  );

  const PasswordResetButton = () => (
    <button
      className="btn btn-primary"
      onClick={() => setShowPasswordResetModal({ visible: true, userDetails })}
    >
      Reset Password
    </button>
  );
  if (userDetails.authenticationType === AuthenticationTypes.LDAP)
    return (
      <div className="mt-3">
        <CloseButton />
      </div>
    );
  if (userDetails.authenticationType === AuthenticationTypes.LOCAL) {
    return (
      <div className="flex gap-3 pt-4">
        <PasswordResetButton />
        <CloseButton />
      </div>
    );
  }
};

export default MyProfile;
