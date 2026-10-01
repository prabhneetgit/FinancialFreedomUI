import type {
  PortfolioHolding,
  PortfolioSummary,
  PortfolioAnalytics,
  StockDetail,
  StockInsight,
  TrendAnalysis,
  OptionStrategy,
  PerformanceMetrics,
  RiskMetrics,
  RebalancingResponse,
  SectorAllocation,
  NewsItem,
  TickerInsightsResponse,
  PositionSizingAnalysis,
  TaxLossHarvestingOpportunity,
  DividendIncomeData,
  PerformanceHistoryData,
  SectorDiversificationAnalysis,
  MarketSentiment,
  MarketInsight,
} from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

class APIError extends Error {
  status: number
  statusText: string

  constructor(message: string, status: number, statusText: string) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.statusText = statusText
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit & { forceRefresh?: boolean },
): Promise<T> {
  let url = `${API_BASE_URL}${endpoint}`
  const forceRefresh = options?.forceRefresh
  
  if (forceRefresh) {
    const separator = url.includes('?') ? '&' : '?'
    url += `${separator}force_refresh=true`
  }
  
  const { forceRefresh: _, ...fetchOptions } = options || {}
  
  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions?.headers,
    },
  })

  if (!response.ok) {
    let errorMessage = `API request failed: ${response.statusText}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.detail || errorMessage
    } catch {
      // If response is not JSON, use default message
    }
    throw new APIError(errorMessage, response.status, response.statusText)
  }

  return response.json()
}

export interface CSVUploadResponse {
  success: boolean
  message: string
  holdingsUpdated: number
  holdingsAdded: number
  errors: string[]
}

export const portfolioAPI = {
  getHoldings: async (): Promise<PortfolioHolding[]> => {
    return fetchAPI<PortfolioHolding[]>('/api/portfolio/holdings')
  },

  getWatchlist: async (): Promise<PortfolioHolding[]> => {
    return fetchAPI<PortfolioHolding[]>('/api/portfolio/watchlist')
  },

  getSummary: async (): Promise<PortfolioSummary> => {
    return fetchAPI<PortfolioSummary>('/api/portfolio/summary')
  },

  getAnalytics: async (): Promise<PortfolioAnalytics> => {
    return fetchAPI<PortfolioAnalytics>('/api/portfolio/analytics')
  },

  uploadCSV: async (file: File): Promise<CSVUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const url = `${API_BASE_URL}/api/portfolio/upload-csv`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      let errorMessage = `Upload failed: ${response.statusText}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorMessage
      } catch {
        // Use default error message
      }
      throw new APIError(errorMessage, response.status, response.statusText)
    }

    return response.json()
  },
}

export const stockAPI = {
  getDetail: async (tickerId: string, forceRefresh?: boolean): Promise<StockDetail> => {
    return fetchAPI<StockDetail>(`/api/stock/${encodeURIComponent(tickerId)}/detail`, { forceRefresh })
  },

  getInsights: async (tickerId: string, forceRefresh?: boolean): Promise<StockInsight[]> => {
    return fetchAPI<StockInsight[]>(`/api/stock/${encodeURIComponent(tickerId)}/insights`, { forceRefresh })
  },

  getTrendAnalysis: async (tickerId: string, forceRefresh?: boolean): Promise<TrendAnalysis[]> => {
    return fetchAPI<TrendAnalysis[]>(
      `/api/stock/${encodeURIComponent(tickerId)}/trend-analysis`,
      { forceRefresh }
    )
  },

  getOptionStrategies: async (tickerId: string, forceRefresh?: boolean): Promise<OptionStrategy[]> => {
    return fetchAPI<OptionStrategy[]>(
      `/api/stock/${encodeURIComponent(tickerId)}/option-strategies`,
      { forceRefresh }
    )
  },

  invalidateInsights: async (tickerId: string): Promise<{ message: string; ticker: string; deleted: number }> => {
    const response = await fetch(`/api/stock/${encodeURIComponent(tickerId)}/insights/invalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to invalidate cache: ${response.statusText}`)
    }
    return response.json()
  },
}

export const analyticsAPI = {
  getPerformance: async (): Promise<PerformanceMetrics> => {
    return fetchAPI<PerformanceMetrics>('/api/analytics/performance')
  },

  getSectorAllocation: async (): Promise<{ sectorAllocation: SectorAllocation[] }> => {
    return fetchAPI<{ sectorAllocation: SectorAllocation[] }>(
      '/api/analytics/sector-allocation',
    )
  },

  getRiskMetrics: async (): Promise<RiskMetrics> => {
    return fetchAPI<RiskMetrics>('/api/analytics/risk-metrics')
  },

  getRebalancing: async (forceRefresh: boolean = false): Promise<RebalancingResponse> => {
    const url = forceRefresh ? '/api/analytics/rebalancing?force_refresh=true' : '/api/analytics/rebalancing'
    return fetchAPI<RebalancingResponse>(url)
  },

  getPositionSizing: async (): Promise<PositionSizingAnalysis> => {
    return fetchAPI<PositionSizingAnalysis>('/api/analytics/position-sizing')
  },

  getTaxLossHarvesting: async (): Promise<TaxLossHarvestingOpportunity[]> => {
    return fetchAPI<TaxLossHarvestingOpportunity[]>('/api/analytics/tax-loss-harvesting')
  },

  getDividendIncome: async (): Promise<DividendIncomeData> => {
    return fetchAPI<DividendIncomeData>('/api/analytics/dividend-income')
  },

  getPerformanceHistory: async (months: number = 6): Promise<PerformanceHistoryData> => {
    return fetchAPI<PerformanceHistoryData>(`/api/analytics/performance-history?months=${months}`)
  },

  getSectorDiversification: async (): Promise<SectorDiversificationAnalysis> => {
    return fetchAPI<SectorDiversificationAnalysis>('/api/analytics/sector-diversification')
  },

  getMarketSentiment: async (portfolioVolatility?: number, forceRefresh?: boolean): Promise<MarketSentiment> => {
    const params = new URLSearchParams()
    if (portfolioVolatility !== undefined) {
      params.append('portfolio_volatility', portfolioVolatility.toString())
    }
    if (forceRefresh) {
      params.append('force_refresh', 'true')
    }
    const queryString = params.toString()
    return fetchAPI<MarketSentiment>(`/api/analytics/market-sentiment${queryString ? `?${queryString}` : ''}`)
  },

  getMarketInsights: async (forceRefresh?: boolean): Promise<MarketInsight[]> => {
    return fetchAPI<MarketInsight[]>('/api/analytics/market-insights', { forceRefresh })
  },

  getDailyMarketSummary: async (forceRefresh?: boolean): Promise<{ summary: string }> => {
    return fetchAPI<{ summary: string }>('/api/analytics/market-insights/daily-summary', { forceRefresh })
  },

  checkDailyMarketSummaryExists: async (): Promise<{ exists: boolean; trading_date: string }> => {
    return fetchAPI<{ exists: boolean; trading_date: string }>('/api/analytics/market-insights/daily-summary/exists')
  },

  getPreMarketInsights: async (forceRefresh?: boolean): Promise<{ insight: string }> => {
    return fetchAPI<{ insight: string }>('/api/analytics/market-insights/pre-market', { forceRefresh })
  },
}

export const researchAPI = {
  getNews: async (tickerId: string, forceRefresh?: boolean): Promise<{
    ticker: string
    news: NewsItem[]
    summary: string
  }> => {
    return fetchAPI<{ ticker: string; news: NewsItem[]; summary: string }>(
      `/api/research/news/${encodeURIComponent(tickerId)}`,
      { forceRefresh }
    )
  },

  getTickerInsights: async (tickerId: string): Promise<TickerInsightsResponse> => {
    return fetchAPI<TickerInsightsResponse>(
      `/api/ticker/insights/${encodeURIComponent(tickerId)}`,
    )
  },
}

export { APIError }
