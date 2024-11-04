'use client';
import React, { useRef } from 'react';
import { TicketDetail } from '@b2b-tickets/shared-models';
import { setRemedyIncidentIDForTicket } from '@b2b-tickets/server-actions';
import toast from 'react-hot-toast';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material';
import { tokens } from '@b2b-tickets/ui-theme';

export const RemedyIncPopup = ({
  ticketDetails,
  setShowRemedyIncDialog,
}: {
  ticketDetails: TicketDetail[];
  setShowRemedyIncDialog: (val: boolean) => void;
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const ticketNumber = ticketDetails[0].Ticket;
  const remedyInc = ticketDetails[0]['Remedy Ticket'];
  const inputBox = useRef<any>();

  const handleSubmit = async () => {
    if (inputBox && inputBox.current.value) {
      const remedyIncId = inputBox.current.value;
      const resp = await setRemedyIncidentIDForTicket({
        ticketId: ticketDetails[0].ticket_id,
        remedyIncId,
        ticketNumber: ticketDetails[0].Ticket,
      });

      if (!resp) {
        toast.error('An error occurred');
        return;
      }

      if (resp?.status === 'ERROR') {
        toast.error(resp.message);
        return;
      }

      toast.success(resp.message);
      setShowRemedyIncDialog(false);
    }
  };

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
                {`Set Remedy Incident for ${ticketNumber}`}
              </div>

              <div className="flex max-h-[984.67px] items-center justify-center relative self-stretch w-full">
                <input
                  className="text-center inline-flex flex-col items-start px-[8.56px] py-[0.56px] relative self-stretch rounded-md overflow-hidden border border-solid"
                  type="text"
                  placeholder="Remedy Inc ID"
                  defaultValue={remedyInc ? remedyInc : ''}
                  ref={inputBox}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit();
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-center gap-20 relative self-stretch w-full flex-[0_0_auto]">
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowRemedyIncDialog(false);
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
                  onClick={handleSubmit}
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
