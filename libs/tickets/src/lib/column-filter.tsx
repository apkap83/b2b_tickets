'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { getUniqueItemsForColumn } from '@b2b-tickets/server-actions';
import { allowedColumnsForFiltering } from '@b2b-tickets/utils';
import { AllowedColumnsForFilteringType } from '@b2b-tickets/shared-models';

type UniqueColumn = {
  id: number;
  value: string;
};

export const ColumnFilter = ({
  column,
  closeFilter,
}: {
  column: AllowedColumnsForFilteringType;
  closeFilter: () => void;
}) => {
  const [checkboxes, setCheckboxes] = useState<Record<string, boolean>>({
    selectAll: true,
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // State to track the search term
  const [allItems, setAllItems] = useState<UniqueColumn[]>([]); // Store the full list of items

  // Filter Applied only for Specific Columns
  if (!allowedColumnsForFiltering.includes(column)) return null;

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const delimiter = '\x1F'; // ASCII Unit Separator (non-printable character)

  const handleFilter = () => {
    const params = new URLSearchParams(searchParams); // Existing query parameters
    const delimiter = '\x1F'; // ASCII Unit Separator (non-printable character)

    // Get selected items (exclude "selectAll")
    const selectedItems = Object.keys(checkboxes)
      .filter((key) => checkboxes[key as string] && key !== 'selectAll')
      .map((key) => allItems.find((item) => String(item.id) === key)?.value)
      .filter(Boolean); // Remove undefined values

    if (selectedItems.length === allItems.length) {
      // If all items are selected, remove the filter
      params.delete(column); // Remove the column from the query string
      params.set('page', '1'); // Reset page to 1
    } else if (selectedItems.length > 0) {
      // Apply the filter with selected items, using the delimiter
      params.set(column, selectedItems.join(delimiter)); // Replace with concatenated values
      params.set('page', '1'); // Reset page to 1
    } else {
      // No selection means clear the filter
      params.delete(column); // Remove the column from the query string
    }
    sessionStorage.setItem('ticketFilter', params.toString());

    // Apply updated query parameters
    replace(`${pathname}?${params.toString()}`);
    closeFilter(); // Close the filter dropdown
  };

  // Fetch unique items and initialize state
  useEffect(() => {
    const getValuesForColumn = async () => {
      setLoading(true);
      const resp = await getUniqueItemsForColumn(column);
      const items = resp?.data || [];

      // Get the filtered items from the URL
      const appliedFilter = searchParams.get(column)?.split(delimiter) || [];

      // Initialize checkboxes state
      const initialCheckboxes: Record<string, boolean> = {};
      items.forEach((item: UniqueColumn) => {
        initialCheckboxes[item.id] =
          appliedFilter.length === 0 || appliedFilter.includes(item.value);
      });

      // "Select All" should be checked if no filter is applied or all items are selected
      initialCheckboxes.selectAll =
        appliedFilter.length === 0 || appliedFilter.length === items.length;

      setCheckboxes(initialCheckboxes);
      setAllItems([...items]);
      await new Promise((resolve) => setTimeout(resolve, 250));
      setLoading(false);
    };

    getValuesForColumn();
  }, [column]);

  // Handle individual checkbox toggle
  const handleCheckboxChange = (id: number) => {
    setCheckboxes((prevState) => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };

  // Handle "Select All" toggle
  const handleSelectAllChange = () => {
    const newSelectAllState = !checkboxes.selectAll;
    const updatedCheckboxes: Record<string, boolean> = {
      selectAll: newSelectAllState,
    };
    Object.keys(checkboxes).forEach((key) => {
      if (key !== 'selectAll') {
        updatedCheckboxes[key] = newSelectAllState;
      }
    });
    setCheckboxes(updatedCheckboxes);
  };

  // Filter items based on the search term
  const filteredItems = allItems.filter((item) =>
    item.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className="absolute bg-white max-h-[450px] border p-2 ml-[-5px] overflow-hidden"
      onClick={(e) => e.stopPropagation()} // Stop event propagation
    >
      <input
        type="text"
        className="border p-1 w-full mb-1"
        placeholder="Search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)} // Update search term
      />
      <div className="max-h-[320px] overflow-y-auto overflow-x-hidden">
        {loading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <ul>
            <li className="hover:bg-gray-200 p-1">
              <label className="flex items-center gap-1" htmlFor="selectall">
                <input
                  id="selectall"
                  type="checkbox"
                  checked={checkboxes.selectAll}
                  onChange={handleSelectAllChange}
                />
                (Select All)
              </label>
            </li>
            {filteredItems.map((item, id) => (
              <li key={id} className="hover:bg-gray-200 p-1">
                <label
                  className="flex items-center gap-1"
                  htmlFor={String(item.id)}
                >
                  <input
                    id={String(item.id)}
                    type="checkbox"
                    checked={checkboxes[item.id] || false}
                    onChange={() => handleCheckboxChange(item.id)}
                  />
                  {item.value}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      {loading ? null : (
        <>
          <div className="border my-1"></div>
          <div className="mt-2 flex justify-end gap-2">
            <button
              className="bg-gray-300 hover:bg-gray-400 text-black px-3 py-1 rounded"
              onClick={closeFilter} // Close the dropdown
            >
              Cancel
            </button>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
              //@ts-ignore
              onClick={handleFilter} // Apply the filter and close the dropdown
            >
              OK
            </button>
          </div>
        </>
      )}
    </div>
  );
};
