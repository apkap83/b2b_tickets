'use client';
import { useRef } from 'react';
import { TicketDetail } from '@b2b-tickets/shared-models';
import { alterTicketSeverity } from '@b2b-tickets/server-actions';
import toast from 'react-hot-toast';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material';
import { tokens } from '@b2b-tickets/ui-theme';

export const SeverityPopup = ({
  ticketDetails,
  setShowSeverityDialog,
}: {
  ticketDetails: TicketDetail[];
  setShowSeverityDialog: (val: boolean) => void;
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const ticketNumber = ticketDetails[0].Ticket;
  const inputSelect = useRef<any>();
  const severityId = ticketDetails[0].severity_id;

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center
         bg-black bg-opacity-50"
      >
        <div
          className={`bg-white rounded-lg justify-start items-center inline-flex min-w-[350px]`}
        >
          <div className="w-full flex flex-col items-start gap-2.5 pt-0 pb-[13px] px-0 relative bg-localhostwhite">
            <div className="flex flex-col items-start gap-[20.8px] relative self-stretch w-full flex-[0_0_auto]">
              <div className="text-white px-4 py-2 relative self-stretch w-full rounded-t-md [background:linear-gradient(0,rgb(2,0,90)_0%,rgba(55,55,66,0.5)_100%)]">
                {`Alter Severity for ${ticketNumber}`}
              </div>

              <div className="flex max-h-[984.67px] items-center justify-center relative self-stretch w-full">
                <select
                  ref={inputSelect}
                  className="pr-6 border bg-white shadow-md"
                  name=""
                  id=""
                  defaultValue={ticketDetails[0].severity_id}
                >
                  <option value="1">Low</option>
                  <option value="2">Medium</option>
                  <option value="3">High</option>
                </select>
              </div>

              <div className="flex items-center justify-center gap-20 relative self-stretch w-full flex-[0_0_auto]">
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowSeverityDialog(false);
                  }}
                >
                  CANCEL
                </Button>

                <Button
                  variant="contained"
                  sx={{
                    transition: 'transform 0.2s ease-in-out', // Smooth transition
                    '&:hover': {
                      transform: 'scale(1.05)', // Scale effect on hover
                    },
                  }}
                  onClick={async () => {
                    if (inputSelect && inputSelect.current.value) {
                      const resp = await alterTicketSeverity({
                        ticketNumber: ticketDetails[0].Ticket,
                        ticketId: ticketDetails[0].ticket_id,
                        newSeverityId: inputSelect.current.value,
                      });

                      if (resp && resp.status === 'SUCCESS') {
                        toast.success('Severity was altered');
                      }

                      setShowSeverityDialog(false);
                    }
                  }}
                >
                  SUBMIT
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
