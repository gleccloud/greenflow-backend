/**
 * GLEC SDK — Bid & Proposal Types
 */

export type BidStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'AWARDED' | 'CANCELLED' | 'EXPIRED';
export type ProposalStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface Bid {
  id: string;
  shipperId: string;
  title: string;
  description: string;
  status: BidStatus;
  cargoType: string;
  cargoWeightTonnes: number;
  originLocation: string;
  destinationLocation: string;
  distanceKm: number;
  requiredLeadtimeHours: number;
  maxBudget: number | null;
  expiresAt: string;
  priceWeight: number;
  leadtimeWeight: number;
  eiWeight: number;
  proposalCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBidInput {
  title: string;
  description?: string;
  cargoType: string;
  cargoWeightTonnes: number;
  originLocation: string;
  destinationLocation: string;
  distanceKm: number;
  requiredLeadtimeHours?: number;
  maxBudget?: number;
  expiresAt: string;
  priceWeight?: number;
  leadtimeWeight?: number;
  eiWeight?: number;
  metadata?: Record<string, any>;
}

export interface UpdateBidInput {
  title?: string;
  description?: string;
  cargoType?: string;
  cargoWeightTonnes?: number;
  maxBudget?: number;
  expiresAt?: string;
  priceWeight?: number;
  leadtimeWeight?: number;
  eiWeight?: number;
}

export interface AwardBidInput {
  proposalId: string;
}

export interface Proposal {
  id: string;
  bidId: string;
  carrierId: string;
  fleetId: string | null;
  carrierName: string;
  proposedPrice: number;
  estimatedLeadtimeHours: number;
  fleetEI: number | null;
  fleetEIGrade: string | null;
  score: number | null;
  rank: number | null;
  status: ProposalStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProposalInput {
  bidId: string;
  fleetId?: string;
  carrierName: string;
  proposedPrice: number;
  estimatedLeadtimeHours: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateProposalInput {
  proposedPrice?: number;
  estimatedLeadtimeHours?: number;
  fleetId?: string;
  notes?: string;
}

// === Bid Evaluation (POST /order/bid-evaluation) ===

export interface EvaluationProposalInput {
  proposalId: string;
  fleetId: string;
  proposedPrice: number;
  estimatedLeadtimeHours: number;
  fleetEI: number;
  fleetEIGrade?: 'GRADE_1' | 'GRADE_2' | 'GRADE_3';
  carrierName?: string;
}

export interface EvaluationPolicy {
  /** Price weight [0-1] */
  alpha: number;
  /** Leadtime weight [0-1] */
  beta: number;
  /** EI (carbon intensity) weight [0-1] */
  gamma: number;
}

export interface BidEvaluationInput {
  bidId: string;
  orderId?: string;
  budgetMin: number;
  budgetMax: number;
  requiredLeadtimeHours: number;
  proposals: EvaluationProposalInput[];
  evaluationPolicy: EvaluationPolicy;
}

export interface ScoreBreakdown {
  priceNormalized: number;
  priceScore: number;
  leadtimeNormalized: number;
  leadtimeScore: number;
  eiNormalized: number;
  eiScore: number;
  finalScore: number;
}

export interface RankedProposal {
  proposalId: string;
  fleetId: string;
  carrierName: string;
  proposedPrice: number;
  estimatedLeadtimeHours: number;
  fleetEI: number;
  fleetEIGrade: string;
  score: number;
  rank: number;
  scoreBreakdown: ScoreBreakdown;
  withinBudget: boolean;
  meetsLeadtime: boolean;
  recommendation: string;
}

export interface BidEvaluationResult {
  bidId: string;
  evaluationId: string;
  evaluatedAt: string;
  policyUsed: EvaluationPolicy;
  ranked: RankedProposal[];
  bestProposal: RankedProposal;
  statistics: {
    totalProposals: number;
    withinBudget: number;
    meetsLeadtime: number;
    averageScore: number;
    bestScore: number;
    worstScore: number;
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
  };
  recommendations: string[];
}

export interface ListBidsQuery {
  shipperId?: string;
  status?: BidStatus;
  page?: number;
  limit?: number;
}

export interface ListProposalsQuery {
  bidId?: string;
  carrierId?: string;
  status?: ProposalStatus;
  page?: number;
  limit?: number;
}
