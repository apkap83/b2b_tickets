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
