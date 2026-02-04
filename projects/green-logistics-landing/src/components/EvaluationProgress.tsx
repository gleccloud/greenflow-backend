/**
 * Evaluation Progress Component
 * Shows real-time progress of bid evaluation with streaming updates
 */

import { useState } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useEvaluationStatus } from '../hooks/useRealtimeUpdates';
import { type EvaluationStatusResponse } from '../services/api';

interface EvaluationProgressProps {
  evaluationId: string;
  onComplete?: (result: EvaluationStatusResponse) => void;
  onError?: (error: Error) => void;
}

export function EvaluationProgress({
  evaluationId,
  onComplete,
  onError,
}: EvaluationProgressProps) {
  const [displayStatus, setDisplayStatus] = useState<EvaluationStatusResponse | null>(null);
  const connection = useEvaluationStatus(evaluationId, {
    onMessage: (data) => {
      const status = data as EvaluationStatusResponse;
      setDisplayStatus(status);

      // Call completion callback when done
      if (status.status === 'completed' || status.status === 'COMPLETED') {
        onComplete?.(status);
      }
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const progress = displayStatus?.progress;
  const percentage = progress ? Math.round(progress.percentage * 100) : 0;

  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-lg border border-emerald-200 bg-emerald-50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-600">
          {displayStatus?.status === 'completed' ||
          displayStatus?.status === 'COMPLETED' ? (
            <CheckCircle className="h-6 w-6 text-white" />
          ) : (
            <Clock className="h-6 w-6 text-white animate-spin" />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">입찰 평가 진행 중</h3>
          <p className="text-sm text-slate-600">
            {displayStatus?.status === 'completed' ||
            displayStatus?.status === 'COMPLETED'
              ? '평가가 완료되었습니다'
              : 'AI가 모든 제안을 평가 중입니다'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">진행률</span>
            <span className="text-sm font-semibold text-emerald-600">
              {percentage}%
            </span>
          </div>
          <div className="w-full h-2 bg-emerald-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-slate-600 mt-2">
            {progress.processedProposals}개 / {progress.totalProposals}개 처리됨
          </p>
        </div>
      )}

      {/* Stats */}
      {displayStatus?.result && (
        <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-white rounded-lg border border-emerald-100">
          <div>
            <p className="text-xs text-slate-600">최고 점수</p>
            <p className="text-lg font-semibold text-slate-900">
              {displayStatus.result.bestScore.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600">평가된 제안</p>
            <p className="text-lg font-semibold text-slate-900">
              {displayStatus.result.proposalCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600">예산 내</p>
            <p className="text-lg font-semibold text-emerald-600">
              {displayStatus.result.withinBudget}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600">리드타임 충족</p>
            <p className="text-lg font-semibold text-emerald-600">
              {displayStatus.result.meetsLeadtime}
            </p>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-white border border-slate-200">
        <div
          className={`h-2 w-2 rounded-full ${
            connection.isConnected ? 'bg-emerald-600' : 'bg-slate-400'
          }`}
        />
        <span className="text-xs text-slate-600">
          {connection.isConnected
            ? connection.isSSE
              ? '실시간 연결 (SSE)'
              : '폴링 업데이트'
            : '연결 중...'}
        </span>
      </div>

      {/* Error Message */}
      {connection.error && (
        <div className="mt-4 flex gap-3 rounded-lg bg-red-50 p-3 border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{connection.error.message}</p>
        </div>
      )}

      {/* Duration */}
      {displayStatus?.duration && (
        <p className="text-xs text-slate-600 mt-4 text-center">
          소요 시간: {(displayStatus.duration / 1000).toFixed(2)}초
        </p>
      )}
    </div>
  );
}

export default EvaluationProgress;
