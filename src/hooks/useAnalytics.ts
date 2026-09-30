import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { analyticsAPI } from '../services/api'
import type {
  PerformanceMetrics,
  RiskMetrics,
  RebalancingRecommendation,
  RebalancingResponse,
  RebalancingMetadata,
  SectorAllocation,
  PositionSizingAnalysis,
  TaxLossHarvestingOpportunity,
  DividendIncomeData,
  SectorDiversificationAnalysis,
  MarketSentiment,
} from '../types/api'
import { queryKeys, queryClient } from '../lib/react-query'
import { saveToIndexedDB, loadFromIndexedDB, deleteFromIndexedDB } from '../lib/persistence'

function getEasternTime(): Date {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0'
  
  return new Date(
    parseInt(getPart('year')),
    parseInt(getPart('month')) - 1,
    parseInt(getPart('day')),
    parseInt(getPart('hour')),
    parseInt(getPart('minute')),
    parseInt(getPart('second'))
  )
}

function isMarketOpen(): boolean {
  const et = getEasternTime()
  const hour = et.getHours() + et.getMinutes() / 60
  const dayOfWeek = et.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  
  if (isWeekend) return false
  return hour >= 9.5 && hour < 16
}

function getCurrentTradingDate(): string {
  const et = getEasternTime()
  return et.toISOString().split('T')[0]
}

interface UseAnalyticsResult {
  performance: PerformanceMetrics | null
  sectorAllocation: SectorAllocation[]
  sectorDiversification: SectorDiversificationAnalysis | null
  sectorDiversificationLoading: boolean
  riskMetrics: RiskMetrics | null
  rebalancing: RebalancingRecommendation[]
  rebalancingMetadata: RebalancingMetadata | null
  rebalancingLoading: boolean
  positionSizing: PositionSizingAnalysis | null
  taxLossHarvesting: TaxLossHarvestingOpportunity[]
  dividendIncome: DividendIncomeData | null
  marketSentiment: MarketSentiment | null
  marketSentimentLoading: boolean
  marketSentimentRefreshing: boolean
  loading: boolean
  error: Error | null
  refetch: (forceRefresh?: boolean) => Promise<void>
  refetchRebalancing: () => Promise<void>
  refetchMarketSentiment: () => Promise<void>
}

export function useAnalytics(holdingsHash?: string): UseAnalyticsResult {
  const lastHoldingsHashRef = useRef<string | undefined>(holdingsHash)
  const lastRefreshDateRef = useRef<string>(getCurrentTradingDate())
  const dailyRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [marketSentimentRefreshing, setMarketSentimentRefreshing] = useState(false)
  const performanceQuery = useQuery({
    queryKey: queryKeys.analytics.performance(),
    queryFn: async ({ queryKey }) => {
      const queryState = queryClient.getQueryState(queryKey)
      const staleTime = 2 * 60 * 1000
      const isStale = !queryState?.dataUpdatedAt || (Date.now() - queryState.dataUpdatedAt) > staleTime
      
      if (!isStale) {
        const cached = await loadFromIndexedDB<PerformanceMetrics>(queryKeys.analytics.performance().join(':'))
        if (cached) {
          return cached
        }
      }
      
      const data = await analyticsAPI.getPerformance()
      await saveToIndexedDB(queryKeys.analytics.performance().join(':'), data)
      return data
    },
    staleTime: 2 * 60 * 1000,
  })

  const sectorAllocationQuery = useQuery({
    queryKey: queryKeys.analytics.sectorAllocation(),
    queryFn: async ({ queryKey }) => {
      const queryState = queryClient.getQueryState(queryKey)
      const staleTime = 2 * 60 * 1000
      const isStale = !queryState?.dataUpdatedAt || (Date.now() - queryState.dataUpdatedAt) > staleTime
      
      if (!isStale) {
        const cached = await loadFromIndexedDB<{ sectorAllocation: SectorAllocation[] }>(queryKeys.analytics.sectorAllocation().join(':'))
        if (cached) {
          return cached
        }
      }
      
      const data = await analyticsAPI.getSectorAllocation()
      await saveToIndexedDB(queryKeys.analytics.sectorAllocation().join(':'), data)
      return data
    },
    staleTime: 2 * 60 * 1000,
  })

  const sectorDiversificationQuery = useQuery({
    queryKey: queryKeys.analytics.sectorDiversification(),
    queryFn: async ({ queryKey }) => {
      const queryState = queryClient.getQueryState(queryKey)
      const staleTime = 2 * 60 * 1000
      const isStale = !queryState?.dataUpdatedAt || (Date.now() - queryState.dataUpdatedAt) > staleTime
      
      if (!isStale) {
        const cached = await loadFromIndexedDB<SectorDiversificationAnalysis>(queryKeys.analytics.sectorDiversification().join(':'))
        if (cached) {
          return cached
        }
      }
      
      const data = await analyticsAPI.getSectorDiversification()
      await saveToIndexedDB(queryKeys.analytics.sectorDiversification().join(':'), data)
      return data
    },
    staleTime: 2 * 60 * 1000,
  })

  const riskMetricsQuery = useQuery({
    queryKey: queryKeys.analytics.riskMetrics(),
    queryFn: async ({ queryKey }) => {
      const queryState = queryClient.getQueryState(queryKey)
      const staleTime = 1 * 60 * 1000
      const isStale = !queryState?.dataUpdatedAt || (Date.now() - queryState.dataUpdatedAt) > staleTime
      
      if (!isStale) {
        const cached = await loadFromIndexedDB<RiskMetrics>(queryKeys.analytics.riskMetrics().join(':'))
        if (cached) {
          return cached
        }
      }
      
      const data = await analyticsAPI.getRiskMetrics()
      await saveToIndexedDB(queryKeys.analytics.riskMetrics().join(':'), data)
      return data
    },
    staleTime: 1 * 60 * 1000,
  })

  const rebalancingQuery = useQuery({
    queryKey: queryKeys.analytics.rebalancing(),
    queryFn: async ({ queryKey }) => {
      const queryState = queryClient.getQueryState(queryKey)
      const staleTime = 4 * 60 * 1000
      const isStale = !queryState?.dataUpdatedAt || (Date.now() - queryState.dataUpdatedAt) > staleTime
      
      if (!isStale) {
        const cached = await loadFromIndexedDB<RebalancingResponse>(queryKeys.analytics.rebalancing().join(':'))
        if (cached) {
          return cached
        }
      }
      
      const data = await analyticsAPI.getRebalancing()
      await saveToIndexedDB(queryKeys.analytics.rebalancing().join(':'), data)
      return data
    },
    staleTime: 4 * 60 * 1000,
  })

  const positionSizingQuery = useQuery({
    queryKey: queryKeys.analytics.positionSizing(),
    queryFn: async ({ queryKey }) => {
      const queryState = queryClient.getQueryState(queryKey)
      const staleTime = 2 * 60 * 1000
      const isStale = !queryState?.dataUpdatedAt || (Date.now() - queryState.dataUpdatedAt) > staleTime
      
      if (!isStale) {
        const cached = await loadFromIndexedDB<PositionSizingAnalysis>(queryKeys.analytics.positionSizing().join(':'))
        if (cached) {
          return cached
        }
      }
      
      const data = await analyticsAPI.getPositionSizing()
      await saveToIndexedDB(queryKeys.analytics.positionSizing().join(':'), data)
      return data
    },
    staleTime: 2 * 60 * 1000,
  })

  const taxLossHarvestingQuery = useQuery({
    queryKey: queryKeys.analytics.taxLossHarvesting(),
    queryFn: async ({ queryKey }) => {
      const queryState = queryClient.getQueryState(queryKey)
      const staleTime = 4 * 60 * 1000
      const isStale = !queryState?.dataUpdatedAt || (Date.now() - queryState.dataUpdatedAt) > staleTime
      
      if (!isStale) {
        const cached = await loadFromIndexedDB<TaxLossHarvestingOpportunity[]>(queryKeys.analytics.taxLossHarvesting().join(':'))
        if (cached) {
          return cached
        }
      }
      
      const data = await analyticsAPI.getTaxLossHarvesting()
      await saveToIndexedDB(queryKeys.analytics.taxLossHarvesting().join(':'), data)
      return data
    },
    staleTime: 4 * 60 * 1000,
  })

  const dividendIncomeQuery = useQuery({
    queryKey: queryKeys.analytics.dividendIncome(),
    queryFn: async ({ queryKey }) => {
      const queryState = queryClient.getQueryState(queryKey)
      const staleTime = 6 * 60 * 1000
      const isStale = !queryState?.dataUpdatedAt || (Date.now() - queryState.dataUpdatedAt) > staleTime
      
      if (!isStale) {
        const cached = await loadFromIndexedDB<DividendIncomeData>(queryKeys.analytics.dividendIncome().join(':'))
        if (cached) {
          return cached
        }
      }
      
      const data = await analyticsAPI.getDividendIncome()
      await saveToIndexedDB(queryKeys.analytics.dividendIncome().join(':'), data)
      return data
    },
    staleTime: 6 * 60 * 1000,
  })

  const marketSentimentQuery = useQuery({
    queryKey: queryKeys.analytics.marketSentiment(riskMetricsQuery.data?.volatility),
    queryFn: async ({ queryKey }) => {
      const queryState = queryClient.getQueryState(queryKey)
      const staleTime = 1 * 60 * 1000
      const isStale = !queryState?.dataUpdatedAt || (Date.now() - queryState.dataUpdatedAt) > staleTime
      
      const key = queryKeys.analytics.marketSentiment(riskMetricsQuery.data?.volatility).join(':')
      
      if (!isStale) {
        const cached = await loadFromIndexedDB<MarketSentiment>(key)
        if (cached) {
          return cached
        }
      }
      
      const data = await analyticsAPI.getMarketSentiment(riskMetricsQuery.data?.volatility)
      await saveToIndexedDB(key, data)
      return data
    },
    enabled: !!riskMetricsQuery.data?.volatility,
    staleTime: 1 * 60 * 1000,
  })

  useEffect(() => {
    if (holdingsHash && holdingsHash !== lastHoldingsHashRef.current) {
      lastHoldingsHashRef.current = holdingsHash
      
      const invalidateAnalyticsCache = async () => {
        const volatility = riskMetricsQuery.data?.volatility
        const marketSentimentKey = queryKeys.analytics.marketSentiment(volatility).join(':')
        
        await Promise.all([
          deleteFromIndexedDB(queryKeys.analytics.performance().join(':')),
          deleteFromIndexedDB(queryKeys.analytics.sectorAllocation().join(':')),
          deleteFromIndexedDB(queryKeys.analytics.sectorDiversification().join(':')),
          deleteFromIndexedDB(queryKeys.analytics.riskMetrics().join(':')),
          deleteFromIndexedDB(queryKeys.analytics.rebalancing().join(':')),
          deleteFromIndexedDB(queryKeys.analytics.positionSizing().join(':')),
          deleteFromIndexedDB(queryKeys.analytics.taxLossHarvesting().join(':')),
          deleteFromIndexedDB(queryKeys.analytics.dividendIncome().join(':')),
          deleteFromIndexedDB(marketSentimentKey),
          deleteFromIndexedDB(queryKeys.analytics.performanceHistory(6).join(':')),
        ])
        
        await queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
      }
      
      invalidateAnalyticsCache()
    }
  }, [holdingsHash])

  useEffect(() => {
    const checkAndRefreshDaily = async () => {
      const currentDate = getCurrentTradingDate()
      const isOpen = isMarketOpen()
      
      if (isOpen && currentDate !== lastRefreshDateRef.current) {
        lastRefreshDateRef.current = currentDate
        
        const volatility = riskMetricsQuery.data?.volatility
        const marketSentimentKey = queryKeys.analytics.marketSentiment(volatility).join(':')
        
        await Promise.all([
          deleteFromIndexedDB(queryKeys.analytics.performance().join(':')),
          deleteFromIndexedDB(queryKeys.analytics.sectorAllocation().join(':')),
          deleteFromIndexedDB(queryKeys.analytics.sectorDiversification().join(':')),
          deleteFromIndexedDB(queryKeys.analytics.riskMetrics().join(':')),
          deleteFromIndexedDB(queryKeys.analytics.rebalancing().join(':')),
          deleteFromIndexedDB(queryKeys.analytics.positionSizing().join(':')),
          deleteFromIndexedDB(queryKeys.analytics.taxLossHarvesting().join(':')),
          deleteFromIndexedDB(queryKeys.analytics.dividendIncome().join(':')),
          deleteFromIndexedDB(marketSentimentKey),
        ])
        
        await queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
      }
    }
    
    checkAndRefreshDaily()
    
    dailyRefreshIntervalRef.current = setInterval(() => {
      checkAndRefreshDaily()
    }, 5 * 60 * 1000)
    
    return () => {
      if (dailyRefreshIntervalRef.current) {
        clearInterval(dailyRefreshIntervalRef.current)
      }
    }
  }, [riskMetricsQuery.data?.volatility])

  const refetch = async (forceRefresh: boolean = false) => {
    const marketSentimentKey = queryKeys.analytics.marketSentiment(riskMetricsQuery.data?.volatility).join(':')
    
    if (forceRefresh) {
      await Promise.all([
        deleteFromIndexedDB(queryKeys.analytics.performance().join(':')),
        deleteFromIndexedDB(queryKeys.analytics.sectorAllocation().join(':')),
        deleteFromIndexedDB(queryKeys.analytics.sectorDiversification().join(':')),
        deleteFromIndexedDB(queryKeys.analytics.riskMetrics().join(':')),
        deleteFromIndexedDB(queryKeys.analytics.rebalancing().join(':')),
        deleteFromIndexedDB(queryKeys.analytics.positionSizing().join(':')),
        deleteFromIndexedDB(queryKeys.analytics.taxLossHarvesting().join(':')),
        deleteFromIndexedDB(queryKeys.analytics.dividendIncome().join(':')),
        deleteFromIndexedDB(marketSentimentKey),
        deleteFromIndexedDB(queryKeys.analytics.performanceHistory(6).join(':')),
      ])
      
      await queryClient.resetQueries({ queryKey: queryKeys.analytics.all })
    }
    
    await queryClient.refetchQueries({
      queryKey: queryKeys.analytics.all,
      type: 'active',
    })
  }

  const rebalancingData = rebalancingQuery.data
  const rebalancingRecommendations = rebalancingData?.recommendations || []
  const rebalancingMetadata = rebalancingData?.metadata || null

  const refetchRebalancing = async () => {
    await deleteFromIndexedDB(queryKeys.analytics.rebalancing().join(':'))
    
    await queryClient.resetQueries({ queryKey: queryKeys.analytics.rebalancing() })
    
    const data = await analyticsAPI.getRebalancing(true)
    await saveToIndexedDB(queryKeys.analytics.rebalancing().join(':'), data)
    
    queryClient.setQueryData(queryKeys.analytics.rebalancing(), data)
  }

  const refetchMarketSentiment = async () => {
    try {
      setMarketSentimentRefreshing(true)
      const volatility = riskMetricsQuery.data?.volatility
      const key = queryKeys.analytics.marketSentiment(volatility).join(':')
      
      await deleteFromIndexedDB(key)
      
      const data = await analyticsAPI.getMarketSentiment(volatility, true)
      await saveToIndexedDB(key, data)
      
      queryClient.setQueryData(queryKeys.analytics.marketSentiment(volatility), data)
    } finally {
      setMarketSentimentRefreshing(false)
    }
  }

  return {
    performance: performanceQuery.data || null,
    sectorAllocation: sectorAllocationQuery.data?.sectorAllocation || [],
    sectorDiversification: sectorDiversificationQuery.data || null,
    sectorDiversificationLoading: sectorDiversificationQuery.isLoading,
    riskMetrics: riskMetricsQuery.data || null,
    rebalancing: rebalancingRecommendations,
    rebalancingMetadata: rebalancingMetadata,
    rebalancingLoading: rebalancingQuery.isLoading || rebalancingQuery.isFetching,
    positionSizing: positionSizingQuery.data || null,
    taxLossHarvesting: taxLossHarvestingQuery.data || [],
    dividendIncome: dividendIncomeQuery.data || null,
    marketSentiment: marketSentimentQuery.data || null,
    marketSentimentLoading: marketSentimentQuery.isLoading,
    marketSentimentRefreshing,
    loading: performanceQuery.isLoading || sectorAllocationQuery.isLoading || riskMetricsQuery.isLoading || rebalancingQuery.isLoading || positionSizingQuery.isLoading || taxLossHarvestingQuery.isLoading || dividendIncomeQuery.isLoading,
    error: (performanceQuery.error || sectorAllocationQuery.error || riskMetricsQuery.error || rebalancingQuery.error || positionSizingQuery.error || taxLossHarvestingQuery.error || dividendIncomeQuery.error) as Error | null,
    refetch,
    refetchRebalancing,
    refetchMarketSentiment,
  }
}
