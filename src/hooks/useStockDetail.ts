import { useQuery, useQueryClient } from '@tanstack/react-query'
import { stockAPI } from '../services/api'
import type { StockDetail, StockInsight, TrendAnalysis, OptionStrategy } from '../types/api'
import { queryKeys } from '../lib/react-query'
import { saveToIndexedDB, loadFromIndexedDB, deleteFromIndexedDB } from '../lib/persistence'

interface UseStockDetailOptions {
  loadInsights?: boolean
  loadTrendAnalysis?: boolean
  loadOptionStrategies?: boolean
}

interface UseStockDetailResult {
  detail: StockDetail | null
  insights: StockInsight[]
  trendAnalysis: TrendAnalysis[]
  optionStrategies: OptionStrategy[]
  loading: boolean
  error: Error | null
  refetch: (forceRefresh?: boolean) => Promise<void>
  loadInsights: () => Promise<StockInsight[] | undefined>
  loadTrendAnalysis: () => Promise<TrendAnalysis[] | undefined>
  loadOptionStrategies: (forceRefresh?: boolean) => Promise<OptionStrategy[] | undefined>
}

export function useStockDetail(
  tickerId: string | null,
  options: UseStockDetailOptions = {}
): UseStockDetailResult {
  const queryClient = useQueryClient()
  const { loadInsights = false, loadTrendAnalysis = false, loadOptionStrategies = false } = options

  const detailQuery = useQuery({
    queryKey: queryKeys.stock.detail(tickerId || ''),
    queryFn: async () => {
      if (!tickerId) return null
      const cached = await loadFromIndexedDB<StockDetail>(queryKeys.stock.detail(tickerId).join(':'))
      if (cached) {
        return cached
      }
      const data = await stockAPI.getDetail(tickerId)
      await saveToIndexedDB(queryKeys.stock.detail(tickerId).join(':'), data)
      return data
    },
    enabled: !!tickerId,
    staleTime: 1 * 60 * 1000,
  })

  const insightsQuery = useQuery({
    queryKey: queryKeys.stock.insights(tickerId || ''),
    queryFn: async () => {
      if (!tickerId) return []
      const data = await stockAPI.getInsights(tickerId, false)
      await saveToIndexedDB(queryKeys.stock.insights(tickerId).join(':'), data)
      return data
    },
    enabled: !!tickerId && loadInsights,
    staleTime: 1 * 60 * 1000,
  })

  const trendAnalysisQuery = useQuery({
    queryKey: queryKeys.stock.trendAnalysis(tickerId || ''),
    queryFn: async () => {
      if (!tickerId) return []
      const cached = await loadFromIndexedDB<TrendAnalysis[]>(queryKeys.stock.trendAnalysis(tickerId).join(':'))
      if (cached) {
        return cached
      }
      const data = await stockAPI.getTrendAnalysis(tickerId)
      await saveToIndexedDB(queryKeys.stock.trendAnalysis(tickerId).join(':'), data)
      return data
    },
    enabled: !!tickerId && loadTrendAnalysis,
    staleTime: 1 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const optionStrategiesQuery = useQuery({
    queryKey: queryKeys.stock.optionStrategies(tickerId || ''),
    queryFn: async () => {
      if (!tickerId) return []
      // Always fetch from API when query runs (cache is handled in loadOptionStrategiesFn)
      const data = await stockAPI.getOptionStrategies(tickerId, false).catch(() => [])
      await saveToIndexedDB(queryKeys.stock.optionStrategies(tickerId).join(':'), data)
      return data
    },
    enabled: !!tickerId && loadOptionStrategies,
    staleTime: 1 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const refetch = async (forceRefresh: boolean = false) => {
    if (forceRefresh && tickerId) {
      const [detailData, insightsData, trendData, optionsData] = await Promise.all([
        stockAPI.getDetail(tickerId, true),
        loadInsights ? stockAPI.getInsights(tickerId, true) : Promise.resolve([]),
        loadTrendAnalysis ? stockAPI.getTrendAnalysis(tickerId, true) : Promise.resolve([]),
        loadOptionStrategies ? stockAPI.getOptionStrategies(tickerId, true).catch(() => []) : Promise.resolve([]),
      ])
      
      await Promise.all([
        saveToIndexedDB(queryKeys.stock.detail(tickerId).join(':'), detailData),
        loadInsights && saveToIndexedDB(queryKeys.stock.insights(tickerId).join(':'), insightsData),
        loadTrendAnalysis && saveToIndexedDB(queryKeys.stock.trendAnalysis(tickerId).join(':'), trendData),
        loadOptionStrategies && saveToIndexedDB(queryKeys.stock.optionStrategies(tickerId).join(':'), optionsData),
      ])
      
      await Promise.all([
        detailQuery.refetch(),
        loadInsights && insightsQuery.refetch(),
        loadTrendAnalysis && trendAnalysisQuery.refetch(),
        loadOptionStrategies && optionStrategiesQuery.refetch(),
      ])
    } else {
      await Promise.all([
        detailQuery.refetch(),
        loadInsights && insightsQuery.refetch(),
        loadTrendAnalysis && trendAnalysisQuery.refetch(),
        loadOptionStrategies && optionStrategiesQuery.refetch(),
      ])
    }
  }

  const loadInsightsFn = async () => {
    if (!tickerId) return
    try {
      const data = await queryClient.fetchQuery({
        queryKey: queryKeys.stock.insights(tickerId),
        queryFn: async () => {
          const fetchedData = await stockAPI.getInsights(tickerId, true)
          await saveToIndexedDB(queryKeys.stock.insights(tickerId).join(':'), fetchedData)
          return fetchedData
        },
      })
      return data
    } catch (error) {
      console.error('Failed to load insights:', error)
      throw error
    }
  }

  const loadTrendAnalysisFn = async () => {
    if (!tickerId) return
    try {
      // Check cache first to avoid unnecessary API calls
      const cached = await loadFromIndexedDB<TrendAnalysis[]>(queryKeys.stock.trendAnalysis(tickerId).join(':'))
      if (cached && cached.length > 0) {
        // Update the query cache with cached data
        queryClient.setQueryData(queryKeys.stock.trendAnalysis(tickerId), cached)
        return cached
      }
      
      // Only fetch if not in cache
      const data = await queryClient.fetchQuery({
        queryKey: queryKeys.stock.trendAnalysis(tickerId),
        queryFn: async () => {
          const fetchedData = await stockAPI.getTrendAnalysis(tickerId, false)
          await saveToIndexedDB(queryKeys.stock.trendAnalysis(tickerId).join(':'), fetchedData)
          return fetchedData
        },
      })
      return data
    } catch (error) {
      console.error('Failed to load trend analysis:', error)
      throw error
    }
  }

  const loadOptionStrategiesFn = async (forceRefresh: boolean = false) => {
    if (!tickerId) return
    try {
      // If force refresh, clear the cache first
      if (forceRefresh) {
        await deleteFromIndexedDB(queryKeys.stock.optionStrategies(tickerId).join(':'))
        queryClient.invalidateQueries({ queryKey: queryKeys.stock.optionStrategies(tickerId) })
      } else {
        // Check cache first to avoid unnecessary API calls
        const cached = await loadFromIndexedDB<OptionStrategy[]>(queryKeys.stock.optionStrategies(tickerId).join(':'))
        if (cached && cached.length > 0) {
          // Update the query cache with cached data
          queryClient.setQueryData(queryKeys.stock.optionStrategies(tickerId), cached)
          return cached
        }
      }
      
      // Fetch from API (with force refresh if requested)
      const data = await queryClient.fetchQuery({
        queryKey: queryKeys.stock.optionStrategies(tickerId),
        queryFn: async () => {
          const fetchedData = await stockAPI.getOptionStrategies(tickerId, forceRefresh).catch(() => [])
          await saveToIndexedDB(queryKeys.stock.optionStrategies(tickerId).join(':'), fetchedData)
          return fetchedData
        },
      })
      return data
    } catch (error) {
      console.error('Failed to load option strategies:', error)
      throw error
    }
  }

  return {
    detail: detailQuery.data || null,
    insights: insightsQuery.data || [],
    trendAnalysis: trendAnalysisQuery.data || [],
    optionStrategies: optionStrategiesQuery.data || [],
    loading: detailQuery.isLoading || (loadInsights && insightsQuery.isLoading) || (loadTrendAnalysis && trendAnalysisQuery.isLoading) || (loadOptionStrategies && optionStrategiesQuery.isLoading),
    error: (detailQuery.error || insightsQuery.error || trendAnalysisQuery.error || optionStrategiesQuery.error) as Error | null,
    refetch,
    loadInsights: loadInsightsFn,
    loadTrendAnalysis: loadTrendAnalysisFn,
    loadOptionStrategies: loadOptionStrategiesFn,
  }
}
