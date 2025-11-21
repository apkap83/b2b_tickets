'use client';

import {
  useState,
  useEffect,
  useRef,
  useContext,
  useMemo,
  useCallback,
  memo,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import {
  getCurrentUserCompanies,
  switchUserCompany,
} from '@b2b-tickets/admin-server-actions';
import {
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  CircularProgress,
} from '@mui/material';

import { IoListSharp } from 'react-icons/io5';
import { Box, IconButton, useTheme } from '@mui/material';
import Stack from '@mui/material/Stack';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

import { ColorModeContext, tokens } from '@b2b-tickets/ui-theme';
import { NovaLogo } from '@b2b-tickets/assets';
import { LoggedInIndication } from '@b2b-tickets/ui';
import {
  AppPermissionTypes,
  AppRoleTypes,
  FilterTicketsStatus,
} from '@b2b-tickets/shared-models';
import { userHasPermission, userHasRole } from '@b2b-tickets/utils';
import config from '@b2b-tickets/config';
import styles from './css/NavBar.module.scss';
import { SessionPopup } from '../session-popup/SessionPopup';

export const NavBar = memo(() => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const router = useRouter();
  const pathname = usePathname();

  // const [navbarHeight, setNavbarHeight] = useState(75);
  const navbarRef = useRef<HTMLDivElement | null>(null);

  const { data: session, status, update } = useSession();

  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    session?.user?.customer_id?.toString() || ''
  );
  const [isSwitchingCompany, setIsSwitchingCompany] = useState<boolean>(false);

  useEffect(() => {
    async function loadCompanies() {
      const userCompanies = await getCurrentUserCompanies(
        session?.user?.email || 'unknown'
      );
      setCompanies(userCompanies);

      // Set user's current customer_id as default if available
      if (session?.user?.customer_id) {
        setSelectedCompanyId(session.user.customer_id.toString());
      } else if (userCompanies.length > 0) {
        setSelectedCompanyId(userCompanies[0].customer_id.toString());
      }
    }

    loadCompanies();
  }, [session?.user?.customer_id]);

  const customerName = session?.user?.customer_name;
  const isAdminPath = pathname === '/admin';
  const isTicketsPath = pathname === '/tickets';

  // Memoize navigation handlers
  const navigateToTickets = useCallback(() => {
    const savedFilter = sessionStorage.getItem('ticketFilter');
    if (savedFilter) {
      router.replace(`/tickets?${savedFilter}`);
    } else {
      router.replace(`/tickets`);
    }
  }, [router]);

  const navigateToAdmin = useCallback(() => {
    router.push('/admin');
  }, [router]);

  // Memoize environment indicator
  const environmentIndicator = useMemo(() => {
    if (process.env['NEXT_PUBLIC_APP_ENV'] === 'staging') {
      return (
        <div className="absolute left-[40%] rounded-md hidden lg:flex items-center justify-center h-12">
          <div className="rounded-md text-center text-sm text-gray-400 border border-gray-400 mx-auto h-auto px-2 shadow-white shadow-sm">
            Staging Environment
          </div>
        </div>
      );
    } else if (process.env['NODE_ENV'] === 'development') {
      return (
        <div className="absolute left-[40%] rounded-md hidden lg:flex items-center justify-center h-12">
          <div className="rounded-md text-center text-sm text-gray-400 border border-gray-400 mx-auto h-auto px-2 shadow-white shadow-sm">
            Development Environment
          </div>
        </div>
      );
    }
    return null;
  }, []);

  const permissionForTicketCreation = userHasPermission(
    session,
    AppPermissionTypes.Create_New_Ticket
  );

  // Handle company switching
  const handleCompanyChange = async (newCompanyId: string) => {
    setIsSwitchingCompany(true);

    try {
      // Switch company on the server (with security validation)
      const result = await switchUserCompany(Number(newCompanyId));

      if (result.success) {
        // Update the session with new company info
        await update({
          customer_id: Number(newCompanyId),
        });

        // Update local state
        setSelectedCompanyId(newCompanyId);

        // Small delay to ensure session is updated before refresh
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Refresh the page to load tickets for the new company
        router.refresh();
      } else {
        //@ts-ignore
        alert('Failed to switch company: ' + result.error);
        // Revert to previous company on error
        setSelectedCompanyId(session?.user?.customer_id?.toString() || '');
      }
    } catch (error) {
      alert('Error switching company. Please try again.');
      // Revert to previous company on error
      setSelectedCompanyId(session?.user?.customer_id?.toString() || '');
    } finally {
      setIsSwitchingCompany(false);
    }
  };

  /* Company Dropdown - Show only if user has multiple companies */
  const CompanySwitchDropdownMenu = () => {
    return (
      // companies.length > 1 &&
      isTicketsPath && (
        <div
          className="w-full h-full relative bg-gray-900 flex items-center justify-center mr-3 px-4 "
          style={{
            borderRight: '1px dashed #5b5ea090',
          }}
        >
          <FormControl
            size="small"
            sx={{
              minWidth: '100px',
              backgroundColor: 'black',
              border: isSwitchingCompany ? '1px dashed gray' : '1px solid gray',

              // ⭐ Lock the label in place
              '& .MuiInputLabel-root': {
                transition: 'none',
              },

              // ⭐ Keep gray even when focused
              '& .Mui-focused': {
                // color: 'gray', // Stay gray on focus
              },
              // ⭐ Keep gray when filled
              '& .MuiFormLabel-filled': {
                color: 'gray', // Stay gray when filled
              },
            }}
          >
            <InputLabel
              id="company-select-label2"
              sx={{
                color: 'gray',
                bgcolor: 'black',
                fontSize: '12px',
                paddingX: '5px',
              }}
            >
              Company
            </InputLabel>
            <Select
              labelId="company-select-label"
              id="company-select"
              value={selectedCompanyId}
              label="Company"
              onChange={(e) => handleCompanyChange(e.target.value)}
              disabled={isSwitchingCompany}
              sx={{
                position: 'relative',
                fontSize: '12px',
                backgroundColor: 'black',
                color: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,.1)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 0, 0, 0.23)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 0, 0, 0.87)',
                },
                '& .MuiSelect-select': {
                  paddingX: '10px',
                  paddingY: '5px',
                },
                '& .MuiSvgIcon-root': {
                  color: 'white',
                  paddingRight: '0px',
                  display: isSwitchingCompany ? 'none' : 'block',
                },
                '& .MuiCircularProgress-root': {
                  color: 'white',
                },
                '& .MuiCircularProgress-svg': {
                  width: '20px',
                  height: '20px',
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    marginTop: '15px',
                    backgroundColor: '#111827',
                    color: 'white',
                    '& MuiMenu-list': {
                      border: '1px solid gray',
                    },
                    '& .MuiMenuItem-root': {
                      padding: '8px',
                      fontSize: '12px',

                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        },
                      },
                    },
                  },
                },
              }}
              endAdornment={
                isSwitchingCompany ? (
                  <CircularProgress
                    size={20}
                    sx={{
                      position: 'absolute',
                      left: '45%',
                    }}
                  />
                ) : null
              }
            >
              {companies.map((company) => (
                <MenuItem
                  key={company.customer_id}
                  value={company.customer_id.toString()}
                >
                  {company.customer_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      )
    );
  };

  return (
    <>
      <Box
        ref={navbarRef}
        display="flex"
        justifyContent="space-between"
        className={`${styles.navBar}`}
      >
        <>
          <Stack
            className="hover:cursor-pointer "
            sx={{
              borderTopLeftRadius: '5px',
              borderTopRightRadius: '5px',
            }}
            onClick={navigateToTickets}
          >
            <Stack
              sx={{
                bgcolor: 'white',
                paddingY: '5px',
                paddingX: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                borderTopLeftRadius: '5px',
                borderTopRightRadius: '5px',
              }}
            >
              <Image
                priority
                src={NovaLogo}
                alt={'Nova Logo'}
                height={18}
                width={110}
                style={{
                  width: '110px',
                  height: '18.2px',
                  objectFit: 'cover',
                }}
                placeholder="empty"
              />
            </Stack>
            <div className={`${styles.b2b_logo_text} whitespace-nowrap`}>
              Platinum Support
            </div>
          </Stack>
        </>

        {environmentIndicator}

        <Box className={`${styles.menuAndLoggedIndication} mr-3`}>
          <div
            className="flex items-center border-y border-solid border-[#5b5ea090] pr-1 sm:pr-5"
            style={{
              borderRight: '1px dashed #5b5ea090',
            }}
          >
            <CompanySwitchDropdownMenu />
            {userHasPermission(session, AppPermissionTypes.Users_List_Page) ? (
              <>
                <IconButton
                  className="flex flex-col"
                  onClick={navigateToAdmin}
                  sx={{
                    color: isAdminPath
                      ? colors.blueAccent[500]
                      : colors.grey[800], // Conditionally apply color
                    borderRadius: '5px',
                    '&:hover': {
                      backgroundColor: '#3d3d3f',
                    },
                  }}
                >
                  <SettingsOutlinedIcon />
                  <span className="text-xs">Users List</span>
                </IconButton>
              </>
            ) : null}

            <IconButton
              className="flex flex-col justify-center items-center "
              onClick={navigateToTickets}
              sx={{
                color: isTicketsPath
                  ? colors.blueAccent[500]
                  : colors.grey[800], // Conditionally apply color
                borderRadius: '5px',
                '&:hover': {
                  backgroundColor: '#3d3d3f',
                },
              }}
            >
              <IoListSharp />
              <span className="text-xs">Tickets List</span>
            </IconButton>
          </div>

          <div className="pl-1 sm:pl-5 flex justify-center items-center gap-2 border-y border-[#5b5ea090] border-solid">
            <LoggedInIndication session={session} customerName={customerName} />
            <SessionPopup />
          </div>
        </Box>
      </Box>
    </>
  );
});
