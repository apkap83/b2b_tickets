import { TicketComment } from '@b2b-tickets/shared-models';
import { getGreekDateFormat } from '@b2b-tickets/utils';

export function TicketsUiComments({ comments }: { comments: TicketComment[] }) {
  return (
    <div className="rounded-t-md rounded-b-md shadow-lg self-stretch border border-[#d4d4d6] justify-start items-center gap-6 inline-flex">
      <div className="rounded-t-md rounded-b-md grow shrink basis-0 bg-[#6870fa]/0 flex-col justify-start items-center inline-flex">
        <div className="rounded-t-md self-stretch p-2.5 bg-[#6870fa]/25 border-b border-black/20 justify-center items-center gap-2.5 inline-flex">
          <div className="grow shrink basis-0 self-stretch text-center text-black text-2xl font-normal font-['Roboto'] leading-[17.16px] tracking-tight">
            Ticket Comments
          </div>
        </div>
        <div className="self-stretch p-4 bg-[#f3f4ff] flex-col justify-start items-center gap-4 flex">
          {comments.length === 0 ? (
            <span>No comments yet</span>
          ) : (
            <>
              {comments.map((item) => {
                return (
                  <div
                    key={item.comment_id}
                    className="self-stretch h-[205px] p-4 bg-white rounded-lg flex-col justify-start items-start gap-2.5 flex"
                  >
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
        </div>
      </div>
    </div>
  );
}

export default TicketsUiComments;
