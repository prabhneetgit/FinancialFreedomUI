import { useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePortfolio } from '../hooks/usePortfolio'
import { useAnalytics as useAnalyticsHook } from '../hooks/useAnalytics'
import { usePerformanceHistory } from '../hooks/usePerformanceHistory'
import { queryKeys } from '../lib/react-query'
import type {
  AlertSeverityType,
  DividendIncomeData,
  MarketSentiment,
  PerformanceDataPoint,
  PositionSizingAnalysis as PositionSizingAnalysisType,
  RebalancingMetadata,
  RebalancingRecommendation,
  RiskMetrics,
  RiskStatusType,
  SectorAllocation,
  SectorDiversificationAnalysis,
  TaxLossHarvestingOpportunity,
} from '../types/api'

const MINUS = '−'
const cad = (value: number) => `${value < 0 ? MINUS : ''}$${Math.round(Math.abs(value)).toLocaleString('en-CA')}`
const signedPct = (value: number, digits = 2) => `${value >= 0 ? '+' : MINUS}${Math.abs(value).toFixed(digits)}%`
const tone = (value: number) => (value >= 0 ? 'text-gain' : 'text-loss')

export const PortfolioPerformanceChart = ({ 
  dataPoints,
  loading = false,
}: { 
  dataPoints: PerformanceDataPoint[]
  loading?: boolean
}) => {
  const chartData = useMemo(() => {
    if (!dataPoints || dataPoints.length === 0) {
      return []
    }
    return dataPoints
  }, [dataPoints])

  const width = 800
  const height = 300
  const padding = { top: 20, right: 40, bottom: 40, left: 70 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Determine the appropriate unit and divisor based on max value
  const { unit, divisor } = useMemo(() => {
    if (chartData.length === 0) return { unit: 'K', divisor: 1000 }
    
    const allValues = chartData.flatMap(d => [d.portfolio, d.sp500])
    const maxVal = Math.max(...allValues)
    
    if (maxVal >= 1_000_000) {
      return { unit: 'M', divisor: 1_000_000 }
    } else if (maxVal >= 1_000) {
      return { unit: 'K', divisor: 1_000 }
    } else {
      return { unit: '', divisor: 1 }
    }
  }, [chartData])

  const { minValue, valueRange, yAxisTicks, allValuesZero } = useMemo(() => {
    if (chartData.length === 0) {
      return { minValue: 0, maxValue: 12, valueRange: 12, yAxisTicks: [0, 3, 6, 9, 12], allValuesZero: false }
    }
    
    const allValues = chartData.flatMap(d => [d.portfolio, d.sp500])
    const dataMin = Math.min(...allValues)
    const dataMax = Math.max(...allValues)
    const allZero = dataMax === 0 && dataMin === 0
    
    // If all values are zero, set a default range for display
    if (allZero) {
      return {
        minValue: 0,
        valueRange: 1,
        yAxisTicks: [0],
        allValuesZero: true,
      }
    }
    
    const paddingPercent = 0.1
    const range = dataMax - dataMin
    // Ensure minimum range to avoid flat lines when values are identical
    const effectiveRange = range === 0 ? dataMax * 0.2 : range
    const adjustedMin = Math.max(0, dataMin - effectiveRange * paddingPercent)
    const adjustedMax = dataMax + effectiveRange * paddingPercent
    
    const tickCount = 5
    const tickStep = (adjustedMax - adjustedMin) / (tickCount - 1)
    const ticks = Array.from({ length: tickCount }, (_, i) => 
      adjustedMin + i * tickStep
    )
    
    return {
      minValue: adjustedMin,
      valueRange: adjustedMax - adjustedMin,
      yAxisTicks: ticks,
      allValuesZero: false,
    }
  }, [chartData])

  const formatYAxisValue = (value: number) => {
    const scaled = value / divisor
    if (divisor === 1) {
      return `$${scaled.toFixed(0)}`
    }
    return `$${scaled.toFixed(1)}${unit}`
  }

  const scaleX = (index: number) => {
    if (chartData.length <= 1) return padding.left
    return padding.left + (index / (chartData.length - 1)) * chartWidth
  }

  const scaleY = (value: number) => {
    // When all values are zero, draw at the bottom of the chart
    if (allValuesZero) {
      return padding.top + chartHeight
    }
    if (valueRange === 0) {
      // All values are the same (but not zero), draw at middle
      return padding.top + chartHeight / 2
    }
    return padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight
  }

  if (loading) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center">
        <div className="text-sm text-slate-500">Loading performance data...</div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center">
        <div className="text-sm text-slate-500">No performance data available</div>
      </div>
    )
  }

  // Check if all values are effectively zero (less than $1)
  const hasValidData = chartData.some(d => Math.abs(d.portfolio) > 1 || Math.abs(d.sp500) > 1)
  
  if (!hasValidData && !allValuesZero) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-slate-500">Portfolio value is too small to display</div>
          <div className="text-xs text-slate-400 mt-1">Please ensure your portfolio has holdings with values</div>
        </div>
      </div>
    )
  }

  const portfolioPath = chartData
    .map((point, index) => {
      const x = scaleX(index)
      const y = scaleY(point.portfolio)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  const sp500Path = chartData
    .map((point, index) => {
      const x = scaleX(index)
      const y = scaleY(point.sp500)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  const lastIndex = chartData.length - 1

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full max-w-full">
        <g className="text-[11px]">
          {yAxisTicks.map((value, tickIndex) => {
            const y = scaleY(value)
            return (
              <g key={`y-axis-tick-${tickIndex}-${value}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E4E4E4"
                  strokeWidth="1"
                />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" fill="#6A6A6A">
                  {allValuesZero ? (value === 0 ? '$0' : '') : formatYAxisValue(value)}
                </text>
              </g>
            )
          })}
        </g>

        <g className="text-[11px]">
          {chartData
            .filter((_, index) => index % 2 === 0 || index === lastIndex)
            .map((point, filteredIndex) => {
              const originalIndex = chartData.findIndex((p) => p.date === point.date)
              const x = scaleX(originalIndex)
              const xAxisKey = `x-axis-label-${originalIndex}-${point.date || filteredIndex}`
              return (
                <text
                  key={xAxisKey}
                  x={x}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  fill="#6A6A6A"
                >
                  {point.date}
                </text>
              )
            })}
        </g>

        <path
          d={sp500Path}
          fill="none"
          stroke="#9A9A9A"
          strokeWidth="1.5"
          strokeDasharray="4,4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d={portfolioPath}
          fill="none"
          stroke="#111111"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle cx={scaleX(lastIndex)} cy={scaleY(chartData[lastIndex].sp500)} r="3.5" fill="#9A9A9A" />
        <circle
          cx={scaleX(lastIndex)}
          cy={scaleY(chartData[lastIndex].portfolio)}
          r="5"
          fill="#111111"
          stroke="#FFFFFF"
          strokeWidth="2"
        />
      </svg>
    </div>
  )
}

const Section = ({
  id,
  title,
  meta,
  action,
  small,
  children,
}: {
  id: string
  title: string
  meta?: ReactNode
  action?: ReactNode
  small?: boolean
  children: ReactNode
}) => (
  <section aria-labelledby={id} className="flex min-w-0 flex-col gap-6 border-t-[3px] border-ink pt-4">
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <h2
        id={id}
        className={`font-serif font-medium leading-none ${small ? 'text-[28px] md:text-[32px]' : 'text-[34px] md:text-[40px]'}`}
      >
        {title}
      </h2>
      {(meta || action) && (
        <div className="flex flex-wrap items-center gap-4">
          {meta && <span className="text-[13px] text-[#4a4a4a]">{meta}</span>}
          {action}
        </div>
      )}
    </div>
    {children}
  </section>
)

const Pending = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted">{children}</p>

const Figure = ({
  label,
  value,
  note,
  valueClass = '',
}: {
  label: string
  value: string
  note?: string
  valueClass?: string
}) => (
  <div className="flex flex-col gap-1">
    <span className="smallcaps text-[11px] text-muted">{label}</span>
    <span className={`font-serif text-[32px] leading-tight tabular-nums ${valueClass}`}>{value}</span>
    {note && <span className="text-xs text-muted">{note}</span>}
  </div>
)

const ActionButton = ({
  onClick,
  busy,
  busyLabel,
  title,
  children,
}: {
  onClick: () => void
  busy: boolean
  busyLabel: string
  title?: string
  children: ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={busy}
    title={title}
    className="flex h-9 items-center gap-1.5 border border-ink px-3 text-xs font-semibold transition-colors hover:bg-sand disabled:cursor-not-allowed disabled:opacity-50"
  >
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
    </svg>
    {busy ? busyLabel : children}
  </button>
)

const TableHead = ({ columns }: { columns: { label: string; className?: string }[] }) => (
  <thead>
    <tr className="smallcaps border-b border-ink text-[11px] text-muted">
      {columns.map((column) => (
        <th key={column.label} scope="col" className={`py-2 font-semibold ${column.className ?? 'text-left'}`}>
          {column.label}
        </th>
      ))}
    </tr>
  </thead>
)

const ListBlock = ({ title, items, titleClass }: { title: string; items: string[]; titleClass: string }) =>
  items.length > 0 ? (
    <div className="flex flex-col gap-1.5">
      <h3 className={`smallcaps text-[11px] ${titleClass}`}>{title}</h3>
      <ul className="flex flex-col font-serif text-base leading-snug text-ink-soft">
        {items.map((item, index) => (
          <li key={`${index}-${item.slice(0, 20)}`} className="border-t border-line py-1.5">
            {item}
          </li>
        ))}
      </ul>
    </div>
  ) : null

const priorityClass: Record<string, string> = {
  High: 'font-bold text-ink',
  Medium: 'text-ink-soft',
  Low: 'text-muted',
}

const AllocationSection = ({
  sectorAllocation,
  analysis,
  loading,
}: {
  sectorAllocation: SectorAllocation[]
  analysis: SectorDiversificationAnalysis | null
  loading: boolean
}) => {
  const sectors = [...sectorAllocation].sort((a, b) => b.amount - a.amount)

  return (
    <Section
      id="alloc-h"
      title="Where your money sits"
      meta={analysis ? `Diversification ${analysis.score} / 100 · ${analysis.status}` : loading ? 'Analyzing…' : undefined}
    >
      <div className="grid gap-10 lg:grid-cols-2">
        {sectors.length === 0 ? (
          <Pending>No sector data yet.</Pending>
        ) : (
          <table className="w-full self-start border-collapse text-sm tabular-nums">
            <TableHead
              columns={[
                { label: 'Sector' },
                { label: 'Share', className: 'sr-only' },
                { label: 'Weight', className: 'text-right' },
                { label: 'Value', className: 'text-right' },
              ]}
            />
            <tbody>
              {sectors.map((sector) => (
                <tr key={sector.name} className="border-b border-line">
                  <th scope="row" className="py-2.5 pr-4 text-left font-semibold">
                    {sector.name}
                  </th>
                  <td className="w-2/5 py-2.5">
                    <span className="block h-1.5 bg-track">
                      <span className="block h-1.5 bg-ink" style={{ width: `${Math.min(100, sector.percentage)}%` }} />
                    </span>
                  </td>
                  <td className="py-2.5 text-right">{sector.percentage.toFixed(1)}%</td>
                  <td className="py-2.5 text-right">{cad(sector.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex flex-col gap-4 lg:border-l lg:border-line lg:pl-8">
          <span className="kicker text-accent">The AI’s read</span>
          {analysis ? (
            <>
              <p className="dropcap font-serif text-lg leading-relaxed text-[#1e1e1e]">{analysis.summary}</p>
              <ListBlock title="Working in your favour" items={analysis.strengths} titleClass="text-gain" />
              <ListBlock title="Worth watching" items={analysis.risks} titleClass="text-loss" />
            </>
          ) : (
            <Pending>{loading ? 'The AI is reviewing your diversification…' : 'No diversification analysis yet.'}</Pending>
          )}
        </div>
      </div>

      {analysis && analysis.suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="smallcaps text-xs">Suggested moves</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm tabular-nums">
              <TableHead
                columns={[
                  { label: 'Move' },
                  { label: 'Now → target', className: 'text-right' },
                  { label: 'Priority', className: 'pl-6 text-left' },
                  { label: 'Why', className: 'pl-6 text-left' },
                ]}
              />
              <tbody>
                {analysis.suggestions.map((suggestion, index) => (
                  <tr key={`${suggestion.sector}-${index}`} className="border-b border-line align-top">
                    <th scope="row" className="py-2.5 pr-4 text-left font-semibold">
                      {suggestion.action} {suggestion.sector}
                    </th>
                    <td className="whitespace-nowrap py-2.5 text-right">
                      {suggestion.currentPercentage.toFixed(1)}% → {suggestion.targetPercentage.toFixed(1)}%
                    </td>
                    <td className={`py-2.5 pl-6 ${priorityClass[suggestion.priority] ?? ''}`}>{suggestion.priority}</td>
                    <td className="py-2.5 pl-6 font-serif text-[15px] leading-snug text-ink-soft">{suggestion.reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Section>
  )
}

const riskStatusClass: Record<RiskStatusType, string> = {
  Good: 'text-gain',
  Moderate: 'text-amber-ink',
  'Needs Attention': 'text-loss',
}

type Reading = { text: string; className: string }
const GOOD = 'text-gain'
const OK = 'text-amber-ink'
const BAD = 'text-loss'

const readSharpe = (v?: number): Reading =>
  v === undefined
    ? { text: 'Unable to calculate', className: 'text-muted' }
    : v >= 2
      ? { text: 'Excellent risk-adjusted returns', className: GOOD }
      : v >= 1
        ? { text: 'Good risk-adjusted returns', className: GOOD }
        : v >= 0.5
          ? { text: 'Acceptable returns for risk taken', className: OK }
          : { text: 'Poor risk-adjusted performance', className: BAD }

const readBeta = (v: number): Reading =>
  v < 0.8
    ? { text: 'Conservative, defensive portfolio', className: 'text-accent' }
    : v <= 1.2
      ? { text: 'Market-aligned risk exposure', className: GOOD }
      : v <= 1.5
        ? { text: 'Above-market volatility', className: OK }
        : { text: 'High market sensitivity', className: BAD }

const readVolatility = (v: number): Reading =>
  v < 15
    ? { text: 'Low volatility, stable portfolio', className: GOOD }
    : v <= 25
      ? { text: 'Moderate volatility, balanced', className: OK }
      : v <= 40
        ? { text: 'High volatility, elevated risk', className: BAD }
        : { text: 'Very high volatility, significant swings', className: BAD }

const readVaR = (v: number): Reading =>
  v > -2
    ? { text: 'Low daily risk exposure', className: GOOD }
    : v > -4
      ? { text: 'Moderate daily risk', className: OK }
      : v > -6
        ? { text: 'Elevated daily risk', className: BAD }
        : { text: 'High potential daily loss', className: BAD }

const readDrawdown = (v: number): Reading =>
  v > -10
    ? { text: 'Well-protected portfolio', className: GOOD }
    : v > -20
      ? { text: 'Moderate drawdown risk', className: OK }
      : v > -30
        ? { text: 'Significant drawdown exposure', className: BAD }
        : { text: 'High drawdown risk', className: BAD }

const readInfoRatio = (v?: number): Reading =>
  v === undefined
    ? { text: 'Unable to calculate', className: 'text-muted' }
    : v >= 1
      ? { text: 'Strong benchmark outperformance', className: GOOD }
      : v >= 0.5
        ? { text: 'Moderate outperformance', className: GOOD }
        : v >= 0
          ? { text: 'Slight outperformance', className: OK }
          : { text: 'Underperforming benchmark', className: BAD }

const RiskSection = ({ riskMetrics }: { riskMetrics: RiskMetrics | null }) => {
  if (!riskMetrics) {
    return (
      <Section small id="risk-h" title="Risk">
        <Pending>Loading risk metrics…</Pending>
      </Section>
    )
  }

  const metrics: { label: string; value: string; description: string; explainer: string; reading: Reading }[] = [
    {
      label: 'Sharpe ratio',
      value: riskMetrics.sharpeRatio?.toFixed(2) ?? 'N/A',
      description: 'Risk-adjusted return',
      explainer:
        'Excess return per unit of risk: (portfolio return − risk-free rate) ÷ volatility. Above 1.0 is considered good, above 2.0 excellent.',
      reading: readSharpe(riskMetrics.sharpeRatio),
    },
    {
      label: 'Portfolio beta',
      value: riskMetrics.portfolioBeta.toFixed(2),
      description: 'vs the market',
      explainer:
        'Sensitivity to market moves. 1.0 moves with the market; below 1.0 is more defensive, above 1.0 more aggressive.',
      reading: readBeta(riskMetrics.portfolioBeta),
    },
    {
      label: 'Volatility',
      value: `${riskMetrics.volatility.toFixed(1)}%`,
      description: 'Annual standard deviation',
      explainer:
        'How far returns swing around their average, annualized. Lower means steadier returns; the S&P 500 typically runs near 15%.',
      reading: readVolatility(riskMetrics.volatility),
    },
    {
      label: 'Value at risk',
      value: `${riskMetrics.valueAtRisk.toFixed(1)}%`,
      description: '1 day, 95% confidence',
      explainer:
        'The loss you should exceed on only 1 day in 20 under normal conditions. −4.2% means a 5% chance of losing more than 4.2% in a day.',
      reading: readVaR(riskMetrics.valueAtRisk),
    },
    {
      label: 'Max drawdown',
      value: `${riskMetrics.maxDrawdown.toFixed(1)}%`,
      description: 'Peak to trough',
      explainer: 'The largest fall from a peak to the following low. Closer to 0% means better downside protection.',
      reading: readDrawdown(riskMetrics.maxDrawdown),
    },
    {
      label: 'Information ratio',
      value: riskMetrics.informationRatio?.toFixed(2) ?? 'N/A',
      description: 'vs the S&P 500',
      explainer:
        'Excess return over the benchmark relative to tracking error. Above 0.5 is good, above 1.0 is excellent active management.',
      reading: readInfoRatio(riskMetrics.informationRatio),
    },
  ]

  return (
    <Section
      small
      id="risk-h"
      title="Risk"
      meta={<span className={`smallcaps text-xs ${riskStatusClass[riskMetrics.riskStatus]}`}>{riskMetrics.riskStatus}</span>}
    >
      <div className="flex flex-col">
        {metrics.map((metric) => (
          <details key={metric.label} className="group border-b border-line py-2.5 first:border-t">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold">
                  {metric.label} <span className="font-normal text-muted">· {metric.description}</span>
                </span>
                <span className={`text-xs ${metric.reading.className}`}>{metric.reading.text}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-serif text-2xl tabular-nums">{metric.value}</span>
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-muted transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </summary>
            <p className="pt-2 text-[13px] leading-relaxed text-ink-soft">{metric.explainer}</p>
          </details>
        ))}
      </div>
      <p className="text-xs text-muted">Select a metric to see what it measures.</p>
    </Section>
  )
}

const alertLabel: Record<AlertSeverityType, { label: string; className: string }> = {
  info: { label: 'Note', className: 'text-accent' },
  warning: { label: 'Caution', className: 'text-amber-ink' },
  error: { label: 'Warning', className: 'text-loss' },
}

const MarketsSection = ({
  sentiment,
  loading,
  refreshing,
  onRefresh,
}: {
  sentiment: MarketSentiment | null
  loading: boolean
  refreshing: boolean
  onRefresh: () => Promise<void>
}) => (
  <Section
    small
    id="mood-h"
    title="Market mood"
    action={
      <ActionButton
        onClick={onRefresh}
        busy={refreshing || loading}
        busyLabel="Refreshing…"
        title="Refresh to get the latest VIX data"
      >
        Refresh
      </ActionButton>
    }
  >
    {!sentiment ? (
      <Pending>{loading ? 'Loading market sentiment…' : 'No market sentiment yet.'}</Pending>
    ) : (
      <>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="font-serif text-[52px] leading-none tabular-nums">{sentiment.fearGreedValue}</span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{sentiment.fearGreedLabel}</span>
              <span className="text-xs text-muted">Fear &amp; Greed Index</span>
            </span>
          </div>
          <span className="relative block h-1.5 bg-track" aria-hidden="true">
            <span
              className="absolute top-1/2 h-3.5 w-1 -translate-x-1/2 -translate-y-1/2 bg-ink"
              style={{ left: `${Math.min(100, Math.max(0, sentiment.fearGreedValue))}%` }}
            />
          </span>
          <div className="flex justify-between text-[11px] text-muted">
            <span>Extreme fear</span>
            <span>Extreme greed</span>
          </div>
        </div>
        <dl className="flex flex-col">
          {[
            { label: 'VIX', value: sentiment.vixValue.toFixed(1), status: sentiment.vixStatus },
            { label: 'Put/call ratio', value: sentiment.putCallRatio.toFixed(2), status: sentiment.putCallStatus },
            { label: 'Market breadth', value: `${sentiment.marketBreadth.toFixed(1)}%`, status: sentiment.marketBreadthStatus },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 border-t border-line py-2.5 last:border-b">
              <dt className="flex flex-col">
                <span className="text-sm font-semibold">{row.label}</span>
                <span className="text-xs text-muted">{row.status}</span>
              </dt>
              <dd className="font-serif text-2xl tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
        {sentiment.alerts.length > 0 && (
          <ul className="flex flex-col gap-2 text-sm leading-snug text-ink-soft">
            {sentiment.alerts.map((alert, index) => (
              <li key={`${index}-${alert.message.slice(0, 20)}`}>
                <span className={`smallcaps mr-1.5 text-[11px] ${alertLabel[alert.severity].className}`}>
                  {alertLabel[alert.severity].label}
                </span>
                {alert.message}
              </li>
            ))}
          </ul>
        )}
      </>
    )}
  </Section>
)

const RebalancingSection = ({
  rebalancing,
  metadata,
  loading,
  onRefresh,
}: {
  rebalancing: RebalancingRecommendation[]
  metadata: RebalancingMetadata | null
  loading: boolean
  onRefresh: () => Promise<void>
}) => {
  const [refreshing, setRefreshing] = useState(false)
  const busy = refreshing || loading
  const total = rebalancing.reduce((sum, rec) => sum + Math.abs(rec.amount), 0)

  const regenerate = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  const meta = [
    `${rebalancing.length} trades`,
    `${cad(total)} CAD in total`,
    metadata &&
      `quality score ${metadata.evaluationScore}% after ${metadata.iterationCount} ${
        metadata.iterationCount === 1 ? 'pass' : 'passes'
      }`,
    metadata?.evaluationPassed && 'passed review',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Section
      id="reb-h"
      title="Rebalancing plan"
      meta={meta}
      action={
        <ActionButton onClick={regenerate} busy={busy} busyLabel="Regenerating…">
          Regenerate plan
        </ActionButton>
      }
    >
      {rebalancing.length === 0 ? (
        <Pending>{busy ? 'Building a rebalancing plan…' : 'No trades suggested right now.'}</Pending>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm tabular-nums">
            <TableHead
              columns={[
                { label: 'Holding' },
                { label: 'Action' },
                { label: 'Now → target', className: 'pl-6 text-right' },
                { label: 'Amount', className: 'pl-6 text-right' },
                { label: 'Risk', className: 'pl-6 text-left' },
                { label: 'Why', className: 'pl-6 text-left' },
              ]}
            />
            <tbody>
              {rebalancing.map((rec) => {
                const sell = rec.action === 'Sell'
                return (
                  <tr key={rec.symbol} className="border-b border-line align-top">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <strong className="block font-bold">{rec.symbol}</strong>
                      <span className="text-xs text-muted">{rec.name}</span>
                    </th>
                    <td className={`py-3 font-semibold ${sell ? 'text-loss' : 'text-gain'}`}>{sell ? 'Trim' : 'Add'}</td>
                    <td className="whitespace-nowrap py-3 pl-6 text-right">
                      {rec.currentAllocation.toFixed(1)}% → {rec.targetAllocation.toFixed(1)}%
                    </td>
                    <td className="whitespace-nowrap py-3 pl-6 text-right font-semibold">
                      {rec.action} {cad(Math.abs(rec.amount))}
                    </td>
                    <td className="py-3 pl-6">{rec.risk}</td>
                    <td className="py-3 pl-6 font-serif text-[15px] leading-snug text-ink-soft">{rec.reason}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

const TaxLossSection = ({ opportunities }: { opportunities: TaxLossHarvestingOpportunity[] }) => {
  const totalLoss = opportunities.reduce((sum, o) => sum + Math.abs(o.unrealizedLoss), 0)
  const totalSavings = opportunities.reduce((sum, o) => sum + o.taxSavings, 0)

  return (
    <Section
      id="tlh-h"
      title="Tax-loss harvesting"
      meta={
        opportunities.length
          ? `${opportunities.length} opportunities · ${cad(-totalLoss)} unrealized · ${cad(totalSavings)} est. savings`
          : undefined
      }
    >
      {opportunities.length === 0 ? (
        <Pending>No tax-loss harvesting opportunities. Every holding is at a gain or break-even.</Pending>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm tabular-nums">
              <TableHead
                columns={[
                  { label: 'Holding' },
                  { label: 'Unrealized loss', className: 'pl-6 text-right' },
                  { label: 'Below cost', className: 'pl-6 text-right' },
                  { label: 'Est. savings', className: 'pl-6 text-right' },
                  { label: 'Now worth', className: 'pl-6 text-right' },
                  { label: 'Swap ideas', className: 'pl-6 text-left' },
                  { label: 'Superficial-loss risk', className: 'pl-6 text-right' },
                ]}
              />
              <tbody>
                {opportunities.map((opp) => (
                  <tr key={opp.symbol} className="border-b border-line align-top">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <strong className="block font-bold">{opp.symbol}</strong>
                      <span className="text-xs text-muted">{opp.name}</span>
                    </th>
                    <td className="py-3 pl-6 text-right font-semibold text-loss">{cad(-Math.abs(opp.unrealizedLoss))}</td>
                    <td className="py-3 pl-6 text-right">{Math.abs(opp.lossPercentage).toFixed(1)}%</td>
                    <td className="py-3 pl-6 text-right font-semibold text-gain">{cad(opp.taxSavings)}</td>
                    <td className="py-3 pl-6 text-right">{cad(opp.currentValue)}</td>
                    <td className="py-3 pl-6">
                      {opp.replacementOptions.length === 0 ? (
                        <span className="text-muted">None suggested</span>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {opp.replacementOptions.map((option) => (
                            <li key={option.symbol} title={option.reason}>
                              <strong className="font-semibold">{option.symbol}</strong>{' '}
                              <span className="text-muted">{option.name}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="py-3 pl-6 text-right">{opp.washSaleRisk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">
            Mind the superficial-loss rule: don’t rebuy the same security within 30 days before or after the sale.
            Hover a swap idea for the AI’s reasoning.
          </p>
        </>
      )}
    </Section>
  )
}

const concentrationCopy: Record<string, { text: string; className: string }> = {
  High: {
    text: 'High concentration: several positions exceed recommended limits. Consider rebalancing.',
    className: 'text-loss',
  },
  Moderate: {
    text: 'Moderate concentration: some positions exceed recommended limits. Keep an eye on them.',
    className: 'text-amber-ink',
  },
  Healthy: {
    text: 'Healthy concentration: positions sit within recommended sizing guidelines.',
    className: 'text-gain',
  },
}

const PositionSizingSection = ({ positionSizing }: { positionSizing: PositionSizingAnalysisType | null }) => {
  if (!positionSizing) {
    return (
      <Section small id="size-h" title="Position sizing">
        <Pending>Loading position sizing…</Pending>
      </Section>
    )
  }

  const { top3Percentage, top5Percentage, concentrationLevel, topHoldings, warnings, guidelines } = positionSizing
  const copy = concentrationCopy[concentrationLevel] ?? concentrationCopy.Healthy

  return (
    <Section small id="size-h" title="Position sizing" meta={concentrationLevel}>
      <div className="grid grid-cols-2 gap-5">
        <Figure label="Top 3 holdings" value={`${top3Percentage.toFixed(1)}%`} note="of the portfolio" />
        <Figure label="Top 5 holdings" value={`${top5Percentage.toFixed(1)}%`} note="of the portfolio" />
      </div>
      <table className="w-full border-collapse text-sm tabular-nums">
        <TableHead
          columns={[
            { label: 'Rank' },
            { label: 'Holding' },
            { label: 'Share', className: 'sr-only' },
            { label: 'Weight', className: 'text-right' },
            { label: 'Value', className: 'text-right' },
          ]}
        />
        <tbody>
          {topHoldings.map((holding, index) => (
            <tr key={holding.symbol} className="border-b border-line">
              <td className="py-2 text-muted">{index + 1}</td>
              <th scope="row" className="py-2 pr-4 text-left font-bold">
                {holding.symbol}
              </th>
              <td className="w-2/5 py-2">
                <span className="block h-1.5 bg-track">
                  <span className="block h-1.5 bg-ink" style={{ width: `${Math.min(100, holding.percentage * 4)}%` }} />
                </span>
              </td>
              <td className="py-2 text-right">{holding.percentage.toFixed(1)}%</td>
              <td className="py-2 text-right">{cad(holding.amountCad)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(warnings.length > 0 || concentrationLevel !== 'Healthy') && (
        <div className="flex flex-col gap-1.5">
          <p className={`text-sm font-semibold ${copy.className}`}>{copy.text}</p>
          {warnings.length > 0 && (
            <ul className="flex flex-col gap-1 text-[13px] text-ink-soft">
              {warnings.map((warning, index) => (
                <li key={`${index}-${warning.slice(0, 20)}`}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {guidelines.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="smallcaps text-[11px] text-muted">Guidelines</h3>
          <ul className="flex flex-col gap-1 text-[13px] text-ink-soft">
            {guidelines.map((guideline, index) => (
              <li key={`${index}-${guideline.description.slice(0, 20)}`}>
                {guideline.description}
                {guideline.threshold !== null && ` (${guideline.threshold}% limit)`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  )
}

const DividendSection = ({ dividendIncome }: { dividendIncome: DividendIncomeData | null }) => {
  if (!dividendIncome) {
    return (
      <Section small id="div-h" title="Dividend income">
        <Pending>Loading dividend data…</Pending>
      </Section>
    )
  }

  const { annualIncome, quarterlyIncome, monthlyIncome, portfolioYield, dividendHoldings, incomeProjectionText, investmentTipText } =
    dividendIncome

  return (
    <Section small id="div-h" title="Dividend income" meta={`${portfolioYield.toFixed(2)}% portfolio yield`}>
      <div className="grid grid-cols-3 gap-5">
        <Figure label="Annual" value={cad(annualIncome)} />
        <Figure label="Quarterly" value={cad(quarterlyIncome)} />
        <Figure label="Monthly" value={cad(monthlyIncome)} />
      </div>
      {dividendHoldings.length === 0 ? (
        <p className="font-serif text-lg leading-relaxed text-ink-soft">
          No dividend-paying holdings were found in your portfolio. Dividend stocks or ETFs would add a passive income
          stream.
        </p>
      ) : (
        <>
          <table className="w-full border-collapse text-sm tabular-nums">
            <TableHead
              columns={[
                { label: 'Holding' },
                { label: 'Yield', className: 'text-right' },
                { label: 'Per year', className: 'text-right' },
              ]}
            />
            <tbody>
              {dividendHoldings.map((holding) => (
                <tr key={holding.symbol} className="border-b border-line">
                  <th scope="row" className="py-2 pr-4 text-left font-normal">
                    <strong className="font-bold">{holding.symbol}</strong>{' '}
                    <span className="text-muted">{holding.name}</span>
                  </th>
                  <td className="py-2 text-right">{holding.dividendYield.toFixed(2)}%</td>
                  <td className="py-2 text-right">{cad(holding.annualDividend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {incomeProjectionText && (
            <p className="font-serif text-base leading-relaxed text-ink-soft">
              <strong className="font-semibold text-ink">Five-year outlook:</strong> {incomeProjectionText}
            </p>
          )}
          {investmentTipText && (
            <p className="font-serif text-base leading-relaxed text-ink-soft">
              <strong className="font-semibold text-ink">Tip:</strong> {investmentTipText}
            </p>
          )}
        </>
      )}
    </Section>
  )
}

export const Analytics = ({ onBackToPortfolio }: { onBackToPortfolio: () => void }) => {
  const queryClient = useQueryClient()
  const { holdings, summary, loading: portfolioLoading, error: portfolioError } = usePortfolio()

  const holdingsHash = useMemo(() => {
    return JSON.stringify(holdings.map((h) => ({ id: h.id, symbol: h.symbol, amountCad: h.amountCad })))
  }, [holdings])

  const {
    performance,
    sectorAllocation: apiSectorAllocation,
    sectorDiversification,
    sectorDiversificationLoading,
    riskMetrics,
    rebalancing,
    rebalancingMetadata,
    rebalancingLoading,
    refetchRebalancing,
    positionSizing,
    taxLossHarvesting,
    dividendIncome,
    marketSentiment,
    marketSentimentLoading,
    marketSentimentRefreshing,
    refetchMarketSentiment,
    loading: analyticsLoading,
    error: analyticsError,
  } = useAnalyticsHook(holdingsHash)
  const { performanceHistory, loading: historyLoading } = usePerformanceHistory(6, holdingsHash)

  const loading = portfolioLoading || analyticsLoading
  const error = portfolioError || analyticsError

  if (loading && !summary) {
    return <div className="flex items-center justify-center py-12 text-muted">Loading analytics data...</div>
  }

  if (error) {
    return (
      <div className="bg-[#fbe9e6] p-4 text-[#9e2a17]">
        <p className="text-sm font-semibold">Error loading analytics data</p>
        <p className="mt-1 text-sm">{error.message}</p>
      </div>
    )
  }

  if (!summary) {
    return <div className="flex items-center justify-center py-12 text-muted">No analytics data available</div>
  }

  const totalValue = summary.totalValueCad
  const annualDividendIncome = performance?.annualDividendIncome ?? 0
  const dividendYield = performance?.dividendYield ?? (totalValue ? (annualDividendIncome / totalValue) * 100 : 0)
  const countBy = (category: string) => holdings.filter((h) => h.category === category).length

  const portfolioReturn = performanceHistory?.portfolioReturn ?? performance?.portfolioReturn ?? 0
  const sp500Return = performanceHistory?.sp500Return ?? performance?.sp500Return ?? 0
  const outperformance =
    performanceHistory?.outperformance ?? performance?.outperformance ?? portfolioReturn - sp500Return
  // Re-read on every render; the component re-renders when the risk data arrives.
  const riskUpdatedAt = queryClient.getQueryState(queryKeys.analytics.riskMetrics())?.dataUpdatedAt

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-4 lg:max-w-[72%]">
        <button
          type="button"
          onClick={onBackToPortfolio}
          className="smallcaps self-start text-xs text-accent hover:text-accent-dark"
        >
          ← Back to the front page
        </button>
        <span className="kicker text-accent">Analysis desk</span>
        <h1 className="font-serif text-[40px] font-medium leading-[1.05] tracking-[-0.5px] text-balance md:text-[56px]">
          {riskMetrics
            ? `Risk rated “${riskMetrics.riskStatus.toLowerCase()}” across ${holdings.length} holdings`
            : 'Portfolio analysis'}
        </h1>
        {riskMetrics?.riskAssessment && (
          <p className="font-serif text-[21px] italic leading-snug text-[#3a3a3a] text-pretty">
            {riskMetrics.riskAssessment}
          </p>
        )}
        <span className="text-[13px] text-muted">
          {riskMetrics && riskUpdatedAt
            ? `AI review as of ${new Date(riskUpdatedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}`
            : 'AI review in progress…'}
        </span>
      </header>

      <section
        aria-label="By the numbers"
        className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-ink py-5 md:grid-cols-3 xl:grid-cols-6"
      >
        <Figure label="Portfolio value" value={cad(totalValue)} note="CAD" />
        <Figure
          label="All-time"
          value={cad(summary.totalGainCad)}
          note={signedPct(summary.totalGainPct, 1)}
          valueClass={tone(summary.totalGainCad)}
        />
        <Figure
          label="6M vs S&P 500"
          value={`${outperformance >= 0 ? '+' : MINUS}${Math.abs(outperformance).toFixed(2)} pts`}
          note={`You ${signedPct(portfolioReturn)} · S&P ${signedPct(sp500Return)}`}
          valueClass={tone(outperformance)}
        />
        <Figure label="Dividend income" value={cad(annualDividendIncome)} note={`${dividendYield.toFixed(2)}% yield`} />
        <Figure
          label="Holdings"
          value={String(holdings.length)}
          note={`${countBy('Stocks')} stocks · ${countBy('ETFs')} ETFs · ${countBy('Crypto')} crypto`}
        />
        <Figure
          label="Diversification"
          value={sectorDiversification ? String(sectorDiversification.score) : '—'}
          note={sectorDiversification ? `${sectorDiversification.status} · out of 100` : 'Analyzing…'}
        />
      </section>

      <Section
        id="perf-h"
        title="Six months against the market"
        meta={`You ${signedPct(portfolioReturn)} · S&P 500 ${signedPct(sp500Return)}`}
      >
        <PortfolioPerformanceChart dataPoints={performanceHistory?.dataPoints ?? []} loading={historyLoading} />
        <p className="text-xs text-muted">
          Solid line: your portfolio. Dashed line: the S&amp;P 500, rebased to your starting value.
        </p>
      </Section>

      <AllocationSection
        sectorAllocation={apiSectorAllocation}
        analysis={sectorDiversification}
        loading={sectorDiversificationLoading}
      />

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
        <RiskSection riskMetrics={riskMetrics} />
        <MarketsSection
          sentiment={marketSentiment}
          loading={marketSentimentLoading || !riskMetrics}
          refreshing={marketSentimentRefreshing}
          onRefresh={refetchMarketSentiment}
        />
      </div>

      <RebalancingSection
        rebalancing={rebalancing}
        metadata={rebalancingMetadata}
        loading={rebalancingLoading}
        onRefresh={refetchRebalancing}
      />

      <TaxLossSection opportunities={taxLossHarvesting} />

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
        <PositionSizingSection positionSizing={positionSizing} />
        <DividendSection dividendIncome={dividendIncome} />
      </div>

      <p className="border-t border-line pt-3 text-xs text-muted">
        AI-generated for education only. Not financial advice.
      </p>
    </div>
  )
}
