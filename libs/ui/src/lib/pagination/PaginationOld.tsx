import { clsx } from 'clsx';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
  totalItems: number;
  pageSize: number;
  activePage: number;
  onPageChange: (page: number) => void;
}

interface PaginationArrowProps {
  direction: 'left' | 'right';
  isDisabled: boolean;
  activePage: number;
  onPageChange: any;
}

interface PaginationNumberProps {
  page: string | number;
  isActive: boolean;
  position: string | undefined;
  onPageChange: any;
}
export const PaginationOld = ({
  totalItems,
  pageSize,
  activePage,
  onPageChange,
}: PaginationProps) => {
  const numberOfPages = Math.ceil(totalItems / pageSize);
  const allPages = generatePagination(activePage, numberOfPages);

  return (
    <div id="pagination" className="join">
      <PaginationArrow
        direction="left"
        isDisabled={activePage <= 1}
        activePage={activePage}
        onPageChange={onPageChange}
      />

      {allPages.map((page, index) => {
        let position;
        if (index === 0) position = 'first';
        if (index === allPages.length - 1) position = 'last';
        if (allPages.length === 1) position = 'single';
        if (page === '...') position = 'middle';

        return (
          <PaginationNumber
            key={`${page}-${index}`}
            page={page}
            isActive={page === activePage}
            position={position}
            onPageChange={onPageChange}
          />
        );
      })}

      <PaginationArrow
        direction="right"
        isDisabled={activePage >= numberOfPages}
        activePage={activePage}
        onPageChange={onPageChange}
      />
    </div>
  );
};

function PaginationNumber({
  page,
  isActive,
  position,
  onPageChange,
}: PaginationNumberProps) {
  const className = clsx(
    'flex h-10 w-10 items-center justify-center text-sm border',
    {
      'rounded-l-md': position === 'first' || position === 'single',
      'rounded-r-md': position === 'last' || position === 'single',
      'z-1 bg-blue-600 border-blue-600 text-white': isActive,
      'hover:bg-gray-100': !isActive && position !== 'middle',
      'text-gray-300': position === 'middle',
    }
  );

  return isActive || position === 'middle' ? (
    <div className={className}>{page}</div>
  ) : (
    <button className={className} onClick={() => onPageChange(page)}>
      {page}
    </button>
  );
}

function PaginationArrow({
  direction,
  isDisabled,
  activePage,
  onPageChange,
}: PaginationArrowProps) {
  const className = clsx(
    'flex h-10 w-10 items-center justify-center rounded-md border',
    {
      'pointer-events-none text-gray-300': isDisabled,
      'hover:bg-gray-100': !isDisabled,
      'mr-2 md:mr-4': direction === 'left',
      'ml-2 md:ml-4': direction === 'right',
    }
  );

  const icon =
    direction === 'left' ? (
      <ArrowLeftIcon className="w-4" />
    ) : (
      <ArrowRightIcon className="w-4" />
    );

  const onClickEvent =
    direction === 'left'
      ? () => {
          onPageChange(activePage - 1);
        }
      : () => {
          onPageChange(activePage + 1);
        };

  return isDisabled ? (
    <div className={className}>{icon}</div>
  ) : (
    <button className={className} onClick={onClickEvent}>
      {icon}
    </button>
  );
}

const generatePagination = (currentPage: number, totalPages: number) => {
  // If the total number of pages is 7 or less,
  // display all pages without any ellipsis.
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // If the current page is among the first 3 pages,
  // show the first 3, an ellipsis, and the last 2 pages.
  if (currentPage <= 3) {
    return [1, 2, 3, '...', totalPages - 1, totalPages];
  }

  // If the current page is among the last 3 pages,
  // show the first 2, an ellipsis, and the last 3 pages.
  if (currentPage >= totalPages - 2) {
    return [1, 2, '...', totalPages - 2, totalPages - 1, totalPages];
  }

  // If the current page is somewhere in the middle,
  // show the first page, an ellipsis, the current page and its neighbors,
  // another ellipsis, and the last page.
  return [
    1,
    '...',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...',
    totalPages,
  ];
};
