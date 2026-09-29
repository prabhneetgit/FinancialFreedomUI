import { useQuery } from '@tanstack/react-query'
import { useRef, useEffect, useState } from 'react'
import type { MarketInsight } from '../types/api'
import { analyticsAPI } from '../services/api'
import { queryKeys } from '../lib/react-query'
import { saveToIndexedDB, loadFromIndexedDB } from '../lib/persistence'
import { getEasternTime, getCurrentTradingDate } from '../lib/tradingDate'

const NYSE_HOURS = {
  MORNING: { start: 9.5, end: 12 },
  MIDDAY: { start: 12, end: 14 },
  CLOSING: { start: 14, end: 16 },
}

function getCurrentTradingSession(): 'MORNING' | 'MIDDAY' | 'CLOSING' | null {
  const et = getEasternTime()
  const hour = et.getHours() + et.getMinutes() / 60
  const dayOfWeek = et.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  if (isWeekend) {
    return 'CLOSING'
  }

  if (hour < NYSE_HOURS.MORNING.start) {
    return null
  } else if (hour >= NYSE_HOURS.MORNING.start && hour < NYSE_HOURS.MORNING.end) {
    return 'MORNING'
  } else if (hour >= NYSE_HOURS.MIDDAY.start && hour < NYSE_HOURS.MIDDAY.end) {
    return 'MIDDAY'
  } else if (hour >= NYSE_HOURS.CLOSING.start && hour < NYSE_HOURS.CLOSING.end) {
    return 'CLOSING'
  } else {
    return 'CLOSING'
  }
}

function getAvailablePeriods(): ('MORNING' | 'MIDDAY' | 'CLOSING')[] {
  const session = getCurrentTradingSession()
  if (!session) {
    return []
  }
  
  const periods: ('MORNING' | 'MIDDAY' | 'CLOSING')[] = ['MORNING', 'MIDDAY', 'CLOSING']
  const sessionIndex = periods.indexOf(session)
  return periods.slice(0, sessionIndex + 1)
}

interface UseMarketInsightsResult {
  insights: MarketInsight[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useMarketInsights(): UseMarketInsightsResult {
  const tradingDate = getCurrentTradingDate()
  const [currentSession, setCurrentSession] = useState(() => getCurrentTradingSession())
  const sessionKey = currentSession || 'CLOSING'
  const cacheKey = `${queryKeys.analytics.marketInsights().join(':')}:${tradingDate}:${sessionKey}`
  const isInitialLoadRef = useRef(true)
  
  const query = useQuery({
    queryKey: [...queryKeys.analytics.marketInsights(), tradingDate, sessionKey],
    queryFn: async () => {
      const availablePeriods = getAvailablePeriods()
      
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false
        const cached = await loadFromIndexedDB<MarketInsight[]>(cacheKey)
        if (cached) {
          const cachedPeriods = cached.map(insight => insight.period)
          const hasAllAvailablePeriods = availablePeriods.every(period => 
            cachedPeriods.includes(period)
          )
          if (hasAllAvailablePeriods) {
            return cached
          }
        }
      }
      
      const data = await analyticsAPI.getMarketInsights(true)
      await saveToIndexedDB(cacheKey, data)
      return data
    },
    staleTime: 60 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const newSession = getCurrentTradingSession()
      if (newSession !== currentSession) {
        setCurrentSession(newSession)
        isInitialLoadRef.current = false
      }
    }, 60000)
    
    return () => clearInterval(interval)
  }, [currentSession])

  return {
    insights: query.data || [],
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: async () => {
      isInitialLoadRef.current = false
      await query.refetch()
    },
  }
}
