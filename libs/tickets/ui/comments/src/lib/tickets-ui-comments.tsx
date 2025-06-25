import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { TicketComment } from '@b2b-tickets/shared-models';
import { formatDate, getGreekDateFormat } from '@b2b-tickets/utils';
import { CgProfile } from 'react-icons/cg';
import { FcBusinessman } from 'react-icons/fc';
import { FcVoicePresentation } from 'react-icons/fc';

import { NovaLogo_49x49 as imagePath } from '@b2b-tickets/assets';
import { RiChatDeleteFill } from 'react-icons/ri';
import {
  Paper,
  Box,
  IconButton,
  useTheme,
  Typography,
  Tooltip,
} from '@mui/material';
import { AppPermissionTypes, AppRoleTypes } from '@b2b-tickets/shared-models';
import { userHasPermission } from '@b2b-tickets/utils';
import { deleteExistingComment } from '@b2b-tickets/server-actions';
import toast from 'react-hot-toast';

const getRightAvatar = (company: string) => {
  return company === 'Nova' ? (
    <Image src={imagePath} alt="Nova Avatar" width={49} height={48} />
  ) : (
    <FcVoicePresentation size={49} />
  );
};

const getRightCommentCreatorName = (comment: TicketComment) => {
  if (comment.Username === 'admin') return 'Administrator';
  if (comment['User Customer Name'] === 'Nova')
    return comment['First Name'].concat(' ', comment['Last Name']);
  return comment['User Customer Name'].concat(
    ' - ',
    comment['First Name'].concat(' ', comment['Last Name'])
  );
};

export function TicketsUiComments({
  comments,
  ticketNumber,
}: {
  comments: TicketComment[];
  ticketNumber: string;
}) {
  const { data: session, status } = useSession();
  return (
    <div className="rounded-t-md rounded-b-md shadow-lg self-stretch border border-[#d4d4d6] justify-start items-center gap-6 inline-flex">
      <div className="rounded-t-md rounded-b-md grow shrink basis-0 bg-[#6870fa]/0 flex-col justify-start items-center inline-flex">
        <div className="rounded-t-md self-stretch p-2.5 bg-[#6870fa]/25 border-b border-black/20 justify-center items-center gap-2.5 inline-flex">
          <div className="grow shrink basis-0 self-stretch text-center text-black text-2xl font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
            Ticket Comments
          </div>
        </div>
        <div className="self-stretch p-4 bg-[#f3f4ff] rounded-md flex-col justify-start items-center gap-4 flex">
          {comments.length === 0 ? (
            <span>No comments yet</span>
          ) : (
            <>
              {comments.map((item: TicketComment) => {
                if (item.by_system === 'y' && !item.escalation_level) {
                  return <SystemComment key={item.comment_id} item={item} />;
                }
                if (item.escalation_level) {
                  return (
                    <EscalationComment
                      key={item.comment_id}
                      item={item}
                      session={session}
                      ticketNumber={ticketNumber}
                      escalationLevel={item.escalation_level}
                    />
                  );
                }

                return (
                  <UserComment
                    key={item.comment_id}
                    item={item}
                    session={session}
                    ticketNumber={ticketNumber}
                  />
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const EscalationComment = ({
  item,
  session,
  ticketNumber,
  escalationLevel,
}: {
  key: string;
  item: TicketComment;
  session: any;
  ticketNumber: string;
  escalationLevel: string;
}) => {
  return (
    <div className="self-stretch shadow-sm h-[205px] p-4 bg-white rounded-lg flex-col justify-start items-start gap-2.5 flex border border-red-200">
      <div className="self-stretch justify-between items-center gap-2.5 inline-flex">
        <div className="flex justify-center items-center gap-2">
          {getRightAvatar(item['User Customer Name'])}
          <div>
            <span className="text-black text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
              {getRightCommentCreatorName(item)}
            </span>
            <span className="text-black/75 text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
              &nbsp; <span className="text-red-900">escalated</span> to
              Level&nbsp;
              {escalationLevel}&nbsp; at&nbsp;
              {formatDate(item['Comment Date'])}
            </span>
          </div>
        </div>
        {item.is_closure === 'y' ? (
          <div className="inline text-right border p-1 text-[#3d8d52] text-xs whitespace-nowrap">
            Closing Comment
          </div>
        ) : (
          <DeleteCommentButton
            session={session}
            item={item}
            ticketNumber={ticketNumber}
          />
        )}
      </div>
      <div className="self-stretch grow shrink basis-0 p-2.5 bg-[#e6e6f3]/50 justify-start items-start gap-2.5 inline-flex">
        <div className="text-black text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
          {item.Comment}
        </div>
      </div>
    </div>
  );
};

const UserComment = ({
  item,
  session,
  ticketNumber,
}: {
  key: string;
  item: TicketComment;
  session: any;
  ticketNumber: string;
}) => {
  return (
    <div className="self-stretch shadow-sm min-h-[205px] p-4 bg-white rounded-lg flex-col justify-start items-start gap-2.5 flex">
      <div className="self-stretch justify-between items-center gap-2.5 inline-flex">
        <div className="flex justify-center items-center gap-2">
          {getRightAvatar(item['User Customer Name'])}
          <div>
            <span className="text-black text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
              {getRightCommentCreatorName(item)}
            </span>
            <span className="text-black/75 text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
              {' '}
              added a comment at {formatDate(item['Comment Date'])}
            </span>
          </div>
        </div>
        {item.is_closure === 'y' ? (
          <div className="inline text-right border p-1 text-[#3d8d52] text-xs whitespace-nowrap">
            Closing Comment
          </div>
        ) : (
          <DeleteCommentButton
            session={session}
            item={item}
            ticketNumber={ticketNumber}
          />
        )}
      </div>
      <div className="self-stretch grow shrink basis-0 p-2.5 bg-[#e6e6f3]/50 justify-start items-start gap-2.5 inline-flex">
        <div className="whitespace-pre-wrap text-black text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
          {item.Comment}
        </div>
      </div>
    </div>
  );
};

const SystemComment = ({ item }: { key: string; item: TicketComment }) => {
  return (
    <div className="rounded-md py-3 shadow-sm border border-gray-300 self-stretch grow shrink basis-0 p-2.5 bg-[#bebee0]/50">
      {/* Desktop layout - side by side */}
      <div className="hidden sm:flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0 text-black text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
          <span className="break-all text-wrap">{item.Comment}</span>
        </div>
        <div className="flex-shrink-0 break-all text-black text-xs font-light font-['Roboto'] leading-[17.16px] tracking-tight whitespace-nowrap">
          {item.Username}&nbsp;-&nbsp;
          {formatDate(item['Comment Date'])}
        </div>
      </div>

      {/* Mobile layout - stacked */}
      <div className="sm:hidden">
        <div className="text-black text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight mb-2">
          <span className="break-all overflow-hidden">{item.Comment}</span>
        </div>
        <div className="text-black break-all text-xs font-light font-['Roboto'] leading-[17.16px] tracking-tight">
          {item.Username}&nbsp;-&nbsp;
          {formatDate(item['Comment Date'])}
        </div>
      </div>
    </div>
  );
};

const handleDeleteComment = async ({
  item,
  ticketNumber,
}: {
  item: TicketComment;
  ticketNumber: string;
}) => {
  const confirmed = window.confirm(
    'Are you sure you want to delete this comment?\n\n* This action will be recorded for accountability.'
  );

  if (!confirmed) {
    return; // User canceled the deletion
  }

  const resp = await deleteExistingComment({
    commentId: item.comment_id,
    ticketNumber,
  });

  if (!resp) {
    toast.error('An error occurred');
    return;
  }

  if (resp?.status === 'ERROR') {
    toast.error(resp.message);
  } else {
    toast.success(resp.message);
  }
};

const DeleteCommentButton = ({ session, item, ticketNumber }: any) => {
  return (
    <>
      {userHasPermission(session, AppPermissionTypes.Delete_Comments) ? (
        <Tooltip title="Delete Comment">
          <IconButton
            onClick={() => {
              handleDeleteComment({ item, ticketNumber });
            }}
            className="flex flex-col justify-center items-center"
          >
            <RiChatDeleteFill size="25" color="rgba(104, 112, 250, .75)" />
          </IconButton>
        </Tooltip>
      ) : null}
    </>
  );
};

export default TicketsUiComments;
