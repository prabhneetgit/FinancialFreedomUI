import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { analyticsAPI } from '../services/api'
import type { PerformanceHistoryData } from '../types/api'
import { queryKeys } from '../lib/react-query'
import { saveToIndexedDB, loadEntryFromIndexedDB, deleteFromIndexedDB } from '../lib/persistence'

// ponytail: saved copies older than this are refetched; raise it if the history endpoint gets slow
const MAX_CACHE_AGE = 15 * 60 * 1000

interface UsePerformanceHistoryResult {
  performanceHistory: PerformanceHistoryData | null
  // When the history was actually fetched from the API (not when it was read from the browser cache).
  updatedAt: number | null
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
      const cacheKey = queryKeys.analytics.performanceHistory(months).join(':')
      const cached = await loadEntryFromIndexedDB<PerformanceHistoryData>(cacheKey)
      if (cached && Date.now() - cached.timestamp < MAX_CACHE_AGE) {
        return { history: cached.data, fetchedAt: cached.timestamp }
      }
      const history = await analyticsAPI.getPerformanceHistory(months)
      await saveToIndexedDB(cacheKey, history)
      return { history, fetchedAt: Date.now() }
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
    performanceHistory: query.data?.history ?? null,
    updatedAt: query.data?.fetchedAt ?? null,
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: async () => {
      await query.refetch()
    },
  }
}
