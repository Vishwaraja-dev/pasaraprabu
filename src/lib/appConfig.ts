export const OWNER_NAME = 'Prabu';
export const OWNER_HONORIFIC = 'Mr.';
export const OWNER_DISPLAY_NAME = `${OWNER_HONORIFIC} ${OWNER_NAME}`;
export const APP_NAME = 'Pasara Management';

export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
