/**
 * Bid Evaluation Modal
 * Shows detailed bid evaluation results with proposal comparison
 */

import { useState } from 'react';
import { X, TrendingUp, CheckCircle } from 'lucide-react';
import { type BidEvaluationResponse, type RankedProposal } from '../services/api';
import { ProposalRankings } from './ProposalRankings';

interface BidEvaluationModalProps {
  isOpen: boolean;
  evaluation: BidEvaluationResponse | null;
  onClose: () => void;
  onSelectProposal?: (proposal: RankedProposal) => void;
}

export function BidEvaluationModal({
  isOpen,
  evaluation,
  onClose,
  onSelectProposal,
}: BidEvaluationModalProps) {
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<'rankings' | 'stats' | 'recommendations'>('rankings');

  if (!isOpen || !evaluation) return null;

  const selectedProposal = evaluation.ranked.find(
    (p) => p.proposalId === selectedProposalId
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:transform md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl md:max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-blue-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">입찰 평가 결과</h2>
            <p className="text-sm text-slate-600 mt-1">
              평가 ID: {evaluation.evaluationId.substring(0, 8)}...
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100 transition"
          >
            <X className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-sm text-emerald-700 font-medium">최고 점수</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                {evaluation.bestProposal.score.toFixed(2)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">평가된 제안</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {evaluation.statistics.totalProposals}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-sm text-purple-700 font-medium">예산 내</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">
                {evaluation.statistics.withinBudget}/
                <span className="text-sm text-purple-700">
                  {evaluation.statistics.totalProposals}
                </span>
              </p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-700 font-medium">평균 점수</p>
              <p className="text-2xl font-bold text-amber-600 mt-2">
                {evaluation.statistics.averageScore.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Evaluation Policy */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3">평가 정책</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-600">가격 가중치 (α)</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {(evaluation.policyUsed.alpha * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600">리드타임 가중치 (β)</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {(evaluation.policyUsed.beta * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600">탄소강도 가중치 (γ)</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {(evaluation.policyUsed.gamma * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200">
            {['rankings', 'stats', 'recommendations'].map((tab) => (
              <button
                key={tab}
                onClick={() =>
                  setActiveTab(
                    tab as 'rankings' | 'stats' | 'recommendations'
                  )
                }
                className={`px-4 py-2 font-medium text-sm transition border-b-2 -mb-0.5 ${
                  activeTab === tab
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'rankings' && '순위'}
                {tab === 'stats' && '통계'}
                {tab === 'recommendations' && '추천'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'rankings' && (
            <ProposalRankings
              proposals={evaluation.ranked}
              selectedProposalId={selectedProposalId || undefined}
              onSelectProposal={(id) => {
                setSelectedProposalId(id);
                const proposal = evaluation.ranked.find(
                  (p) => p.proposalId === id
                );
                onSelectProposal?.(proposal!);
              }}
            />
          )}

          {activeTab === 'stats' && (
            <div className="space-y-4">
              {/* Price Statistics */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white">
                <h4 className="font-semibold text-slate-900 mb-3">가격 통계</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-600">최소 가격</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      ₩{evaluation.statistics.minPrice.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">평균 가격</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      ₩{evaluation.statistics.averagePrice.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">최대 가격</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      ₩{evaluation.statistics.maxPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scoring Statistics */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white">
                <h4 className="font-semibold text-slate-900 mb-3">점수 통계</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-600">최저 점수</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {evaluation.statistics.worstScore.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">평균 점수</p>
                    <p className="text-lg font-bold text-emerald-600 mt-1">
                      {evaluation.statistics.averageScore.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">최고 점수</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {evaluation.statistics.bestScore.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compliance Statistics */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white">
                <h4 className="font-semibold text-slate-900 mb-3">규정 준수</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-xs text-slate-600">리드타임 충족</p>
                      <p className="text-lg font-bold text-slate-900">
                        {evaluation.statistics.meetsLeadtime}/
                        {evaluation.statistics.totalProposals}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-xs text-slate-600">예산 내</p>
                      <p className="text-lg font-bold text-slate-900">
                        {evaluation.statistics.withinBudget}/
                        {evaluation.statistics.totalProposals}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-3">
              {evaluation.recommendations.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <p className="text-slate-600">추천 사항이 없습니다.</p>
                </div>
              ) : (
                evaluation.recommendations.map((recommendation, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200"
                  >
                    <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">{recommendation}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition"
          >
            닫기
          </button>
          {selectedProposal && (
            <button
              onClick={() => {
                onSelectProposal?.(selectedProposal);
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
            >
              선택된 제안 확정
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default BidEvaluationModal;
