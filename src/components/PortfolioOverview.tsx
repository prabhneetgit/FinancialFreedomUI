import React, { useEffect, useMemo, useState, useRef, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePortfolio } from '../hooks/usePortfolio'
import { useAnalytics } from '../hooks/useAnalytics'
import { useStockDetail } from '../hooks/useStockDetail'
import { useMarketInsights } from '../hooks/useMarketInsights'
import { useDailyMarketSummary } from '../hooks/useDailyMarketSummary'
import { useDailyMarketSummaryExists } from '../hooks/useDailyMarketSummaryExists'
import { usePreMarketInsights } from '../hooks/usePreMarketInsights'
import { usePerformanceHistory } from '../hooks/usePerformanceHistory'
import { PortfolioPerformanceChart } from './Analytics'
import { portfolioAPI, stockAPI, type CSVUploadResponse } from '../services/api'
import { queryKeys } from '../lib/react-query'
import { deleteFromIndexedDB } from '../lib/persistence'
import { getEasternTime } from '../lib/tradingDate'
import type {
  HoldingCategory,
  MarketInsight,
  OptionStrategy,
  PortfolioHolding,
  RebalancingRecommendation,
  StockDetail,
  StockInsight,
  StockPeriodType,
  TaxLossHarvestingOpportunity,
  TrendPeriodType as TrendPeriod,
} from '../types/api'

const MINUS = '−'

const formatCad = (value: number) => {
  const formatted = new Intl.NumberFormat('en-CA', {
    maximumFractionDigits: 0,
  }).format(value)
  return `$${formatted}`
}

const formatPercent = (value: number, includeSign: boolean = false) => {
  const formatted = `${Math.abs(value).toFixed(1)}%`
  if (includeSign) {
    return value >= 0 ? `+${formatted}` : `${MINUS}${formatted}`
  }
  return value >= 0 ? formatted : `${MINUS}${formatted}`
}

const signedCad = (value: number) => `${value >= 0 ? '+' : MINUS}${formatCad(Math.abs(value))}`

const Icon = ({ d, className = 'h-4 w-4' }: { d: string; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
)

const ICONS = {
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  upload: 'M12 15V4M7.5 8.5L12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  chevron: 'M9 6l6 6-6 6',
}

const RANGES = [
  { label: '1M', months: 1, name: 'One-month' },
  { label: '3M', months: 3, name: 'Three-month' },
  { label: '6M', months: 6, name: 'Half-year' },
  { label: '1Y', months: 12, name: 'One-year' },
  { label: '2Y', months: 24, name: 'Two-year' },
]

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const tabs: HoldingCategory[] = ['Stocks', 'ETFs', 'Crypto', 'Sector']

const InsightTabs = ({
  insights,
}: {
  insights: StockInsight[]
}) => {
  const [activePeriod, setActivePeriod] = useState<StockPeriodType>('Daily Brief')
  const activeInsight =
    insights.find((insight) => insight.period === activePeriod) ?? insights[0]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {insights.map((insight) => (
          <button
            key={insight.period}
            type="button"
            onClick={() => setActivePeriod(insight.period)}
            className={`border px-3 py-2 text-xs font-semibold ${
              activePeriod === insight.period
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-white text-ink-soft hover:border-ink'
            }`}
          >
            {insight.period}
          </button>
        ))}
      </div>
      <div className="max-h-64 overflow-y-auto border-y border-line py-3">
        <FormattedInsightContent text={activeInsight?.text || ''} />
      </div>
      <button
        type="button"
        className="text-sm font-semibold text-slate-800 underline underline-offset-4"
      >
        View Details
      </button>
    </div>
  )
}

const FormattedInsightContent = ({ text }: { text: string }) => {
  const parseContent = (content: string) => {
    const lines = content.split('\n')
    const elements: React.ReactElement[] = []
    let currentList: string[] = []
    let listKey = 0

    const flushList = () => {
      if (currentList.length > 0) {
        const currentListKey = listKey++
        elements.push(
          <ul key={`list-${currentListKey}`} className="space-y-1 pl-4">
            {currentList.map((item, idx) => (
              <li key={`list-${currentListKey}-item-${idx}`} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                <span dangerouslySetInnerHTML={{ __html: formatInlineText(item) }} />
              </li>
            ))}
          </ul>
        )
        currentList = []
      }
    }

    const formatInlineText = (text: string): string => {
      return text
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-800">$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    }

    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
      if (!trimmedLine) {
        flushList()
        return
      }

      if (trimmedLine.startsWith('### ') && !trimmedLine.startsWith('#### ')) {
        flushList()
        const headerText = trimmedLine.replace(/^###\s+/, '').replace(/\*\*/g, '')
        elements.push(
          <h3 key={`h3-${index}`} className="mt-3 first:mt-0 text-base font-bold text-ink">
            {headerText}
          </h3>
        )
      } else if (trimmedLine.startsWith('#### ')) {
        flushList()
        const headerText = trimmedLine.replace(/^####\s+/, '').replace(/\*\*/g, '')
        elements.push(
          <h4 key={`h4-${index}`} className="mt-3 text-sm font-semibold text-slate-800 border-l-2 border-slate-300 pl-2">
            {headerText}
          </h4>
        )
      } else if (trimmedLine.match(/^[\d]+\.\s+/)) {
        flushList()
        const itemText = trimmedLine.replace(/^[\d]+\.\s+/, '')
        elements.push(
          <div key={`numbered-${index}`} className="flex items-start gap-2 text-sm text-slate-600 mt-1">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-semibold">
              {trimmedLine.match(/^(\d+)/)?.[1]}
            </span>
            <span dangerouslySetInnerHTML={{ __html: formatInlineText(itemText) }} />
          </div>
        )
      } else if (trimmedLine.startsWith('- ')) {
        const itemText = trimmedLine.replace(/^-\s+/, '')
        currentList.push(itemText)
      } else {
        flushList()
        elements.push(
          <p 
            key={`p-${index}`} 
            className="text-sm leading-relaxed text-slate-600"
            dangerouslySetInnerHTML={{ __html: formatInlineText(trimmedLine) }}
          />
        )
      }
    })

    flushList()
    return elements
  }

  return <div className="space-y-2">{parseContent(text)}</div>
}

type MarketPeriod = 'PRE_MARKET' | 'MORNING' | 'MIDDAY' | 'CLOSING'
type MarketStatus = 'pre-market' | 'morning' | 'midday' | 'closing' | 'after-hours' | 'closed'

const NYSE_HOURS = {
  PRE_MARKET: { start: 4, end: 9.5 },
  MORNING: { start: 9.5, end: 12 },
  MIDDAY: { start: 12, end: 14 },
  CLOSING: { start: 14, end: 16 },
}

const getMarketStatus = (): { status: MarketStatus; currentPeriod: MarketPeriod | null; isWeekend: boolean } => {
  const et = getEasternTime()
  const hour = et.getHours() + et.getMinutes() / 60
  const dayOfWeek = et.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  if (isWeekend) {
    return { status: 'closed', currentPeriod: 'CLOSING', isWeekend: true }
  }

  if (hour < NYSE_HOURS.MORNING.start) {
    return { status: 'pre-market', currentPeriod: null, isWeekend: false }
  } else if (hour >= NYSE_HOURS.MORNING.start && hour < NYSE_HOURS.MORNING.end) {
    return { status: 'morning', currentPeriod: 'MORNING', isWeekend: false }
  } else if (hour >= NYSE_HOURS.MIDDAY.start && hour < NYSE_HOURS.MIDDAY.end) {
    return { status: 'midday', currentPeriod: 'MIDDAY', isWeekend: false }
  } else if (hour >= NYSE_HOURS.CLOSING.start && hour < NYSE_HOURS.CLOSING.end) {
    return { status: 'closing', currentPeriod: 'CLOSING', isWeekend: false }
  } else {
    return { status: 'after-hours', currentPeriod: 'CLOSING', isWeekend: false }
  }
}

const isPeriodAvailable = (period: MarketPeriod, marketStatus: MarketStatus): boolean => {
  if (marketStatus === 'closed' || marketStatus === 'after-hours') {
    return true
  }
  if (marketStatus === 'pre-market') {
    return period === 'PRE_MARKET'
  }
  
  const periodOrder: MarketPeriod[] = ['PRE_MARKET', 'MORNING', 'MIDDAY', 'CLOSING']
  const statusToPeriod: Record<string, MarketPeriod> = {
    'morning': 'MORNING',
    'midday': 'MIDDAY', 
    'closing': 'CLOSING',
  }
  
  const currentPeriod = statusToPeriod[marketStatus]
  if (!currentPeriod) return false
  
  const currentIndex = periodOrder.indexOf(currentPeriod)
  const periodIndex = periodOrder.indexOf(period)
  
  return periodIndex <= currentIndex
}

const MarketInsightTabs = ({
  insights,
  loading,
  error,
}: {
  insights: MarketInsight[]
  loading: boolean
  error: Error | null
}) => {
  const [currentTime, setCurrentTime] = useState(getEasternTime())
  const marketInfo = useMemo(() => getMarketStatus(), [currentTime])
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [showPreMarketInsight, setShowPreMarketInsight] = useState(false)
  const isMarketClosed = marketInfo.status === 'closed' || marketInfo.status === 'after-hours'
  const isPreMarket = marketInfo.status === 'pre-market'
  const [previousMarketClosed, setPreviousMarketClosed] = useState<boolean>(isMarketClosed)
  
  // Track market status transition
  useEffect(() => {
    setPreviousMarketClosed(isMarketClosed)
  }, [isMarketClosed])
  
  const { summary, loading: summaryLoading, error: summaryError } = useDailyMarketSummary(showSummaryModal && isMarketClosed)
  const { exists: summaryExists, loading: summaryExistsLoading } = useDailyMarketSummaryExists(
    isMarketClosed,
    previousMarketClosed
  )
  const { insight: preMarketInsight, loading: preMarketLoading, error: preMarketError, refetch: refetchPreMarket } = usePreMarketInsights(showPreMarketInsight && isPreMarket)
  
  const fetchPreMarketInsights = async (forceRefresh: boolean = true) => {
    try {
      setShowPreMarketInsight(true)
      await refetchPreMarket(forceRefresh)
    } catch (error) {
      console.error('Failed to fetch pre-market insights:', error)
      setShowPreMarketInsight(true)
    }
  }

  const hasInsightData = (period: MarketPeriod): boolean => {
    if (period === 'PRE_MARKET') {
      return !!preMarketInsight
    }
    return insights.some((insight) => insight.period === period && insight.text)
  }
  
  const isPeriodEnabled = (period: MarketPeriod): boolean => {
    if (marketInfo.status === 'closed' || marketInfo.status === 'after-hours') {
      return period === 'CLOSING' && hasInsightData(period)
    }
    // PRE_MARKET should always be enabled during pre-market hours, even without data
    if (period === 'PRE_MARKET' && marketInfo.status === 'pre-market') {
      return true
    }
    const timeAvailable = isPeriodAvailable(period, marketInfo.status)
    const hasData = hasInsightData(period)
    return timeAvailable && hasData
  }
  
  const getInitialPeriod = (): MarketPeriod => {
    if (marketInfo.status === 'pre-market') {
      if (preMarketInsight) return 'PRE_MARKET'
      return 'PRE_MARKET'
    }
    
    if (marketInfo.status === 'closed' || marketInfo.status === 'after-hours') {
      return 'CLOSING'
    }
    
    if (marketInfo.currentPeriod && hasInsightData(marketInfo.currentPeriod)) {
      return marketInfo.currentPeriod
    }
    
    const availablePeriods: MarketPeriod[] = ['CLOSING', 'MIDDAY', 'MORNING']
    for (const period of availablePeriods) {
      if (hasInsightData(period)) return period
    }
    return 'CLOSING'
  }
  
  const [activePeriod, setActivePeriod] = useState<MarketPeriod>(getInitialPeriod)
  const periods: MarketPeriod[] = ['PRE_MARKET', 'MORNING', 'MIDDAY', 'CLOSING']
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getEasternTime())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const insightsPeriodsKey = useMemo(() => {
    const periodsList = insights && insights.length > 0 
      ? insights.map(i => i.period).sort().join(',')
      : 'none'
    return `${periodsList}-${preMarketInsight ? 'has-pm' : 'no-pm'}`
  }, [
    insights?.length ?? 0, 
    (insights ? insights.map(i => i.period).sort().join(',') : 'none'), 
    !!preMarketInsight
  ])

  useEffect(() => {
    if (marketInfo.status === 'pre-market') {
      setActivePeriod((current) => {
        if (current !== 'PRE_MARKET') {
          setShowPreMarketInsight(true)
          return 'PRE_MARKET'
        }
        return current
      })
      return
    }
    
    if (marketInfo.status === 'closed' || marketInfo.status === 'after-hours') {
      setActivePeriod((current) => {
        if (current !== 'CLOSING') {
          return 'CLOSING'
        }
        return current
      })
      return
    }
    
    const currentPeriod = marketInfo.currentPeriod
    if (currentPeriod) {
      setActivePeriod((current) => {
        if (current !== currentPeriod) {
          const hasData = currentPeriod === 'PRE_MARKET'
            ? !!preMarketInsight
            : insights.some((insight) => insight.period === currentPeriod && insight.text)

          if (hasData) {
            return currentPeriod
          }
        }
        return current
      })
    }
  }, [marketInfo.currentPeriod ?? null, marketInfo.status, insightsPeriodsKey, preMarketInsight, insights])
  
  const activeInsight = insights.find((insight) => insight.period === activePeriod) ?? insights[0]

  const getPeriodInfo = (period: MarketPeriod) => {
    const hours = NYSE_HOURS[period]
    const formatHour = (h: number) => {
      const hour12 = h > 12 ? h - 12 : h
      const suffix = h >= 12 ? 'PM' : 'AM'
      const mins = (h % 1) * 60
      return `${Math.floor(hour12)}:${mins.toString().padStart(2, '0')} ${suffix}`
    }
    return `${formatHour(hours.start)} - ${formatHour(hours.end)} ET`
  }

  const getPeriodIcon = (period: MarketPeriod, isDisabled: boolean) => {
    const className = `h-4 w-4 ${isDisabled ? 'opacity-50' : ''}`
    switch (period) {
      case 'PRE_MARKET':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      case 'MORNING':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      case 'MIDDAY':
        return (
          <svg className={className} fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )
      case 'CLOSING':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )
    }
  }

  const getMarketStatusDisplay = () => {
    const et = currentTime
    const timeStr = et.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    
    switch (marketInfo.status) {
      case 'pre-market':
        return { label: 'Pre-market', color: 'text-accent', time: timeStr }
      case 'morning':
        return { label: 'Market open', color: 'text-gain', time: timeStr }
      case 'midday':
        return { label: 'Market open', color: 'text-gain', time: timeStr }
      case 'closing':
        return { label: 'Market open', color: 'text-gain', time: timeStr }
      case 'after-hours':
        return { label: 'After hours', color: 'text-muted', time: timeStr }
      case 'closed':
        return { label: 'Market closed', color: 'text-muted', time: 'Weekend' }
    }
  }

  const statusDisplay = getMarketStatusDisplay()

  const periodButtonClass = (variant: 'pre-active' | 'active' | 'pre' | 'enabled' | 'disabled') =>
    `flex h-9 items-center gap-1.5 border px-3 text-xs font-semibold capitalize transition-colors ${
      {
        'pre-active': 'border-ink bg-ink text-white',
        active: 'border-ink bg-ink text-white',
        pre: 'border-accent text-accent hover:bg-[#eef1fc]',
        enabled: 'border-line bg-white text-ink-soft hover:border-ink',
        disabled: 'cursor-not-allowed border-hairline bg-white text-[#9a9a9a]',
      }[variant]
    }`

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
        <span className="text-sm text-muted">Loading market insights...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <p className="text-sm font-semibold text-red-800">Error loading market insights</p>
        <p className="text-sm text-red-700">{error.message}</p>
      </div>
    )
  }

  // Don't return early if we're in pre-market hours - allow PRE_MARKET tab to be shown
  if (!insights.length && marketInfo.status !== 'pre-market') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {periods.map((period) => (
              <button
                key={period}
                type="button"
                disabled
                className={periodButtonClass('disabled')}
              >
                {getPeriodIcon(period, true)}
                {period.toLowerCase()}
                <svg className="h-3 w-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            ))}
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${statusDisplay.color}`}>
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8a8a8a]" />
            </span>
            {statusDisplay.label} · {statusDisplay.time}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center border-y border-line py-8 text-center">
          <svg className="h-10 w-10 text-[#bdbdbd] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-ink-soft">
            {marketInfo.isWeekend
              ? "Market is closed for the weekend"
              : "No market insights available yet"}
          </p>
          <p className="text-xs text-muted mt-1">
            {marketInfo.isWeekend
              ? "Check back Monday for today's insights"
              : "Insights will be available during market hours"}
          </p>
        </div>
      </div>
    )
  }


  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {periods.map((period) => {
            const isPreMarketPeriod = period === 'PRE_MARKET'
            const isEnabled = isPeriodEnabled(period)
            const isActive = activePeriod === period
            const isCurrent = marketInfo.currentPeriod === period || (isPreMarketPeriod && marketInfo.status === 'pre-market')
            
            return (
              <div key={period} className="relative">
                <button
                  type="button"
                  onClick={async () => {
                    if (isPreMarketPeriod) {
                      setActivePeriod('PRE_MARKET')
                      setShowPreMarketInsight(true)
                      if (!preMarketInsight && !preMarketLoading) {
                        await fetchPreMarketInsights(false)
                      }
                    } else {
                      setActivePeriod(period)
                      setShowPreMarketInsight(false)
                    }
                  }}
                  disabled={!isEnabled && !isPreMarketPeriod}
                  title={isEnabled || isPreMarketPeriod ? getPeriodInfo(period) : `${period} insights not yet available for today`}
                  className={periodButtonClass(
                    isPreMarketPeriod && isActive
                      ? 'pre-active'
                      : isActive
                        ? 'active'
                        : isPreMarketPeriod
                          ? 'pre'
                          : isEnabled
                            ? 'enabled'
                            : 'disabled',
                  )}
                >
                  {getPeriodIcon(period, !isEnabled && !isPreMarketPeriod)}
                  {period === 'PRE_MARKET' ? 'pre-market' : period.toLowerCase()}
                  {isPreMarketPeriod && preMarketLoading && (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent ml-0.5" />
                  )}
                  {isPreMarketPeriod && !preMarketLoading && preMarketInsight && (
                    <svg className="h-3 w-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {!isPreMarketPeriod && !isEnabled && (
                    <svg className="h-3 w-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
                {isCurrent && (isEnabled || isPreMarketPeriod) && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent border-2 border-white" />
                )}
              </div>
            )
          })}
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${statusDisplay.color}`}>
          <span className="relative flex h-2 w-2">
            {(marketInfo.status === 'morning' || marketInfo.status === 'midday' || marketInfo.status === 'closing') && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gain opacity-50" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              marketInfo.status === 'morning' || marketInfo.status === 'midday' || marketInfo.status === 'closing'
                ? 'bg-gain'
                : marketInfo.status === 'pre-market'
                  ? 'bg-accent'
                  : 'bg-[#8a8a8a]'
            }`} />
          </span>
          {statusDisplay.label} · {statusDisplay.time}
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs text-muted">
        <span className="font-semibold uppercase tracking-[0.06em] text-[11px]">NYSE hours (ET)</span>
        {periods.map((period) => {
          const isEnabled = isPeriodEnabled(period)
          const isCurrent = marketInfo.currentPeriod === period || (period === 'PRE_MARKET' && marketInfo.status === 'pre-market')
          return (
            <span
              key={period}
              className={`flex justify-between ${isCurrent ? 'text-accent font-semibold' : isEnabled || period === 'PRE_MARKET' ? 'text-ink-soft' : 'text-[#8a8a8a]'}`}
            >
              <span>{period === 'PRE_MARKET' ? 'Pre-market' : period.charAt(0) + period.slice(1).toLowerCase()}</span>
              <span className="tabular-nums">{getPeriodInfo(period)}</span>
            </span>
          )
        })}
      </div>

      <div className="max-h-80 overflow-y-auto border-y border-line py-4">
        {activePeriod === 'PRE_MARKET' ? (
          <>
            {preMarketLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg className="h-10 w-10 text-accent mb-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="2" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-sm font-medium text-slate-600">
                  Generating Pre-Market Insights...
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Analyzing futures, overnight news, and global markets
                </p>
              </div>
            ) : preMarketInsight ? (
              <FormattedInsightContent text={preMarketInsight} />
            ) : preMarketError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg className="h-12 w-12 text-red-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-medium text-red-600">
                  Failed to load pre-market insights
                </p>
                <p className="text-xs text-red-500 mt-1">
                  {preMarketError.message}
                </p>
                <button
                  type="button"
                  onClick={() => fetchPreMarketInsights(true)}
                  className="mt-3 text-xs text-accent hover:text-accent-dark font-semibold underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-sm font-medium text-ink-soft">
                  Your pre-market brief isn’t ready yet
                </p>
                <p className="text-xs text-muted mt-1">
                  Built from futures, overnight news and global markets
                </p>
                <button
                  type="button"
                  onClick={() => fetchPreMarketInsights(true)}
                  className="mt-4 flex h-11 items-center gap-2 border border-ink bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
                >
                  <Icon d={ICONS.sparkle} />
                  Generate pre-market brief
                </button>
              </div>
            )}
          </>
        ) : !isPeriodEnabled(activePeriod) ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg className="h-10 w-10 text-[#bdbdbd] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-ink-soft">
              {activePeriod.charAt(0) + activePeriod.slice(1).toLowerCase()} insights not yet available for today
            </p>
            <p className="text-xs text-muted mt-1">
              Check back during {getPeriodInfo(activePeriod)}
            </p>
          </div>
        ) : activeInsight?.text ? (
          <FormattedInsightContent text={activeInsight.text} />
        ) : (
          <p className="text-sm text-slate-500 italic">No insight available for this period.</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (isMarketClosed && summaryExists) {
              setShowSummaryModal(true)
            }
          }}
          className={`self-start text-sm font-semibold transition-colors ${
            isMarketClosed && summaryExists && !summaryExistsLoading
              ? 'text-accent hover:text-accent-dark cursor-pointer'
              : 'text-[#8a8a8a] cursor-not-allowed'
          }`}
          disabled={!isMarketClosed || !summaryExists || summaryExistsLoading}
          title={
            summaryExistsLoading
              ? 'Checking for daily summary...'
              : !isMarketClosed
              ? 'Available after market closes'
              : !summaryExists
              ? 'Daily summary is being generated...'
              : 'View comprehensive daily market summary'
          }
        >
          View full report →
        </button>
      </div>

      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onClick={() => setShowSummaryModal(false)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white shadow-xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-line">
              <h2 className="font-serif text-3xl">Daily market summary</h2>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {summaryLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600 mb-4" />
                  <p className="text-sm text-slate-600">Generating daily summary...</p>
                </div>
              ) : summaryError ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg className="h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-red-800 mb-2">Error loading summary</p>
                  <p className="text-sm text-red-600">{summaryError.message}</p>
                </div>
              ) : summary ? (
                <div className="prose prose-slate max-w-none">
                  <FormattedInsightContent text={summary} />
                </div>
              ) : (
                <p className="text-sm text-slate-500">No summary available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const TrendGrid = ({
  trendAnalyses,
  recommendation,
  longTermBias,
}: {
  trendAnalyses: StockDetail['trendAnalyses']
  recommendation: StockDetail['recommendation']
  longTermBias: StockDetail['longTermBias']
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>('This Year')

  const cells: TrendPeriod[] = [
    'This Year',
    'This Month',
    'This week',
    'Today',
    'Short Future',
    'Long Future',
  ]

  const selectedAnalysis = trendAnalyses.find((analysis) => analysis.period === selectedPeriod)

  const getCellValue = (period: TrendPeriod): 'Buy' | 'Sell' | 'Hold' => {
    if (period === 'This Year') return recommendation
    if (period === 'Long Future') return longTermBias
    const analysis = trendAnalyses.find((a) => a.period === period)
    return analysis?.recommendation ?? 'Hold'
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-ink">Historical Trend</h3>
      <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
        {cells.map((period) => {
          const value = getCellValue(period)
          const isActive = selectedPeriod === period
          const isToday = period === 'Today'
          
          let buttonClasses = 'rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-colors'
          
          if (isActive) {
            buttonClasses += ' bg-ink border-ink text-white'
          } else if (isToday) {
            buttonClasses += ' bg-slate-700 border-slate-700 text-white'
          } else {
            buttonClasses += ' bg-slate-100 border-slate-200 text-ink'
          }

          const recommendationColor =
            value === 'Sell'
              ? 'text-loss'
              : value === 'Buy'
                ? 'text-gain'
                : isActive
                  ? 'text-white'
                  : 'text-slate-700'

          return (
            <button
              key={period}
              type="button"
              onClick={() => setSelectedPeriod(period)}
              className={buttonClasses}
            >
              <p className={`text-[11px] ${isActive ? 'text-white' : isToday ? 'text-white' : 'text-slate-700'}`}>
                {period}
              </p>
              <p className={`text-sm font-bold ${recommendationColor}`}>
                {value}
              </p>
            </button>
          )
        })}
      </div>
      {selectedAnalysis && (
        <div className="mt-4 rounded-lg border-l-4 border-ink border-r border-t border-b border-slate-200 bg-white px-4 py-4 shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">{selectedPeriod} Analysis</p>
              <p
                className={`mt-1 text-base font-bold ${
                  selectedAnalysis.recommendation === 'Sell'
                    ? 'text-loss'
                    : selectedAnalysis.recommendation === 'Buy'
                      ? 'text-gain'
                      : 'text-slate-700'
                }`}
              >
                Recommendation: {selectedAnalysis.recommendation}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPeriod('This Year')}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Close analysis"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                QUICK INSIGHT
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {selectedAnalysis.quickInsight}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                REASONING
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {selectedAnalysis.reasoning}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                KEY METRICS
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {Object.entries(selectedAnalysis.keyMetrics).map(([key, value], index) => {
                  const isPositiveValue = typeof value === 'string' && (value.startsWith('+') || value.includes('Positive'))
                  const valueColor = isPositiveValue ? 'text-gain' : 'text-ink'
                  const isFirstRow = index < 2
                  
                  return (
                    <div key={key} className={`flex flex-col ${isFirstRow ? 'border-b border-slate-200 pb-3' : ''}`}>
                      <span className="text-xs font-semibold text-slate-600">
                        {key
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, (str) => str.toUpperCase())
                          .trim()}
                      </span>
                      <span className={`mt-1 text-sm font-bold ${valueColor}`}>{value}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const OptionStrategies = ({
  strategies,
  onRefresh,
}: {
  strategies: OptionStrategy[]
  onRefresh?: () => Promise<void>
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    if (!onRefresh) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!strategies || strategies.length === 0) {
    return null
  }

  const getSentimentColor = (sentiment: OptionStrategy['sentiment']) => {
    switch (sentiment) {
      case 'Bullish':
        return 'bg-emerald-100 text-gain'
      case 'Bearish':
        return 'bg-rose-100 text-rose-700'
      case 'Neutral':
        return 'bg-slate-100 text-slate-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getRiskLevelColor = (riskLevel: OptionStrategy['riskLevel']) => {
    switch (riskLevel) {
      case 'Low':
        return 'bg-emerald-100 text-gain'
      case 'Medium':
        return 'bg-amber-100 text-amber-700'
      case 'High':
        return 'bg-emerald-100 text-gain'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getRiskLevelBorderColor = (riskLevel: OptionStrategy['riskLevel']) => {
    switch (riskLevel) {
      case 'Low':
        return 'border-emerald-200'
      case 'Medium':
        return 'border-amber-200'
      case 'High':
        return 'border-emerald-200'
      default:
        return 'border-slate-200'
    }
  }

  const getRiskTypeColor = (riskType: string | undefined) => {
    if (riskType === 'Defined') return 'bg-emerald-100 text-gain'
    if (riskType === 'Undefined') return 'bg-rose-100 text-rose-700'
    return 'bg-slate-100 text-slate-700'
  }

  const getCategoryColor = (category: string | undefined) => {
    switch (category) {
      case 'Directional':
        return 'bg-blue-100 text-blue-700'
      case 'Income':
        return 'bg-emerald-100 text-gain'
      case 'Volatility':
        return 'bg-purple-100 text-purple-700'
      case 'Protective':
      case 'Protection':
        return 'bg-amber-100 text-amber-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {isRefreshing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-accent"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-700">Refreshing strategies...</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-ink">Option Strategies</h3>
        {onRefresh && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh option strategies"
          >
            <svg
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>
      <div className="mt-3 space-y-4">
        {strategies.map((strategy, index) => (
          <div
            key={`strategy-${index}-${strategy.name}-${strategy.expirationDate}`}
            className={`rounded-lg border bg-white p-4 shadow-sm ${getRiskLevelBorderColor(
              strategy.riskLevel,
            )}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-semibold text-ink">{strategy.name}</h4>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getSentimentColor(
                      strategy.sentiment,
                    )}`}
                  >
                    {strategy.sentiment}
                  </span>
                  {strategy.strategyCategory && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getCategoryColor(strategy.strategyCategory)}`}>
                      {strategy.strategyCategory}
                    </span>
                  )}
                  {strategy.riskType && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getRiskTypeColor(strategy.riskType)}`}>
                      {strategy.riskType} Risk
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span>
                    {strategy.expirationDate} ({strategy.daysToExpiration}d)
                  </span>
                  {strategy.strategyType && strategy.strategyType !== strategy.name && (
                    <span className="text-slate-500">• {strategy.strategyType}</span>
                  )}
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getRiskLevelColor(
                  strategy.riskLevel,
                )}`}
              >
                {strategy.riskLevel}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold text-slate-600">Strike Price</p>
                <p className="mt-1 text-sm font-bold text-ink">
                  ${strategy.strikePrice.toFixed(2)}
                </p>
                {(strategy.strikePriceLower || strategy.strikePriceUpper) && (
                  <p className="text-xs text-slate-500">
                    {strategy.strikePriceLower && `Low: $${strategy.strikePriceLower.toFixed(2)}`}
                    {strategy.strikePriceLower && strategy.strikePriceUpper && ' / '}
                    {strategy.strikePriceUpper && `High: $${strategy.strikePriceUpper.toFixed(2)}`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">Premium</p>
                <p className="mt-1 text-sm font-bold text-ink">
                  ${strategy.premium.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">Break Even</p>
                <p className="mt-1 text-sm font-bold text-ink">
                  ${strategy.breakEven.toFixed(2)}
                </p>
                {(strategy.breakEvenLower || strategy.breakEvenUpper) && (
                  <p className="text-xs text-slate-500">
                    {strategy.breakEvenLower && `$${strategy.breakEvenLower.toFixed(2)}`}
                    {strategy.breakEvenLower && strategy.breakEvenUpper && ' - '}
                    {strategy.breakEvenUpper && `$${strategy.breakEvenUpper.toFixed(2)}`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">Current Price</p>
                <p className="mt-1 text-sm font-bold text-ink">
                  ${strategy.currentPrice.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">Max Profit</p>
                <p className="mt-1 text-sm font-bold text-gain">
                  {typeof strategy.maxProfit === 'number' ? formatCurrency(strategy.maxProfit) : strategy.maxProfit}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">Max Loss</p>
                <p className="mt-1 text-sm font-bold text-loss">
                  {typeof strategy.maxLoss === 'number' ? formatCurrency(strategy.maxLoss) : strategy.maxLoss}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs font-semibold text-slate-600">Delta</p>
                <p className="mt-1 text-sm font-bold text-ink">{strategy.delta.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">IV (Implied Volatility)</p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {(strategy.iv * 100).toFixed(1)}%
                  {strategy.ivRank !== undefined && (
                    <span className="ml-1 text-xs text-slate-500">(Rank: {strategy.ivRank.toFixed(0)})</span>
                  )}
                </p>
              </div>
              {strategy.gamma !== undefined && (
                <div>
                  <p className="text-xs font-semibold text-slate-600">Gamma</p>
                  <p className="mt-1 text-sm font-bold text-ink">{strategy.gamma.toFixed(4)}</p>
                </div>
              )}
              {strategy.theta !== undefined && (
                <div>
                  <p className="text-xs font-semibold text-slate-600">Theta</p>
                  <p className="mt-1 text-sm font-bold text-ink">${strategy.theta.toFixed(2)}/day</p>
                </div>
              )}
              {strategy.vega !== undefined && (
                <div>
                  <p className="text-xs font-semibold text-slate-600">Vega</p>
                  <p className="mt-1 text-sm font-bold text-ink">{strategy.vega.toFixed(2)}</p>
                </div>
              )}
            </div>

            {(strategy.probabilityOfProfit !== undefined || strategy.capitalRequired !== undefined || strategy.returnOnCapital !== undefined) && (
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                {strategy.probabilityOfProfit !== undefined && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Probability of Profit</p>
                    <p className="mt-1 text-sm font-bold text-gain">{strategy.probabilityOfProfit.toFixed(1)}%</p>
                  </div>
                )}
                {strategy.capitalRequired !== undefined && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Capital Required</p>
                    <p className="mt-1 text-sm font-bold text-ink">{formatCurrency(strategy.capitalRequired)}</p>
                  </div>
                )}
                {strategy.returnOnCapital !== undefined && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Return on Capital</p>
                    <p className="mt-1 text-sm font-bold text-gain">{strategy.returnOnCapital.toFixed(1)}%</p>
                  </div>
                )}
                {strategy.riskRewardRatio && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Risk/Reward</p>
                    <p className="mt-1 text-sm font-bold text-ink">{strategy.riskRewardRatio}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <p className="text-sm leading-relaxed text-slate-700">{strategy.description}</p>
            </div>

            {(strategy.profitTarget || strategy.stopLoss || strategy.idealConditions) && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">Management Notes</p>
                <div className="space-y-1 text-xs text-slate-600">
                  {strategy.profitTarget && (
                    <p><span className="font-medium text-gain">Profit Target:</span> {strategy.profitTarget}</p>
                  )}
                  {strategy.stopLoss && (
                    <p><span className="font-medium text-rose-700">Stop Loss:</span> {strategy.stopLoss}</p>
                  )}
                  {strategy.idealConditions && (
                    <p><span className="font-medium text-blue-700">Best When:</span> {strategy.idealConditions}</p>
                  )}
                  {strategy.adjustmentPlan && (
                    <p><span className="font-medium text-amber-700">Adjustment:</span> {strategy.adjustmentPlan}</p>
                  )}
                </div>
              </div>
            )}

            {strategy.legs && strategy.legs.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-600 mb-2">Strategy Legs</p>
                <div className="space-y-2">
                  {strategy.legs.map((leg, legIndex) => (
                    <div key={`leg-${legIndex}`} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-xs">
                      <span className={leg.legType === 'Buy' ? 'text-gain font-semibold' : 'text-rose-700 font-semibold'}>
                        {leg.legType} {leg.quantity}x {leg.optionType}
                      </span>
                      <span className="text-slate-700">Strike: ${leg.strikePrice.toFixed(2)}</span>
                      <span className="text-slate-600">${leg.premium.toFixed(2)}</span>
                      <span className="text-slate-500">{leg.expiration}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

type SectorGroup = {
  sector: string
  holdings: PortfolioHolding[]
  totalAmount: number
  totalChangePct: number
  count: number
}

const sectorOrder = [
  'Technology',
  'Index Fund',
  'Technology ETF',
  'Cryptocurrency',
  'Consumer',
  'Automotive',
  'Aerospace',
  'Healthcare',
  'Real Estate',
  'Financials',
  'Energy',
  'Entertainment',
  'Telecommunications',
  'Other',
]

const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_88px_76px] items-center gap-4 px-3 md:grid-cols-[minmax(0,1fr)_96px_80px_130px]'

const Allocation = ({ pct, highlight }: { pct: number; highlight?: boolean }) => (
  <span className="hidden items-center justify-end gap-2.5 md:flex">
    <span className="flex h-1 w-16 overflow-hidden bg-track">
      <span className={highlight ? 'bg-accent' : 'bg-ink/45'} style={{ width: `${Math.min(100, pct * 5)}%` }} />
    </span>
    <span className="w-11 text-right text-[13px] tabular-nums text-ink-soft">{pct.toFixed(1)}%</span>
  </span>
)

const ValueCells = ({ amount, changePct }: { amount: number; changePct: number }) => (
  <>
    <span className="text-right text-sm tabular-nums">{formatCad(amount)}</span>
    <span
      className={`text-right text-sm font-semibold tabular-nums ${changePct >= 0 ? 'text-gain' : 'text-loss'}`}
    >
      {formatPercent(changePct, true)}
    </span>
  </>
)

const HoldingRow = ({
  holding,
  selected,
  totalValue,
  onSelect,
}: {
  holding: PortfolioHolding
  selected: boolean
  totalValue?: number
  onSelect: (id: string) => void
}) => (
  <button
    type="button"
    onClick={() => onSelect(holding.id)}
    aria-pressed={selected}
    className={`${ROW_GRID} w-full border-t border-line py-2.5 text-left transition-colors ${
      selected ? 'bg-[#f2f4fd]' : 'hover:bg-sand'
    }`}
  >
    <span className="flex min-w-0 items-baseline gap-3">
      <span className={`w-12 shrink-0 text-sm font-bold ${selected ? 'text-accent' : 'text-ink'}`}>
        {holding.symbol}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm text-ink">{holding.name}</span>
        <span className="truncate text-xs text-muted">
          {[holding.tag, holding.notes].filter(Boolean).join(' · ')}
        </span>
      </span>
    </span>
    <ValueCells amount={holding.amountCad} changePct={holding.changePct} />
    {totalValue ? <Allocation pct={(holding.amountCad / totalValue) * 100} highlight={selected} /> : <span />}
  </button>
)

const HoldingsList = ({
  holdings,
  selectedId,
  totalValue,
  onSelect,
  isSectorView = false,
}: {
  holdings: PortfolioHolding[]
  selectedId: string
  // ponytail: allocation is only meaningful for owned holdings, so the watchlist passes undefined
  totalValue?: number
  onSelect: (id: string) => void
  isSectorView?: boolean
}) => {
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set())

  const toggleSector = (sector: string) => {
    setExpandedSectors((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sector)) {
        newSet.delete(sector)
      } else {
        newSet.add(sector)
      }
      return newSet
    })
  }

  const sectorGroups = useMemo(() => {
    if (!isSectorView) return null

    const groups = holdings.reduce((acc, holding) => {
      const sector = holding.tag || 'Other'
      if (!acc[sector]) {
        acc[sector] = { sector, holdings: [], totalAmount: 0, totalChangePct: 0, count: 0 }
      }
      acc[sector].holdings.push(holding)
      acc[sector].totalAmount += holding.amountCad
      acc[sector].count += 1
      return acc
    }, {} as Record<string, SectorGroup>)

    const ordered = [
      ...sectorOrder.filter((sector) => groups[sector]),
      ...Object.keys(groups).filter((sector) => !sectorOrder.includes(sector)),
    ]

    return ordered.map((sector) => {
      const group = groups[sector]
      const weightedChange = group.holdings.reduce((sum, h) => sum + h.changePct * h.amountCad, 0)
      group.totalChangePct = group.totalAmount > 0 ? weightedChange / group.totalAmount : 0
      return group
    })
  }, [holdings, isSectorView])

  return (
    <div className="flex flex-col">
      <div className={`${ROW_GRID} smallcaps border-b border-ink py-2 text-[11px] text-muted`}>
        <span>{isSectorView ? 'Sector' : 'Holding'}</span>
        <span className="text-right">Value</span>
        <span className="text-right">Return</span>
        {totalValue ? <span className="hidden text-right md:block">Weight</span> : <span />}
      </div>

      {holdings.length === 0 && (
        <p className="border-t border-line px-3 py-10 text-center text-sm text-muted">No holdings match.</p>
      )}

      {sectorGroups
        ? sectorGroups.map((group) => {
            const isExpanded = expandedSectors.has(group.sector)
            return (
              <div key={group.sector}>
                <button
                  type="button"
                  onClick={() => toggleSector(group.sector)}
                  aria-expanded={isExpanded}
                  className={`${ROW_GRID} w-full border-t border-line py-2.5 text-left transition-colors hover:bg-sand ${
                    isExpanded ? 'bg-sand' : ''
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon
                      d={ICONS.chevron}
                      className={`h-4 w-4 shrink-0 text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                    <span className="truncate font-serif text-lg">{group.sector}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {group.count} {group.count === 1 ? 'holding' : 'holdings'}
                    </span>
                  </span>
                  <ValueCells amount={group.totalAmount} changePct={group.totalChangePct} />
                  {totalValue ? <Allocation pct={(group.totalAmount / totalValue) * 100} /> : <span />}
                </button>
                {isExpanded &&
                  group.holdings.map((holding) => (
                    <HoldingRow
                      key={holding.id}
                      holding={holding}
                      selected={holding.id === selectedId}
                      totalValue={totalValue}
                      onSelect={onSelect}
                    />
                  ))}
              </div>
            )
          })
        : holdings.map((holding) => (
            <HoldingRow
              key={holding.id}
              holding={holding}
              selected={holding.id === selectedId}
              totalValue={totalValue}
              onSelect={onSelect}
            />
          ))}
      <div className="border-t border-ink" />
    </div>
  )
}

const GlanceRow = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <div className="flex justify-between gap-4 border-t border-line py-2.5 text-sm">
    <dt className="text-[#4a4a4a]">{label}</dt>
    <dd className={`text-right font-semibold tabular-nums ${tone ?? ''}`}>{value}</dd>
  </div>
)

const SectionHeading = ({ id, title, meta }: { id: string; title: string; meta?: string }) => (
  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
    <h2 id={id} className="font-serif text-[34px] font-medium leading-none md:text-[40px]">
      {title}
    </h2>
    {meta && <span className="text-[13px] text-[#4a4a4a]">{meta}</span>}
  </div>
)

const BriefSection = ({
  title,
  tone = 'text-muted',
  children,
}: {
  title: string
  tone?: string
  children: ReactNode
}) => (
  <div className="flex flex-col gap-2 border-t border-line pt-3">
    <span className={`smallcaps text-[11px] ${tone}`}>{title}</span>
    {children}
  </div>
)

const RebalanceBlock = ({ rec }: { rec: RebalancingRecommendation }) => {
  const sell = rec.action === 'Sell'
  return (
    <BriefSection title={`Rebalance · ${sell ? 'Trim' : 'Add'}`} tone={sell ? 'text-loss' : 'text-gain'}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-serif text-2xl tabular-nums">
          {rec.currentAllocation.toFixed(1)}% → {rec.targetAllocation.toFixed(1)}%
        </span>
        <span className="text-[13px] font-semibold">
          {rec.action} {formatCad(Math.abs(rec.amount))} CAD
        </span>
      </div>
      <p className="font-serif text-base leading-relaxed text-ink-soft">{rec.reason}</p>
    </BriefSection>
  )
}

const HarvestBlock = ({ opp }: { opp: TaxLossHarvestingOpportunity }) => (
  <BriefSection title="Tax-loss harvest">
    <dl className="grid grid-cols-2 gap-3">
      <div className="flex flex-col">
        <dt className="text-xs text-muted">Unrealized loss</dt>
        <dd className="font-serif text-[28px] leading-tight tabular-nums text-loss">
          {MINUS}
          {formatCad(Math.abs(opp.unrealizedLoss))}
        </dd>
        <dd className="text-xs text-muted">{Math.abs(opp.lossPercentage).toFixed(1)}% below cost</dd>
      </div>
      <div className="flex flex-col">
        <dt className="text-xs text-muted">Est. tax savings</dt>
        <dd className="font-serif text-[28px] leading-tight tabular-nums text-gain">{formatCad(opp.taxSavings)}</dd>
      </div>
    </dl>
    {opp.replacementOptions.length > 0 && (
      <p className="text-[13px] text-ink-soft">
        Swap ideas:{' '}
        {opp.replacementOptions.map((option, index) => (
          <span key={option.symbol}>
            {index > 0 && ', '}
            <abbr title={`${option.name}: ${option.reason}`} className="font-semibold no-underline">
              {option.symbol}
            </abbr>
          </span>
        ))}
      </p>
    )}
    <span className="text-xs text-muted">
      Superficial-loss risk: <strong className="text-ink">{opp.washSaleRisk}</strong>
    </span>
  </BriefSection>
)

export const PortfolioOverview = () => {
  const [activeList, setActiveList] = useState<'Holdings' | 'Watchlist'>('Holdings')
  const [activeTab, setActiveTab] = useState<HoldingCategory | 'All'>('All')
  const [selectedId, setSelectedId] = useState<string>('')
  const [hasExplicitSelection, setHasExplicitSelection] = useState(false)
  const [loadInsights, setLoadInsights] = useState(false)
  const [loadTrendAnalysis, setLoadTrendAnalysis] = useState(false)
  const [loadOptionStrategies, setLoadOptionStrategies] = useState(false)
  const [loadingTrendAnalysis, setLoadingTrendAnalysis] = useState(false)
  const [loadingOptionStrategies, setLoadingOptionStrategies] = useState(false)
  const [optionStrategiesError, setOptionStrategiesError] = useState<Error | null>(null)
  const [uploadStatus, setUploadStatus] = useState<{
    loading: boolean
    message: string | null
    isError: boolean
  }>({ loading: false, message: null, isError: false })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { holdings, watchlist, summary, loading: portfolioLoading, error: portfolioError, refetch } =
    usePortfolio()
  
  const holdingsHash = useMemo(() => {
    return JSON.stringify(holdings.map(h => ({ id: h.id, symbol: h.symbol, amountCad: h.amountCad })))
  }, [holdings])
  
  const {
    refetch: refetchAnalytics,
    performance,
    sectorDiversification,
    riskMetrics,
    positionSizing,
    rebalancing,
    taxLossHarvesting,
    rebalancingMetadata,
  } = useAnalytics(holdingsHash)
  const [months, setMonths] = useState(6)
  const [query, setQuery] = useState('')
  const { performanceHistory, loading: historyLoading } = usePerformanceHistory(months, holdingsHash)
  
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadStatus({ loading: true, message: null, isError: false })

    try {
      const result: CSVUploadResponse = await portfolioAPI.uploadCSV(file)
      
      setUploadStatus({
        loading: false,
        message: result.message,
        isError: !result.success,
      })

      if (result.success) {
        await Promise.all([
          refetch(),
          refetchAnalytics(true),
          deleteFromIndexedDB(queryKeys.analytics.performanceHistory(months).join(':')),
          queryClient.invalidateQueries({ queryKey: queryKeys.analytics.performanceHistory(months) }),
        ])
        setTimeout(() => {
          setUploadStatus({ loading: false, message: null, isError: false })
        }, 5000)
      }
    } catch (err) {
      setUploadStatus({
        loading: false,
        message: err instanceof Error ? err.message : 'Upload failed',
        isError: true,
      })
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  const { insights: marketInsights, loading: marketInsightsLoading, error: marketInsightsError } =
    useMarketInsights()
  const baseHoldings = useMemo(
    () => (activeList === 'Holdings' ? holdings : watchlist),
    [activeList, holdings, watchlist],
  )

  const selectedHolding = useMemo(() => {
    return baseHoldings.find((holding) => holding.id === selectedId) ?? baseHoldings[0] ?? null
  }, [baseHoldings, selectedId])

  const {
    detail,
    insights: stockInsights,
    trendAnalysis,
    optionStrategies,
    loading: detailLoading,
    error: detailError,
    loadInsights: loadInsightsFn,
    loadTrendAnalysis: loadTrendAnalysisFn,
    loadOptionStrategies: loadOptionStrategiesFn,
  } = useStockDetail(
    hasExplicitSelection && selectedHolding?.symbol ? selectedHolding.symbol : null,
    {
      loadInsights,
      loadTrendAnalysis,
      loadOptionStrategies,
    }
  )

  const filteredHoldings = useMemo(() => {
    if (activeTab === 'All') {
      return baseHoldings
    }
    
    if (activeTab === 'Sector') {
      return baseHoldings
    }
    
    return baseHoldings.filter((item) => item.category === activeTab)
  }, [activeTab, baseHoldings])

  const handleStockSelect = (id: string) => {
    setSelectedId(id)
    setHasExplicitSelection(true)
    setLoadInsights(true)
  }

  const handleInsightsClick = async (holding: PortfolioHolding) => {
    handleStockSelect(holding.id)
    // Stock Insights loads by default, reset other loading states
    setLoadTrendAnalysis(false)
    setLoadOptionStrategies(false)
    
    // Invalidate cache for this stock's insights to force fresh generation
    if (holding.symbol) {
      try {
        await stockAPI.invalidateInsights(holding.symbol)
      } catch (error) {
        console.error('Failed to invalidate insights cache:', error)
        // Continue anyway - the force_refresh flag will still work
      }
    }
  }

  const handleLoadStockInsights = async () => {
    setLoadInsights(true)
    await loadInsightsFn()
  }

  const handleLoadTrendAnalysis = async () => {
    setLoadingTrendAnalysis(true)
    setLoadTrendAnalysis(true)
    try {
      // Load the data first, then enable the query to avoid unnecessary refetches
      await loadTrendAnalysisFn()
    } catch (error) {
      console.error('Failed to load trend analysis:', error)
    } finally {
      setLoadingTrendAnalysis(false)
    }
  }

  const handleLoadOptionStrategies = async () => {
    setLoadingOptionStrategies(true)
    setLoadOptionStrategies(true)
    try {
      // Load the data first, then enable the query to avoid unnecessary refetches
      await loadOptionStrategiesFn()
    } catch (error) {
      console.error('Failed to load option strategies:', error)
    } finally {
      setLoadingOptionStrategies(false)
    }
  }

  const handleRefreshOptionStrategies = async () => {
    setLoadingOptionStrategies(true)
    setOptionStrategiesError(null)
    try {
      // Force refresh option strategies
      await loadOptionStrategiesFn(true)
    } catch (error) {
      console.error('Failed to refresh option strategies:', error)
      setOptionStrategiesError(error as Error)
      setLoadOptionStrategies(false)
    } finally {
      setLoadingOptionStrategies(false)
    }
  }

  useEffect(() => {
    if (!baseHoldings.length) return

    const existsInBase = baseHoldings.some((holding) => holding.id === selectedId)
    if (!existsInBase) {
      setSelectedId(baseHoldings[0].id)
      setHasExplicitSelection(false)
      setLoadInsights(false)
      setLoadTrendAnalysis(false)
      setLoadOptionStrategies(false)
      return
    }

    const isSelectedVisible = filteredHoldings.some((holding) => holding.id === selectedId)
    if (!isSelectedVisible && filteredHoldings[0]) {
      setSelectedId(filteredHoldings[0].id)
      setHasExplicitSelection(false)
      setLoadInsights(false)
      setLoadTrendAnalysis(false)
      setLoadOptionStrategies(false)
    }
  }, [baseHoldings, filteredHoldings, selectedId])

  // Reset loading states when stock changes (except insights which load by default)
  useEffect(() => {
    if (hasExplicitSelection && selectedHolding?.symbol) {
      setLoadInsights(true)
      setLoadTrendAnalysis(false)
      setLoadOptionStrategies(false)
      setOptionStrategiesError(null)
    }
  }, [selectedHolding?.symbol, hasExplicitSelection])

  const loading = portfolioLoading
  const error = portfolioError

  if (loading && !summary) {
    return <div className="flex items-center justify-center py-12 text-muted">Loading portfolio data...</div>
  }

  if (error) {
    return (
      <div className="bg-[#fbe9e6] p-4 text-[#9e2a17]">
        <p className="text-sm font-semibold">Error loading portfolio data</p>
        <p className="mt-1 text-sm">{error.message}</p>
      </div>
    )
  }

  if (!summary) {
    return <div className="flex items-center justify-center py-12 text-muted">No portfolio data available</div>
  }

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const range = RANGES.find((r) => r.months === months) ?? RANGES[2]
  const absPct = (value: number) => `${Math.abs(value).toFixed(1)}%`
  const signedPct = (value: number) => `${value >= 0 ? '+' : MINUS}${Math.abs(value).toFixed(1)}%`

  // ponytail: headline and deck are templated from live numbers, no extra AI call
  const headline = performanceHistory
    ? `Your portfolio ${performanceHistory.portfolioReturn >= 0 ? 'rose' : 'slipped'} ${absPct(
        performanceHistory.portfolioReturn,
      )} while the S&P 500 ${performanceHistory.sp500Return >= 0 ? 'climbed' : 'fell'} ${absPct(
        performanceHistory.sp500Return,
      )}`
    : 'Your portfolio, at a glance'
  const totalLoss = taxLossHarvesting.reduce((sum, o) => sum + Math.abs(o.unrealizedLoss), 0)
  const totalSavings = taxLossHarvesting.reduce((sum, o) => sum + o.taxSavings, 0)
  const deck = taxLossHarvesting.length
    ? `${taxLossHarvesting.length} ${
        taxLossHarvesting.length === 1 ? 'position carries' : 'positions carry'
      } ${formatCad(totalLoss)} in harvestable losses, worth about ${formatCad(totalSavings)} in tax savings.`
    : null

  const annualDividendIncome = performance?.annualDividendIncome ?? 0
  const dividendYield =
    performance?.dividendYield ??
    (summary.totalValueCad ? (annualDividendIncome / summary.totalValueCad) * 100 : 0)
  const countBy = (category: HoldingCategory) => holdings.filter((h) => h.category === category).length

  const q = query.trim().toLowerCase()
  const visibleHoldings = filteredHoldings
    .filter((h) => !q || h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q))
    .sort((a, b) => b.amountCad - a.amountCad)

  const brief = hasExplicitSelection ? selectedHolding : null
  const rebalance = brief ? rebalancing.find((r) => r.symbol === brief.symbol) : undefined
  const harvest = brief ? taxLossHarvesting.find((t) => t.symbol === brief.symbol) : undefined

  const tradeTotal = (items: RebalancingRecommendation[]) => items.reduce((sum, r) => sum + Math.abs(r.amount), 0)
  const tradeColumns = [
    { kicker: 'Trim', title: 'Trim these positions', verb: 'Sell', tone: 'text-loss', items: rebalancing.filter((r) => r.action === 'Sell') },
    { kicker: 'Add', title: 'Add to these positions', verb: 'Buy', tone: 'text-gain', items: rebalancing.filter((r) => r.action === 'Buy') },
  ]

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        {uploadStatus.message && (
          <p
            role="status"
            className={`mr-auto px-3 py-2 text-sm font-medium ${
              uploadStatus.isError ? 'bg-[#fbe9e6] text-[#9e2a17]' : 'bg-[#e3f1e8] text-gain'
            }`}
          >
            {uploadStatus.message}
          </p>
        )}
        <button
          type="button"
          onClick={async () => {
            try {
              await refetchAnalytics(true)
            } catch (error) {
              console.error('Failed to refresh analytics:', error)
            }
          }}
          title="Refresh all analytics and insights"
          className="flex h-10 items-center gap-1.5 border border-ink bg-white px-3.5 text-[13px] font-semibold transition-colors hover:bg-sand"
        >
          <Icon d={ICONS.refresh} />
          Refresh
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={uploadStatus.loading}
          className="flex h-10 items-center gap-1.5 border border-ink bg-ink px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploadStatus.loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <Icon d={ICONS.upload} />
          )}
          {uploadStatus.loading ? 'Uploading...' : 'Upload & update'}
        </button>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <article className="flex flex-col gap-4">
          <span className="kicker text-accent">{range.name} review</span>
          <h1 className="font-serif text-[40px] font-medium leading-[1.05] tracking-[-0.5px] text-balance md:text-[56px]">
            {headline}
          </h1>
          {deck && (
            <p className="font-serif text-[21px] italic leading-snug text-[#3a3a3a] text-pretty">{deck}</p>
          )}
          <span className="text-[13px] text-muted">AI analysis · updated {today}</span>

          <figure className="mt-2 flex flex-col gap-2 border-t border-line pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[13px] text-ink-soft">
                You <strong className={performanceHistory && performanceHistory.portfolioReturn < 0 ? 'text-loss' : 'text-gain'}>
                  {performanceHistory ? signedPct(performanceHistory.portfolioReturn) : '—'}
                </strong>
                {' · '}S&amp;P 500{' '}
                <strong className={performanceHistory && performanceHistory.sp500Return < 0 ? 'text-loss' : 'text-gain'}>
                  {performanceHistory ? signedPct(performanceHistory.sp500Return) : '—'}
                </strong>
              </span>
              <div role="group" aria-label="Chart range" className="flex gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => setMonths(r.months)}
                    aria-pressed={r.months === months}
                    className={`smallcaps h-8 px-2 text-xs transition-colors ${
                      r.months === months
                        ? 'text-ink underline decoration-2 underline-offset-4'
                        : 'text-[#8a8a8a] hover:text-ink'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <PortfolioPerformanceChart dataPoints={performanceHistory?.dataPoints ?? []} loading={historyLoading} />
            <figcaption className="text-xs leading-relaxed text-muted">
              Solid line: your portfolio. Dashed line: the S&amp;P 500, rebased to your starting value.
            </figcaption>
          </figure>

          {sectorDiversification && (
            <div className="gap-9 pt-2 font-serif text-lg leading-relaxed text-[#1e1e1e] [column-rule:1px_solid_#e4e4e4] md:columns-2">
              <p className="dropcap mb-3.5">{sectorDiversification.summary}</p>
              {sectorDiversification.strengths.length > 0 && (
                <p className="mb-3.5">
                  <strong className="font-semibold">Working in your favour:</strong>{' '}
                  {sectorDiversification.strengths.join('; ')}.
                </p>
              )}
              {sectorDiversification.risks.length > 0 && (
                <p>
                  <strong className="font-semibold">Worth watching:</strong> {sectorDiversification.risks.join('; ')}.
                </p>
              )}
            </div>
          )}
        </article>

        <aside className="flex flex-col gap-8 lg:border-l lg:border-line lg:pl-8">
          <section aria-labelledby="glance-h" className="flex flex-col gap-3 border-t-[3px] border-ink pt-3">
            <h2 id="glance-h" className="smallcaps text-xs">
              At a glance
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-[52px] font-medium leading-none tabular-nums">
                {formatCad(summary.totalValueCad)}
              </span>
              <span className="text-[13px] font-semibold text-muted">CAD</span>
            </div>
            <dl className="flex flex-col border-b border-line">
              <GlanceRow
                label="All-time"
                value={`${signedCad(summary.totalGainCad)} (${formatPercent(summary.totalGainPct, true)})`}
                tone={summary.totalGainCad >= 0 ? 'text-gain' : 'text-loss'}
              />
              <GlanceRow
                label="Dividend income"
                value={`${formatCad(annualDividendIncome)} · ${dividendYield.toFixed(2)}% yield`}
              />
              <GlanceRow
                label="Holdings"
                value={`${holdings.length} · ${countBy('Stocks')} stocks, ${countBy('ETFs')} ETFs`}
              />
              <GlanceRow
                label="Diversification"
                value={sectorDiversification ? `${sectorDiversification.score} / 100` : '—'}
              />
              <GlanceRow label="Risk" value={riskMetrics?.riskStatus ?? '—'} />
              {positionSizing && (
                <GlanceRow label="Top-5 concentration" value={`${positionSizing.top5Percentage.toFixed(1)}%`} />
              )}
            </dl>
          </section>

          <section aria-labelledby="markets-h" className="flex flex-col gap-3 border-t-[3px] border-ink pt-3">
            <h2 id="markets-h" className="smallcaps text-xs">
              Markets
            </h2>
            <MarketInsightTabs
              insights={marketInsights}
              loading={marketInsightsLoading}
              error={marketInsightsError}
            />
          </section>

          <nav aria-labelledby="inside-h" className="flex flex-col gap-1 border-t-[3px] border-ink pt-3">
            <h2 id="inside-h" className="smallcaps mb-1 text-xs">
              Inside this edition
            </h2>
            {[
              { href: '#moves', label: 'What the AI suggests', meta: `${rebalancing.length} trades` },
              { href: '#holdings', label: 'Your holdings', meta: `${holdings.length} positions` },
              { href: '#losses', label: 'Losses you could put to work', meta: formatCad(totalSavings) },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-baseline justify-between gap-3 border-b border-line py-2 font-serif text-lg text-ink no-underline hover:text-accent"
              >
                {link.label}
                <span className="shrink-0 font-sans text-[13px] text-accent">{link.meta} →</span>
              </a>
            ))}
          </nav>
        </aside>
      </div>

      <section id="moves" aria-labelledby="moves-h" className="flex scroll-mt-6 flex-col gap-6 border-t-[3px] border-ink pt-4">
        <SectionHeading
          id="moves-h"
          title="What the AI suggests"
          meta={`${rebalancing.length} trades · ${formatCad(tradeTotal(rebalancing))} CAD in total${
            rebalancingMetadata ? ` · quality score ${rebalancingMetadata.evaluationScore}%` : ''
          }`}
        />
        {rebalancing.length === 0 ? (
          <p className="text-sm text-muted">No rebalancing trades suggested right now.</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 md:gap-0">
            {tradeColumns.map((column, index) => (
              <div
                key={column.kicker}
                className={`flex flex-col gap-3 ${index ? 'md:border-l md:border-line md:pl-8' : 'md:pr-8'}`}
              >
                <span className={`kicker ${column.tone}`}>
                  {column.kicker} · {formatCad(tradeTotal(column.items))}
                </span>
                <h3 className="font-serif text-[28px] font-medium leading-tight">{column.title}</h3>
                {column.items.length === 0 ? (
                  <p className="text-sm text-muted">Nothing to {column.verb.toLowerCase()}.</p>
                ) : (
                  <table className="w-full border-collapse border-b border-line text-sm tabular-nums">
                    <tbody>
                      {column.items.map((rec) => (
                        <tr key={rec.symbol} className="border-t border-line" title={rec.reason}>
                          <th scope="row" className="py-2 text-left font-bold">
                            {rec.symbol}
                          </th>
                          <td className="py-2 text-[#4a4a4a]">
                            {rec.currentAllocation.toFixed(1)}% → {rec.targetAllocation.toFixed(1)}%
                          </td>
                          <td className="py-2 text-right font-semibold">
                            {column.verb} {formatCad(Math.abs(rec.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section
        id="holdings"
        aria-label="Holdings"
        className="grid scroll-mt-6 gap-10 border-t-[3px] border-ink pt-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            {(['Holdings', 'Watchlist'] as const).map((list) => (
              <button
                key={list}
                type="button"
                onClick={() => setActiveList(list)}
                aria-pressed={activeList === list}
                className={`font-serif text-[34px] font-medium leading-none transition-colors md:text-[40px] ${
                  activeList === list ? 'text-ink' : 'text-[#b0b0b0] hover:text-ink-soft'
                }`}
              >
                {list === 'Holdings' ? 'Your holdings' : 'Watchlist'}
              </button>
            ))}
            <span className="text-[13px] text-muted">
              {visibleHoldings.length} positions · values in CAD, largest first
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Filter holdings" className="flex flex-wrap gap-1.5">
              {(['All', ...tabs] as const).map((tab) => {
                const active = activeTab === tab
                const count =
                  tab === 'All'
                    ? baseHoldings.length
                    : tab === 'Sector'
                      ? null
                      : baseHoldings.filter((h) => h.category === tab).length
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    aria-pressed={active}
                    className={`flex h-9 items-center gap-1.5 border px-3 text-[13px] font-semibold transition-colors ${
                      active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink'
                    }`}
                  >
                    {tab === 'Sector' ? 'By sector' : tab}
                    {count !== null && <span className="text-[11px] opacity-70">{count}</span>}
                  </button>
                )
              })}
            </div>
            <label className="flex h-9 w-56 items-center gap-2 border-b border-ink px-1 text-muted">
              <Icon d={ICONS.search} />
              <span className="sr-only">Search holdings</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search holdings"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
            </label>
          </div>
          <HoldingsList
            holdings={visibleHoldings}
            selectedId={hasExplicitSelection ? selectedId : ''}
            totalValue={activeList === 'Holdings' ? summary.totalValueCad : undefined}
            onSelect={handleStockSelect}
            isSectorView={activeTab === 'Sector'}
          />
        </div>

        <aside className="lg:border-l lg:border-line lg:pl-8">
          {brief ? (
            <div aria-live="polite" className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <span className="kicker text-accent">Holding brief</span>
                <button
                  type="button"
                  onClick={() => handleInsightsClick(brief)}
                  title="Regenerate AI insights for this holding"
                  className="flex h-9 items-center gap-1.5 border border-ink px-3 text-xs font-semibold transition-colors hover:bg-sand"
                >
                  <Icon d={ICONS.sparkle} className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-serif text-[40px] font-medium leading-none">{brief.symbol}</h3>
                <span className="text-sm text-muted">{brief.name}</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-[40px] leading-none tabular-nums">{formatCad(brief.amountCad)}</span>
                  <span
                    className={`text-base font-semibold tabular-nums ${brief.changePct >= 0 ? 'text-gain' : 'text-loss'}`}
                  >
                    {formatPercent(brief.changePct, true)}
                  </span>
                </div>
                <span className="text-[13px] text-muted">
                  {[
                    brief.notes,
                    activeList === 'Holdings' && summary.totalValueCad
                      ? `${((brief.amountCad / summary.totalValueCad) * 100).toFixed(1)}% of portfolio`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {detail && (
                  <span className="text-[13px] text-muted">
                    Last price{' '}
                    <span className="font-semibold text-ink tabular-nums">
                      ${detail.price.toFixed(2)} {detail.currency || 'USD'}
                    </span>{' '}
                    <span className={detail.change >= 0 ? 'text-gain' : 'text-loss'}>
                      {detail.change >= 0 ? '+' : MINUS}
                      {Math.abs(detail.changePct).toFixed(1)}% today
                    </span>
                  </span>
                )}
              </div>

              {rebalance && <RebalanceBlock rec={rebalance} />}
              {harvest && <HarvestBlock opp={harvest} />}

              {detailLoading ? (
                <div className="flex items-center gap-2 border-t border-line pt-3 text-sm text-muted">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink" />
                  Loading stock details...
                </div>
              ) : detailError ? (
                <div className="bg-[#fbe9e6] p-4 text-[#9e2a17]">
                  <p className="text-sm font-semibold">Error loading stock details</p>
                  <p className="mt-1 text-sm">{detailError.message}</p>
                </div>
              ) : detail ? (
                <div className="flex flex-col gap-3 border-t border-line pt-3">
                  <div>
                    {(() => {
                      const insightsToShow = stockInsights.length > 0 ? stockInsights : (detail.insights || [])
                      const hasInsights = insightsToShow.length > 0
                      
                      if (!loadInsights && !hasInsights) {
                        return (
                          <button
                            type="button"
                            onClick={handleLoadStockInsights}
                            className="flex w-full items-center justify-between border border-line bg-white px-4 py-3 transition-colors hover:border-ink"
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-5 w-5 text-accent"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                />
                              </svg>
                              <p className="text-base font-semibold text-ink">Stock Insights</p>
                            </div>
                            <span className="text-sm text-slate-600">Click to load</span>
                          </button>
                        )
                      } else if (hasInsights) {
                        return (
                          <>
                            <div className="flex items-center gap-2">
                              <p className="text-base font-semibold text-ink">Stock Insights</p>
                            </div>
                            <div className="mt-3">
                              <InsightTabs insights={insightsToShow} />
                            </div>
                          </>
                        )
                      } else {
                        return (
                          <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                            <span className="ml-2 text-sm text-slate-600">Loading Stock Insights...</span>
                          </div>
                        )
                      }
                    })()}
                  </div>

                  <div>
                    {(() => {
                      const trendToShow = trendAnalysis.length > 0 ? trendAnalysis : []
                      const hasTrend = trendToShow.length > 0
                      
                      if (!loadTrendAnalysis && !hasTrend) {
                        return (
                          <button
                            type="button"
                            onClick={handleLoadTrendAnalysis}
                            disabled={loadingTrendAnalysis}
                            className="flex w-full items-center justify-between border border-line bg-white px-4 py-3 transition-colors hover:border-ink disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-5 w-5 text-accent"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                              </svg>
                              <p className="text-base font-semibold text-ink">Historical Trend</p>
                            </div>
                            <span className="text-sm text-slate-600">Click to load</span>
                          </button>
                        )
                      } else if (loadingTrendAnalysis || (!hasTrend && loadTrendAnalysis)) {
                        return (
                          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="relative">
                                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-accent"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <svg
                                    className="h-6 w-6 text-accent"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                  </svg>
                                </div>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-semibold text-ink">Loading Historical Trend</p>
                                <p className="mt-1 text-xs text-slate-500">Analyzing market data and trends...</p>
                              </div>
                              <div className="w-full max-w-xs">
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                  <div className="h-full w-3/4 animate-pulse rounded-full bg-accent"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      } else if (hasTrend) {
                        return (
                          <TrendGrid
                            trendAnalyses={trendToShow}
                            recommendation={detail.recommendation}
                            longTermBias={detail.longTermBias}
                          />
                        )
                      } else {
                        return (
                          <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                            <span className="ml-2 text-sm text-slate-600">Loading Historical Trend...</span>
                          </div>
                        )
                      }
                    })()}
                  </div>

                  <div>
                    {(() => {
                      const strategiesToShow = optionStrategies.length > 0 ? optionStrategies : []
                      const hasStrategies = strategiesToShow.length > 0
                      
                      if (optionStrategiesError) {
                        return (
                          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
                            <p className="text-sm font-semibold text-red-800">Error loading option strategies</p>
                            <p className="mt-1 text-sm text-red-700">{optionStrategiesError.message}</p>
                            <button
                              type="button"
                              onClick={handleLoadOptionStrategies}
                              className="mt-3 text-sm font-medium text-red-800 underline hover:text-red-900"
                            >
                              Try again
                            </button>
                          </div>
                        )
                      } else if (!loadOptionStrategies && !hasStrategies) {
                        return (
                          <button
                            type="button"
                            onClick={handleLoadOptionStrategies}
                            disabled={loadingOptionStrategies}
                            className="flex w-full items-center justify-between border border-line bg-white px-4 py-3 transition-colors hover:border-ink disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-5 w-5 text-accent"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                              </svg>
                              <p className="text-base font-semibold text-ink">Option Strategies</p>
                            </div>
                            <span className="text-sm text-slate-600">Click to load</span>
                          </button>
                        )
                      } else if (loadingOptionStrategies || (!hasStrategies && loadOptionStrategies)) {
                        return (
                          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="relative">
                                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-accent"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <svg
                                    className="h-6 w-6 text-accent"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                  </svg>
                                </div>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-semibold text-ink">Loading Option Strategies</p>
                                <p className="mt-1 text-xs text-slate-500">Generating AI-powered strategies and analytics...</p>
                              </div>
                              <div className="w-full max-w-xs">
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                  <div className="h-full w-3/4 animate-pulse rounded-full bg-accent"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      } else if (hasStrategies) {
                        return <OptionStrategies strategies={strategiesToShow} onRefresh={handleRefreshOptionStrategies} />
                      } else {
                        return (
                          <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                            <span className="ml-2 text-sm text-slate-600">Loading Option Strategies...</span>
                          </div>
                        )
                      }
                    })()}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">Loading details for {brief.symbol}...</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="kicker text-accent">Holding brief</span>
              <p className="font-serif text-lg leading-relaxed text-ink-soft">
                Select a holding from the {activeList.toLowerCase()} table to read its brief: rebalancing and
                tax-loss ideas, stock insights, historical trends and option strategies.
              </p>
            </div>
          )}
        </aside>
      </section>

      <section id="losses" aria-labelledby="losses-h" className="flex scroll-mt-6 flex-col gap-4 border-t-[3px] border-ink pt-4">
        <SectionHeading id="losses-h" title="Losses you could put to work" />
        {taxLossHarvesting.length === 0 ? (
          <p className="text-sm text-muted">No tax-loss harvesting opportunities right now.</p>
        ) : (
          <>
            <p className="max-w-3xl font-serif text-lg leading-relaxed text-ink-soft">
              Selling these {taxLossHarvesting.length} at a loss could offset about{' '}
              <strong className="font-semibold text-gain">{formatCad(totalSavings)}</strong> in tax. Each has swap
              ideas that keep similar exposure.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm tabular-nums">
                <thead>
                  <tr className="smallcaps border-b border-ink text-[11px] text-muted">
                    <th scope="col" className="py-2 text-left">Holding</th>
                    <th scope="col" className="py-2 text-right">Unrealized loss</th>
                    <th scope="col" className="py-2 text-right">Below cost</th>
                    <th scope="col" className="py-2 text-right">Est. savings</th>
                    <th scope="col" className="py-2 pl-6 text-left">Swap ideas</th>
                    <th scope="col" className="py-2 text-right">Superficial-loss risk</th>
                  </tr>
                </thead>
                <tbody>
                  {taxLossHarvesting.map((opp) => (
                    <tr key={opp.symbol} className="border-b border-line">
                      <th scope="row" className="py-2.5 text-left font-normal">
                        <strong className="font-bold">{opp.symbol}</strong>{' '}
                        <span className="text-muted">{opp.name}</span>
                      </th>
                      <td className="py-2.5 text-right font-semibold text-loss">
                        {MINUS}
                        {formatCad(Math.abs(opp.unrealizedLoss))}
                      </td>
                      <td className="py-2.5 text-right">{Math.abs(opp.lossPercentage).toFixed(1)}%</td>
                      <td className="py-2.5 text-right font-semibold text-gain">{formatCad(opp.taxSavings)}</td>
                      <td className="py-2.5 pl-6 text-[#4a4a4a]">
                        {opp.replacementOptions.map((o) => o.symbol).join(', ') || '—'}
                      </td>
                      <td className="py-2.5 text-right">{opp.washSaleRisk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">
              Mind the superficial-loss rule: don’t rebuy the same security within 30 days before or after the sale.
            </p>
          </>
        )}
      </section>

      <p className="border-t border-line pt-3 text-xs text-muted">
        AI-generated for education only. Not financial advice.
      </p>
    </div>
  )
}
