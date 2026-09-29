import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { analyticsAPI } from '../services/api'
import { queryKeys } from '../lib/react-query'
import { saveToIndexedDB, loadFromIndexedDB, deleteFromIndexedDB } from '../lib/persistence'
import { getCurrentTradingDate } from '../lib/tradingDate'

interface UseDailyMarketSummaryResult {
  summary: string | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useDailyMarketSummary(enabled: boolean = false): UseDailyMarketSummaryResult {
  const queryClient = useQueryClient()
  const tradingDate = getCurrentTradingDate()
  const lastTradingDateRef = useRef<string>(tradingDate)
  
  const query = useQuery({
    queryKey: [...queryKeys.analytics.dailyMarketSummary(), tradingDate],
    queryFn: async () => {
      const cacheKey = `${queryKeys.analytics.dailyMarketSummary().join(':')}:${tradingDate}`
      
      const cached = await loadFromIndexedDB<{ summary: string }>(cacheKey)
      if (cached) {
        return cached
      }
      
      const data = await analyticsAPI.getDailyMarketSummary(false)
      await saveToIndexedDB(cacheKey, data)
      return data
    },
    enabled,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  })

  useEffect(() => {
    if (tradingDate !== lastTradingDateRef.current) {
      const oldDate = lastTradingDateRef.current
      lastTradingDateRef.current = tradingDate
      
      const invalidateOldCache = async () => {
        if (oldDate) {
          const oldCacheKey = `${queryKeys.analytics.dailyMarketSummary().join(':')}:${oldDate}`
          await deleteFromIndexedDB(oldCacheKey)
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.analytics.dailyMarketSummary() })
      }
      
      invalidateOldCache()
    }
  }, [tradingDate, queryClient])

  return {
    summary: query.data?.summary || null,
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: async () => {
      const cacheKey = `${queryKeys.analytics.dailyMarketSummary().join(':')}:${tradingDate}`
      await deleteFromIndexedDB(cacheKey)
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.analytics.dailyMarketSummary(), tradingDate] })
      await query.refetch()
    },
  }
}
