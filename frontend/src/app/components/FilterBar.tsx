import { Filter } from 'lucide-react';

interface FilterBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const filters = [
  { id: 'all', label: 'All IPOs' },
  { id: 'open', label: 'Open Now' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'closed', label: 'Recently Closed' }
];

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Filter:</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === filter.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}