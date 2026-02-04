import { X } from 'lucide-react';

interface FilterBarProps {
  onDatePreset?: (preset: '7d' | '30d' | '90d') => void;
  onCustomDate?: (startDate: string, endDate: string) => void;
  onFilter?: (filters: Record<string, string>) => void;
  onClear?: () => void;
  filterOptions?: Array<{
    name: string;
    label: string;
    options: Array<{ value: string; label: string }>;
  }>;
}

export function FilterBar({
  onDatePreset,
  onFilter,
  onClear,
  filterOptions = [],
}: FilterBarProps) {
  const handleDatePreset = (preset: '7d' | '30d' | '90d') => {
    onDatePreset?.(preset);
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:gap-3">
      {/* Date Presets */}
      <div className="flex gap-2">
        <label className="flex items-center text-sm font-medium text-slate-600">
          기간:
        </label>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((preset) => (
            <button
              key={preset}
              onClick={() => handleDatePreset(preset as '7d' | '30d' | '90d')}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-700"
            >
              {preset === '7d' ? '7일' : preset === '30d' ? '30일' : '90일'}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Dropdowns */}
      {filterOptions.map((filter) => (
        <div key={filter.name} className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">
            {filter.label}:
          </label>
          <select
            onChange={(e) =>
              onFilter?.({ [filter.name]: e.target.value })
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">전체</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {/* Clear Button */}
      <button
        onClick={onClear}
        className="ml-auto flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <X className="h-4 w-4" />
        필터 초기화
      </button>
    </div>
  );
}
