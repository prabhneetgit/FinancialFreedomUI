import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { analyticsAPI } from '../services/api'
import { saveToIndexedDB, loadFromIndexedDB } from '../lib/persistence'

const PRE_MARKET_INSIGHTS_QUERY_KEY = ['analytics', 'preMarketInsights'] as const
const PRE_MARKET_INSIGHTS_CACHE_KEY = 'analytics:preMarketInsights'

interface UsePreMarketInsightsResult {
  insight: string | null
  loading: boolean
  error: Error | null
  refetch: (forceRefresh?: boolean) => Promise<void>
}

export function usePreMarketInsights(enabled: boolean = false): UsePreMarketInsightsResult {
  const queryClient = useQueryClient()
  const [isRefetching, setIsRefetching] = useState(false)
  const [manualInsight, setManualInsight] = useState<string | null>(null)
  const [manualError, setManualError] = useState<Error | null>(null)
  const [isManualRefetch, setIsManualRefetch] = useState(false)
  
  const query = useQuery({
    queryKey: PRE_MARKET_INSIGHTS_QUERY_KEY,
    queryFn: async () => {
      const cached = await loadFromIndexedDB<{ insight: string }>(PRE_MARKET_INSIGHTS_CACHE_KEY)
      if (cached) {
        return cached
      }
      const data = await analyticsAPI.getPreMarketInsights(false)
      await saveToIndexedDB(PRE_MARKET_INSIGHTS_CACHE_KEY, data)
      return data
    },
    enabled: enabled && !isManualRefetch,
    staleTime: 15 * 60 * 1000,
  })

  useEffect(() => {
    if (enabled && query.data?.insight && !manualInsight) {
      setManualInsight(null)
    }
  }, [enabled, query.data?.insight, manualInsight])

  return {
    insight: manualInsight || query.data?.insight || null,
    loading: query.isLoading || isRefetching,
    error: manualError || (query.error as Error | null),
    refetch: async (forceRefresh: boolean = false) => {
      try {
        setIsRefetching(true)
        setManualError(null)
        setIsManualRefetch(true)
        
        if (forceRefresh) {
          const fetchedData = await analyticsAPI.getPreMarketInsights(true)
          if (!fetchedData || !fetchedData.insight) {
            throw new Error('No insight data received from API')
          }
          await saveToIndexedDB(PRE_MARKET_INSIGHTS_CACHE_KEY, fetchedData)
          queryClient.setQueryData(PRE_MARKET_INSIGHTS_QUERY_KEY, fetchedData)
          setManualInsight(fetchedData.insight)
        } else {
          if (enabled) {
            await query.refetch()
          } else {
            const cached = await loadFromIndexedDB<{ insight: string }>(PRE_MARKET_INSIGHTS_CACHE_KEY)
            if (cached) {
              queryClient.setQueryData(PRE_MARKET_INSIGHTS_QUERY_KEY, cached)
              setManualInsight(cached.insight)
            } else {
              const fetchedData = await analyticsAPI.getPreMarketInsights(false)
              await saveToIndexedDB(PRE_MARKET_INSIGHTS_CACHE_KEY, fetchedData)
              queryClient.setQueryData(PRE_MARKET_INSIGHTS_QUERY_KEY, fetchedData)
              setManualInsight(fetchedData.insight)
            }
          }
        }
      } catch (error) {
        const apiError = error instanceof Error ? error : new Error(String(error))
        setManualError(apiError)
        console.error('Error fetching pre-market insights:', error)
        throw error
      } finally {
        setIsRefetching(false)
        setIsManualRefetch(false)
      }
    },
  }
}
