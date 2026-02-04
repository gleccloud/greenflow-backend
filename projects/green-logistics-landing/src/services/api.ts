/**
 * API Service Layer
 * Centralized API client for all backend communication
 * Base URL: http://localhost:3000/api/v2
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v2';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface BidEvaluationRequest {
  bidId: string;
  orderId?: string;
  budgetMin: number;
  budgetMax: number;
  requiredLeadtimeHours: number;
  proposals: ProposalData[];
  evaluationPolicy: {
    alpha: number;
    beta: number;
    gamma: number;
  };
}

export interface ProposalData {
  proposalId: string;
  fleetId: string;
  proposedPrice: number;
  estimatedLeadtimeHours: number;
  fleetEI: number;
  fleetEIGrade?: string;
}

export interface BidEvaluationResponse {
  bidId: string;
  evaluationId: string;
  evaluatedAt: string;
  policyUsed: {
    alpha: number;
    beta: number;
    gamma: number;
  };
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
  scoreBreakdown: {
    priceNormalized: number;
    priceScore: number;
    leadtimeNormalized: number;
    leadtimeScore: number;
    eiNormalized: number;
    eiScore: number;
    finalScore: number;
  };
  withinBudget: boolean;
  meetsLeadtime: boolean;
  recommendation: string;
}

export interface AsyncEvaluationResponse {
  evaluationId: string;
  status: string;
  message: string;
}

export interface EvaluationStatusResponse {
  evaluationId: string;
  status: string;
  progress?: {
    processedProposals: number;
    totalProposals: number;
    percentage: number;
  };
  result?: {
    bestScore: number;
    proposalCount: number;
    meetsLeadtime: number;
    withinBudget: number;
  };
  duration?: number;
  timestamp: string;
}

export interface FleetEIResponse {
  fleetId: string;
  fleetName: string;
  carrierName: string;
  eiCurrent: number;
  eiGrade: string;
  eiConfidence: number;
  ei30DayAverage: number;
  trend: Array<{
    date: string;
    ei: number;
    grade: string;
  }>;
  emissions: {
    wtt: number;
    ttw: number;
    total: number;
  };
  lastUpdatedAt: string;
  dataSource: string;
  measurements: number;
  confidence: {
    score: number;
    basis: string;
    coverage: string;
  };
}

export interface PublicFleetDto {
  fleetId: string;
  fleetName: string;
  carrierName: string;
  vehicleCount: number;
  eiCurrent: number;
  eiGrade: string;
  eiConfidence: number;
  primaryFuelType: string;
  isPublic: boolean;
}

// ============================================================================
// API ERROR HANDLING
// ============================================================================

export class APIError extends Error {
  status: number;
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new APIError(
      response.status,
      `API Error: ${response.status} ${response.statusText}`,
      data
    );
  }
  return response.json();
}

// ============================================================================
// BID EVALUATION API
// ============================================================================

export const bidAPI = {
  /**
   * Synchronous bid evaluation with multi-factor scoring
   */
  async evaluateBids(request: BidEvaluationRequest): Promise<BidEvaluationResponse> {
    const response = await fetch(`${API_BASE_URL}/order/bid-evaluation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<BidEvaluationResponse>(response);
  },

  /**
   * Submit async bid evaluation job (queued processing)
   * Returns immediately with evaluation ID for polling/SSE
   */
  async submitAsyncEvaluation(
    bidId: string,
    weights: { alpha: number; beta: number; gamma: number }
  ): Promise<AsyncEvaluationResponse> {
    const response = await fetch(
      `${API_BASE_URL}/order/bid-evaluation-async/${bidId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weights),
      }
    );
    return handleResponse<AsyncEvaluationResponse>(response);
  },

  /**
   * Get bid evaluation results
   */
  async getEvaluation(bidId: string): Promise<BidEvaluationResponse> {
    const response = await fetch(
      `${API_BASE_URL}/order/bid-evaluation/${bidId}`
    );
    return handleResponse<BidEvaluationResponse>(response);
  },

  /**
   * Get ranked proposals for a bid
   */
  async getRankings(
    bidId: string,
    options?: { sortBy?: string; limit?: number }
  ): Promise<RankedProposal[]> {
    const params = new URLSearchParams();
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.limit) params.append('limit', String(options.limit));

    const url = `${API_BASE_URL}/order/bid-evaluation/${bidId}/rankings${
      params.toString() ? `?${params}` : ''
    }`;
    const response = await fetch(url);
    return handleResponse<RankedProposal[]>(response);
  },
};

// ============================================================================
// REAL-TIME / SSE API
// ============================================================================

export const realtimeAPI = {
  /**
   * Subscribe to bid updates via SSE
   * Returns EventSource for real-time streaming
   */
  subscribeToBidUpdates(bidId: string): EventSource {
    return new EventSource(`${API_BASE_URL}/bid/${bidId}/updates`);
  },

  /**
   * Subscribe to proposal ranking updates via SSE
   */
  subscribeToRankingUpdates(bidId: string): EventSource {
    return new EventSource(
      `${API_BASE_URL}/bid/${bidId}/rankings/updates`
    );
  },

  /**
   * Subscribe to evaluation status updates via SSE
   */
  subscribeToEvaluationStatus(evaluationId: string): EventSource {
    return new EventSource(
      `${API_BASE_URL}/bid/evaluations/${evaluationId}/status`
    );
  },

  /**
   * Poll bid status (fallback for clients without SSE support)
   */
  async pollBidStatus(bidId: string): Promise<{
    bidId: string;
    status: string;
    lastUpdate: string;
    proposalCount: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/bid/${bidId}/status/poll`);
    return handleResponse(response);
  },

  /**
   * Check real-time service health
   */
  async checkHealth(): Promise<{
    status: string;
    realtime: {
      connections: number;
      resources: number;
      timestamp: string;
    };
  }> {
    const response = await fetch(`${API_BASE_URL}/bid/realtime/health`);
    return handleResponse(response);
  },
};

// ============================================================================
// FLEET API
// ============================================================================

export const fleetAPI = {
  /**
   * Get fleet carbon intensity (EI) data with 30-day trend
   */
  async getFleetEI(fleetId: string): Promise<FleetEIResponse> {
    const response = await fetch(`${API_BASE_URL}/fleet/ei/${fleetId}`);
    return handleResponse<FleetEIResponse>(response);
  },

  /**
   * Get fleet EI history over specified period
   */
  async getFleetEIHistory(
    fleetId: string,
    days: number = 30
  ): Promise<{
    fleetId: string;
    fleetName: string;
    history: Array<{ date: string; ei: number; grade: string }>;
    average30Day: number;
    minEI: number;
    maxEI: number;
    stdDev: number;
    startDate: string;
    endDate: string;
  }> {
    const params = new URLSearchParams({ days: String(days) });
    const response = await fetch(
      `${API_BASE_URL}/fleet/ei-history/${fleetId}?${params}`
    );
    return handleResponse(response);
  },

  /**
   * List all public fleets in marketplace (sorted by EI, best first)
   */
  async getPublicFleets(limit: number = 50): Promise<PublicFleetDto[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await fetch(`${API_BASE_URL}/fleet/public?${params}`);
    return handleResponse<PublicFleetDto[]>(response);
  },

  /**
   * List eco-friendly fleets below threshold
   */
  async getEcoFriendlyFleets(
    threshold: number = 160
  ): Promise<PublicFleetDto[]> {
    const params = new URLSearchParams({ threshold: String(threshold) });
    const response = await fetch(
      `${API_BASE_URL}/fleet/eco-friendly?${params}`
    );
    return handleResponse<PublicFleetDto[]>(response);
  },
};

// ============================================================================
// HEALTH CHECK API
// ============================================================================

export const healthAPI = {
  /**
   * Basic health check
   */
  async check(): Promise<{
    status: string;
    timestamp: string;
    version: string;
  }> {
    const response = await fetch(`${API_BASE_URL.replace('/api/v2', '')}/health`);
    return handleResponse(response);
  },

  /**
   * Deep health check (database, Redis, etc.)
   */
  async deepCheck(): Promise<unknown> {
    const response = await fetch(`${API_BASE_URL.replace('/api/v2', '')}/health/deep`);
    return handleResponse(response);
  },

  /**
   * Kubernetes readiness probe
   */
  async checkReady(): Promise<unknown> {
    const response = await fetch(`${API_BASE_URL.replace('/api/v2', '')}/health/ready`);
    return handleResponse(response);
  },

  /**
   * Kubernetes liveness probe
   */
  async checkAlive(): Promise<unknown> {
    const response = await fetch(`${API_BASE_URL.replace('/api/v2', '')}/health/alive`);
    return handleResponse(response);
  },
};

// ============================================================================
// API CONFIGURATION
// ============================================================================

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

export default {
  bidAPI,
  realtimeAPI,
  fleetAPI,
  healthAPI,
  apiConfig,
  APIError,
};
