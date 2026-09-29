import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePortfolio } from '../hooks/usePortfolio'
import { useAnalytics } from '../hooks/useAnalytics'
import { useStockDetail } from '../hooks/useStockDetail'
import { useMarketInsights } from '../hooks/useMarketInsights'
import { useDailyMarketSummary } from '../hooks/useDailyMarketSummary'
import { useDailyMarketSummaryExists } from '../hooks/useDailyMarketSummaryExists'
import { usePreMarketInsights } from '../hooks/usePreMarketInsights'
import { portfolioAPI, stockAPI, type CSVUploadResponse } from '../services/api'
import { queryKeys } from '../lib/react-query'
import { deleteFromIndexedDB } from '../lib/persistence'
import type {
  HoldingCategory,
  MarketInsight,
  OptionStrategy,
  PortfolioHolding,
  StockDetail,
  StockInsight,
  StockPeriodType,
  TrendPeriodType as TrendPeriod,
} from '../types/api'

const formatCad = (value: number) => {
  const formatted = new Intl.NumberFormat('en-CA', {
    maximumFractionDigits: 0,
  }).format(value)
  return `$ ${formatted}`
}

const formatPercent = (value: number, includeSign: boolean = false) => {
  const formatted = `${Math.abs(value).toFixed(1)}%`
  if (includeSign) {
    return value >= 0 ? `+${formatted}` : `-${formatted}`
  }
  return value >= 0 ? formatted : `-${formatted}`
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const tabs: HoldingCategory[] = ['Stocks', 'ETFs', 'Crypto', 'Sector']

const DetailPill = ({
  label,
  active,
  onClick,
}: {
  label: string
  active?: boolean
  onClick?: () => void
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm font-semibold transition-colors ${
        active
          ? 'text-slate-900 border-b-2 border-slate-900 pb-1'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  )
}

const InsightTabs = ({
  insights,
}: {
  insights: StockInsight[]
}) => {
  const [activePeriod, setActivePeriod] = useState<StockPeriodType>('Daily Brief')
  const activeInsight =
    insights.find((insight) => insight.period === activePeriod) ?? insights[0]

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {insights.map((insight) => (
          <button
            key={insight.period}
            type="button"
            onClick={() => setActivePeriod(insight.period)}
            className={`rounded-md px-3 py-2 text-xs font-semibold tracking-tight ${
              activePeriod === insight.period
                ? 'bg-black text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {insight.period}
          </button>
        ))}
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg bg-slate-50 p-3">
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
    const elements: JSX.Element[] = []
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
          <h3 key={`h3-${index}`} className="mt-3 first:mt-0 text-base font-bold text-slate-900">
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

const getEasternTime = (): Date => {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
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

  const handlePreMarketButtonClick = () => {
    fetchPreMarketInsights(true)
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
    
    if (marketInfo.currentPeriod) {
      setActivePeriod((current) => {
        if (current !== marketInfo.currentPeriod) {
          const hasData = marketInfo.currentPeriod === 'PRE_MARKET' 
            ? !!preMarketInsight 
            : insights.some((insight) => insight.period === marketInfo.currentPeriod && insight.text)
          
          if (hasData) {
            return marketInfo.currentPeriod
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
        return { label: 'Pre-Market', color: 'bg-amber-100 text-amber-800', time: timeStr }
      case 'morning':
        return { label: 'Market Open', color: 'bg-emerald-100 text-emerald-800', time: timeStr }
      case 'midday':
        return { label: 'Market Open', color: 'bg-emerald-100 text-emerald-800', time: timeStr }
      case 'closing':
        return { label: 'Market Open', color: 'bg-emerald-100 text-emerald-800', time: timeStr }
      case 'after-hours':
        return { label: 'After Hours', color: 'bg-slate-100 text-slate-800', time: timeStr }
      case 'closed':
        return { label: 'Market Closed', color: 'bg-slate-100 text-slate-600', time: 'Weekend' }
    }
  }

  const statusDisplay = getMarketStatusDisplay()

  if (loading) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          <span className="text-sm text-slate-600">Loading market insights...</span>
        </div>
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
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {periods.map((period) => (
              <button
                key={period}
                type="button"
                disabled
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-tight bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              >
                {getPeriodIcon(period, true)}
                {period.toLowerCase()}
                <svg className="h-3 w-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            ))}
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.color}`}>
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400" />
            </span>
            {statusDisplay.label} • {statusDisplay.time}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg bg-white border border-slate-100">
          <svg className="h-12 w-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-slate-600">
            {marketInfo.isWeekend
              ? "Market is closed for the weekend"
              : "No market insights available yet"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {marketInfo.isWeekend
              ? "Check back Monday for today's insights"
              : "Insights will be available during market hours"}
          </p>
        </div>
      </div>
    )
  }
  

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
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
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-tight transition-all ${
                    isPreMarketPeriod && isActive
                      ? 'bg-amber-600 text-white shadow-md'
                      : isActive
                        ? 'bg-slate-900 text-white shadow-md'
                        : isPreMarketPeriod
                          ? 'bg-amber-500 text-white hover:bg-amber-600 border border-amber-400'
                          : isEnabled
                            ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
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
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                )}
              </div>
            )
          })}
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.color}`}>
          <span className="relative flex h-2 w-2">
            {(marketInfo.status === 'morning' || marketInfo.status === 'midday' || marketInfo.status === 'closing') && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              marketInfo.status === 'morning' || marketInfo.status === 'midday' || marketInfo.status === 'closing'
                ? 'bg-emerald-500'
                : marketInfo.status === 'pre-market'
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
            }`} />
          </span>
          {statusDisplay.label} • {statusDisplay.time}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 border-b border-slate-100 pb-2">
        <span className="font-medium">NYSE Hours (ET):</span>
        {periods.map((period) => {
          const isEnabled = isPeriodEnabled(period)
          const isCurrent = marketInfo.currentPeriod === period || (period === 'PRE_MARKET' && marketInfo.status === 'pre-market')
          return (
            <span 
              key={period} 
              className={`${isCurrent ? 'text-emerald-600 font-semibold' : isEnabled || period === 'PRE_MARKET' ? 'text-slate-600' : 'text-slate-400'}`}
            >
              {period === 'PRE_MARKET' ? 'Pre-Market' : period.charAt(0) + period.slice(1).toLowerCase()}: {getPeriodInfo(period)}
            </span>
          )
        })}
      </div>
      
      <div className="max-h-80 overflow-y-auto rounded-lg bg-white p-4 border border-slate-100">
        {activePeriod === 'PRE_MARKET' ? (
          <>
            {preMarketLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg className="h-12 w-12 text-amber-500 mb-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
                  className="mt-3 text-xs text-amber-600 hover:text-amber-700 font-medium underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg className="h-12 w-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-sm font-medium text-slate-600">
                  Pre-market insights not yet available
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Click the Pre-Market tab to generate insights
                </p>
                <button
                  type="button"
                  onClick={() => fetchPreMarketInsights(true)}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Get Pre-Market Insights
                </button>
              </div>
            )}
          </>
        ) : !isPeriodEnabled(activePeriod) ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg className="h-12 w-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-slate-600">
              {activePeriod.charAt(0) + activePeriod.slice(1).toLowerCase()} insights not yet available for today
            </p>
            <p className="text-xs text-slate-500 mt-1">
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
          className={`self-start text-sm font-semibold underline underline-offset-4 transition-colors ${
            isMarketClosed && summaryExists && !summaryExistsLoading
              ? 'text-slate-700 hover:text-slate-900 decoration-slate-300 hover:decoration-slate-500 cursor-pointer'
              : 'text-slate-400 decoration-slate-200 cursor-not-allowed'
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
          View Full Report →
        </button>
      </div>

      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setShowSummaryModal(false)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-xl shadow-xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Daily Market Summary</h2>
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
      <h3 className="text-base font-semibold text-slate-900">Historical Trend</h3>
      <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
        {cells.map((period) => {
          const value = getCellValue(period)
          const isActive = selectedPeriod === period
          const isToday = period === 'Today'
          
          let buttonClasses = 'rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-colors'
          
          if (isActive) {
            buttonClasses += ' bg-black border-black text-white'
          } else if (isToday) {
            buttonClasses += ' bg-slate-700 border-slate-700 text-white'
          } else {
            buttonClasses += ' bg-slate-100 border-slate-200 text-slate-900'
          }

          const recommendationColor =
            value === 'Sell'
              ? 'text-rose-600'
              : value === 'Buy'
                ? 'text-emerald-700'
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
        <div className="mt-4 rounded-lg border-l-4 border-black border-r border-t border-b border-slate-200 bg-white px-4 py-4 shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">{selectedPeriod} Analysis</p>
              <p
                className={`mt-1 text-base font-bold ${
                  selectedAnalysis.recommendation === 'Sell'
                    ? 'text-rose-600'
                    : selectedAnalysis.recommendation === 'Buy'
                      ? 'text-emerald-700'
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
                  const valueColor = isPositiveValue ? 'text-emerald-700' : 'text-slate-900'
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
        return 'bg-emerald-100 text-emerald-700'
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
        return 'bg-emerald-100 text-emerald-700'
      case 'Medium':
        return 'bg-amber-100 text-amber-700'
      case 'High':
        return 'bg-emerald-100 text-emerald-700'
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
    if (riskType === 'Defined') return 'bg-emerald-100 text-emerald-700'
    if (riskType === 'Undefined') return 'bg-rose-100 text-rose-700'
    return 'bg-slate-100 text-slate-700'
  }

  const getCategoryColor = (category: string | undefined) => {
    switch (category) {
      case 'Directional':
        return 'bg-blue-100 text-blue-700'
      case 'Income':
        return 'bg-emerald-100 text-emerald-700'
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
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-blue-600"
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
        <h3 className="text-base font-semibold text-slate-900">Option Strategies</h3>
        {onRefresh && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <h4 className="text-base font-semibold text-slate-900">{strategy.name}</h4>
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
                <p className="mt-1 text-sm font-bold text-slate-900">
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
                <p className="mt-1 text-sm font-bold text-slate-900">
                  ${strategy.premium.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">Break Even</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
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
                <p className="mt-1 text-sm font-bold text-slate-900">
                  ${strategy.currentPrice.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">Max Profit</p>
                <p className="mt-1 text-sm font-bold text-emerald-700">
                  {typeof strategy.maxProfit === 'number' ? formatCurrency(strategy.maxProfit) : strategy.maxProfit}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">Max Loss</p>
                <p className="mt-1 text-sm font-bold text-rose-600">
                  {typeof strategy.maxLoss === 'number' ? formatCurrency(strategy.maxLoss) : strategy.maxLoss}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs font-semibold text-slate-600">Delta</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{strategy.delta.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">IV (Implied Volatility)</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {(strategy.iv * 100).toFixed(1)}%
                  {strategy.ivRank !== undefined && (
                    <span className="ml-1 text-xs text-slate-500">(Rank: {strategy.ivRank.toFixed(0)})</span>
                  )}
                </p>
              </div>
              {strategy.gamma !== undefined && (
                <div>
                  <p className="text-xs font-semibold text-slate-600">Gamma</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{strategy.gamma.toFixed(4)}</p>
                </div>
              )}
              {strategy.theta !== undefined && (
                <div>
                  <p className="text-xs font-semibold text-slate-600">Theta</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">${strategy.theta.toFixed(2)}/day</p>
                </div>
              )}
              {strategy.vega !== undefined && (
                <div>
                  <p className="text-xs font-semibold text-slate-600">Vega</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{strategy.vega.toFixed(2)}</p>
                </div>
              )}
            </div>

            {(strategy.probabilityOfProfit !== undefined || strategy.capitalRequired !== undefined || strategy.returnOnCapital !== undefined) && (
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                {strategy.probabilityOfProfit !== undefined && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Probability of Profit</p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">{strategy.probabilityOfProfit.toFixed(1)}%</p>
                  </div>
                )}
                {strategy.capitalRequired !== undefined && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Capital Required</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(strategy.capitalRequired)}</p>
                  </div>
                )}
                {strategy.returnOnCapital !== undefined && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Return on Capital</p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">{strategy.returnOnCapital.toFixed(1)}%</p>
                  </div>
                )}
                {strategy.riskRewardRatio && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Risk/Reward</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{strategy.riskRewardRatio}</p>
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
                    <p><span className="font-medium text-emerald-700">Profit Target:</span> {strategy.profitTarget}</p>
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
                      <span className={leg.legType === 'Buy' ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
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

const HoldingsList = ({
  filteredHoldings,
  onSelect,
  onInsightsClick,
  isSectorView = false,
}: {
  filteredHoldings: PortfolioHolding[]
  onSelect: (id: string) => void
  onInsightsClick?: (holding: PortfolioHolding) => void
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

    const groups = filteredHoldings.reduce((acc, holding) => {
      const sector = holding.tag || 'Other'
      if (!acc[sector]) {
        acc[sector] = {
          sector,
          holdings: [],
          totalAmount: 0,
          totalChangePct: 0,
          count: 0,
        }
      }
      acc[sector].holdings.push(holding)
      acc[sector].totalAmount += holding.amountCad
      acc[sector].count += 1
      return acc
    }, {} as Record<string, SectorGroup>)

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

    const sortedGroups: SectorGroup[] = []
    for (const sector of sectorOrder) {
      if (groups[sector]) {
        const group = groups[sector]
        const totalWeightedChange = group.holdings.reduce(
          (sum, h) => sum + h.changePct * h.amountCad,
          0
        )
        group.totalChangePct = group.totalAmount > 0 ? totalWeightedChange / group.totalAmount : 0
        sortedGroups.push(group)
      }
    }

    for (const sector of Object.keys(groups)) {
      if (!sectorOrder.includes(sector)) {
        const group = groups[sector]
        const totalWeightedChange = group.holdings.reduce(
          (sum, h) => sum + h.changePct * h.amountCad,
          0
        )
        group.totalChangePct = group.totalAmount > 0 ? totalWeightedChange / group.totalAmount : 0
        sortedGroups.push(group)
      }
    }

    return sortedGroups
  }, [filteredHoldings, isSectorView])

  if (isSectorView && sectorGroups) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              Display & Sort
            </button>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_1fr_1fr] border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <span>Sector</span>
          <span className="text-right">Total Amount</span>
          <span className="text-right">Holdings</span>
        </div>
        <ul className="divide-y divide-slate-200" role="list">
          {sectorGroups.map((group, index) => {
            const isEvenRow = index % 2 === 0
            const rowBgColor = isEvenRow ? 'bg-slate-100' : 'bg-white'
            const isExpanded = expandedSectors.has(group.sector)
            return (
              <li key={group.sector} className={rowBgColor}>
                <div
                  tabIndex={0}
                  aria-label={`${group.sector} sector total ${formatCad(group.totalAmount)}`}
                  className={`grid cursor-pointer grid-cols-[1fr_1fr_1fr] items-center gap-2 px-4 py-4 transition hover:bg-slate-200`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSector(group.sector)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      toggleSector(group.sector)
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className={`h-4 w-4 text-slate-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-slate-900">{group.sector}</p>
                      <p className="text-xs text-slate-600">
                        {group.count} {group.count === 1 ? 'holding' : 'holdings'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatCad(group.totalAmount)}</p>
                    <p
                      className={`text-xs font-semibold ${
                        group.totalChangePct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {group.totalChangePct >= 0 ? '+' : ''}
                      {formatPercent(group.totalChangePct)}
                    </p>
                  </div>
                  <div className="text-right text-sm font-semibold text-slate-700">
                    {group.count}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-300 bg-slate-50">
                    <div className="grid grid-cols-[0.5fr_1.5fr_1fr_1fr_1fr_0.8fr] border-b border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <span>Symbol</span>
                      <span>Name</span>
                      <span className="text-right">Amount</span>
                      <span className="text-right">Last Activity</span>
                      <span className="text-right">Notes</span>
                      <span className="text-center">Actions</span>
                    </div>
                    <ul className="divide-y divide-slate-200" role="list">
                      {group.holdings.map((holding, holdingIndex) => {
                        const holdingIsEvenRow = holdingIndex % 2 === 0
                        const holdingRowBgColor = holdingIsEvenRow ? 'bg-white' : 'bg-slate-50'
                        return (
                          <li
                            key={holding.id}
                            tabIndex={0}
                            aria-label={`${holding.name} ${holding.symbol} amount ${formatCad(holding.amountCad)}`}
                            className={`grid cursor-pointer grid-cols-[0.5fr_1.5fr_1fr_1fr_1fr_0.8fr] items-center gap-2 px-4 py-3 pl-8 transition ${holdingRowBgColor} hover:bg-slate-200`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelect(holding.id)
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                onSelect(holding.id)
                              }
                            }}
                          >
                            <div className="text-sm font-bold text-slate-900">{holding.symbol}</div>
                            <div className="flex flex-col gap-1">
                              <p className="text-sm font-semibold text-slate-900">{holding.name}</p>
                              <p className="text-xs font-semibold text-slate-600">
                                {holding.tag}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-900">{formatCad(holding.amountCad)}</p>
                              <p
                                className={`text-xs font-semibold ${
                                  holding.changePct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                                }`}
                              >
                                {holding.changePct >= 0 ? '+' : ''}
                                {formatPercent(holding.changePct)}
                              </p>
                            </div>
                            <div className="text-right text-sm font-semibold text-slate-700">
                              {holding.lastActivity}
                            </div>
                            <div className="truncate text-sm text-slate-700">
                              {holding.notes}
                            </div>
                            <div className="flex justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onInsightsClick?.(holding)
                                }}
                                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                title="Generate AI Insights"
                              >
                                <svg
                                  className="h-3.5 w-3.5"
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
                                AI Insights
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            Display & Sort
          </button>
        </div>
      </div>
      <div className="grid grid-cols-[0.5fr_1.5fr_1fr_1fr_1fr_0.8fr] border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <span>Symbol</span>
        <span>Name</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Last Activity</span>
        <span className="text-right">Notes</span>
        <span className="text-center">Actions</span>
      </div>
      <ul className="divide-y divide-slate-200" role="list">
        {filteredHoldings.map((holding, index) => {
          const isEvenRow = index % 2 === 0
          const rowBgColor = isEvenRow ? 'bg-slate-100' : 'bg-white'
          return (
            <li
              key={holding.id}
              tabIndex={0}
              aria-label={`${holding.name} ${holding.symbol} amount ${formatCad(holding.amountCad)}`}
              className={`grid cursor-pointer grid-cols-[0.5fr_1.5fr_1fr_1fr_1fr_0.8fr] items-center gap-2 px-4 py-4 transition ${rowBgColor} hover:bg-slate-200`}
              onClick={() => onSelect(holding.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(holding.id)
                }
              }}
            >
              <div className="text-sm font-bold text-slate-900">{holding.symbol}</div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-slate-900">{holding.name}</p>
                <p className="text-xs font-semibold text-slate-600">
                  {holding.tag}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{formatCad(holding.amountCad)}</p>
                <p
                  className={`text-xs font-semibold ${
                    holding.changePct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {holding.changePct >= 0 ? '+' : ''}
                  {formatPercent(holding.changePct)}
                </p>
              </div>
              <div className="text-right text-sm font-semibold text-slate-700">
                {holding.lastActivity}
              </div>
              <div className="truncate text-sm text-slate-700">
                {holding.notes}
              </div>
              <div className="flex justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onInsightsClick?.(holding)
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  title="Generate AI Insights"
                >
                  <svg
                    className="h-3.5 w-3.5"
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
                  AI Insights
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

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
    return JSON.stringify(holdings.map(h => ({ id: h.id, symbol: h.symbol, shares: h.shares, amountCad: h.amountCad })))
  }, [holdings])
  
  const { refetch: refetchAnalytics } = useAnalytics(holdingsHash)
  
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
          deleteFromIndexedDB(queryKeys.analytics.performanceHistory(6).join(':')),
          queryClient.invalidateQueries({ queryKey: queryKeys.analytics.performanceHistory(6) }),
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
    refetch: stockDetailRefetch,
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
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-600">Loading portfolio data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Error loading portfolio data</p>
          <p className="mt-1 text-sm text-red-700">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-600">No portfolio data available</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative flex flex-col gap-4 pb-12">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold text-slate-900">
            {formatCad(summary.totalValueCad)} CAD
          </h1>
          <div className={`flex items-center gap-2 text-lg font-semibold ${
            summary.totalGainCad >= 0 ? 'text-emerald-700' : 'text-rose-600'
          }`}>
            {summary.totalGainCad >= 0 ? '+' : '-'} {formatCad(Math.abs(summary.totalGainCad))} ({formatPercent(summary.totalGainPct, true)}){' '}
            <span className="text-sm font-medium text-slate-500">all time</span>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 flex items-center gap-3">
          {uploadStatus.message && (
            <div
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                uploadStatus.isError
                  ? 'bg-red-100 text-red-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {uploadStatus.message}
            </div>
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
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-1"
            title="Refresh all analytics and insights"
          >
            <svg
              className="h-4 w-4"
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
            Refresh
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={uploadStatus.loading}
            className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {uploadStatus.loading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            )}
            {uploadStatus.loading ? 'Uploading...' : 'Upload & Update'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-6">
            <div className="flex flex-wrap items-center gap-6">
              <DetailPill
                label="Holdings"
                active={activeList === 'Holdings'}
                onClick={() => setActiveList('Holdings')}
              />
              <DetailPill
                label="Watchlist"
                active={activeList === 'Watchlist'}
                onClick={() => setActiveList('Watchlist')}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === 'All'
                  ? 'bg-black text-white border-black'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              onClick={() => setActiveTab('All')}
            >
              All
            </button>
            {tabs.map((tab) => {
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  type="button"
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-black text-white border-black'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              )
            })}
          </div>

          <HoldingsList
            filteredHoldings={filteredHoldings}
            onSelect={handleStockSelect}
            onInsightsClick={handleInsightsClick}
            isSectorView={activeTab === 'Sector'}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-slate-900">Market Insights</p>
            </div>
            <div className="mt-3">
              <MarketInsightTabs
                insights={marketInsights}
                loading={marketInsightsLoading}
                error={marketInsightsError}
              />
            </div>
          </div>

          {hasExplicitSelection && (
            <>
              {detailLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                    <span className="text-sm text-slate-600">Loading stock details...</span>
                  </div>
                </div>
              ) : detailError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-5 shadow-sm">
                  <p className="text-sm font-semibold text-red-800">Error loading stock details</p>
                  <p className="mt-1 text-sm text-red-700">{detailError.message}</p>
                </div>
              ) : detail ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{detail.symbol} Details</p>
                    <p className="text-3xl font-bold text-slate-900">
                      ${detail.price.toFixed(2)} <span className="text-lg font-semibold">{detail.currency || 'USD'}</span>
                    </p>
                    <p className={`text-sm font-semibold ${detail.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {detail.change >= 0 ? '+' : ''} ${Math.abs(detail.change).toFixed(2)} ({detail.change >= 0 ? '+' : ''}{detail.changePct.toFixed(1)}%){' '}
                      <span className="text-xs font-medium text-slate-500">today</span>
                    </p>
                  </div>

                  <div className="mt-4">
                    {(() => {
                      const insightsToShow = stockInsights.length > 0 ? stockInsights : (detail.insights || [])
                      const hasInsights = insightsToShow.length > 0
                      
                      if (!loadInsights && !hasInsights) {
                        return (
                          <button
                            type="button"
                            onClick={handleLoadStockInsights}
                            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-5 w-5 text-blue-600"
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
                              <p className="text-base font-semibold text-slate-900">Stock Insights</p>
                            </div>
                            <span className="text-sm text-slate-600">Click to load</span>
                          </button>
                        )
                      } else if (hasInsights) {
                        return (
                          <>
                            <div className="flex items-center gap-2">
                              <p className="text-base font-semibold text-slate-900">Stock Insights</p>
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

                  <div className="mt-4">
                    {(() => {
                      const trendToShow = trendAnalysis.length > 0 ? trendAnalysis : []
                      const hasTrend = trendToShow.length > 0
                      
                      if (!loadTrendAnalysis && !hasTrend) {
                        return (
                          <button
                            type="button"
                            onClick={handleLoadTrendAnalysis}
                            disabled={loadingTrendAnalysis}
                            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-5 w-5 text-blue-600"
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
                              <p className="text-base font-semibold text-slate-900">Historical Trend</p>
                            </div>
                            <span className="text-sm text-slate-600">Click to load</span>
                          </button>
                        )
                      } else if (loadingTrendAnalysis || (!hasTrend && loadTrendAnalysis)) {
                        return (
                          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="relative">
                                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <svg
                                    className="h-6 w-6 text-blue-600"
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
                                <p className="text-sm font-semibold text-slate-900">Loading Historical Trend</p>
                                <p className="mt-1 text-xs text-slate-500">Analyzing market data and trends...</p>
                              </div>
                              <div className="w-full max-w-xs">
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                  <div className="h-full w-3/4 animate-pulse rounded-full bg-blue-600"></div>
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

                  <div className="mt-4">
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
                            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-5 w-5 text-blue-600"
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
                              <p className="text-base font-semibold text-slate-900">Option Strategies</p>
                            </div>
                            <span className="text-sm text-slate-600">Click to load</span>
                          </button>
                        )
                      } else if (loadingOptionStrategies || (!hasStrategies && loadOptionStrategies)) {
                        return (
                          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="relative">
                                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <svg
                                    className="h-6 w-6 text-blue-600"
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
                                <p className="text-sm font-semibold text-slate-900">Loading Option Strategies</p>
                                <p className="mt-1 text-xs text-slate-500">Generating AI-powered strategies and analytics...</p>
                              </div>
                              <div className="w-full max-w-xs">
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                  <div className="h-full w-3/4 animate-pulse rounded-full bg-blue-600"></div>
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
              ) : selectedHolding ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                  <div className="text-slate-600">
                    Loading details for {selectedHolding.symbol}...
                  </div>
                </div>
              ) : null}
            </>
          )}

          {!hasExplicitSelection && (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <div className="text-slate-600">
                Select a stock from the {activeList.toLowerCase()} table to view detailed insights, historical trends, and option strategies.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

