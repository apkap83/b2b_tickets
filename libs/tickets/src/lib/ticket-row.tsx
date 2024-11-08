'use client';

import TableCell from '@mui/material/TableCell';
import { AppRoleTypes, TicketDetail } from '@b2b-tickets/shared-models';
import Link from 'next/link';
import clsx from 'clsx';
import { formatDate, userHasRole, getStatusColor } from '@b2b-tickets/utils';
// import styles from './css/ticker-row.module.scss';
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
  const finalTicketStatus = item['Is Final Status'] === 'y' ? true : false;
  return (
    <tr
      key={item.ticket_id}
      onClick={handleClick}
      className={clsx(
        'hover:bg-black/5',
        'whitespace-nowrap hover:cursor-pointer',
        {
          'bg-red-100':
            userHasRole(session, AppRoleTypes.B2B_TicketHandler) &&
            !finalTicketStatus &&
            item['Delayed Response'] === 'Yes',
          'hover:bg-red-200': delayedResponse,
        }
      )}
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
            <div className="text-center">
              {!finalTicketStatus && item['Current Escalation Level']}
            </div>
          </TableCell>
          <TableCell>
            <span>
              {!finalTicketStatus && <span>{lastCustCommentDate}</span>}
            </span>
          </TableCell>
          {/* <TableCell>
            <span>{!finalTicketStatus && <span>{delayedResponse}</span>}</span>
          </TableCell> */}
        </>
      ) : null}
    </tr>
  );
};
