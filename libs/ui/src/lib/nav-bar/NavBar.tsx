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
  const isUserInitiatedChange = useRef<boolean>(false);

  useEffect(() => {
    // Only load companies once when session is available, not on every customer_id change
    async function loadCompanies() {
      if (!session?.user?.email || companies.length > 0) return;
      
      const userCompanies = await getCurrentUserCompanies(
        session.user.email
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
  }, [session?.user?.email]); // Changed dependency to email instead of customer_id

  // Separate effect to update selectedCompanyId when session changes
  useEffect(() => {
    if (session?.user?.customer_id && !isSwitchingCompany && !isUserInitiatedChange.current) {
      const newCompanyId = session.user.customer_id.toString();
      // Only update if it's actually different to prevent unnecessary re-renders
      if (newCompanyId !== selectedCompanyId) {
        setSelectedCompanyId(newCompanyId);
      }
    }
  }, [session?.user?.customer_id, isSwitchingCompany, selectedCompanyId]);

  const customerName = session?.user?.customer_name;
  const isAdminPath = pathname === '/admin';
  const isTicketsPath = pathname === '/tickets';

  // Memoize navigation handlers
  const navigateToTickets = useCallback(() => {
    if (typeof window !== 'undefined') {
      const savedFilter = sessionStorage.getItem('ticketFilter');
      if (savedFilter) {
        router.replace(`/tickets?${savedFilter}`);
      } else {
        router.replace(`/tickets`);
      }
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
  const handleCompanyChange = useCallback(async (newCompanyId: string) => {
    // Prevent multiple clicks during switching
    if (isSwitchingCompany) return;
    
    setIsSwitchingCompany(true);
    isUserInitiatedChange.current = true;
    let switchSuccessful = false;

    try {
      // Switch company on the server (with security validation)
      const result = await switchUserCompany(Number(newCompanyId));

      if (result.success) {
        switchSuccessful = true;
        
        // Update local state first to prevent flickering
        setSelectedCompanyId(newCompanyId);

        // Update the session with new company info
        await update({
          customer_id: Number(newCompanyId),
        });
        
        // Small delay to ensure session is fully updated
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Dispatch custom event to trigger tickets refresh without page reload
        // This provides a smoother experience than router.refresh()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('companyChanged', {
            detail: { newCompanyId: Number(newCompanyId) }
          }));
        }
        
        // Small delay to allow tickets to refresh before hiding loading
        setTimeout(() => {
          setIsSwitchingCompany(false);
        }, 500);
      } else {
        //@ts-ignore
        alert('Failed to switch company: ' + result.error);
        // Revert to previous company on error
        setSelectedCompanyId(session?.user?.customer_id?.toString() || '');
        setIsSwitchingCompany(false);
      }
    } catch (error) {
      alert('Error switching company. Please try again.');
      // Revert to previous company on error
      setSelectedCompanyId(session?.user?.customer_id?.toString() || '');
      setIsSwitchingCompany(false);
    } finally {
      // Reset flag after a short delay to allow session to update
      setTimeout(() => {
        isUserInitiatedChange.current = false;
      }, switchSuccessful ? 300 : 100);
    }
  }, [isSwitchingCompany, session, update]);

  /* Company Dropdown - Show only if user has multiple companies */
  const CompanySwitchDropdownMenu = useCallback(() => {
    return (
      companies.length > 1 &&
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

              // ⭐ Lock the label in place and prevent disappearing
              '& .MuiInputLabel-root': {
                transition: 'none',
                transform: 'translate(14px, -9px) scale(0.75)', // Keep label in shrunk position
                zIndex: 1,
                pointerEvents: 'none',
                '&.MuiInputLabel-shrink': {
                  transform: 'translate(14px, -9px) scale(0.75)',
                },
                '&.Mui-focused': {
                  color: 'gray',
                  transform: 'translate(14px, -9px) scale(0.75)',
                },
              },

              // ⭐ Keep gray even when focused
              '& .Mui-focused': {
                color: 'gray', // Stay gray on focus
              },
              // ⭐ Keep gray when filled
              '& .MuiFormLabel-filled': {
                color: 'gray', // Stay gray when filled
              },
            }}
          >
            <InputLabel
              id="company-select-label2"
              shrink
              sx={{
                color: 'gray',
                fontSize: '12px',
                paddingX: '5px',
                bgcolor: 'black', // Add back black background to cover border
                '&.MuiInputLabel-shrink': {
                  bgcolor: 'black',
                },
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
                color: 'gray',
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
  }, [companies.length, isTicketsPath, selectedCompanyId, isSwitchingCompany, handleCompanyChange]);

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
