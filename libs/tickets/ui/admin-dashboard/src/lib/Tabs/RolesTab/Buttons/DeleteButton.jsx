import { RiDeleteBin5Fill } from "react-icons/ri";
import clsx from "clsx";

export const DeleteButton = ({ role, setShowDeleteRoleModal }) => {
  return (
    <button className="w-6 h-6 text-red-900 outline-none hover:scale-105 border-spacing-2 border shadow-md">
      <RiDeleteBin5Fill
        className={clsx(`w-full h-full`)}
        data-tooltip-id="deleteIcon"
        onClick={() => {
          setShowDeleteRoleModal({
            visible: true,
            role,
          });
        }}
      />
    </button>
  );
};
