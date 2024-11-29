'use client';
import {
  TicketDetail,
  WebSocketMessage,
  WebSocketData,
} from '@b2b-tickets/shared-models';
import { alterTicketSeverity } from '@b2b-tickets/server-actions';
import toast from 'react-hot-toast';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import { useTheme } from '@mui/material';
import { useFormik } from 'formik';
import { useWebSocket } from '@b2b-tickets/react-hooks';

export const SeverityPopup = ({
  ticketDetails,
  setShowSeverityDialog,
}: {
  ticketDetails: TicketDetail[];
  setShowSeverityDialog: (val: boolean) => void;
}) => {
  const theme = useTheme();

  const ticketId = ticketDetails[0].ticket_id;
  const ticketNumber = ticketDetails[0].Ticket;
  const severityId = String(ticketDetails[0].severity_id);

  // Web Socket Connection
  const { emitEvent } = useWebSocket();

  const formik = useFormik<any>({
    initialValues: {
      severity: severityId,
    },
    // validateOnMount: true,
    // validationSchema: ticketSchema,
    onSubmit: async (values, { setSubmitting }) => {
      const resp = await alterTicketSeverity({
        ticketNumber,
        ticketId: ticketDetails[0].ticket_id,
        newSeverityId: values.severity,
      });

      if (resp?.status === 'ERROR') {
        toast.error(resp.message);
        return;
      }

      emitEvent(WebSocketMessage.TICKET_ALTERED_SEVERITY, {
        ticket_id: ticketId,
      });

      toast.success('Severity was altered');

      setShowSeverityDialog(false);
    },
  });

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

              <div className="flex items-center justify-center relative self-stretch w-full">
                <FormControl
                  sx={{
                    marginTop: '10px',
                    marginBottom: '10px',
                    width: '150px',
                  }}
                >
                  <InputLabel
                    id="severity"
                    sx={{
                      top: '-7px',
                    }}
                  >
                    Severity
                  </InputLabel>
                  <Select
                    labelId="severity"
                    id="severity"
                    name="severity"
                    value={formik.values.severity}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    autoWidth
                    label="Severity"
                    sx={{
                      '& .MuiSelect-select': {
                        paddingTop: '8px',
                        paddingBottom: '8px',
                      },
                    }}
                  >
                    <MenuItem
                      value="1"
                      sx={{
                        width: '270px',
                      }}
                    >
                      Low
                    </MenuItem>
                    <MenuItem
                      value="2"
                      sx={{
                        width: '270px',
                      }}
                    >
                      Medium
                    </MenuItem>
                    <MenuItem
                      value="3"
                      sx={{
                        width: '270px',
                      }}
                    >
                      High
                    </MenuItem>
                  </Select>
                </FormControl>
              </div>

              <div className="flex items-center justify-center mb-2 gap-20 relative self-stretch w-full flex-[0_0_auto]">
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
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.10)', // Scale effect on hover
                    },
                  }}
                  onClick={() => formik.handleSubmit()}
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
