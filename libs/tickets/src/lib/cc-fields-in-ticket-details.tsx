import { useState, useEffect } from 'react';
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCloseLine,
  RiAddLine,
  RiDeleteBinLine,
} from 'react-icons/ri';
import {
  buildTicketCcUsers,
  getCcValuesForTicket,
  updateCcUsers,
} from '@b2b-tickets/server-actions';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { isValidEmail } from '@b2b-tickets/utils';
import Tooltip from '@mui/material/Tooltip';

// Type definitions
interface CcFieldsProps {
  ticketId: string;
  isFinalStatus: boolean;
}

interface CcValuesResponse {
  data?: {
    ccEmails?: string;
    ccPhones?: string;
  };
  error?: string;
}

interface UpdateCcEmailsParams {
  ticketId: string;
  ccEmails: string;
}

interface UpdateCcEmailsResponse {
  success: boolean;
  error?: string;
}

const detailsRowClass: string =
  'w-full justify-center items-center gap-2.5 inline-flex text-md';

const detailsRowHeaderClass: string =
  "grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] ";

export const CcFields: React.FC<CcFieldsProps> = ({
  ticketId,
  isFinalStatus,
}) => {
  const [showCcFields, setShowCcFields] = useState<boolean>(false);
  const [showEmailPopup, setShowEmailPopup] = useState<boolean>(false);

  const [ccEmails, setCcEmails] = useState<string>('');
  const [ccPhones, setCcPhones] = useState<string>('');
  const [editableEmails, setEditableEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState<string>('');
  const [saveButtonMessage, setSaveButtonMessage] =
    useState<string>('Save Changes');
  const { data: session, status } = useSession();

  const [ccCompanyButtonText, setCcCompanyButtonText] =
    useState<string>('CC Company');
  useEffect(() => {
    const getCcValues = async (): Promise<void> => {
      try {
        const res: CcValuesResponse = await getCcValuesForTicket({ ticketId });
        setCcEmails(res.data?.ccEmails || '');
        setCcPhones(res.data?.ccPhones || '');

        if (res.data?.ccEmails && res.data.ccEmails.length > 0) {
          setShowCcFields(true);
        }
      } catch (error) {
        console.error('Failed to get CC values:', error);
      }
    };

    getCcValues();
  }, [ticketId]);

  const saveEmails = async (): Promise<void> => {
    setSaveButtonMessage('Saving...');
    const emailString: string = editableEmails.join(', ');

    // Call your server action to update the emails
    try {
      const resp = await updateCcUsers({ ticketId, ccEmails });

      if (resp.status === 'SUCCESS') {
        setCcEmails(emailString);
        toast.success(resp.message);
        closeEmailPopup();
        setSaveButtonMessage('Save Changes');
      } else {
        toast.error(resp.message);
      }
    } catch (error) {
      toast.error('Failed to update emails');
    }
  };

  const toggleFields = (): void => {
    setShowCcFields(!showCcFields);
  };

  const openEmailPopup = (): void => {
    // Parse current emails into array
    const emailArray: string[] =
      ccEmails && ccEmails.length > 0
        ? ccEmails
            .split(',')
            .map((email: string) => email.trim())
            .filter((email: string) => email)
        : [];
    setEditableEmails(emailArray);
    setShowEmailPopup(true);
  };

  const closeEmailPopup = (): void => {
    setShowEmailPopup(false);
    setNewEmail('');
  };

  const addEmail = (): void => {
    if (
      newEmail.trim() &&
      isValidEmail(newEmail) &&
      !editableEmails.includes(newEmail.trim())
    ) {
      setEditableEmails([newEmail.trim(), ...editableEmails]);
      setNewEmail('');
    }
  };

  const addAllCompanyEmails = async () => {
    setCcCompanyButtonText('Getting Info...');
    const user_id = String(session?.user.user_id!);

    const resp = await buildTicketCcUsers({ userId: user_id });

    if (resp.data) {
      const emailList = resp.data.build_ticket_cc_users;
      const emailListArray = emailList.split(', ');

      const uniqueEmails = [...new Set([...editableEmails, ...emailListArray])];
      setEditableEmails(uniqueEmails);
      setCcCompanyButtonText('CC Company');
    }
  };

  const removeEmail = (emailToRemove: string): void => {
    setEditableEmails(
      editableEmails.filter((email: string) => email !== emailToRemove)
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && isValidEmail(newEmail)) {
      addEmail();
    }
  };

  const renderEmailDisplay = (): JSX.Element => {
    return (
      <div className="flex items-center gap-4 ">
        {ccEmails && ccEmails.length > 0 && (
          <span>{ccEmails.substring(0, 20)}...</span>
        )}
        <Tooltip title={'Edit CC users list'}>
          <button
            onClick={openEmailPopup}
            className="bg-[#4461ac] tracking-wide text-white text-sm rounded-md px-1 py-1 hover:bg-[#577ddb] font-medium cursor-pointer border-1 border-blue-500 shadow-md"
          >
            ...
          </button>
        </Tooltip>
      </div>
    );
  };

  // Check if the current input is a valid email and not already in the list
  const canAddEmail: boolean =
    isValidEmail(newEmail) && !editableEmails.includes(newEmail.trim());

  const newEmailAlreadyExists = (mail: string) =>
    editableEmails.includes(mail.trim());

  return (
    <div className="mt-1 flex-col w-full">
      <div>
        <div
          className="mb-1 text-[12px] border border-gray-200 text-black/50 text-center cursor-pointer"
          onClick={toggleFields}
        >
          {showCcFields ? (
            <div className="flex justify-center items-center">
              <span>Hide Cc Fields</span>
              <RiArrowUpSLine size="20" />
            </div>
          ) : (
            <div className="flex justify-center items-center bg-gray-100">
              <span>Extra Cc Fields</span>
              <RiArrowDownSLine size="20" />
            </div>
          )}
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          showCcFields ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pt-1">
          <div className={detailsRowClass}>
            <div className={detailsRowHeaderClass}>CC Users</div>
            <div className="text-black/90 text-right text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
              {renderEmailDisplay()}
            </div>
          </div>

          {/* <div className={detailsRowClass}>
            <div className={detailsRowHeaderClass}>CC Phones</div>
            <div className="text-black/90 text-right text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
              {ccPhones}
            </div>
          </div> */}
        </div>
      </div>

      {/* Email Editing Popup */}
      {showEmailPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Edit CC Emails</h3>
              <button
                onClick={closeEmailPopup}
                className="text-gray-500 hover:text-gray-700"
              >
                <RiCloseLine size="24" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-96 overflow-y-auto">
              {/* Add new email */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewEmail(e.target.value)
                    }
                    onKeyPress={handleKeyPress}
                    placeholder="Enter email address"
                    className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      (newEmail && !isValidEmail(newEmail)) ||
                      newEmailAlreadyExists(newEmail)
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  <button
                    onClick={addEmail}
                    disabled={!canAddEmail}
                    className={`px-3 py-2 rounded-md flex items-center transition-colors ${
                      canAddEmail
                        ? 'bg-[#4461ac] text-white hover:bg-[#5d85ea] cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <RiAddLine size="16" />
                  </button>

                  <Tooltip title={'Add all Company E-mails'}>
                    <button
                      onClick={addAllCompanyEmails}
                      className={`px-3 py-2 rounded-md flex items-center transition-colors 
                      ${'bg-[#4461ac] text-white hover:bg-[#5d85ea] cursor-pointer'}`}
                    >
                      {ccCompanyButtonText}
                    </button>
                  </Tooltip>
                </div>
                {newEmail && !isValidEmail(newEmail) && (
                  <p className="text-red-600 text-xs mt-1">
                    Please enter a valid email address
                  </p>
                )}

                {newEmail && newEmailAlreadyExists(newEmail) && (
                  <p className="text-red-600 text-xs mt-1">
                    This email already exists
                  </p>
                )}
              </div>

              {/* Email list */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Emails ({editableEmails.length})
                </label>
                {editableEmails.length === 0 ? (
                  <p className="text-gray-500 text-sm">No emails added</p>
                ) : (
                  <ul className="space-y-2">
                    {editableEmails.map((email: string, index: number) => (
                      <li
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                      >
                        <span className="text-sm flex-1 mr-2 break-all">
                          {email}
                        </span>
                        <button
                          onClick={() => removeEmail(email)}
                          className="text-red-600 hover:text-red-800 flex-shrink-0"
                        >
                          <RiDeleteBinLine size="16" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <button
                onClick={closeEmailPopup}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEmails}
                disabled={isFinalStatus}
                className="px-4 py-2 bg-[#4461ac] text-white rounded-md hover:bg-[#5d85ea] disabled:bg-gray-300"
              >
                {saveButtonMessage}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
