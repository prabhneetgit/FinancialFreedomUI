import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { analyticsAPI } from '../services/api'
import type { PerformanceHistoryData } from '../types/api'
import { queryKeys } from '../lib/react-query'
import { saveToIndexedDB, loadFromIndexedDB, deleteFromIndexedDB } from '../lib/persistence'

interface UsePerformanceHistoryResult {
  performanceHistory: PerformanceHistoryData | null
  loading: boolean
  error: Error | null
  refetch: (months?: number) => Promise<void>
}

export function usePerformanceHistory(months: number = 6, holdingsHash?: string): UsePerformanceHistoryResult {
  const queryClient = useQueryClient()
  const lastHoldingsHashRef = useRef<string | undefined>(holdingsHash)
  
  const query = useQuery({
    queryKey: queryKeys.analytics.performanceHistory(months),
    queryFn: async () => {
      const cached = await loadFromIndexedDB<PerformanceHistoryData>(queryKeys.analytics.performanceHistory(months).join(':'))
      if (cached) {
        return cached
      }
      const data = await analyticsAPI.getPerformanceHistory(months)
      await saveToIndexedDB(queryKeys.analytics.performanceHistory(months).join(':'), data)
      return data
    },
    staleTime: 2 * 60 * 1000,
  })

  useEffect(() => {
    if (holdingsHash && holdingsHash !== lastHoldingsHashRef.current) {
      lastHoldingsHashRef.current = holdingsHash
      
      const invalidatePerformanceHistory = async () => {
        await deleteFromIndexedDB(queryKeys.analytics.performanceHistory(months).join(':'))
        await queryClient.invalidateQueries({ queryKey: queryKeys.analytics.performanceHistory(months) })
      }
      
      invalidatePerformanceHistory()
    }
  }, [holdingsHash, months, queryClient])

  return {
    performanceHistory: query.data || null,
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: async (monthsToFetch?: number) => {
      await query.refetch()
    },
  }
}
