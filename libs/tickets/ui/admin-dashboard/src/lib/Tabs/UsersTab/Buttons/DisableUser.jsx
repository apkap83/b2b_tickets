import React, { useTransition } from 'react';
import clsx from 'clsx';

import { FaUser } from 'react-icons/fa6';
import { FaUserSlash } from 'react-icons/fa6';

import { FaLock } from 'react-icons/fa';
import { FaUnlock } from 'react-icons/fa';
import { activeorInactiveUser } from '@b2b-tickets/admin-server-actions';

import toast from 'react-hot-toast';

export const DisableUser = ({ user }) => {
  //   const [isPending, startTransition] = useTransition();

  const handleDisableEnableUser = async () => {
    // startTransition(async () => {
    try {
      const message = await activeorInactiveUser({
        username: user.username,
      });

      if (
        message.status === 'SUCCESS_UNLOCKED' ||
        message.status === 'SUCCESS_LOCKED'
      ) {
        toast.success(
          <p className="text-center">
            {`User ${user.first_name} ${user.last_name} successfully ${
              message.status === 'SUCCESS_UNLOCKED' ? 'enabled' : 'disabled'
            }`}
          </p>
        );
      } else {
        toast.error(<p className="text-center">{message.message}</p>);
      }
    } catch (error) {
      toast.error('An unexpected error occurred.');
      console.error('Error message:', error.message);
    }
    // });
  };

  if (user.username === 'admin') return;
  return (
    <>
      <button
        className={clsx(
          'w-6 h-6  outline-none hover:scale-105 border-spacing-2 border shadow-md',
          {
            'text-green-400': user.is_active === 'y',
            'text-red-400': user.is_active === 'n',
          }
        )}
        onClick={async () => await handleDisableEnableUser()}
      >
        {user.is_active === 'y' ? (
          //   <UnLock isPending={isPending} />
          <UnLock />
        ) : (
          //   <Lock isPending={isPending} />
          <Lock />
        )}
      </button>
    </>
  );
};

const UnLock = ({ isPending }) => {
  return (
    <FaUser
      className={clsx(
        `w-full h-full`,

        { 'bg-red-500 border-2': isPending }
      )}
      data-tooltip-id="disableIcon"
    />
  );
};

const Lock = ({ isPending }) => {
  return (
    <FaUserSlash
      className={clsx(
        `w-full h-full`,

        { 'bg-green-500 border-2': isPending }
      )}
      data-tooltip-id="disableIcon"
    />
  );
};
