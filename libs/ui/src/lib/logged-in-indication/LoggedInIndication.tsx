'use client';
import React, { useState, useEffect, useRef } from 'react';
import { IconButton } from '@mui/material';
import { FaRegCircleUser } from 'react-icons/fa6';
import { FaCircleUser } from 'react-icons/fa6';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { userHasRole } from '@b2b-tickets/utils';
import { AppRoleTypes } from '@b2b-tickets/shared-models';

export const LoggedInIndication = ({ session, customerName }: any) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef();

  const userIsHandler = userHasRole(session, AppRoleTypes.B2B_TicketHandler);
  const userIsCreator = userHasRole(session, AppRoleTypes.B2B_TicketCreator);
  const bothRoles = userIsHandler && userIsCreator;

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      //@ts-ignore
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  const ProfileMenuContents = () => {
    return (
      <div
        //@ts-ignore
        ref={menuRef}
        className="absolute z-10  bg-gray-50 w-auto border-gray-200 border-2 rounded-md text-gray-600"
        style={{
          top: '24px',
          right: '0px',
        }}
      >
        <ul className={`menu menu-lg p-2`}>
          <li>
            <Link href={'/profile'} onClick={() => setProfileMenuOpen(false)}>
              Profile
            </Link>
          </li>
          <li
            onClick={async () => {
              await signOut({ callbackUrl: process.env.SIGNOUT_CALLBACKURL });
            }}
          >
            <span className="whitespace-nowrap">
              Log Out - {session?.user?.userName}
            </span>
          </li>
        </ul>
      </div>
    );
  };
  return (
    <>
      <IconButton
        className="flex flex-col"
        sx={{
          color: 'white',
          padding: 0,
          paddingX: '5px',
          borderRadius: '5px',

          '&:hover': {
            backgroundColor: '#3d3d3f',
          },
        }}
        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
      >
        <PersonOutlinedIcon />
        <span className="loggedInUserName text-xs leading-3 ">
          {session?.user?.userName || ''}
        </span>
        <div
          style={{
            fontSize: '9px',
          }}
          className="text-[#bcbff0] mt-[3px] font-bold border-t border-dotted justify-center items-center "
        >
          {customerName !== 'Nova' ? (
            <div className="border-t  border-dotted border-black">
              {customerName}
            </div>
          ) : (
            <>
              {bothRoles ? (
                <div className="border-t border-dotted border-black">
                  Nova Ticket Handler & Ticket Creator
                </div>
              ) : userIsHandler ? (
                <div className="border-t border-dotted border-black">
                  Nova Ticket Handler
                </div>
              ) : userIsCreator ? (
                <div className="border-t border-dotted border-black">
                  Ticket Creator
                </div>
              ) : (
                <div className="border-t border-dotted border-black">
                  No Role Assigned
                </div>
              )}
            </>
          )}
        </div>
        {profileMenuOpen ? <ProfileMenuContents /> : null}
      </IconButton>
    </>
  );
};
