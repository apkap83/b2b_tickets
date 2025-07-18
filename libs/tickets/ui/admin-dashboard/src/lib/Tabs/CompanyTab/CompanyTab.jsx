import React, { useState, useEffect, useMemo } from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { PaginationOld } from '@b2b-tickets/ui';
import slice from 'lodash/slice';
import { AuthenticationTypes } from '@b2b-tickets/shared-models';

import {
  updateMFAMethodForUser,
  getAllCompanyData,
  getCompanyCategories,
  addCustomerTicketCategory,
  deactivateCustomerTicketCategory,
} from '@b2b-tickets/admin-server-actions';
import styles from './css/CompanyTab.module.scss';
import config from '@b2b-tickets/config';
import toast from 'react-hot-toast';

export function CompanyTab({ usersList, rolesList }) {
  const [activePage, setActivePage] = useState(1);
  const [companyData, setCompanyData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [showServicesModal, setShowServicesModal] = useState({
    visible: false,
    companyName: '',
    customerId: '',
    services: [],
    isLoadingServices: false,
  });

  const itemsPerPage = 15000;

  // Filter company data based on search term
  const filteredCompanyData = useMemo(() => {
    if (!searchTerm.trim()) {
      return companyData;
    }
    return companyData.filter(
      (company) =>
        company.Customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company['Fiscal Number']?.includes(searchTerm)
    );
  }, [companyData, searchTerm]);

  // Reset to first page when search term changes
  useEffect(() => {
    setActivePage(1);
  }, [searchTerm]);

  // Paginate the filtered company data
  const paginatedCompanyData = slice(
    filteredCompanyData,
    (activePage - 1) * itemsPerPage,
    (activePage - 1) * itemsPerPage + itemsPerPage
  );

  useEffect(() => {
    const getCompData = async () => {
      try {
        setIsLoading(true);
        const resp = await getAllCompanyData();
        setCompanyData(resp.companyData);
      } catch (error) {
        console.error('Error fetching company data:', error);
        toast.error('Failed to load company data');
      } finally {
        setIsLoading(false);
      }
    };

    getCompData();
  }, []);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleOpenServicesModal = async (company) => {
    setShowServicesModal({
      visible: true,
      companyName: company.Customer,
      customerId: company.customer_id,
      customer_ticket_category_id: company.customer_ticket_category_id,
      services: [],
      isLoadingServices: true,
    });

    try {
      const resp = await getCompanyCategories({
        customerId: company.customer_id,
      });
      setShowServicesModal((prev) => ({
        ...prev,
        services: resp.companyData,
        isLoadingServices: false,
      }));
    } catch (error) {
      console.error('Error fetching company categories:', error);
      toast.error('Failed to load company services');
      setShowServicesModal((prev) => ({
        ...prev,
        isLoadingServices: false,
      }));
    }
  };

  const handleCloseServicesModal = () => {
    setShowServicesModal({
      visible: false,
      companyName: '',
      customerId: '',
      customer_ticket_category_id: '',
      services: [],
      isLoadingServices: false,
    });
  };

  const handleServiceToggle = async (service) => {
    console.log('service', service);
    const isCurrentlyChecked = service.Assigned === 'y';

    try {
      // Optimistically update the UI
      setShowServicesModal((prev) => ({
        ...prev,
        services: prev.services.map((s) =>
          s.category_id === service.category_id
            ? { ...s, Assigned: isCurrentlyChecked ? 'n' : 'y' }
            : s
        ),
      }));

      let result;

      if (isCurrentlyChecked) {
        // Deactivate the category
        result = await deactivateCustomerTicketCategory({
          customerTicketCategoryId: service.customer_ticket_category_id,
        });
      } else {
        // Add the category
        result = await addCustomerTicketCategory({
          customerId: parseInt(showServicesModal.customerId),
          categoryId: service.category_id,
        });
      }

      if (result.success) {
        setShowServicesModal((prev) => ({
          ...prev,
          services: prev.services.map((s) =>
            s.category_id === service.category_id
              ? { ...s, customer_ticket_category_id: result.result }
              : s
          ),
        }));

        toast.success(
          `Service ${isCurrentlyChecked ? 'removed' : 'added'} successfully`
        );
      } else {
        // Revert the optimistic update on failure
        setShowServicesModal((prev) => ({
          ...prev,
          services: prev.services.map((s) =>
            s.category_id === service.category_id
              ? {
                  ...s,
                  Assigned: isCurrentlyChecked ? 'y' : 'n',
                }
              : s
          ),
        }));
        toast.error(result.error || 'Failed to update service');
      }
    } catch (error) {
      // Revert the optimistic update on error
      setShowServicesModal((prev) => ({
        ...prev,
        services: prev.services.map((s) =>
          s.category_id === service.category_id
            ? { ...s, Assigned: isCurrentlyChecked ? 'y' : 'n' }
            : s
        ),
      }));
      console.error('Error updating service:', error);
      toast.error('Failed to update service');
    }
  };

  const handleSaveServices = () => {
    // Services are now saved immediately when toggled, so this just closes the modal
    toast.success('Services configuration completed!');
    handleCloseServicesModal();
  };

  return (
    <>
      <div className="mb-[2rem] border-b rounded-lg">
        <div className="w-[8%] float-right py-5 flex gap-1 items-center justify-end -translate-y-[16px]"></div>

        {/* Search Section */}
        <div className="px-3 mt-3 mb-2">
          <div className="flex items-center gap-3 max-w-md">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by Customer Name or AFM..."
                value={searchTerm}
                onChange={handleSearchChange}
                disabled={isLoading}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {/* Search Icon */}
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              {/* Clear Button */}
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg
                    className="h-5 w-5 text-gray-400 hover:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Search Results Info */}
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-600">
              {filteredCompanyData.length === 0 ? (
                <span className="text-red-600">
                  No customers found matching "{searchTerm}"
                </span>
              ) : (
                <span>
                  Found {filteredCompanyData.length} customer
                  {filteredCompanyData.length !== 1 ? 's' : ''}
                  {filteredCompanyData.length !== companyData.length &&
                    ` out of ${companyData.length}`}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="px-3">
          <table className={`${styles.myTable} table`}>
            <thead>
              <tr>
                <th></th>
                <th>Customer Name</th>
                <th>Customer Type</th>
                <th>AFM</th>
                <th className="w-[150px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="text-center py-3">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                      <span className="text-gray-500">
                        Loading company data...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedCompanyData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    {searchTerm
                      ? 'No customers found matching your search.'
                      : 'No company data available.'}
                  </td>
                </tr>
              ) : (
                paginatedCompanyData.map((company, index) => (
                  <tr
                    key={company.customer_id + index}
                    className="hover:bg-slate-100"
                  >
                    <th>{index + 1 + itemsPerPage * (activePage - 1)}</th>
                    <td>
                      {searchTerm ? (
                        <span
                          dangerouslySetInnerHTML={{
                            __html: company.Customer?.replace(
                              new RegExp(`(${searchTerm})`, 'gi'),
                              '<mark style="background-color: #fef08a; padding: 0 2px;">$1</mark>'
                            ),
                          }}
                        />
                      ) : (
                        company.Customer
                      )}
                    </td>
                    <td>{company['Customer Type']}</td>
                    <td>
                      {searchTerm ? (
                        <span
                          dangerouslySetInnerHTML={{
                            __html: company['Fiscal Number']?.replace(
                              new RegExp(`(${searchTerm})`, 'gi'),
                              '<mark style="background-color: #fef08a; padding: 0 2px;">$1</mark>'
                            ),
                          }}
                        />
                      ) : (
                        company['Fiscal Number']
                      )}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleOpenServicesModal(company)}
                        className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                      >
                        Services
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot></tfoot>
          </table>
        </div>
      </div>

      <div className="px-5 pt-5 flex justify-between items-center">
        <div className="py-5 flex gap-1 ">
          <button
            className="btn btn-sm bg-black text-white"
            onClick={() => {
              setShowCreateUserModal(true);
            }}
          >
            Create New User
          </button>
        </div>
        <PaginationOld
          totalItems={filteredCompanyData?.length || 0}
          pageSize={itemsPerPage}
          activePage={activePage}
          onPageChange={(page) => setActivePage(page)}
        />
      </div>

      {/* Services Modal */}
      {showServicesModal.visible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Services Configuration
              </h2>
              <button
                onClick={handleCloseServicesModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Company: {showServicesModal.companyName}
              </h3>
              <p className="text-sm text-gray-600">
                Reduce available services for this company:
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {showServicesModal.isLoadingServices ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                  <span className="text-sm text-gray-500">
                    Loading services...
                  </span>
                </div>
              ) : showServicesModal.services.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No services available for this company
                </div>
              ) : (
                showServicesModal.services.map((service) => (
                  <label
                    key={service.CATEGORY_ID}
                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={service.Assigned === 'y'}
                      onChange={() => handleServiceToggle(service)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-gray-700">{service.Category}</span>
                    {service.Assigned === 'y' && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Assigned
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCloseServicesModal}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
