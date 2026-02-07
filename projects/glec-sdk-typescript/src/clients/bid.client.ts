import { HttpClient } from '../utils/http';
import {
  Bid,
  Proposal,
  CreateBidInput,
  UpdateBidInput,
  AwardBidInput,
  CreateProposalInput,
  UpdateProposalInput,
  BidEvaluationInput,
  BidEvaluationResult,
  ListBidsQuery,
  ListProposalsQuery,
} from '../types/bid';
import { PaginatedResponse } from '../types/common';

/**
 * Bid & Proposal Client
 * 입찰 전체 생명주기 관리 + 투찰 시스템
 */
export class BidClient {
  constructor(private readonly http: HttpClient) {}

  // === Bid CRUD ===

  /**
   * Create a new bid (입찰 등록)
   */
  async createBid(input: CreateBidInput): Promise<Bid> {
    return this.http.post<Bid>('/bids', input);
  }

  /**
   * Get bid by ID
   */
  async getBid(bidId: string): Promise<Bid> {
    return this.http.get<Bid>(`/bids/${bidId}`);
  }

  /**
   * List bids with filters
   */
  async listBids(query?: ListBidsQuery): Promise<PaginatedResponse<Bid>> {
    return this.http.get<PaginatedResponse<Bid>>('/bids', query as any);
  }

  /**
   * Update bid (입찰 수정) — only in DRAFT status
   */
  async updateBid(bidId: string, input: UpdateBidInput): Promise<Bid> {
    return this.http.put<Bid>(`/bids/${bidId}`, input);
  }

  /**
   * Delete bid (입찰 삭제) — only in DRAFT status
   */
  async deleteBid(bidId: string): Promise<void> {
    return this.http.delete(`/bids/${bidId}`);
  }

  /**
   * Publish bid (DRAFT → OPEN, 공개)
   */
  async publishBid(bidId: string): Promise<Bid> {
    return this.http.post<Bid>(`/bids/${bidId}/publish`);
  }

  /**
   * Close bid (OPEN → CLOSED, 마감)
   */
  async closeBid(bidId: string): Promise<Bid> {
    return this.http.post<Bid>(`/bids/${bidId}/close`);
  }

  /**
   * Award bid (낙찰)
   */
  async awardBid(bidId: string, input: AwardBidInput): Promise<Bid> {
    return this.http.post<Bid>(`/bids/${bidId}/award`, input);
  }

  /**
   * Cancel bid (유찰)
   */
  async cancelBid(bidId: string, reason: string): Promise<Bid> {
    return this.http.post<Bid>(`/bids/${bidId}/void`, { reason });
  }

  /**
   * Evaluate bid — multi-factor scoring (price × leadtime × EI)
   * POST /order/bid-evaluation
   *
   * @param input - Full evaluation payload including proposals, policy weights, and budget
   * @returns Ranked proposals with score breakdowns, statistics, and recommendations
   */
  async evaluateBid(input: BidEvaluationInput): Promise<BidEvaluationResult> {
    return this.http.post<BidEvaluationResult>('/order/bid-evaluation', input);
  }

  // === Proposal CRUD ===

  /**
   * Submit a proposal (투찰 등록)
   */
  async createProposal(input: CreateProposalInput): Promise<Proposal> {
    return this.http.post<Proposal>('/proposals', input);
  }

  /**
   * List proposals
   */
  async listProposals(query?: ListProposalsQuery): Promise<PaginatedResponse<Proposal>> {
    return this.http.get<PaginatedResponse<Proposal>>('/proposals', query as any);
  }

  /**
   * Get proposal by ID
   */
  async getProposal(proposalId: string): Promise<Proposal> {
    return this.http.get<Proposal>(`/proposals/${proposalId}`);
  }

  /**
   * Update proposal (투찰 수정)
   */
  async updateProposal(proposalId: string, input: UpdateProposalInput): Promise<Proposal> {
    return this.http.put<Proposal>(`/proposals/${proposalId}`, input);
  }

  /**
   * Withdraw proposal (투찰 철회)
   */
  async withdrawProposal(proposalId: string, reason: string): Promise<Proposal> {
    return this.http.post<Proposal>(`/proposals/${proposalId}/withdraw`, { reason });
  }
}
