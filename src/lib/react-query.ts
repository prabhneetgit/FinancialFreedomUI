import { QueryClient } from '@tanstack/react-query'

const CACHE_STALE_TIME = 5 * 60 * 1000
const CACHE_TIME = 30 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_STALE_TIME,
      gcTime: CACHE_TIME,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: 1000,
    },
  },
})

export const queryKeys = {
  portfolio: {
    all: ['portfolio'] as const,
    holdings: () => [...queryKeys.portfolio.all, 'holdings'] as const,
    watchlist: () => [...queryKeys.portfolio.all, 'watchlist'] as const,
    summary: () => [...queryKeys.portfolio.all, 'summary'] as const,
    analytics: () => [...queryKeys.portfolio.all, 'analytics'] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    performance: () => [...queryKeys.analytics.all, 'performance'] as const,
    sectorAllocation: () => [...queryKeys.analytics.all, 'sectorAllocation'] as const,
    sectorDiversification: () => [...queryKeys.analytics.all, 'sectorDiversification'] as const,
    riskMetrics: () => [...queryKeys.analytics.all, 'riskMetrics'] as const,
    rebalancing: () => [...queryKeys.analytics.all, 'rebalancing'] as const,
    positionSizing: () => [...queryKeys.analytics.all, 'positionSizing'] as const,
    taxLossHarvesting: () => [...queryKeys.analytics.all, 'taxLossHarvesting'] as const,
    dividendIncome: () => [...queryKeys.analytics.all, 'dividendIncome'] as const,
    marketSentiment: (volatility?: number) => [...queryKeys.analytics.all, 'marketSentiment', volatility] as const,
    marketInsights: () => [...queryKeys.analytics.all, 'marketInsights'] as const,
    preMarketInsights: () => [...queryKeys.analytics.all, 'preMarketInsights'] as const,
    dailyMarketSummary: () => [...queryKeys.analytics.all, 'dailyMarketSummary'] as const,
    performanceHistory: (months: number) => [...queryKeys.analytics.all, 'performanceHistory', months] as const,
  },
  stock: {
    all: ['stock'] as const,
    detail: (tickerId: string) => [...queryKeys.stock.all, 'detail', tickerId] as const,
    insights: (tickerId: string) => [...queryKeys.stock.all, 'insights', tickerId] as const,
    trendAnalysis: (tickerId: string) => [...queryKeys.stock.all, 'trendAnalysis', tickerId] as const,
    optionStrategies: (tickerId: string) => [...queryKeys.stock.all, 'optionStrategies', tickerId] as const,
  },
  research: {
    all: ['research'] as const,
    news: (tickerId: string) => [...queryKeys.research.all, 'news', tickerId] as const,
    tickerInsights: (tickerId: string) => [...queryKeys.research.all, 'tickerInsights', tickerId] as const,
  },
}
