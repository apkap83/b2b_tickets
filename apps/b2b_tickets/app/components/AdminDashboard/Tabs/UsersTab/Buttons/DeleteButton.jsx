import { RiDeleteBin5Fill } from "react-icons/ri";
import clsx from "clsx";

export const DeleteButton = ({ user, setShowDeleteUserModal }) => {
  if (user.userName === "admin") return;
  return (
    <button className="w-6 h-6 text-red-900 outline-none hover:scale-105 border-spacing-2 border shadow-md">
      <RiDeleteBin5Fill
        className={clsx(`w-full h-full`)}
        data-tooltip-id="deleteIcon"
        onClick={() => {
          setShowDeleteUserModal({
            visible: true,
            userDetails: {
              firstName: user.firstName,
              lastName: user.lastName,
              userName: user.userName,
            },
          });
        }}
      />
    </button>
  );
};
