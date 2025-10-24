'use client';
import React, { useRef, useState } from 'react';
import { TicketDetail, WebSocketMessage } from '@b2b-tickets/shared-models';
import { setActualResolutionDateForTicket } from '@b2b-tickets/server-actions';
import toast from 'react-hot-toast';
import Button from '@mui/material/Button';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { FormControl } from '@mui/material';

import { useTheme } from '@mui/material';
import { tokens } from '@b2b-tickets/ui-theme';
import { useWebSocketContext } from '@b2b-tickets/contexts';

export const ResolutionDatePopup = ({
  ticketDetails,
  setShowActualResolutionDateDialog,
}: {
  ticketDetails: TicketDetail[];
  setShowActualResolutionDateDialog: (val: boolean) => void;
}) => {
  const ticketNumber = ticketDetails[0].Ticket;
  const remedyInc = ticketDetails[0]['Remedy Ticket'];

  // Change state type to Dayjs and convert Date to Dayjs
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(
    ticketDetails[0]['Actual Resolution Timestamp']
      ? dayjs(ticketDetails[0]['Actual Resolution Timestamp'])
      : null
  );

  // Web Socket Connection
  const { emitEvent } = useWebSocketContext();

  const handleSubmit = async () => {
    if (selectedDate) {
      // Format as SQL timestamp without timezone conversion
      const actualResolutionTimestamp = selectedDate.format(
        'YYYY-MM-DD HH:mm:ss'
      );
      const resp = await setActualResolutionDateForTicket({
        ticketId: ticketDetails[0].ticket_id,
        actualResolutionTimestamp,
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

      emitEvent(WebSocketMessage.TICKET_ALTERED_ACTUAL_RESOLUTION_DATE, {
        ticket_id: ticketDetails[0].ticket_id,
      });

      toast.success(resp.message);
      setShowActualResolutionDateDialog(false);
    } else {
      toast.error('Please select a valid date');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 pointer-events-none z-10 justify-center items-center flex">
        <div
          className={`bg-white rounded-lg justify-start items-center inline-flex min-w-[400px] pointer-events-auto`}
        >
          <div className="flex flex-col items-start gap-[20.8px] relative self-stretch w-full flex-[0_0_auto] pb-4">
            <div className="bg-[#4461ac] text-white px-4 py-2 relative self-stretch w-full rounded-t-md">
              {`Set Actual Resolution Date for ${ticketNumber}`}
            </div>

            <div className="flex max-h-[984.67px] items-center justify-center relative self-stretch w-full">
              <div className="w-full flex justify-center items-center rounded-md">
                <div className="w-[250px] bg-gray-100 pl-2 pr-2 rounded-md pb-4 flex justify-center items-center">
                  <FormControl sx={{ mt: '.5rem' }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <span
                        style={{
                          color: 'rgba(0,0,0,.6)',
                          fontSize: '11.7143px',
                          fontWeight: '400',
                          textAlign: 'center',
                        }}
                      >
                        Resolution Date
                      </span>
                      <DateTimePicker
                        name="actualResolutionDate"
                        format="DD/MM/YYYY HH:mm"
                        ampm={false}
                        value={selectedDate}
                        onChange={(newValue) => {
                          setSelectedDate(newValue);
                        }}
                        slotProps={{
                          textField: {
                            sx: {
                              '& .MuiInputBase-input': {
                                padding: '8px 0px 8px 14px',
                                width: '112px',
                              },
                              '& .MuiInputAdornment-root': {
                                marginLeft: '0px',
                              },
                            },
                          },
                        }}
                      />
                    </LocalizationProvider>
                  </FormControl>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-20 relative self-stretch w-full flex-[0_0_auto]">
              <Button
                variant="outlined"
                onClick={() => {
                  setShowActualResolutionDateDialog(false);
                }}
              >
                CANCEL
              </Button>

              <Button
                variant="contained"
                sx={{
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.05)',
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
    </>
  );
};
