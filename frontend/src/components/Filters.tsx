export function Filters<T extends string>({ options, selected, onSelect, label }: {
  options: readonly T[]; selected: T; onSelect: (value: T) => void; label: string;
}) {
  return <div className="filters" role="group" aria-label={label}>
    {options.map(option => <button key={option} onClick={() => onSelect(option)} aria-pressed={selected === option}>{option}</button>)}
  </div>;
}
