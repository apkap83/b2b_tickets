import { AppPermissionTypes, AppRoleTypes } from '@b2b-tickets/shared-models';

export const userHasPermission = (session: any, permissionName: any) => {
  if (!session) return false;
  return session?.user?.permissions.some(
    (permission: any) =>
      permission.permissionName === permissionName ||
      permission.permissionName === AppPermissionTypes.API_Admin
  );
};

export const endPointPermitted = (session: any, endpoint: any) => {
  if (session?.user?.roles.includes(AppRoleTypes.Admin)) return true;

  return session?.user?.permissions.some((perm: any) =>
    perm.permissionEndPoint?.startsWith(endpoint)
  );
};

export const userHasRole = (session: any, roleName: any) => {
  if (!session) return false;
  return session?.user?.roles.some(
    (role: any) => role === AppRoleTypes.Admin || role === roleName
  );
};

export function formatDate(date: Date) {
  if (!date) return null;
  return date
    .toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

// utils.ts
export const getEnvVariable = (variableName: string): string => {
  const value = process.env[variableName];
  if (!value) {
    throw new Error(`${variableName} environment variable is not set.`);
  }
  return value;
};

export const getGreekDateFormat = (dateString: Date) => {
  // Format the date as DD/MM/YYYY
  const formattedDate = dateString.toLocaleDateString('el-GR');

  // Format the time as HH:MM AM/PM in Greek (πμ for AM and μμ for PM)
  const formattedTime = dateString.toLocaleTimeString('el-GR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit', // Include seconds
    hour12: true, // This ensures AM/PM format (πμ/μμ in Greek)
  });
  return `${formattedDate} ${formattedTime}`;
};

export const convertToISODate = (dateStr: string) => {
  // Replace Greek AM/PM with standard AM/PM
  let standardizedDateStr = dateStr.replace('πμ', 'AM').replace('μμ', 'PM');

  // Swap day and month
  const dateRegex = /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2} [AP]M)/;
  const match = standardizedDateStr.match(dateRegex);

  if (match) {
    const [, day, month, year, time] = match;
    standardizedDateStr = `${month}/${day}/${year} ${time}`;
  }

  console.log('standardizedDateStr', standardizedDateStr);

  // Parse the standardized date string to a JavaScript Date object
  const parsedDate = new Date(standardizedDateStr);
  console.log('parsedDate', parsedDate);

  // Convert the Date object to an ISO string
  return parsedDate.toISOString();
};

export const convertTo24HourFormat = (dateStr: string): string | null => {
  // Replace Greek AM/PM with standard AM/PM
  let standardizedDateStr = dateStr.replace('πμ', 'AM').replace('μμ', 'PM');

  // Parse the date string using a regex
  const dateRegex = /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}) (AM|PM)/;
  const match = standardizedDateStr.match(dateRegex);

  if (!match) return null;

  let [, day, month, year, hour, minute, period] = match;

  // Convert hour to 24-hour format
  let hourNumber = parseInt(hour);
  if (period === 'PM' && hourNumber < 12) {
    hourNumber += 12;
  } else if (period === 'AM' && hourNumber === 12) {
    hourNumber = 0;
  }

  // Format the date string to YYYY-MM-DD HH:mm:ss
  const formattedDate = `${year}-${month}-${day} ${String(hourNumber).padStart(
    2,
    '0'
  )}:${minute}:00`;

  return formattedDate;
};
