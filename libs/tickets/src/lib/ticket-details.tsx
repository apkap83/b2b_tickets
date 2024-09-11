'use client';
import React, { useState, useEffect } from 'react';
import { getTicketDetailsForTicketId } from '@b2b-tickets/server-actions';
import { getGreekDateFormat } from '@b2b-tickets/utils';
import { TicketComment } from '@b2b-tickets/shared-models';
import { TicketsUiComments } from '@b2b-tickets/tickets/ui/comments';

import { NewCommentModal } from './new-comment-modal';

import Button from '@mui/material/Button';
import clsx from 'clsx';
import styles from './css/ticket-details.module.scss';
import { useSession } from 'next-auth/react';

import { userHasPermission, userHasRole } from '@b2b-tickets/utils';
import { AppPermissionTypes, AppRoleTypes } from '@b2b-tickets/shared-models';
import { updateTicketStatus } from '@b2b-tickets/server-actions';
import toast from 'react-hot-toast';

export function TicketDetails({ ticketDetails }: { ticketDetails: any }) {
  // const theme = useTheme();
  // const colors = tokens(theme.palette.mode);
  const { data: session, status } = useSession();
  const [showNewComment, setShowNewComment] = useState(false);
  const [ticketStatus, setTicketStatus] = useState(ticketDetails[0].status_id);

  if (ticketDetails.length === 0) return;

  const ticketNumber = ticketDetails[0]['ticket_number'];
  const title = ticketDetails[0]['title'];
  const category = ticketDetails[0]['category_name'];
  const serviceName = ticketDetails[0]['service_name'];
  const equipment_id = ticketDetails[0]['equipment_id'];
  const contact_person = ticketDetails[0]['contact_person'];
  const contact_phone = ticketDetails[0]['contact_phone_number'];
  const sid = ticketDetails[0]['sid'];
  const cid = ticketDetails[0]['cid'];
  const userName = ticketDetails[0]['username'];
  const cliValue = ticketDetails[0]['cli'];
  const occurrenceDate = ticketDetails[0]['occurrence_date'];
  const greekOccurrenceDate = getGreekDateFormat(occurrenceDate);
  const problemDescription = ticketDetails[0]['description'];
  const commentsArray: TicketComment[] = ticketDetails[0]['comments'];

  return (
    <>
      <div className="w-full h-[1404px] flex-col justify-start items-center gap-5 inline-flex">
        <div className="w-full h-[92px] px-6 pb-[9px] border-b border-black justify-between items-center inline-flex">
          <div className="self-stretch flex-col justify-center items-center inline-flex">
            <div className="text-black/90 text-5xl font-bold leading-[57.60px]">
              Ticket Details
            </div>
            <div className="pt-2 self-stretch h-[17px] text-center text-[#6870fa] text-[15px] font-medium font-['Roboto'] leading-[4px] tracking-widest">
              {ticketNumber}
            </div>
          </div>
          <Button
            onClick={() => {
              setShowNewComment(true);
            }}
            variant="outlined"
          >
            Add New Comment
          </Button>
        </div>
        <div className="self-stretch h-[1151.29px] pl-8 pr-6 pt-3.5 flex-col justify-start items-start gap-6 flex">
          <div className="self-stretch justify-start items-center gap-6 inline-flex">
            <div className="shadow-lg p-2 bg-white rounded-lg border border-black/25 flex-col justify-start items-start inline-flex">
              <div className="w-[344px] justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Status
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {userHasRole(session, AppRoleTypes.B2B_TicketHandler) ? (
                    <select
                      name="company"
                      className={clsx(
                        `${styles.customSelect} text-center border-1 rounded-md px-1 outline-none font-semibold tracking-wide`,
                        {
                          'text-[#6870fa] border border-[#6870fa]':
                            ticketStatus === '1',
                          'text-[#684e32] border border-[#684e32]':
                            ticketStatus === '2',
                          'text-[#dc5743] border border-[#dc5743]':
                            ticketStatus === '3',
                          'text-[#3d8d52] border border-[#3d8d52]':
                            ticketStatus === '4',
                        }
                      )}
                      onChange={async (item) => {
                        try {
                          setTicketStatus(item.target.value);
                          const ticketId = ticketDetails[0].ticket_id;
                          const statusId = item.target.value;
                          //@ts-ignore
                          const userId = session?.user.user_id;

                          const response = await updateTicketStatus({
                            ticketId,
                            statusId,
                            userId,
                          });

                          if (response.status === 'SUCCCESS')
                            toast.success(response.message);
                          if (response.status === 'ERROR')
                            toast.error(response.message);
                        } catch (error) {
                          toast.error('An unexpected error occurred.');
                          console.error('Error message:', error.message);
                        }
                      }}
                      // onBlur={formik.handleBlur}
                      value={ticketStatus}
                    >
                      <option value="1">New</option>
                      <option value="2">Working</option>
                      <option value="3">Cancelled</option>
                      <option value="4">Closed</option>
                    </select>
                  ) : (
                    <span
                      className={clsx(`px-2`, {
                        'text-[#6870fa] border border-[#6870fa]':
                          ticketStatus === '1',
                        'text-[#916430] border border-[#916430]':
                          ticketStatus === '2',
                        'text-[#dc5743] border border-[#dc5743]':
                          ticketStatus === '3',
                        'text-[#3d8d52] border border-[#3d8d52]':
                          ticketStatus === '4',
                      })}
                    >
                      {ticketDetails[0].status_name}
                    </span>
                  )}
                  {/* <select
                    name="company"
                    className={clsx(
                      `${styles.customSelect} text-left border-1 rounded-md px-1 outline-none font-semibold tracking-wide`,
                      {
                        'text-[#6870fa] border border-[#6870fa]':
                          ticketStatus === '1',
                        'text-[#916430] border border-[#916430]':
                          ticketStatus === '2',
                        'text-[#dc5743] border border-[#dc5743]':
                          ticketStatus === '3',
                        'text-[#3d8d52] border border-[#3d8d52]':
                          ticketStatus === '4',
                      }
                    )}
                    onChange={(item) => {
                      setTicketStatus(item.target.value);
                    }}
                    // onBlur={formik.handleBlur}
                    value={ticketStatus}
                  >
                    <option value="1">New</option>
                    <option value="2">Working</option>
                    <option value="3">Cancelled</option>
                    <option value="4">Closed</option>
                  </select> */}
                </div>
              </div>
              <div className="w-[344px] justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Title
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {title}
                </div>
              </div>
              <div className="w-[344px] justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Category
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {category}
                </div>
              </div>
              <div className="w-[344px] justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Service Name
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {serviceName}
                </div>
              </div>
              <div className="w-[344px] justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Equipment ID
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {equipment_id}
                </div>
              </div>
              <div className="w-[344px] justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Contact Person
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {contact_person}
                </div>
              </div>
              <div className="w-[344px] justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Contact Phone
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {contact_phone}
                </div>
              </div>
              <div className="w-[344px] h-[0px] border border-black/20"></div>
              <div className="w-[344px] justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  SID
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {sid}
                </div>
              </div>

              <div className="w-[344px] justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  CID
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {cid}
                </div>
              </div>
              <div className="w-[344px] justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  User Name
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {userName}
                </div>
              </div>
              <div className="w-[344px] justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  CLI Value
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {cliValue}
                </div>
              </div>
              <div className="w-[344px] h-[0px] border border-black/20"></div>
              <div className="w-[344px] justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 text-black/90 text-base font-medium font-['Roboto'] leading-9">
                  Occurence Date
                </div>
                <div className="text-black/90 text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {greekOccurrenceDate}
                </div>
              </div>
            </div>
            <div className="shadow-lg grow shrink basis-0 self-stretch bg-[#6870fa]/0 flex-col justify-start items-center gap-4 inline-flex">
              <div className="self-stretch p-2.5 border rounded-t-md border-black/20 justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 self-stretch text-center text-black text-2xl font-extrabold font-['Roboto'] leading-[17.16px] tracking-tight">
                  Problem Description
                </div>
              </div>
              <div className="w-full h-[342.29px] px-[13px] py-[17px] bg-white border border-[#ebebeb] flex-col justify-start items-start inline-flex">
                <div className="overflow-y-auto self-stretch text-black text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  {problemDescription}
                </div>
                <div className="self-stretch p-0.5 justify-end items-center gap-2.5 inline-flex">
                  <div className="w-4 p-0.5 flex-col justify-start items-start gap-2.5 inline-flex"></div>
                </div>
              </div>
            </div>
          </div>
          <TicketsUiComments comments={commentsArray} />
        </div>
      </div>
      {showNewComment ? (
        <NewCommentModal
          closeModal={setShowNewComment}
          ticketDetail={ticketDetails}
        />
      ) : null}
    </>
  );
}
