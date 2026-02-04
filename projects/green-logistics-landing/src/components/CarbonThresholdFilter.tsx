/**
 * Carbon Threshold Filter Component
 * Allows users to filter fleets by carbon intensity (EI) threshold
 */

import { useState, useCallback } from 'react';
import { Leaf, TrendingDown } from 'lucide-react';

interface CarbonThresholdFilterProps {
  minThreshold?: number;
  maxThreshold?: number;
  currentThreshold: number;
  onThresholdChange: (threshold: number) => void;
  onPresetSelect?: (preset: string) => void;
}

export const CARBON_PRESETS = {
  eco: { label: '탄소 중립 (≤ 100)', value: 100, color: 'emerald' },
  low: { label: '저탄소 (≤ 150)', value: 150, color: 'green' },
  moderate: { label: '중간 (≤ 200)', value: 200, color: 'blue' },
  standard: { label: '표준 (≤ 250)', value: 250, color: 'yellow' },
  all: { label: '모두 표시', value: 500, color: 'slate' },
};

export function CarbonThresholdFilter({
  minThreshold = 50,
  maxThreshold = 300,
  currentThreshold,
  onThresholdChange,
  onPresetSelect,
}: CarbonThresholdFilterProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState(currentThreshold);

  const handleSliderChange = useCallback(
    (value: number) => {
      setCustomValue(value);
      onThresholdChange(value);
    },
    [onThresholdChange]
  );

  const handlePresetClick = useCallback(
    (presetKey: string) => {
      const preset = CARBON_PRESETS[presetKey as keyof typeof CARBON_PRESETS];
      setIsCustom(false);
      setCustomValue(preset.value);
      onThresholdChange(preset.value);
      onPresetSelect?.(presetKey);
    },
    [onThresholdChange, onPresetSelect]
  );

  const getThresholdColor = (value: number) => {
    if (value <= 100) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (value <= 150) return 'text-green-600 bg-green-50 border-green-200';
    if (value <= 200) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (value <= 250) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const getThresholdLabel = (value: number) => {
    if (value <= 100) return '탄소 중립';
    if (value <= 150) return '저탄소';
    if (value <= 200) return '중간';
    if (value <= 250) return '표준';
    return '모두 표시';
  };

  const matchedPreset = Object.entries(CARBON_PRESETS).find(
    ([, preset]) => preset.value === customValue
  );

  return (
    <div className="w-full space-y-6 p-6 rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-100">
          <Leaf className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">탄소 강도 필터</h3>
          <p className="text-sm text-slate-600 mt-0.5">
            gCO₂e/t·km 기준으로 차량군 필터링
          </p>
        </div>
      </div>

      {/* Current Threshold Display */}
      <div className={`p-4 rounded-lg border ${getThresholdColor(customValue)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">현재 임계값</p>
            <p className="text-2xl font-bold mt-1">{customValue} gCO₂e/t·km</p>
            <p className="text-xs mt-1 opacity-75">{getThresholdLabel(customValue)}</p>
          </div>
          <div className="text-right">
            <TrendingDown className="h-8 w-8 opacity-50" />
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">빠른 선택</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(CARBON_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetClick(key)}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition ${
                matchedPreset?.[0] === key
                  ? `border-emerald-600 bg-emerald-50 text-emerald-700`
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="text-xs opacity-75">{preset.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">사용자 지정</p>
          <button
            onClick={() => setIsCustom(!isCustom)}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            {isCustom ? '완료' : '조정'}
          </button>
        </div>

        {isCustom && (
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            {/* Slider */}
            <div>
              <input
                type="range"
                min={minThreshold}
                max={maxThreshold}
                value={customValue}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-xs text-slate-600 mt-2">
                <span>{minThreshold} gCO₂e/t·km</span>
                <span>{maxThreshold} gCO₂e/t·km</span>
              </div>
            </div>

            {/* Input Field */}
            <input
              type="number"
              value={customValue}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              min={minThreshold}
              max={maxThreshold}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {/* Range Presets */}
            <div className="grid grid-cols-3 gap-2">
              {[100, 150, 200, 250, 300].map((value) => (
                <button
                  key={value}
                  onClick={() => handleSliderChange(value)}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    customValue === value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Information */}
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">탄소 강도 등급</h4>
        <div className="space-y-1 text-xs text-blue-800">
          <p>
            <span className="font-semibold">Grade 1:</span> 저탄소 (≤ 160
            gCO₂e/t·km)
          </p>
          <p>
            <span className="font-semibold">Grade 2:</span> 중간 (161-200
            gCO₂e/t·km)
          </p>
          <p>
            <span className="font-semibold">Grade 3:</span> 표준 (201+ gCO₂e/t·km)
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
        <p className="text-sm text-emerald-900">
          <span className="font-semibold">현재 설정:</span> {customValue}
          gCO₂e/t·km 이하의 차량군만 표시됩니다.
        </p>
      </div>
    </div>
  );
}

export default CarbonThresholdFilter;
