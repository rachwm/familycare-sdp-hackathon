import { useId } from 'react';

// Original SVG artwork. Decorative layers cannot receive pointer events.
function Sprig({ gradient }: { gradient: string }) {
  const leaves = [
    { x: 159, y: 170, angle: -78, scale: .85 },
    { x: 136, y: 125, angle: -89, scale: 1.03 },
    { x: 105, y: 83, angle: -40, scale: 1.12 },
    { x: 163, y: 177, angle: 12, scale: .78 },
    { x: 141, y: 134, angle: 43, scale: .96 },
    { x: 112, y: 91, angle: 43, scale: .92 },
    { x: 186, y: 209, angle: -62, scale: .73 },
  ];
  return <g>
    <path d="M207 244C174 194 158 151 131 112C111 83 96 55 75 31" stroke="#338863" strokeWidth="1.8" />
    {leaves.map(({ x, y, angle, scale }, index) => <g key={index} transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
      <path d="M0 0C-31-10-49-43-43-85C-5-61 12-30 0 0Z" fill={`url(#${gradient})`} />
      <path d="M0 0C-12-28-25-58-43-85M-12-29l-21-7M-22-49l-18-7M-13-30l9-23" stroke="#499e73" strokeWidth=".65" opacity=".5" />
    </g>)}
  </g>;
}
export function Botanical({ position }: { position: 'top' | 'bottom' }) {
  const gradient = useId().replace(/:/g, '');
  return <svg className={`botanical botanical--${position}`} viewBox={position === 'top' ? '0 0 220 245' : '0 0 430 180'} aria-hidden="true" fill="none">
    <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2=".6"><stop stopColor="#e1f3e4" /><stop offset=".45" stopColor="#a8dbb9" /><stop offset="1" stopColor="#409e77" /></linearGradient></defs>
    {position === 'top' ? <Sprig gradient={gradient} /> : <>
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
    </>}
  </svg>;
}
