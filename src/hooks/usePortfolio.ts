import { useQuery } from '@tanstack/react-query'
import { portfolioAPI } from '../services/api'
import type { PortfolioHolding, PortfolioSummary, PortfolioAnalytics } from '../types/api'
import { queryKeys, queryClient } from '../lib/react-query'
import { saveToIndexedDB, loadFromIndexedDB, deleteFromIndexedDB } from '../lib/persistence'

interface UsePortfolioResult {
  holdings: PortfolioHolding[]
  watchlist: PortfolioHolding[]
  summary: PortfolioSummary | null
  analytics: PortfolioAnalytics | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function usePortfolio(): UsePortfolioResult {
  const holdingsQuery = useQuery({
    queryKey: queryKeys.portfolio.holdings(),
    queryFn: async ({ queryKey }) => {
      const queryState = queryClient.getQueryState(queryKey)
      const staleTime = 2 * 60 * 1000
      const isStale = !queryState?.dataUpdatedAt || (Date.now() - queryState.dataUpdatedAt) > staleTime
      
      if (!isStale) {
        const cached = await loadFromIndexedDB<PortfolioHolding[]>(queryKeys.portfolio.holdings().join(':'))
        if (cached) {
          return cached
        }
      }
      
      const data = await portfolioAPI.getHoldings()
      await saveToIndexedDB(queryKeys.portfolio.holdings().join(':'), data)
      return data
    },
    staleTime: 2 * 60 * 1000,
  })

  const watchlistQuery = useQuery({
    queryKey: queryKeys.portfolio.watchlist(),
    queryFn: async ({ queryKey }) => {
      const queryState = queryClient.getQueryState(queryKey)
      const staleTime = 2 * 60 * 1000
      const isStale = !queryState?.dataUpdatedAt || (Date.now() - queryState.dataUpdatedAt) > staleTime
      
      if (!isStale) {
        const cached = await loadFromIndexedDB<PortfolioHolding[]>(queryKeys.portfolio.watchlist().join(':'))
        if (cached) {
          return cached
        }
      }
      
      const data = await portfolioAPI.getWatchlist()
      await saveToIndexedDB(queryKeys.portfolio.watchlist().join(':'), data)
      return data
    },
    staleTime: 2 * 60 * 1000,
  })

  const summaryQuery = useQuery({
    queryKey: queryKeys.portfolio.summary(),
    queryFn: async ({ queryKey }) => {
      const queryState = queryClient.getQueryState(queryKey)
      const staleTime = 2 * 60 * 1000
      const isStale = !queryState?.dataUpdatedAt || (Date.now() - queryState.dataUpdatedAt) > staleTime
      
      if (!isStale) {
        const cached = await loadFromIndexedDB<PortfolioSummary>(queryKeys.portfolio.summary().join(':'))
        if (cached) {
          return cached
        }
      }
      
      const data = await portfolioAPI.getSummary()
      await saveToIndexedDB(queryKeys.portfolio.summary().join(':'), data)
      return data
    },
    staleTime: 2 * 60 * 1000,
  })

  const analyticsQuery = useQuery({
    queryKey: queryKeys.portfolio.analytics(),
    queryFn: async ({ queryKey }) => {
      const queryState = queryClient.getQueryState(queryKey)
      const staleTime = 2 * 60 * 1000
      const isStale = !queryState?.dataUpdatedAt || (Date.now() - queryState.dataUpdatedAt) > staleTime
      
      if (!isStale) {
        const cached = await loadFromIndexedDB<PortfolioAnalytics>(queryKeys.portfolio.analytics().join(':'))
        if (cached) {
          return cached
        }
      }
      
      const data = await portfolioAPI.getAnalytics()
      await saveToIndexedDB(queryKeys.portfolio.analytics().join(':'), data)
      return data
    },
    staleTime: 2 * 60 * 1000,
  })

  const refetch = async () => {
    await Promise.all([
      deleteFromIndexedDB(queryKeys.portfolio.holdings().join(':')),
      deleteFromIndexedDB(queryKeys.portfolio.watchlist().join(':')),
      deleteFromIndexedDB(queryKeys.portfolio.summary().join(':')),
      deleteFromIndexedDB(queryKeys.portfolio.analytics().join(':')),
    ])
    
    await queryClient.resetQueries({ queryKey: queryKeys.portfolio.all })
    await queryClient.resetQueries({ queryKey: queryKeys.analytics.all })
    
    await queryClient.refetchQueries({
      queryKey: queryKeys.portfolio.all,
      type: 'active',
    })
  }

  return {
    holdings: holdingsQuery.data || [],
    watchlist: watchlistQuery.data || [],
    summary: summaryQuery.data || null,
    analytics: analyticsQuery.data || null,
    loading: holdingsQuery.isLoading || watchlistQuery.isLoading || summaryQuery.isLoading || analyticsQuery.isLoading,
    error: (holdingsQuery.error || watchlistQuery.error || summaryQuery.error || analyticsQuery.error) as Error | null,
    refetch,
  }
}
