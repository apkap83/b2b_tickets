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
