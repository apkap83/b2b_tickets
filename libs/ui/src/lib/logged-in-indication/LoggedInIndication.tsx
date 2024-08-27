'use client';
import React, { useState, useEffect, useRef } from 'react';
import { IconButton } from '@mui/material';
import { FaRegCircleUser } from 'react-icons/fa6';
import { FaCircleUser } from 'react-icons/fa6';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';

export const LoggedInIndication = ({ session }: any) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event: any) => {
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
        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
      >
        <PersonOutlinedIcon />
        <span className="text-xs">apostolos.kapetanios</span>
        {profileMenuOpen ? <ProfileMenuContents /> : null}
      </IconButton>
    </>
  );
};
