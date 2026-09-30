import { useEffect, type ReactNode } from 'react'
import { queryClient } from '../lib/react-query'
import { queryKeys } from '../lib/react-query'
import { loadFromIndexedDB } from '../lib/persistence'

interface PersistenceProviderProps {
  children: ReactNode
}

export function PersistenceProvider({ children }: PersistenceProviderProps) {
  useEffect(() => {
    async function loadCachedData() {
      try {
        const loadPromises = [
          {
            key: queryKeys.portfolio.holdings(),
            cacheKey: queryKeys.portfolio.holdings().join(':'),
          },
          {
            key: queryKeys.portfolio.watchlist(),
            cacheKey: queryKeys.portfolio.watchlist().join(':'),
          },
          {
            key: queryKeys.portfolio.summary(),
            cacheKey: queryKeys.portfolio.summary().join(':'),
          },
          {
            key: queryKeys.portfolio.analytics(),
            cacheKey: queryKeys.portfolio.analytics().join(':'),
          },
          {
            key: queryKeys.analytics.performance(),
            cacheKey: queryKeys.analytics.performance().join(':'),
          },
          {
            key: queryKeys.analytics.sectorAllocation(),
            cacheKey: queryKeys.analytics.sectorAllocation().join(':'),
          },
          {
            key: queryKeys.analytics.marketInsights(),
            cacheKey: queryKeys.analytics.marketInsights().join(':'),
          },
        ]

        const results = await Promise.allSettled(
          loadPromises.map(async ({ key, cacheKey }) => {
            const data = await loadFromIndexedDB(cacheKey)
            if (data) {
              queryClient.setQueryData(key, data)
            }
            return data
          })
        )

        const failed = results.filter((result) => result.status === 'rejected')
        if (failed.length > 0 && import.meta.env.DEV) {
          console.warn(`Failed to load ${failed.length} cached items from IndexedDB`)
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to load cached data:', error)
        }
      }
    }

    loadCachedData()
  }, [])

  return <>{children}</>
}
