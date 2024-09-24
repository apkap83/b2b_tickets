import React, { Suspense } from 'react';
import { TicketsList } from '@b2b-tickets/tickets';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { getNumOfTickets } from '@b2b-tickets/server-actions';
import { Pagination } from '@b2b-tickets/ui';
import { config } from '@b2b-tickets/config';
import { TicketListHeader } from '@b2b-tickets/tickets';
const App: React.FC = async ({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
}) => {
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;

  const totalTickets = await getNumOfTickets(query);
  const totalPages = Math.ceil(
    Number(totalTickets) / config.TICKET_ITEMS_PER_PAGE
  );

  return (
    <Container
      maxWidth="xl"
      sx={{
        marginTop: 2,
        paddingBottom: '55px',
      }}
      className="relative"
    >
      <TicketListHeader query={query} currentPage={currentPage} />

      <Suspense key={query + currentPage} fallback={<MyFallBack />}>
        <TicketsList query={query} currentPage={currentPage} />
      </Suspense>
      <div className="pt-5 flex justify-between items-center">
        <div>Total Items: {totalTickets}</div>
        <Pagination totalPages={totalPages} />
      </div>
    </Container>
  );
};
const Skeleton = ({ className }: any) => (
  <div aria-live="polite" aria-busy="true" className={className}>
    <span className="inline-flex w-full animate-pulse select-none rounded-md bg-gray-300 leading-none">
      ‌
    </span>
    <br />
  </div>
);

const MyFallBack = () => {
  return (
    <>
      <table>
        <thead>
          <tr>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span>
                <Skeleton className="w-[140px] max-w-full" />
              </span>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[175px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[245px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[165px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[130px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[135px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[130px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <div
                    aria-live="polite"
                    aria-busy="true"
                    className={'w-[110px] max-w-full'}
                  >
                    <span className="inline-flex w-full animate-pulse select-none rounded-md bg-gray-400 leading-none">
                      ‌
                    </span>
                    <br />
                  </div>
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[240px] max-w-full" />
                </span>
              </a>
            </td>
          </tr>
          <tr>
            <td>
              <span>
                <Skeleton className="w-[140px] max-w-full" />
              </span>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[175px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[245px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[165px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[130px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[135px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[130px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <div
                    aria-live="polite"
                    aria-busy="true"
                    className={'w-[110px] max-w-full'}
                  >
                    <span className="inline-flex w-full animate-pulse select-none rounded-md bg-gray-400 leading-none">
                      ‌
                    </span>
                    <br />
                  </div>
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[240px] max-w-full" />
                </span>
              </a>
            </td>
          </tr>
          <tr>
            <td>
              <span>
                <Skeleton className="w-[140px] max-w-full" />
              </span>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[175px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[245px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[165px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[130px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[135px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[130px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <div
                    aria-live="polite"
                    aria-busy="true"
                    className={'w-[110px] max-w-full'}
                  >
                    <span className="inline-flex w-full animate-pulse select-none rounded-md bg-gray-400 leading-none">
                      ‌
                    </span>
                    <br />
                  </div>
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[240px] max-w-full" />
                </span>
              </a>
            </td>
          </tr>
          <tr>
            <td>
              <span>
                <Skeleton className="w-[140px] max-w-full" />
              </span>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[175px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[245px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[165px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[130px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[135px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[130px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <div
                    aria-live="polite"
                    aria-busy="true"
                    className={'w-[110px] max-w-full'}
                  >
                    <span className="inline-flex w-full animate-pulse select-none rounded-md bg-gray-400 leading-none">
                      ‌
                    </span>
                    <br />
                  </div>
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[240px] max-w-full" />
                </span>
              </a>
            </td>
          </tr>
          <tr>
            <td>
              <span>
                <Skeleton className="w-[140px] max-w-full" />
              </span>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[175px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[245px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[165px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[130px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[135px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[130px] max-w-full" />
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <div
                    aria-live="polite"
                    aria-busy="true"
                    className={'w-[110px] max-w-full'}
                  >
                    <span className="inline-flex w-full animate-pulse select-none rounded-md bg-gray-400 leading-none">
                      ‌
                    </span>
                    <br />
                  </div>
                </span>
              </a>
            </td>
            <td>
              <a>
                <span className="tracking-wider">
                  <Skeleton className="w-[240px] max-w-full" />
                </span>
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
};

export default App;
