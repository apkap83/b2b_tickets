'use client';

import TableCell from '@mui/material/TableCell';
import { AppRoleTypes, TicketDetail } from '@b2b-tickets/shared-models';
import Link from 'next/link';
import clsx from 'clsx';
import { formatDate, userHasRole, getStatusColor } from '@b2b-tickets/utils';
import styles from './css/ticker-row.module.scss';
import { useRouter } from 'next/navigation';

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

  const lastCustCommentDate = formatDate(item['Last Cust. Comment Date']);
  const delayedResponse = item['Delayed Response'];
  return (
    // <tr key={item.ticket_id} onClick={handleClick} className={styles.ticketRow}>
    <tr
      key={item.ticket_id}
      onClick={handleClick}
      className={clsx({
        'bg-red-100':
          userHasRole(session, AppRoleTypes.B2B_TicketHandler) &&
          item['Delayed Response'] === 'Yes',
      })}
    >
      {/* One More Column for Ticket Handlers */}
      {userHasRole(session, AppRoleTypes.B2B_TicketHandler) ? (
        <>
          <TableCell data-label="Customer" align="center">
            <span className="font-medium">{item.Customer}</span>
          </TableCell>
          <TableCell data-label="Type" align="center">
            <span className="font-medium">{item['Cust. Type']}</span>
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
      <TableCell
        style={{
          whiteSpace: 'normal',
        }}
        data-label="Category"
        align="center"
      >
        {item.Category}
      </TableCell>
      <TableCell
        style={{
          whiteSpace: 'normal',
        }}
        data-label="Service"
        align="center"
      >
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
      <TableCell
        data-label="Status Date"
        align="center"
        style={{
          whiteSpace: 'normal',
        }}
      >
        {formatDate(item['Status Date'])}
      </TableCell>
      {userHasRole(session, AppRoleTypes.B2B_TicketHandler) ? (
        <>
          <TableCell data-label="Escalated" align="center">
            No
          </TableCell>
          <TableCell>
            <span>
              {lastCustCommentDate ? <span>{lastCustCommentDate}</span> : ''}
            </span>
          </TableCell>
          <TableCell>
            <span>{delayedResponse ? <span>{delayedResponse}</span> : ''}</span>
          </TableCell>
        </>
      ) : null}
    </tr>
  );
};
