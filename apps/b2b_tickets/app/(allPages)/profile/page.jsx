// app/profile/page.tsx (Server Component)
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import { options } from '@b2b-tickets/auth-options';
import { AuthenticationTypes } from '@b2b-tickets/shared-models';
import { PasswordResetModal } from '@b2b-tickets/tickets/ui/admin-dashboard';
import { getUserIdentifier } from '@b2b-tickets/utils';

const MyProfile = async ({ searchParams }) => {
  const session = await getServerSession(options);

  if (!session) {
    redirect('/api/auth/signin?callbackUrl=/profile');
  }

  const showPasswordReset = searchParams?.modal === 'password-reset';

  const userDetails = {
    firstName: session.user?.firstName || 'N/A',
    lastName: session.user?.lastName || 'N/A',
    userName: session.user?.userName || 'N/A',
    email: session.user?.email || 'N/A',
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="relative max-w-md w-full mx-4">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden  transform transition-all hover:scale-[1.01] hover:shadow-3xl">
          {/* Header */}
          <div className="bg-black px-8 py-6 border-b-4 border-gray-800">
            <h2 className="text-2xl font-bold text-white text-center tracking-wide">
              User Profile
            </h2>
          </div>

          {/* Profile Content */}
          <div className="px-8 py-6 space-y-4">
            {/* Profile Info Grid */}
            <div className="space-y-3">
              <ProfileField label="First Name" value={userDetails.firstName} />
              <ProfileField label="Last Name" value={userDetails.lastName} />
              <ProfileField
                label="User Name"
                value={getUserIdentifier(
                  userDetails.userName,
                  userDetails.email
                )}
              />
              <ProfileField
                label="Account Type"
                value={session.user?.authenticationType || 'N/A'}
                badge
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-6">
              <ProfilePageButtons
                authenticationType={session.user?.authenticationType}
              />
            </div>
          </div>
        </div>
      </div>

      {showPasswordReset && <PasswordResetModal userDetails={userDetails} />}
    </div>
  );
};

const ProfileField = ({ label, value, badge = false }) => {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0 hover:bg-gray-50 px-2 -mx-2 rounded transition-colors">
      <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        {label}
      </span>
      {badge ? (
        <span className="px-4 py-1.5 text-xs font-bold text-white bg-black rounded-full uppercase tracking-wider shadow-sm">
          {value}
        </span>
      ) : (
        <span className="text-sm font-semibold text-black text-right max-w-[60%] break-words">
          {value}
        </span>
      )}
    </div>
  );
};

const ProfilePageButtons = ({ authenticationType }) => {
  if (authenticationType === AuthenticationTypes.LDAP) {
    return (
      <div className="flex justify-center">
        <Link
          className="w-full btn bg-black hover:bg-gray-800 text-white border-0 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl font-semibold uppercase tracking-wide"
          href="/"
        >
          Close
        </Link>
      </div>
    );
  }

  if (authenticationType === AuthenticationTypes.LOCAL) {
    return (
      <div className="flex gap-3">
        <Link
          className="flex-1 btn bg-black hover:bg-gray-800 text-white border-0 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl font-semibold uppercase tracking-wide"
          href="/profile?modal=password-reset"
        >
          Reset Password
        </Link>
        <Link
          className="flex-1 btn bg-white hover:bg-gray-100 text-black border-2 border-black rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl font-semibold uppercase tracking-wide"
          href="/"
        >
          Close
        </Link>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <Link
        className="w-full btn bg-black hover:bg-gray-800 text-white border-0 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl font-semibold uppercase tracking-wide"
        href="/"
      >
        Close
      </Link>
    </div>
  );
};

export default MyProfile;
