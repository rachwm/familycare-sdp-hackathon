import { useId } from 'react';

// Decorative layers cannot receive pointer events.
export function Botanical({ position }: { position: 'top' | 'bottom' }) {
  const gradient = useId().replace(/:/g, '');
  if (position === 'top') return <span className="botanical botanical--top" aria-hidden="true" />;
  return <svg className={`botanical botanical--${position}`} viewBox="0 0 430 180" aria-hidden="true" fill="none">
    <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2=".6"><stop stopColor="#e1f3e4" /><stop offset=".45" stopColor="#a8dbb9" /><stop offset="1" stopColor="#409e77" /></linearGradient></defs>
    <>
      <path d="M0 70C150 40 218 205 430 70V180H0Z" fill="#e2f1e8" />
      <path d="M0 135C160 190 246 27 430 124V180H0Z" fill="#cde8da" opacity=".6" />
      <path d="M0 162C159 96 263 222 430 138V180H0Z" fill="#bde1cd" opacity=".35" />
      {[false, true].map(mirror => <g key={String(mirror)} transform={mirror ? 'translate(430 0) scale(-1 1)' : undefined}>
        <path d="M4 183C32 132 25 76 12 9M15 164C38 141 70 126 111 122" stroke="#368d69" strokeWidth="1.3" />
        <path d="M21 136C-7 115-6 68 10 12C30 52 41 99 21 136Z" fill={`url(#${gradient})`} />
        <path d="M23 145C30 102 61 92 98 91C72 126 50 140 23 145Z" fill={`url(#${gradient})`} />
        <path d="M11 170C43 135 74 140 111 153C73 173 43 181 11 170Z" fill={`url(#${gradient})`} />
        <path d="M21 136 10 12M23 145 98 91M11 170 111 153" stroke="#5ca581" strokeWidth=".6" opacity=".7" />
      </g>)}
    </>
  </svg>;
}
