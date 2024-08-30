import clsx from 'clsx';
import { FaKey } from 'react-icons/fa6';

export const PasswordChangeButton = ({ user, setShowPasswordResetModal }) => {
  return (
    <button
      className="
        w-6 h-6
      text-purple-400 outline-none border-spacing-2 border shadow-md hover:scale-105"
    >
      <FaKey
        className={clsx(
          `w-full h-full
            `
        )}
        data-tooltip-id="passwordChangeIcon"
        onClick={() => {
          setShowPasswordResetModal({
            visible: true,
            userDetails: {
              firstName: user.first_name,
              lastName: user.last_name,
              userName: user.username,
              email: user.email,
              mobilePhone: user.mobile_phone,
            },
          });
        }}
      />
    </button>
  );
};
