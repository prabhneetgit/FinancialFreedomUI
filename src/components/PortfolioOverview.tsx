import { useEffect, useMemo, useState } from 'react'
import type {
  HoldingCategory,
  OptionStrategy,
  PortfolioHolding,
  StockDetail,
  TrendPeriod,
} from '../data/mockPortfolioData'
import {
  featuredDetail,
  holdings,
  portfolioSummary,
  stockDetails,
  watchlistHoldings,
} from '../data/mockPortfolioData'

const formatCad = (value: number) => {
  const formatted = new Intl.NumberFormat('en-CA', {
    maximumFractionDigits: 0,
  }).format(value)
  return `$ ${formatted}`
}

const formatPercent = (value: number) => `${value.toFixed(1)}%`

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
  insights: StockDetail['insights']
}) => {
  const [activePeriod, setActivePeriod] = useState<'MORNING' | 'MIDDAY' | 'CLOSING'>('MORNING')
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
            className={`rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-tight ${
              activePeriod === insight.period
                ? 'bg-black text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {insight.period.toLowerCase()}
          </button>
        ))}
      </div>
      <div className="text-sm leading-relaxed text-slate-700">{activeInsight.text}</div>
      <button
        type="button"
        className="text-sm font-semibold text-slate-800 underline underline-offset-4"
      >
        View Details
      </button>
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
}: {
  strategies: OptionStrategy[]
}) => {
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Option Strategies</h3>
      <div className="mt-3 space-y-4">
        {strategies.map((strategy, index) => (
          <div
            key={index}
            className={`rounded-lg border bg-white p-4 shadow-sm ${getRiskLevelBorderColor(
              strategy.riskLevel,
            )}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-semibold text-slate-900">{strategy.name}</h4>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getSentimentColor(
                      strategy.sentiment,
                    )}`}
                  >
                    {strategy.sentiment}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  <span>
                    {strategy.expirationDate} ({strategy.daysToExpiration}d)
                  </span>
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

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-600">Delta</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{strategy.delta.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">IV (Implied Volatility)</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{strategy.iv.toFixed(1)}%</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm leading-relaxed text-slate-700">{strategy.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const HoldingsList = ({
  filteredHoldings,
  onSelect,
}: {
  filteredHoldings: PortfolioHolding[]
  onSelect: (id: string) => void
}) => {
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
      <div className="grid grid-cols-[0.5fr_1.5fr_1fr_1fr_1fr] border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <span>Symbol</span>
        <span>Name</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Last Activity</span>
        <span className="text-right">Notes</span>
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
              className={`grid cursor-pointer grid-cols-[0.5fr_1.5fr_1fr_1fr_1fr] items-center gap-2 px-4 py-4 transition ${rowBgColor} hover:bg-slate-200`}
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
  const [selectedId, setSelectedId] = useState<string>(holdings[0]?.id ?? '')

  const baseHoldings = useMemo(
    () => (activeList === 'Holdings' ? holdings : watchlistHoldings),
    [activeList],
  )

  const filteredHoldings = useMemo(
    () =>
      activeTab === 'All'
        ? baseHoldings
        : baseHoldings.filter((item) => item.category === activeTab || activeTab === 'Sector'),
    [activeTab, baseHoldings],
  )

  const selectedHolding =
    baseHoldings.find((holding) => holding.id === selectedId) ??
    baseHoldings[0] ??
    holdings[0]

  useEffect(() => {
    if (!baseHoldings.length) return

    const existsInBase = baseHoldings.some((holding) => holding.id === selectedId)
    if (!existsInBase) {
      setSelectedId(baseHoldings[0].id)
      return
    }

    const isSelectedVisible = filteredHoldings.some((holding) => holding.id === selectedId)
    if (!isSelectedVisible && filteredHoldings[0]) {
      setSelectedId(filteredHoldings[0].id)
    }
  }, [baseHoldings, filteredHoldings, selectedId])

  const detail = stockDetails[selectedHolding.symbol] ?? featuredDetail

  return (
    <div className="flex flex-col gap-6">
      <div className="relative flex flex-col gap-4 pb-12">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold text-slate-900">
            {formatCad(portfolioSummary.totalValueCad)} CAD
          </h1>
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-700">
            + {formatCad(portfolioSummary.totalGainCad)} ({formatPercent(portfolioSummary.totalGainPct)}){' '}
            <span className="text-sm font-medium text-slate-500">all time</span>
          </div>
        </div>
        <div className="absolute bottom-0 right-0">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Upload & Update
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
            onSelect={setSelectedId}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-800">{detail.symbol} Details</p>
              <p className="text-3xl font-bold text-slate-900">
                {formatCad(detail.priceCad)} <span className="text-lg font-semibold">CAD</span>
              </p>
              <p className="text-sm font-semibold text-emerald-600">
                + {formatCad(detail.changeCad)} ({formatPercent(detail.changePct)}){' '}
                <span className="text-xs font-medium text-slate-500">all time</span>
              </p>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <p className="text-base font-semibold text-slate-900">Stock Insights</p>
            </div>

            <div className="mt-3">
              <InsightTabs insights={detail.insights} />
            </div>

            <div className="mt-4">
              <TrendGrid
                trendAnalyses={detail.trendAnalyses}
                recommendation={detail.recommendation}
                longTermBias={detail.longTermBias}
              />
            </div>

            {detail.optionStrategies && detail.optionStrategies.length > 0 && (
              <div className="mt-4">
                <OptionStrategies strategies={detail.optionStrategies} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

