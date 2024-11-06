import { useState, useEffect } from 'react';

import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import { getCcValuesForTicket } from '@b2b-tickets/server-actions';

const detailsRowClass =
  'w-full justify-center items-center gap-2.5 inline-flex text-md';

const detailsRowHeaderClass =
  "grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] ";

export const CcFields = ({ ticketId }: { ticketId: string }) => {
  const [showCcFields, setShowCcFields] = useState(false);

  const [ccEmails, setCcEmails] = useState('');
  const [ccPhones, setCcPhones] = useState('');

  useEffect(() => {
    const getCcValues = async () => {
      const res = await getCcValuesForTicket({ ticketId });
      setCcEmails(res.data?.ccEmails as string);
      setCcPhones(res.data?.ccPhones as string);
    };

    getCcValues();
  }, []);

  // Function to toggle the state
  const toggleFields = () => {
    setShowCcFields(!showCcFields);
  };

  // TODO Enable The Below?
  //   if (!ccEmails && !ccPhones) {
  //     return null;
  //   }

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
      {showCcFields && (
        <div>
          <div className={detailsRowClass}>
            <div className={detailsRowHeaderClass}>CC Users</div>
            <div className="text-black/90 text-right text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
              {ccEmails}
            </div>
          </div>

          <div className={detailsRowClass}>
            <div className={detailsRowHeaderClass}>CC Phones</div>
            <div className="text-black/90 text-right text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
              {ccPhones}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
