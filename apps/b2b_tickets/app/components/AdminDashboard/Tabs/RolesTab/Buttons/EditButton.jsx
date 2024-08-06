import { FaPencil } from "react-icons/fa6";
import clsx from "clsx";

export const EditButton = ({ role, setShowEditRoleModal }) => {
  return (
    <button
      className="
        w-6 h-6
      text-blue-900 outline-none border-spacing-2 border shadow-md hover:scale-105"
    >
      <FaPencil
        className={clsx(
          `w-full h-full
            `
        )}
        data-tooltip-id="editIcon"
        onClick={() => {
          setShowEditRoleModal({
            visible: true,
            role: role,
          });
        }}
      />
    </button>
  );
};
