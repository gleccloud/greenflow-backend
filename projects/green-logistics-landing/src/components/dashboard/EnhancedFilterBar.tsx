/**
 * Enhanced FilterBar Component
 * Advanced filtering with date ranges, multi-select, and filter persistence
 */

import { useState, useCallback } from 'react';
import { ChevronDown, X, Settings } from 'lucide-react';

export interface FilterConfig {
  dateRange: 'last7days' | 'last30days' | 'last90days' | 'custom';
  startDate?: string;
  endDate?: string;
  statuses?: string[];
  routes?: string[];
  vehicles?: string[];
}

interface EnhancedFilterBarProps {
  onFilterChange: (filters: FilterConfig) => void;
  availableStatuses?: string[];
  availableRoutes?: string[];
  availableVehicles?: string[];
  initialFilters?: FilterConfig;
}

export function EnhancedFilterBar({
  onFilterChange,
  availableStatuses = ['OPEN', 'CLOSED', 'AWARDED'],
  availableRoutes = [],
  availableVehicles = [],
  initialFilters,
}: EnhancedFilterBarProps) {
  const [filters, setFilters] = useState<FilterConfig>(
    initialFilters || {
      dateRange: 'last30days',
      statuses: [],
      routes: [],
      vehicles: [],
    }
  );

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleDateRangeChange = useCallback(
    (range: FilterConfig['dateRange']) => {
      const newFilters = { ...filters, dateRange: range };
      setFilters(newFilters);
      onFilterChange(newFilters);
    },
    [filters, onFilterChange]
  );

  const handleStatusToggle = useCallback(
    (status: string) => {
      const newStatuses = filters.statuses?.includes(status)
        ? filters.statuses.filter((s) => s !== status)
        : [...(filters.statuses || []), status];

      const newFilters = { ...filters, statuses: newStatuses };
      setFilters(newFilters);
      onFilterChange(newFilters);
    },
    [filters, onFilterChange]
  );

  const handleRouteToggle = useCallback(
    (route: string) => {
      const newRoutes = filters.routes?.includes(route)
        ? filters.routes.filter((r) => r !== route)
        : [...(filters.routes || []), route];

      const newFilters = { ...filters, routes: newRoutes };
      setFilters(newFilters);
      onFilterChange(newFilters);
    },
    [filters, onFilterChange]
  );

  const handleVehicleToggle = useCallback(
    (vehicle: string) => {
      const newVehicles = filters.vehicles?.includes(vehicle)
        ? filters.vehicles.filter((v) => v !== vehicle)
        : [...(filters.vehicles || []), vehicle];

      const newFilters = { ...filters, vehicles: newVehicles };
      setFilters(newFilters);
      onFilterChange(newFilters);
    },
    [filters, onFilterChange]
  );

  const handleClearFilters = useCallback(() => {
    const newFilters: FilterConfig = {
      dateRange: 'last30days',
      statuses: [],
      routes: [],
      vehicles: [],
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  }, [onFilterChange]);

  const hasActiveFilters =
    (filters.statuses && filters.statuses.length > 0) ||
    (filters.routes && filters.routes.length > 0) ||
    (filters.vehicles && filters.vehicles.length > 0) ||
    filters.dateRange !== 'last30days';

  return (
    <div className="space-y-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
      {/* Date Range Selection */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          기간
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '최근 7일', value: 'last7days' as const },
            { label: '최근 30일', value: 'last30days' as const },
            { label: '최근 90일', value: 'last90days' as const },
            { label: '사용자 지정', value: 'custom' as const },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleDateRangeChange(option.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filters.dateRange === option.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Filters */}
      {availableStatuses.length > 0 && (
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">
            상태
          </label>
          <div className="flex flex-wrap gap-2">
            {availableStatuses.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusToggle(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  filters.statuses?.includes(status)
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Filters Toggle */}
      {(availableRoutes.length > 0 || availableVehicles.length > 0) && (
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          <Settings className="h-4 w-4" />
          {showAdvanced ? '고급 필터 숨기기' : '고급 필터 보기'}
          <ChevronDown
            className={`h-4 w-4 transition ${showAdvanced ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          {availableRoutes.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                노선
              </label>
              <div className="flex flex-wrap gap-2">
                {availableRoutes.map((route) => (
                  <button
                    key={route}
                    onClick={() => handleRouteToggle(route)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      filters.routes?.includes(route)
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {route}
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableVehicles.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                차량 유형
              </label>
              <div className="flex flex-wrap gap-2">
                {availableVehicles.map((vehicle) => (
                  <button
                    key={vehicle}
                    onClick={() => handleVehicleToggle(vehicle)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      filters.vehicles?.includes(vehicle)
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {vehicle}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Filters & Clear Button */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div className="flex flex-wrap gap-1">
            {filters.dateRange !== 'last30days' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-200 text-xs text-slate-700">
                기간: {filters.dateRange}
                <X className="h-3 w-3 cursor-pointer" />
              </span>
            )}
            {filters.statuses?.map((status) => (
              <span
                key={status}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-xs text-emerald-700"
              >
                {status}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleStatusToggle(status)}
                />
              </span>
            ))}
          </div>
          <button
            onClick={handleClearFilters}
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            모든 필터 초기화
          </button>
        </div>
      )}
    </div>
  );
}

export default EnhancedFilterBar;
