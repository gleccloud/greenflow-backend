import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { Fleet, Grade } from '../../types/dashboard';

interface FleetComparisonTableProps {
  fleets: Fleet[];
  showPrice?: boolean;
  showCoverage?: boolean;
}

type SortField = 'vehicleType' | 'carbonIntensity' | 'grade' | 'price' | 'coverage';
type SortOrder = 'asc' | 'desc';

export function FleetComparisonTable({
  fleets,
  showPrice = true,
  showCoverage = false,
}: FleetComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>('carbonIntensity');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedFleets = [...fleets].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const GradeBadge = ({ grade }: { grade: Grade }) => {
    const colors = {
      GRADE_1: 'bg-emerald-100 text-emerald-700',
      GRADE_2: 'bg-amber-100 text-amber-700',
      GRADE_3: 'bg-slate-100 text-slate-700',
    };
    const labels = {
      GRADE_1: '1등급 (실측)',
      GRADE_2: '2등급 (모델링)',
      GRADE_3: '3등급 (기본값)',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colors[grade]}`}
      >
        {labels[grade]}
      </span>
    );
  };

  const SortHeader = ({
    label,
    field,
  }: {
    label: string;
    field: SortField;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-2 font-semibold hover:text-emerald-600"
    >
      {label}
      {sortField === field && (
        <>
          {sortOrder === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </>
      )}
    </button>
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-6 py-4 text-left">
              <SortHeader label="차량 타입" field="vehicleType" />
            </th>
            <th className="px-6 py-4 text-left">
              <SortHeader
                label="탄소집약도 (gCO₂e/t·km)"
                field="carbonIntensity"
              />
            </th>
            <th className="px-6 py-4 text-left">
              <SortHeader label="데이터 등급" field="grade" />
            </th>
            <th className="px-6 py-4 text-left">소유사</th>
            {showPrice && (
              <th className="px-6 py-4 text-left">
                <SortHeader label="가격" field="price" />
              </th>
            )}
            {showCoverage && (
              <th className="px-6 py-4 text-left">
                <SortHeader label="커버리지" field="coverage" />
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedFleets.map((fleet, idx) => (
            <tr
              key={fleet.id}
              className={`border-b border-slate-100 transition hover:bg-emerald-50 ${
                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
              }`}
            >
              <td className="px-6 py-4 text-sm font-medium text-slate-900">
                {fleet.vehicleType}
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  {fleet.carbonIntensity.toFixed(1)}
                </span>
              </td>
              <td className="px-6 py-4">
                <GradeBadge grade={fleet.grade} />
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">{fleet.owner}</td>
              {showPrice && (
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                  ₩{fleet.price?.toLocaleString()}
                </td>
              )}
              {showCoverage && (
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${fleet.coverage}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {fleet.coverage}%
                    </span>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
