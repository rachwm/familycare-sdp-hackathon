import type { ReactNode } from 'react';
export type IconName = 'home' | 'bell' | 'history' | 'profile' | 'message' | 'pill' | 'alert' | 'clock' | 'chevron' | 'arrow' | 'check' | 'close' | 'people' | 'car' | 'hourglass' | 'shield' | 'help' | 'logout' | 'info' | 'back';
const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-8 9 8v11h-6v-7H9v7H3Z" /></>,
  bell: <><path d="M5 9a7 7 0 0 1 14 0c0 8 3 8 3 9H2c0-1 3-1 3-9Z" /><path d="M9 21h6" /></>,
  history: <><path d="M5 2h9l5 5v15H5Z" /><path d="M14 2v6h5M9 12h6M9 16h6" /></>,
  profile: <><circle cx="12" cy="7" r="4" /><path d="M3 22c0-10 18-10 18 0Z" /></>,
  message: <><path d="M4 3h16v14H10l-6 5v-5H2V5a2 2 0 0 1 2-2Z" /><path d="M6 7h10M6 11h6" /></>,
  pill: <><path d="m4 12 8-8a6 6 0 0 1 8 8l-8 8a6 6 0 0 1-8-8ZM8 8l8 8M3 3l18 18" /></>,
  alert: <><path d="m10 3-9 17a1 1 0 0 0 1 2h20a1 1 0 0 0 1-2L14 3a2 2 0 0 0-4 0Z" /><path d="M12 8v6M12 18v.1" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
  chevron: <path d="m9 5 7 7-7 7" />,
  arrow: <path d="M3 12h18m-7-7 7 7-7 7" />,
  check: <path d="m6 12 4 4 8-8" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  people: <><circle cx="12" cy="7" r="3" /><path d="M6 21v-3a6 6 0 0 1 12 0v3ZM4 4a3 3 0 0 0 0 6M20 4a3 3 0 0 1 0 6M3 13a5 5 0 0 0-2 8h2M21 13a5 5 0 0 1 2 8h-2" /></>,
  car: <><path d="m4 10 2-6h12l2 6M2 10h20v9H2ZM5 19v3M19 19v3M5 14h2M17 14h2" /></>,
  hourglass: <><path d="M5 2h14M5 22h14M7 2c0 7 2 6 5 10-3 4-5 3-5 10M17 2c0 7-2 6-5 10 3 4 5 3 5 10M8 6h8M8 18h8" /></>,
  shield: <><path d="m12 2 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6Z" /><path d="m8 12 3 3 5-6" /></>,
  help: <><circle cx="12" cy="12" r="10" /><path d="M9 8a3 3 0 1 1 4 3c-1 1-1 2-1 3M12 18v.1" /></>,
  logout: <><path d="M9 3H3v18h6M9 12h13m-5-5 5 5-5 5" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 11v6M12 7v.1" /></>,
  back: <path d="M21 12H3m6-7-7 7 7 7" />,
};
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
