/**
 * Proposal Rankings Component
 * Displays ranked proposals with scoring breakdown and recommendations
 */

import { useMemo } from 'react';
import { TrendingUp, CheckCircle } from 'lucide-react';
import { type RankedProposal } from '../services/api';

interface ProposalRankingsProps {
  proposals: RankedProposal[];
  selectedProposalId?: string;
  onSelectProposal?: (proposalId: string) => void;
}

export function ProposalRankings({
  proposals,
  selectedProposalId,
  onSelectProposal,
}: ProposalRankingsProps) {
  const sortedProposals = useMemo(
    () => [...proposals].sort((a, b) => a.rank - b.rank),
    [proposals]
  );

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'GRADE_1':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'GRADE_2':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'GRADE_3':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">제안 순위</h3>
        <div className="text-sm text-slate-600">
          총 {sortedProposals.length}개 제안
        </div>
      </div>

      {/* Rankings Table */}
      <div className="space-y-2">
        {sortedProposals.length === 0 ? (
          <div className="p-6 text-center rounded-lg border border-slate-200 bg-slate-50">
            <p className="text-slate-600">평가 대기 중...</p>
          </div>
        ) : (
          sortedProposals.map((proposal) => (
            <button
              key={proposal.proposalId}
              onClick={() => onSelectProposal?.(proposal.proposalId)}
              className={`w-full p-4 rounded-lg border-2 transition ${
                selectedProposalId === proposal.proposalId
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:border-emerald-300'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Rank Badge */}
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-lg shadow-md">
                    {getRankIcon(proposal.rank)}
                  </div>
                </div>

                {/* Main Info */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-slate-900">
                      {proposal.carrierName}
                    </h4>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getGradeColor(
                        proposal.fleetEIGrade
                      )}`}
                    >
                      {proposal.fleetEIGrade}
                    </span>

                    {proposal.withinBudget && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                        <CheckCircle className="h-3 w-3" />
                        예산 내
                      </span>
                    )}

                    {proposal.meetsLeadtime && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                        <CheckCircle className="h-3 w-3" />
                        리드타임 충족
                      </span>
                    )}
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-3 py-3 border-y border-slate-200">
                    <div>
                      <p className="text-xs text-slate-600">가격</p>
                      <p className="text-sm font-semibold text-slate-900">
                        ₩{proposal.proposedPrice.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">탄소 강도</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {proposal.fleetEI} gCO₂e/t·km
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">예상 리드타임</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {proposal.estimatedLeadtimeHours}시간
                      </p>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="bg-slate-50 p-3 rounded mb-3 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-600">
                        최종 점수
                      </span>
                      <span className="text-lg font-bold text-emerald-600">
                        {proposal.score.toFixed(2)}점
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600">가격 점수</span>
                        <span className="font-semibold text-slate-900">
                          {proposal.scoreBreakdown.priceScore.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">리드타임 점수</span>
                        <span className="font-semibold text-slate-900">
                          {proposal.scoreBreakdown.leadtimeScore.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">탄소 강도 점수</span>
                        <span className="font-semibold text-slate-900">
                          {proposal.scoreBreakdown.eiScore.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  {proposal.recommendation && (
                    <div className="flex gap-2 items-start">
                      <TrendingUp className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-emerald-700">
                        {proposal.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {sortedProposals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div>
            <p className="text-sm text-emerald-700">최고 점수</p>
            <p className="text-2xl font-bold text-emerald-600">
              {Math.max(...sortedProposals.map((p) => p.score)).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-emerald-700">평균 점수</p>
            <p className="text-2xl font-bold text-emerald-600">
              {(
                sortedProposals.reduce((sum, p) => sum + p.score, 0) /
                sortedProposals.length
              ).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-emerald-700">예산 내 제안</p>
            <p className="text-2xl font-bold text-emerald-600">
              {sortedProposals.filter((p) => p.withinBudget).length}/{' '}
              {sortedProposals.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProposalRankings;
