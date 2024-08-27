import React, { useTransition } from 'react';
import clsx from 'clsx';

import { FaLock } from 'react-icons/fa';
import { FaUnlock } from 'react-icons/fa';
import { lockorUnlockUser } from '@b2b-tickets/admin-server-actions';

import toast from 'react-hot-toast';

export const LockOrUnlock = ({ user }) => {
  //   const [isPending, startTransition] = useTransition();

  const handleLockOrUnlock = async () => {
    // startTransition(async () => {
    try {
      const message = await lockorUnlockUser({
        userName: user.userName,
      });

      if (
        message.status === 'SUCCESS_UNLOCKED' ||
        message.status === 'SUCCESS_LOCKED'
      ) {
        toast.success(
          <p className="text-center">
            {`User ${user.firstName} ${user.lastName} successfully ${
              message.status === 'SUCCESS_UNLOCKED' ? 'unlocked' : 'locked'
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

  if (user.userName === 'admin') return;

  return (
    <>
      <button
        className={clsx(
          'w-6 h-6  outline-none hover:scale-105 border-spacing-2 border shadow-md',
          {
            'text-green-400': user.active,
            'text-red-400': !user.active,
          }
        )}
        onClick={async () => await handleLockOrUnlock()}
      >
        {user.active ? (
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
    <FaUnlock
      className={clsx(
        `w-full h-full`,

        { 'bg-red-500 border-2': isPending }
      )}
      data-tooltip-id="lockIcon"
    />
  );
};

const Lock = ({ isPending }) => {
  return (
    <FaLock
      className={clsx(
        `w-full h-full`,

        { 'bg-green-500 border-2': isPending }
      )}
      data-tooltip-id="lockIcon"
    />
  );
};
