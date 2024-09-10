'use client';
import React, { useState, useEffect } from 'react';
import { getTicketDetailsForTicketId } from '@b2b-tickets/server-actions';
import { getGreekDateFormat } from '@b2b-tickets/utils';
import { TicketComments } from '@b2b-tickets/shared-models';

export default function Page({ params }: { params: { slug: string } }) {
  // const theme = useTheme();
  // const colors = tokens(theme.palette.mode);

  const [ticketDetails, setTicketDetails] = useState<any>([]);

  const ticketNumber = params.slug;

  useEffect(() => {
    const getTicketDetails = async () => {
      const result = await getTicketDetailsForTicketId({ ticketNumber });
      console.log(result);
      setTicketDetails(result);
    };

    getTicketDetails();
  }, []);

  if (ticketDetails.length === 0) return;

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
  const commentsArray: TicketComments[] = ticketDetails[0]['comments'];
  console.log('commentsArray', commentsArray);
  return (
    <>
      <div className="w-full h-[1404px] flex-col justify-start items-center gap-5 inline-flex">
        <div className="self-stretch h-[92px] px-6 pb-[9px] border-b border-black flex-col justify-start items-start gap-[0px] flex">
          <div className="grow shrink basis-0 flex-col justify-center items-center flex">
            <div className="mt-3 text-black/90 text-5xl font-bold leading-[57.60px]">
              Ticket Details
            </div>
            <div className="self-stretch h-[17px] text-center text-[#6870fa] text-[15px] font-medium font-['Roboto'] leading-[4px] tracking-widest">
              {ticketNumber}
            </div>
          </div>
        </div>
        <div className="self-stretch h-[1151.29px] pl-8 pr-6 pt-3.5 flex-col justify-start items-start gap-6 flex">
          <div className="self-stretch justify-start items-center gap-6 inline-flex">
            <div className="shadow-lg p-2 bg-white rounded-lg border border-black/25 flex-col justify-start items-start inline-flex">
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
          <div className="rounded-t-md rounded-b-md shadow-lg self-stretch border border-[#d4d4d6] justify-start items-center gap-6 inline-flex">
            <div className="rounded-t-md rounded-b-md grow shrink basis-0 bg-[#6870fa]/0 flex-col justify-start items-center inline-flex">
              <div className="rounded-t-md self-stretch p-2.5 bg-[#6870fa]/25 border-b border-black/20 justify-center items-center gap-2.5 inline-flex">
                <div className="grow shrink basis-0 self-stretch text-center text-black text-2xl font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                  Comments/Updates
                </div>
              </div>
              <div className="self-stretch p-4 bg-[#f3f4ff] flex-col justify-start items-center gap-4 flex">
                {commentsArray.length === 0 ? (
                  <span>No comments yet</span>
                ) : (
                  <>
                    {commentsArray.map((item) => {
                      return (
                        <div className="self-stretch h-[205px] p-4 bg-white rounded-lg flex-col justify-start items-start gap-2.5 flex">
                          <div className="self-stretch justify-start items-center gap-2.5 inline-flex">
                            <img
                              className="w-[49px] h-[49px] rounded-full"
                              src="https://via.placeholder.com/49x49"
                            />
                            <div>
                              <span className="text-black text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                                {item.customer_name} - {item.username}
                              </span>
                              <span className="text-black/75 text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
                                {' '}
                                added a comment at{' '}
                                {getGreekDateFormat(item.comment_date)}
                              </span>
                            </div>
                          </div>
                          <div className="self-stretch grow shrink basis-0 p-2.5 bg-[#e6e6f3]/50 justify-start items-start gap-2.5 inline-flex">
                            <div className="text-black text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
                              {item.comment}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                {/* <div className="self-stretch h-[205px] p-4 bg-white rounded-lg flex-col justify-start items-start gap-2.5 flex">
                  <div className="self-stretch justify-start items-center gap-2.5 inline-flex">
                    <img
                      className="w-[49px] h-[49px] rounded-full"
                      src="https://via.placeholder.com/49x49"
                    />
                    <div>
                      <span className="text-black text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                        Nova - Apostolos Kapetanios
                      </span>
                      <span className="text-black/75 text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
                        added a comment 2 hours ago
                      </span>
                    </div>
                  </div>
                  <div className="self-stretch grow shrink basis-0 p-2.5 bg-[#e6e6f3]/50 justify-start items-start gap-2.5 inline-flex">
                    <div className="text-black text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
                      Validation would be needed on Friday!
                    </div>
                  </div>
                </div>
                <div className="self-stretch h-[205px] p-4 bg-white rounded-lg flex-col justify-start items-start gap-2.5 flex">
                  <div className="self-stretch justify-start items-center gap-2.5 inline-flex">
                    <img
                      className="w-[49px] h-[49px] rounded-full"
                      src="https://via.placeholder.com/49x49"
                    />
                    <div>
                      <span className="text-black text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                        DEH - Prasinos Ierotheos{' '}
                      </span>
                      <span className="text-black/75 text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
                        added a comment 1 hour ago
                      </span>
                    </div>
                  </div>
                  <div className="self-stretch grow shrink basis-0 p-2.5 bg-[#f3f3f9] justify-start items-start gap-2.5 inline-flex">
                    <div className="text-black text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
                      We can proceed.
                    </div>
                  </div>
                </div>
                <div className="self-stretch h-[205px] p-4 bg-white rounded-lg flex-col justify-start items-start gap-2.5 flex">
                  <div className="self-stretch justify-start items-center gap-2.5 inline-flex">
                    <img
                      className="w-[49px] h-[49px] rounded-full"
                      src="https://via.placeholder.com/49x49"
                    />
                    <div>
                      <span className="text-black text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
                        Nova - Petros Papadopoulos{' '}
                      </span>
                      <span className="text-black/75 text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
                        added a comment a few minutes ago
                      </span>
                    </div>
                  </div>
                  <div className="self-stretch grow shrink basis-0 p-2.5 bg-[#f3f3f9] justify-start items-start gap-2.5 inline-flex">
                    <div className="w-[870px] text-black text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
                      Lorem ipsum dolor sit amet consectetur. Viverra dui
                      viverra at interdum eget urna feugiat sem. Fermentum
                      vestibulum dolor vestibulum quis in vel fermentum.
                      Sagittis mi id dui laoreet. Morbi facilisi nunc phasellus
                      vitae lacinia at tortor.
                    </div>
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

{
  /* <div className="self-stretch h-[205px] p-4 bg-white rounded-lg flex-col justify-start items-start gap-2.5 flex">
<div className="self-stretch justify-start items-center gap-2.5 inline-flex">
  <img
    className="w-[49px] h-[49px] rounded-full"
    src="https://via.placeholder.com/49x49"
  />
  <div>
    <span className="text-black text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
      Nova - Apostolos Kapetanios
    </span>
    <span className="text-black/75 text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
      added a comment 2 hours ago
    </span>
  </div>
</div>
<div className="self-stretch grow shrink basis-0 p-2.5 bg-[#e6e6f3]/50 justify-start items-start gap-2.5 inline-flex">
  <div className="text-black text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
    Validation would be needed on Friday!
  </div>
</div>
</div>
<div className="self-stretch h-[205px] p-4 bg-white rounded-lg flex-col justify-start items-start gap-2.5 flex">
<div className="self-stretch justify-start items-center gap-2.5 inline-flex">
  <img
    className="w-[49px] h-[49px] rounded-full"
    src="https://via.placeholder.com/49x49"
  />
  <div>
    <span className="text-black text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
      DEH - Prasinos Ierotheos{' '}
    </span>
    <span className="text-black/75 text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
      added a comment 1 hour ago
    </span>
  </div>
</div>
<div className="self-stretch grow shrink basis-0 p-2.5 bg-[#f3f3f9] justify-start items-start gap-2.5 inline-flex">
  <div className="text-black text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
    We can proceed.
  </div>
</div>
</div>
<div className="self-stretch h-[205px] p-4 bg-white rounded-lg flex-col justify-start items-start gap-2.5 flex">
<div className="self-stretch justify-start items-center gap-2.5 inline-flex">
  <img
    className="w-[49px] h-[49px] rounded-full"
    src="https://via.placeholder.com/49x49"
  />
  <div>
    <span className="text-black text-base font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
      Nova - Petros Papadopoulos{' '}
    </span>
    <span className="text-black/75 text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
      added a comment a few minutes ago
    </span>
  </div>
</div>
<div className="self-stretch grow shrink basis-0 p-2.5 bg-[#f3f3f9] justify-start items-start gap-2.5 inline-flex">
  <div className="w-[870px] text-black text-base font-light font-['Roboto'] leading-[17.16px] tracking-tight">
    Lorem ipsum dolor sit amet consectetur. Viverra dui
    viverra at interdum eget urna feugiat sem. Fermentum
    vestibulum dolor vestibulum quis in vel fermentum.
    Sagittis mi id dui laoreet. Morbi facilisi nunc phasellus
    vitae lacinia at tortor.
  </div>
</div>
</div> */
}
