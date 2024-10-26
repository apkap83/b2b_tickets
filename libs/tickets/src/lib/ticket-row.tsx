'use client';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import {
  Ticket,
  TicketStatusName,
  AppRoleTypes,
  TicketStatusColors,
  TicketDetail,
} from '@b2b-tickets/shared-models';
import Link from 'next/link';
import clsx from 'clsx';
import { formatDate, userHasRole, getStatusColor } from '@b2b-tickets/utils';
import styles from './css/ticker-row.module.scss';
import { useRouter } from 'next/navigation';
import { getGreekDateFormat } from '@b2b-tickets/utils';
import { EscalationFillColor } from '@b2b-tickets/shared-models';

export const TicketRow = ({
  session,
  item,
}: {
  session: any;
  item: TicketDetail;
}) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/ticket/${item.Ticket}`);
  };

  return (
    <tr key={item.ticket_id} onClick={handleClick} className={styles.ticketRow}>
      {/* One More Column for Ticket Handlers */}
      {userHasRole(session, AppRoleTypes.B2B_TicketHandler) ? (
        <>
          <TableCell data-label="Customer" align="center">
            <span className="font-medium">{item.Customer}</span>
          </TableCell>
          <TableCell data-label="Type" align="center">
            <span className="font-medium">{item['Cust. Type']}</span>
          </TableCell>
          <TableCell data-label="Escalated" align="center">
            {/* <span className="font-medium">
              {item['Escalation Date'] ? (
                <>
                  <div
                    className="text-left"
                    style={{
                      color: `${EscalationFillColor}`,
                    }}
                  >
                    By {item['Escalated By']}
                  </div>
                  <div
                    className="text-left"
                    style={{
                      color: `${EscalationFillColor}`,
                    }}
                  >
                    {getGreekDateFormat(item['Escalation Date'])}
                  </div>
                </>
              ) : (
                'No'
              )}
            </span> */}
            EMPTY
          </TableCell>
        </>
      ) : null}
      <TableCell data-label="Ticket Number" align="center">
        <Link href={`/ticket/${item.Ticket}`} className="text-blue-500">
          {<span className="font-medium tracking-wider">{item.Ticket}</span>}
        </Link>
      </TableCell>
      <TableCell data-label="Opened" align="center">
        {formatDate(item.Opened)}
      </TableCell>
      <TableCell
        style={{
          whiteSpace: 'normal',
        }}
        data-label="Title"
        align="center"
      >
        {item.Title}
      </TableCell>
      <TableCell data-label="Category" align="center">
        {item.Category}
      </TableCell>
      <TableCell data-label="Service" align="center">
        {item.Service}
      </TableCell>
      <TableCell data-label="Opened By" align="center">
        {item['Opened By']}
      </TableCell>
      <TableCell data-label="Serverity" align="center">
        {item.Severity}
      </TableCell>
      <TableCell data-label="Status" align="center">
        {
          <div
            style={{
              backgroundColor: getStatusColor(item.status_id),
              borderColor: getStatusColor(item.status_id),
            }}
            className="text-white px-1 py-1 rounded-md font-medium text-center"
          >
            {item.Status}
          </div>
        }
      </TableCell>
      <TableCell data-label="Status Date" align="center">
        {formatDate(item['Status Date'])}
      </TableCell>
    </tr>
  );
};
