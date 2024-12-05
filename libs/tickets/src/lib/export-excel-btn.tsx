'use client';
import { useState } from 'react';
import Button from '@mui/material/Button';
import { getFilteredTicketsForCustomer } from '@b2b-tickets/server-actions';
import {
  TicketDetail,
  TicketDetailForTicketCreator,
} from '@b2b-tickets/shared-models';
import * as XLSX from 'xlsx';
import { SiMicrosoftexcel } from 'react-icons/si';
import Tooltip from '@mui/material/Tooltip';

export const ExportToExcelButton = ({
  query,
  currentPage,
  disabled,
}: {
  query: string;
  currentPage: number;
  disabled: boolean;
}) => {
  const [producingExcelFile, setProducingExcelFile] = useState(false);

  const getDataAndConvertToExcel = async () => {
    setProducingExcelFile(true);
    const ticketsList = await getFilteredTicketsForCustomer(
      query,
      currentPage,
      true
    );

    setTimeout(() => {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      // Convert the data to a worksheet
      const worksheet = XLSX.utils.json_to_sheet(ticketsList.pageData);
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      // Generate an Excel file
      XLSX.writeFile(workbook, 'exported_data.xlsx');
      setProducingExcelFile(false);
    }, 500);
  };

  return (
    <Tooltip title="Export list to Excel">
      <span>
        <Button
          variant="outlined"
          sx={{
            border: '1px solid #45464a50',
            height: '33px',
            paddingTop: '16px',
            paddingBottom: '16px',
          }}
          onClick={() => {
            getDataAndConvertToExcel();
          }}
          disabled={disabled}
        >
          <div className="flex flex-col justify-center items-center">
            <SiMicrosoftexcel size={16} />
            {producingExcelFile ? (
              <div
                style={{
                  fontSize: '7px',
                }}
              >
                Exporting...
              </div>
            ) : null}
          </div>
        </Button>
      </span>
    </Tooltip>
  );
};
