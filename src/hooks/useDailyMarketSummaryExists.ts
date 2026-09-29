import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { analyticsAPI } from '../services/api'
import { queryKeys } from '../lib/react-query'
import { getCurrentTradingDate } from '../lib/tradingDate'

interface UseDailyMarketSummaryExistsResult {
  exists: boolean
  loading: boolean
  error: Error | null
}

export function useDailyMarketSummaryExists(
  isMarketClosed: boolean,
  previousMarketClosed?: boolean
): UseDailyMarketSummaryExistsResult {
  const tradingDate = getCurrentTradingDate()
  const hasCheckedRef = useRef<boolean>(false)
  const lastTradingDateRef = useRef<string>(tradingDate)
  const previousMarketClosedRef = useRef<boolean | undefined>(previousMarketClosed)
  
  // Detect transition from open to closed
  const marketJustClosed = 
    isMarketClosed && 
    (previousMarketClosedRef.current === false || previousMarketClosedRef.current === undefined) &&
    !hasCheckedRef.current
  
  // Reset check flag when trading date changes
  useEffect(() => {
    if (tradingDate !== lastTradingDateRef.current) {
      hasCheckedRef.current = false
      lastTradingDateRef.current = tradingDate
    }
  }, [tradingDate])
  
  // Update previous market status ref
  useEffect(() => {
    previousMarketClosedRef.current = isMarketClosed
  }, [isMarketClosed])
  
  const query = useQuery({
    queryKey: [...queryKeys.analytics.dailyMarketSummary(), 'exists', tradingDate],
    queryFn: async () => {
      try {
        const result = await analyticsAPI.checkDailyMarketSummaryExists()
        hasCheckedRef.current = true
        return result
      } catch (error) {
        console.error('Error checking daily summary existence:', error)
        // Return exists: false on error so UI doesn't break
        return { exists: false, trading_date: tradingDate }
      }
    },
    enabled: marketJustClosed || (isMarketClosed && !hasCheckedRef.current),
    staleTime: Infinity, // Once checked, don't refetch automatically
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    retry: 1, // Only retry once on failure
    retryDelay: 2000, // Wait 2 seconds between retries
  })

  return {
    exists: query.data?.exists ?? false,
    loading: query.isLoading,
    error: query.error as Error | null,
  }
}
