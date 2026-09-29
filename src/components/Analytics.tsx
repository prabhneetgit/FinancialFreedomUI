import { useMemo, useState } from 'react'
import { usePortfolio } from '../hooks/usePortfolio'
import { useAnalytics as useAnalyticsHook } from '../hooks/useAnalytics'
import { usePerformanceHistory } from '../hooks/usePerformanceHistory'
import type { 
  PositionSizingAnalysis as PositionSizingAnalysisType, 
  DividendIncomeData, 
  PerformanceDataPoint, 
  SectorDiversificationAnalysis,
  MarketSentiment,
  AlertSeverityType,
} from '../types/api'

const formatCurrency = (value: number) => {
  const formatted = new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
  return `$${formatted} CAD`
}

const formatCurrencyShort = (value: number) => {
  const thousands = Math.round(value / 1_000)
  return `$${thousands}K`
}

const formatPercent = (value: number) => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

const formatPercentNoSign = (value: number) => {
  return `${value.toFixed(1)}%`
}

type SectorData = {
  name: string
  amount: number
  percentage: number
  color: string
}

const SectorAllocationChart = ({
  sectorAllocation,
  diversificationAnalysis,
  diversificationLoading,
}: {
  sectorAllocation: Array<{ name: string; amount: number; percentage: number; color?: string }>
  diversificationAnalysis: SectorDiversificationAnalysis | null
  diversificationLoading: boolean
}) => {
  const sectorData = useMemo(() => {
    const sectorConfigs: Record<string, string> = {
      Technology: '#6366F1',
      'Index Fund': '#10B981',
      Cryptocurrency: '#F59E0B',
      Consumer: '#EC4899',
      Automotive: '#06B6D4',
      Other: '#94A3B8',
    }

    return sectorAllocation
      .map((sector) => ({
        name: sector.name,
        amount: sector.amount,
        percentage: sector.percentage,
        color: sector.color || sectorConfigs[sector.name] || '#94A3B8',
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [sectorAllocation])

  const totalValue = sectorData.reduce((sum, s) => sum + s.amount, 0)

  const outerRadius = 120
  const innerRadius = 70
  const centerX = 150
  const centerY = 150

  const createDonutArc = (startAngle: number, endAngle: number, largeArc: boolean) => {
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    
    const x1Outer = centerX + outerRadius * Math.cos(startRad)
    const y1Outer = centerY + outerRadius * Math.sin(startRad)
    const x2Outer = centerX + outerRadius * Math.cos(endRad)
    const y2Outer = centerY + outerRadius * Math.sin(endRad)
    
    const x1Inner = centerX + innerRadius * Math.cos(endRad)
    const y1Inner = centerY + innerRadius * Math.sin(endRad)
    const x2Inner = centerX + innerRadius * Math.cos(startRad)
    const y2Inner = centerY + innerRadius * Math.sin(startRad)
    
    return `M ${x1Outer} ${y1Outer} 
            A ${outerRadius} ${outerRadius} 0 ${largeArc ? 1 : 0} 1 ${x2Outer} ${y2Outer} 
            L ${x1Inner} ${y1Inner} 
            A ${innerRadius} ${innerRadius} 0 ${largeArc ? 1 : 0} 0 ${x2Inner} ${y2Inner} 
            Z`
  }

  const sectorsWithAngles = sectorData.reduce(
    (acc, sector) => {
      const startAngle = acc.currentAngle
      const sectorAngle = (sector.percentage / 100) * 360
      const endAngle = startAngle + sectorAngle
      acc.sectors.push({
        ...sector,
        startAngle,
        endAngle,
        sectorAngle,
      })
      acc.currentAngle = endAngle
      return acc
    },
    { sectors: [] as Array<SectorData & { startAngle: number; endAngle: number; sectorAngle: number }>, currentAngle: -90 }
  ).sectors

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Well Diversified':
        return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' }
      case 'Moderately Diversified':
        return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' }
      default:
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' }
    }
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'High':
        return { bg: 'bg-red-100', text: 'text-red-700' }
      case 'Medium':
        return { bg: 'bg-amber-100', text: 'text-amber-700' }
      default:
        return { bg: 'bg-emerald-100', text: 'text-emerald-700' }
    }
  }

  const statusConfig = diversificationAnalysis 
    ? getStatusConfig(diversificationAnalysis.status) 
    : { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' }

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-white p-8 shadow-lg">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Sector Allocation</h2>
          <p className="mt-1 text-sm text-slate-500">AI-powered portfolio analysis</p>
        </div>
        <div className={`flex items-center gap-2 rounded-full ${statusConfig.bg} ${statusConfig.border} border px-4 py-2`}>
          {diversificationLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
          ) : (
            <div className={`h-2 w-2 rounded-full ${statusConfig.dot} animate-pulse`}></div>
          )}
          <span className={`text-sm font-semibold ${statusConfig.text}`}>
            {diversificationLoading ? 'Analyzing...' : diversificationAnalysis?.status || 'Loading'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="relative flex-shrink-0 mx-auto lg:mx-0">
          <svg width={300} height={300} viewBox="0 0 300 300" className="drop-shadow-xl">
            <defs>
              {sectorsWithAngles.map((sector, idx) => (
                <filter key={`shadow-${idx}`} id={`shadow-${sector.name.replace(/\s+/g, '-')}`}>
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                </filter>
              ))}
              <linearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </linearGradient>
            </defs>
            
            <circle 
              cx={centerX} 
              cy={centerY} 
              r={outerRadius + 8} 
              fill="none" 
              stroke="#e2e8f0" 
              strokeWidth="1" 
              strokeDasharray="4,4"
              opacity="0.5"
            />
            
            {sectorsWithAngles.map((sector) => {
              const largeArc = sector.sectorAngle > 180
              const path = createDonutArc(sector.startAngle, sector.endAngle, largeArc)

              return (
                <g key={sector.name}>
                  <path
                    d={path}
                    fill={sector.color}
                    stroke="white"
                    strokeWidth="3"
                    filter={`url(#shadow-${sector.name.replace(/\s+/g, '-')})`}
                    className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                    style={{
                      transform: 'scale(1)',
                      transformOrigin: `${centerX}px ${centerY}px`,
                    }}
                  />
                </g>
              )
            })}
            
            <circle 
              cx={centerX} 
              cy={centerY} 
              r={innerRadius - 5} 
              fill="url(#centerGradient)"
              className="drop-shadow-inner"
            />
            
            {diversificationAnalysis && !diversificationLoading ? (
              <>
                <text
                  x={centerX}
                  y={centerY - 8}
                  textAnchor="middle"
                  className="fill-slate-900 font-bold"
                  style={{ fontSize: '28px' }}
                >
                  {diversificationAnalysis.score}
                </text>
                <text
                  x={centerX}
                  y={centerY + 14}
                  textAnchor="middle"
                  className="fill-slate-500"
                  style={{ fontSize: '11px', fontWeight: 500 }}
                >
                  Diversification Score
                </text>
              </>
            ) : (
              <>
                <text
                  x={centerX}
                  y={centerY - 12}
                  textAnchor="middle"
                  className="fill-slate-900 font-bold"
                  style={{ fontSize: '22px' }}
                >
                  {totalValue >= 1_000_000 ? `$${(totalValue / 1_000_000).toFixed(1)}M` : 
                   totalValue >= 1_000 ? `$${(totalValue / 1_000).toFixed(1)}K` : 
                   `$${totalValue.toFixed(0)}`}
                </text>
                <text
                  x={centerX}
                  y={centerY + 12}
                  textAnchor="middle"
                  className="fill-slate-500"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                >
                  Total Value
                </text>
              </>
            )}
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-3">
            {sectorData.map((sector) => (
              <div 
                key={sector.name} 
                className="group flex items-center gap-4 rounded-xl bg-white p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200"
              >
                <div 
                  className="h-12 w-12 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: `${sector.color}15` }}
                >
                  <div
                    className="h-6 w-6 rounded-lg"
                    style={{ backgroundColor: sector.color }}
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-900 truncate">{sector.name}</span>
                    <span className="text-lg font-bold text-slate-900 ml-2">
                      {formatPercentNoSign(sector.percentage)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${sector.percentage}%`, 
                          backgroundColor: sector.color,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-600 min-w-[60px] text-right">
                      {formatCurrencyShort(sector.amount)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {diversificationAnalysis && !diversificationLoading && (
        <div className="mt-8 space-y-6">
          <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/60 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-800">AI Analysis Summary</p>
                <p className="mt-1 text-sm text-indigo-700">{diversificationAnalysis.summary}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {diversificationAnalysis.strengths.length > 0 && (
              <div className="rounded-xl bg-emerald-50/50 border border-emerald-200/60 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-emerald-800">Strengths</span>
                </div>
                <ul className="space-y-2">
                  {diversificationAnalysis.strengths.map((strength, idx) => (
                    <li key={`strength-${idx}-${strength.slice(0, 20)}`} className="flex items-start gap-2 text-sm text-emerald-700">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {diversificationAnalysis.risks.length > 0 && (
              <div className="rounded-xl bg-amber-50/50 border border-amber-200/60 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm font-semibold text-amber-800">Risks</span>
                </div>
                <ul className="space-y-2">
                  {diversificationAnalysis.risks.map((risk, idx) => (
                    <li key={`risk-${idx}-${risk.slice(0, 20)}`} className="flex items-start gap-2 text-sm text-amber-700">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {diversificationAnalysis.suggestions.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-semibold text-slate-900">AI Recommendations</span>
              </div>
              <div className="space-y-3">
                {diversificationAnalysis.suggestions.map((suggestion, idx) => {
                  const priorityConfig = getPriorityConfig(suggestion.priority)
                  const suggestionKey = `suggestion-${idx}-${suggestion.sector}-${suggestion.action.slice(0, 15)}`
                  return (
                    <div 
                      key={suggestionKey} 
                      className="flex items-start gap-4 rounded-lg bg-slate-50 p-4 border border-slate-100"
                    >
                      <div className={`px-2.5 py-1 rounded-md text-xs font-semibold ${priorityConfig.bg} ${priorityConfig.text}`}>
                        {suggestion.priority}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">{suggestion.action}</span>
                          <span className="text-slate-600">{suggestion.sector}</span>
                          <span className="text-xs text-slate-500">
                            ({suggestion.currentPercentage.toFixed(1)}% → {suggestion.targetPercentage.toFixed(1)}%)
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{suggestion.reasoning}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {diversificationLoading && (
        <div className="mt-8 rounded-xl bg-slate-50 border border-slate-200 p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">AI Agent Analyzing Portfolio...</p>
              <p className="text-xs text-slate-500 mt-1">Evaluating diversification and generating recommendations</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const PortfolioPerformanceChart = ({ 
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

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full max-w-full">
        <defs>
          <linearGradient id="portfolioGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className="text-xs text-slate-500">
          {yAxisTicks.map((value, tickIndex) => {
            const y = scaleY(value)
            return (
              <g key={`y-axis-tick-${tickIndex}-${value}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" fill="#64748B">
                  {allValuesZero ? (value === 0 ? '$0' : '') : formatYAxisValue(value)}
                </text>
              </g>
            )
          })}
        </g>

        <g className="text-xs text-slate-500">
          {chartData
            .filter((_, index) => index % 2 === 0 || index === chartData.length - 1)
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
                  fill="#64748B"
                >
                  {point.date}
                </text>
              )
            })}
        </g>

        <path
          d={`${portfolioPath} L ${scaleX(chartData.length - 1)} ${chartHeight + padding.top} L ${padding.left} ${chartHeight + padding.top} Z`}
          fill="url(#portfolioGradient)"
        />

        <path
          d={portfolioPath}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d={sp500Path}
          fill="none"
          stroke="#94A3B8"
          strokeWidth="2"
          strokeDasharray="5,5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {chartData.map((point, index) => {
          const x = scaleX(index)
          const portfolioY = scaleY(point.portfolio)
          const sp500Y = scaleY(point.sp500)
          const pointKey = `chart-point-${index}-${point.date || `no-date-${index}`}`
          return (
            <g key={pointKey}>
              <circle cx={x} cy={portfolioY} r="3" fill="#3B82F6" />
              <circle cx={x} cy={sp500Y} r="3" fill="#94A3B8" />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export const Analytics = ({ onBackToPortfolio }: { onBackToPortfolio: () => void }) => {
  const { holdings, summary, loading: portfolioLoading, error: portfolioError } = usePortfolio()
  
  const holdingsHash = useMemo(() => {
    return JSON.stringify(holdings.map(h => ({ id: h.id, symbol: h.symbol, amountCad: h.amountCad })))
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
  const {
    performanceHistory,
    loading: historyLoading,
  } = usePerformanceHistory(6, holdingsHash)

  const loading = portfolioLoading || analyticsLoading
  const error = portfolioError || analyticsError

  if (loading && !summary) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-600">Loading analytics data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Error loading analytics data</p>
          <p className="mt-1 text-sm text-red-700">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-600">No analytics data available</div>
        </div>
      </div>
    )
  }

  const totalValue = summary.totalValueCad
  const totalGain = summary.totalGainCad
  const totalGainPct = summary.totalGainPct

  const annualDividendIncome = performance?.annualDividendIncome ?? 0
  const dividendYield = performance?.dividendYield ?? (annualDividendIncome / totalValue) * 100

  const stockCount = holdings.filter((h) => h.category === 'Stocks').length
  const etfCount = holdings.filter((h) => h.category === 'ETFs').length
  const cryptoCount = holdings.filter((h) => h.category === 'Crypto').length
  const totalHoldings = holdings.length

  const portfolioReturn = performanceHistory?.portfolioReturn ?? performance?.portfolioReturn ?? 0
  const sp500Return = performanceHistory?.sp500Return ?? performance?.sp500Return ?? 0
  const outperformance = performanceHistory?.outperformance ?? performance?.outperformance ?? portfolioReturn - sp500Return

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-slate-600">Total Portfolio Value</div>
          <div className="text-3xl font-bold text-slate-900">{formatCurrency(totalValue)}</div>
          <div className={`text-sm font-semibold ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalGain)} ({formatPercent(totalGainPct)})
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-slate-600">Annual Dividend Income</div>
          <div className="text-3xl font-bold text-slate-900">
            {formatCurrency(annualDividendIncome)}
          </div>
          <div className="text-sm font-medium text-slate-600">
            {dividendYield.toFixed(2)}% yield
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-slate-600">Number of Holdings</div>
          <div className="text-3xl font-bold text-slate-900">{totalHoldings}</div>
          <div className="text-sm font-medium text-slate-600">
            {stockCount} stocks, {etfCount} ETFs, {cryptoCount} crypto
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onBackToPortfolio}
        className="text-sm font-semibold text-slate-900 underline underline-offset-4 hover:text-slate-700 w-fit"
      >
        &lt; Back to Portfolio
      </button>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Portfolio Performance</h2>

        <div className="mb-6 flex flex-wrap items-center gap-6">
          <div className="text-sm text-slate-700">
            Your Portfolio: <span className={`font-semibold ${portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(portfolioReturn)}</span>
          </div>
          <div className="text-sm text-slate-700">
            S&P 500: <span className={`font-semibold ${sp500Return >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(sp500Return)}</span>
          </div>
          <div className="text-sm text-slate-700">
            Outperformance:{' '}
            <span className={`font-semibold ${outperformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(outperformance)}
            </span>
          </div>
        </div>

        <PortfolioPerformanceChart 
          dataPoints={performanceHistory?.dataPoints ?? []}
          loading={historyLoading}
        />

        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-8 bg-blue-500"></div>
            <span>Your Portfolio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-8 border-t-2 border-dashed border-slate-400"></div>
            <span>S&P 500</span>
          </div>
        </div>
      </div>

      <SectorAllocationChart 
        sectorAllocation={apiSectorAllocation} 
        diversificationAnalysis={sectorDiversification}
        diversificationLoading={sectorDiversificationLoading}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <RiskAnalytics 
          riskMetrics={riskMetrics} 
          marketSentiment={marketSentiment}
          marketSentimentLoading={marketSentimentLoading}
          marketSentimentRefreshing={marketSentimentRefreshing}
          onRefreshMarketSentiment={refetchMarketSentiment}
        />
        <PortfolioRebalancing 
          rebalancing={rebalancing} 
          rebalancingMetadata={rebalancingMetadata} 
          rebalancingLoading={rebalancingLoading}
          onRefreshRebalancing={refetchRebalancing}
          taxLossHarvesting={taxLossHarvesting} 
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PositionSizingAnalysis positionSizing={positionSizing} />
        <DividendIncomeTracker dividendIncome={dividendIncome} />
      </div>
    </div>
  )
}

const PositionSizingAnalysis = ({
  positionSizing,
}: {
  positionSizing: PositionSizingAnalysisType | null
}) => {
  if (!positionSizing) {
    return (
      <div className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Position Sizing Analysis</h2>
        <div className="text-sm text-slate-600">Loading position sizing data...</div>
      </div>
    )
  }

  const { top3Percentage, top5Percentage, concentrationLevel, topHoldings, warnings, guidelines } =
    positionSizing

  const getBarColor = (index: number) => {
    return index < 2 ? 'bg-yellow-500' : 'bg-blue-500'
  }

  const getConcentrationColor = () => {
    switch (concentrationLevel) {
      case 'High':
        return 'border-red-200 bg-red-50 text-red-800'
      case 'Moderate':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800'
      default:
        return 'border-green-200 bg-green-50 text-green-800'
    }
  }

  const getConcentrationMessage = () => {
    switch (concentrationLevel) {
      case 'High':
        return 'High Concentration Risk. Multiple positions exceed recommended thresholds. Consider rebalancing to reduce risk.'
      case 'Moderate':
        return 'Moderate Concentration. Some positions exceed recommended thresholds. Monitor closely and consider rebalancing.'
      default:
        return 'Healthy Concentration. Portfolio is well-diversified within recommended position sizing guidelines.'
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Position Sizing Analysis</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-600 mb-1">Top 3 Holdings</div>
          <div className="text-2xl font-bold text-slate-900">{top3Percentage.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">of portfolio</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-600 mb-1">Top 5 Holdings</div>
          <div className="text-2xl font-bold text-slate-900">{top5Percentage.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">of portfolio</div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Top Holdings</h3>
        <div className="flex flex-col gap-3">
          {topHoldings.map((holding, index) => {
            return (
              <div key={holding.symbol} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">#{index + 1}</span>
                  <span className="text-sm font-bold text-slate-900">{holding.symbol}</span>
                  {index < 2 && (
                    <svg
                      className="h-3 w-3 text-yellow-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-600">{holding.percentage.toFixed(1)}%</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrencyShort(holding.amountCad)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full ${getBarColor(index)} transition-all`}
                      style={{ width: `${Math.min(holding.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {(warnings.length > 0 || concentrationLevel !== 'Healthy') && (
        <div className={`rounded-md border p-4 ${getConcentrationColor()}`}>
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{getConcentrationMessage()}</p>
              {warnings.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-xs space-y-1">
                  {warnings.map((warning, idx) => (
                    <li key={`warning-${idx}-${warning.slice(0, 20).replace(/\s+/g, '-')}`}>{warning}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Position Sizing Guidelines</h3>
        <ul className="flex flex-col gap-2 text-xs text-slate-700">
          {guidelines.map((guideline, idx) => (
            <li key={`guideline-${idx}-${guideline.description.slice(0, 20)}`} className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>
                {guideline.description}
                {guideline.threshold !== null && ` (${guideline.threshold}% threshold)`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const DividendIncomeTracker = ({
  dividendIncome,
}: {
  dividendIncome: DividendIncomeData | null
}) => {
  if (!dividendIncome) {
    return (
      <div className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">$ Dividend Income Tracker</h2>
        <div className="text-sm text-slate-600">Loading dividend data...</div>
      </div>
    )
  }

  const {
    annualIncome,
    quarterlyIncome,
    monthlyIncome,
    portfolioYield,
    dividendHoldings,
    incomeProjectionText,
    investmentTipText,
  } = dividendIncome

  const hasDividendHoldings = dividendHoldings.length > 0

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">$ Dividend Income Tracker</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="text-xs font-medium text-green-600 mb-1">Annual</div>
          <div className="text-xl font-bold text-green-900">{formatCurrency(annualIncome)}</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="text-xs font-medium text-blue-600 mb-1">Quarterly</div>
          <div className="text-xl font-bold text-blue-900">{formatCurrency(quarterlyIncome)}</div>
        </div>
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="text-xs font-medium text-purple-600 mb-1">Monthly</div>
          <div className="text-xl font-bold text-purple-900">{formatCurrency(monthlyIncome)}</div>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="text-xs font-medium text-orange-600 mb-1">Portfolio Yield</div>
          <div className="text-xl font-bold text-orange-900">{portfolioYield.toFixed(2)}%</div>
        </div>
      </div>

      {hasDividendHoldings && (
        <div>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Dividend Paying Holdings</h3>
          <div className="flex flex-col gap-3">
            {dividendHoldings.map((holding) => (
              <div
                key={holding.symbol}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900">{holding.symbol}</div>
                  <div className="text-xs text-slate-600">{holding.name}</div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs font-medium text-slate-600">Yield</div>
                    <div className="text-sm font-semibold text-slate-900">{holding.dividendYield.toFixed(2)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-slate-600">Annual</div>
                    <div className="text-sm font-semibold text-slate-900">
                      {formatCurrency(holding.annualDividend)}/yr
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasDividendHoldings && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
          <p className="text-sm text-slate-600">
            No dividend-paying holdings in your portfolio. Consider adding dividend stocks or ETFs to generate passive income.
          </p>
        </div>
      )}

      {hasDividendHoldings && (
        <>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 flex-shrink-0 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <div>
                <div className="text-sm font-semibold text-blue-900 mb-1">5-Year Income Projection</div>
                <p className="text-xs text-blue-800">
                  {incomeProjectionText}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 flex-shrink-0 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div>
                <div className="text-sm font-semibold text-slate-900 mb-1">Tip</div>
                <p className="text-xs text-slate-700">
                  {investmentTipText}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

type RiskStatusType = 'Good' | 'Moderate' | 'Needs Attention'

const getRiskStatusStyle = (status: RiskStatusType) => {
  switch (status) {
    case 'Good':
      return 'bg-green-100 text-green-700'
    case 'Moderate':
      return 'bg-yellow-100 text-yellow-700'
    case 'Needs Attention':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

const getRiskAssessmentStyle = (status: RiskStatusType) => {
  switch (status) {
    case 'Good':
      return 'border-green-200 bg-green-50'
    case 'Moderate':
      return 'border-yellow-200 bg-yellow-50'
    case 'Needs Attention':
      return 'border-red-200 bg-red-50'
    default:
      return 'border-slate-200 bg-slate-50'
  }
}

const getRiskAssessmentIconColor = (status: RiskStatusType) => {
  switch (status) {
    case 'Good':
      return 'text-green-600'
    case 'Moderate':
      return 'text-yellow-600'
    case 'Needs Attention':
      return 'text-red-600'
    default:
      return 'text-slate-600'
  }
}

interface RiskMetricInfo {
  label: string
  value: string
  description: string
  tooltip: string
  valueInterpretation: string
  interpretationColor: string
}

const getSharpeInterpretation = (value: number | undefined): { text: string; color: string } => {
  if (value === undefined) return { text: 'Unable to calculate', color: 'text-slate-500' }
  if (value >= 2.0) return { text: 'Excellent risk-adjusted returns', color: 'text-green-600' }
  if (value >= 1.0) return { text: 'Good risk-adjusted returns', color: 'text-green-600' }
  if (value >= 0.5) return { text: 'Acceptable returns for risk taken', color: 'text-yellow-600' }
  return { text: 'Poor risk-adjusted performance', color: 'text-red-600' }
}

const getBetaInterpretation = (value: number): { text: string; color: string } => {
  if (value < 0.8) return { text: 'Conservative/defensive portfolio', color: 'text-blue-600' }
  if (value <= 1.2) return { text: 'Market-aligned risk exposure', color: 'text-green-600' }
  if (value <= 1.5) return { text: 'Above-market volatility', color: 'text-yellow-600' }
  return { text: 'High market sensitivity', color: 'text-red-600' }
}

const getVolatilityInterpretation = (value: number): { text: string; color: string } => {
  if (value < 15) return { text: 'Low volatility - stable portfolio', color: 'text-green-600' }
  if (value <= 25) return { text: 'Moderate volatility - balanced', color: 'text-yellow-600' }
  if (value <= 40) return { text: 'High volatility - elevated risk', color: 'text-orange-600' }
  return { text: 'Very high volatility - significant swings', color: 'text-red-600' }
}

const getVaRInterpretation = (value: number): { text: string; color: string } => {
  if (value > -2) return { text: 'Low daily risk exposure', color: 'text-green-600' }
  if (value > -4) return { text: 'Moderate daily risk', color: 'text-yellow-600' }
  if (value > -6) return { text: 'Elevated daily risk', color: 'text-orange-600' }
  return { text: 'High potential daily loss', color: 'text-red-600' }
}

const getDrawdownInterpretation = (value: number): { text: string; color: string } => {
  if (value > -10) return { text: 'Well-protected portfolio', color: 'text-green-600' }
  if (value > -20) return { text: 'Moderate drawdown risk', color: 'text-yellow-600' }
  if (value > -30) return { text: 'Significant drawdown exposure', color: 'text-orange-600' }
  return { text: 'High drawdown risk', color: 'text-red-600' }
}

const getInfoRatioInterpretation = (value: number | undefined): { text: string; color: string } => {
  if (value === undefined) return { text: 'Unable to calculate', color: 'text-slate-500' }
  if (value >= 1.0) return { text: 'Strong benchmark outperformance', color: 'text-green-600' }
  if (value >= 0.5) return { text: 'Moderate outperformance', color: 'text-green-600' }
  if (value >= 0) return { text: 'Slight outperformance', color: 'text-yellow-600' }
  return { text: 'Underperforming benchmark', color: 'text-red-600' }
}

const RiskMetricCard = ({ metric }: { metric: RiskMetricInfo }) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="group relative flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-md cursor-help"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-1.5">
        <div className="text-xs font-medium text-slate-600">{metric.label}</div>
        <svg
          className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="text-xl font-bold text-slate-900">{metric.value}</div>
      <div className="text-xs text-slate-500">{metric.description}</div>
      <div className={`text-xs font-medium mt-1 ${metric.interpretationColor}`}>
        {metric.valueInterpretation}
      </div>

      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 animate-in fade-in zoom-in-95 duration-200">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-start gap-2 mb-2">
              <svg className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{metric.label}</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{metric.tooltip}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-2 mt-2">
              <p className="text-xs text-slate-500">
                <span className="font-medium">Your value:</span> <span className="font-semibold text-slate-700">{metric.value}</span>
              </p>
              <p className={`text-xs font-medium mt-1 ${metric.interpretationColor}`}>
                → {metric.valueInterpretation}
              </p>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-3 h-3 bg-white border-r border-b border-slate-200 transform rotate-45 -mt-1.5"></div>
          </div>
        </div>
      )}
    </div>
  )
}

const RiskAnalytics = ({
  riskMetrics: apiRiskMetrics,
  marketSentiment,
  marketSentimentLoading,
  marketSentimentRefreshing,
  onRefreshMarketSentiment,
}: {
  riskMetrics: {
    portfolioBeta: number
    volatility: number
    valueAtRisk: number
    maxDrawdown: number
    sharpeRatio?: number
    informationRatio?: number
    riskStatus?: RiskStatusType
    riskAssessment?: string
  } | null
  marketSentiment: MarketSentiment | null
  marketSentimentLoading: boolean
  marketSentimentRefreshing: boolean
  onRefreshMarketSentiment: () => Promise<void>
}) => {
  const riskStatus: RiskStatusType = apiRiskMetrics?.riskStatus ?? 'Moderate'
  const riskAssessment = apiRiskMetrics?.riskAssessment

  const sharpeInterp = getSharpeInterpretation(apiRiskMetrics?.sharpeRatio)
  const betaInterp = getBetaInterpretation(apiRiskMetrics?.portfolioBeta ?? 1)
  const volInterp = getVolatilityInterpretation(apiRiskMetrics?.volatility ?? 20)
  const varInterp = getVaRInterpretation(apiRiskMetrics?.valueAtRisk ?? -3)
  const ddInterp = getDrawdownInterpretation(apiRiskMetrics?.maxDrawdown ?? -15)
  const infoInterp = getInfoRatioInterpretation(apiRiskMetrics?.informationRatio)

  const riskMetrics: RiskMetricInfo[] = apiRiskMetrics
    ? [
        {
          label: 'Sharpe Ratio',
          value: apiRiskMetrics.sharpeRatio?.toFixed(2) ?? 'N/A',
          description: 'Risk-adjusted return',
          tooltip: 'Measures excess return per unit of risk. Calculated as (Portfolio Return - Risk-Free Rate) / Portfolio Volatility. Higher values indicate better risk-adjusted performance. Above 1.0 is considered good, above 2.0 is excellent.',
          valueInterpretation: sharpeInterp.text,
          interpretationColor: sharpeInterp.color,
        },
        {
          label: 'Portfolio Beta',
          value: apiRiskMetrics.portfolioBeta.toFixed(2),
          description: 'vs Market',
          tooltip: 'Measures portfolio sensitivity to market movements. Beta of 1.0 means your portfolio moves with the market. Below 1.0 is less volatile than the market (defensive), above 1.0 is more volatile (aggressive).',
          valueInterpretation: betaInterp.text,
          interpretationColor: betaInterp.color,
        },
        {
          label: 'Volatility',
          value: `${apiRiskMetrics.volatility.toFixed(1)}%`,
          description: 'Annual std dev',
          tooltip: 'Annualized standard deviation of portfolio returns, measuring how much returns deviate from the average. Lower volatility means more predictable returns. S&P 500 typically has ~15% annual volatility.',
          valueInterpretation: volInterp.text,
          interpretationColor: volInterp.color,
        },
        {
          label: 'Value at Risk',
          value: `${apiRiskMetrics.valueAtRisk.toFixed(1)}%`,
          description: '95% confidence, 1-day',
          tooltip: 'Maximum expected loss in one day with 95% confidence. For example, -4.2% means there\'s only a 5% chance of losing more than 4.2% of your portfolio value in a single day under normal market conditions.',
          valueInterpretation: varInterp.text,
          interpretationColor: varInterp.color,
        },
        {
          label: 'Max Drawdown',
          value: `${apiRiskMetrics.maxDrawdown.toFixed(1)}%`,
          description: 'Peak to trough',
          tooltip: 'Largest potential decline from a portfolio peak to subsequent trough. Represents the worst-case historical loss you could experience. Lower (closer to 0%) indicates better downside protection.',
          valueInterpretation: ddInterp.text,
          interpretationColor: ddInterp.color,
        },
        {
          label: 'Information Ratio',
          value: apiRiskMetrics.informationRatio?.toFixed(2) ?? 'N/A',
          description: 'vs Benchmark',
          tooltip: 'Measures portfolio\'s excess return over a benchmark (S&P 500) relative to tracking error. Higher values indicate consistent outperformance. Above 0.5 is good, above 1.0 is excellent active management.',
          valueInterpretation: infoInterp.text,
          interpretationColor: infoInterp.color,
        },
      ]
    : []

  const fearGreedValue = marketSentiment?.fearGreedValue ?? 50
  const fearGreedLabel = marketSentiment?.fearGreedLabel ?? 'Neutral'
  const vixValue = marketSentiment?.vixValue ?? 14.2
  const vixStatus = marketSentiment?.vixStatus ?? 'Low volatility'
  const putCallRatio = marketSentiment?.putCallRatio ?? 0.78
  const putCallStatus = marketSentiment?.putCallStatus ?? 'Bullish'
  const marketBreadth = marketSentiment?.marketBreadth ?? 62.5
  const marketBreadthStatus = marketSentiment?.marketBreadthStatus ?? 'Above 200-day MA'
  const sentimentAlerts = marketSentiment?.alerts ?? []

  const getVixStatusColor = (status: string) => {
    switch (status) {
      case 'Low volatility':
        return 'text-green-600'
      case 'Moderate volatility':
        return 'text-yellow-600'
      case 'High volatility':
        return 'text-orange-600'
      case 'Extreme volatility':
        return 'text-red-600'
      default:
        return 'text-slate-600'
    }
  }

  const getPutCallStatusColor = (status: string) => {
    switch (status) {
      case 'Bullish':
        return 'text-green-600'
      case 'Neutral':
        return 'text-yellow-600'
      case 'Bearish':
        return 'text-red-600'
      default:
        return 'text-slate-600'
    }
  }

  const getMarketBreadthStatusColor = (status: string) => {
    switch (status) {
      case 'Above 200-day MA':
        return 'text-green-600'
      case 'Near 200-day MA':
        return 'text-yellow-600'
      case 'Below 200-day MA':
        return 'text-red-600'
      default:
        return 'text-slate-600'
    }
  }

  const getAlertStyles = (severity: AlertSeverityType) => {
    switch (severity) {
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          text: 'text-blue-800',
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
          text: 'text-yellow-800',
        }
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          text: 'text-red-800',
        }
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          icon: 'text-slate-600',
          text: 'text-slate-800',
        }
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Risk Analytics</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskStatusStyle(riskStatus)}`}>
          {riskStatus}
        </span>
      </div>

      {riskAssessment && (
        <div className={`rounded-md border p-4 ${getRiskAssessmentStyle(riskStatus)}`}>
          <div className="flex items-start gap-3">
            <svg
              className={`h-5 w-5 flex-shrink-0 ${getRiskAssessmentIconColor(riskStatus)}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {riskStatus === 'Good' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : riskStatus === 'Needs Attention' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <div>
              <p className="text-sm font-medium text-slate-800">AI Risk Assessment</p>
              <p className="mt-1 text-sm text-slate-600">{riskAssessment}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Key Metrics</h3>
          <span className="text-xs text-slate-400">(hover for details)</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {riskMetrics.map((metric) => (
            <RiskMetricCard key={metric.label} metric={metric} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Market Sentiment</h3>
          <button
            onClick={onRefreshMarketSentiment}
            disabled={marketSentimentRefreshing || marketSentimentLoading}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            title="Refresh to get latest VIX data"
          >
            <svg
              className={`h-3.5 w-3.5 ${marketSentimentRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {marketSentimentRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {marketSentimentLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-slate-500">Loading market sentiment...</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Fear & Greed Index</span>
                <span className="text-sm font-semibold text-slate-900">{fearGreedValue}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full transition-all ${
                    fearGreedValue <= 25
                      ? 'bg-red-500'
                      : fearGreedValue <= 45
                        ? 'bg-orange-500'
                        : fearGreedValue <= 55
                          ? 'bg-yellow-500'
                          : fearGreedValue <= 75
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                  }`}
                  style={{ width: `${fearGreedValue}%` }}
                ></div>
              </div>
              <div className="mt-1 text-xs text-slate-600">{fearGreedLabel}</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-slate-600">VIX</div>
                <div className="text-lg font-bold text-slate-900">{vixValue.toFixed(1)}</div>
                <div className={`text-xs ${getVixStatusColor(vixStatus)}`}>{vixStatus}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-slate-600">Put/Call Ratio</div>
                <div className="text-lg font-bold text-slate-900">{putCallRatio.toFixed(2)}</div>
                <div className={`text-xs ${getPutCallStatusColor(putCallStatus)}`}>{putCallStatus}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-slate-600">Market Breadth</div>
                <div className="text-lg font-bold text-slate-900">{marketBreadth.toFixed(1)}%</div>
                <div className={`text-xs ${getMarketBreadthStatusColor(marketBreadthStatus)}`}>{marketBreadthStatus}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {sentimentAlerts.length > 0 && (
        <div className="flex flex-col gap-3">
          {sentimentAlerts.map((alert, index) => {
            const styles = getAlertStyles(alert.severity)
            const alertKey = `${index}-${alert.severity}-${alert.message.slice(0, 20).replace(/\s+/g, '-')}`
            return (
              <div key={alertKey} className={`rounded-md border ${styles.border} ${styles.bg} p-4`}>
                <div className="flex items-start gap-3">
                  <svg
                    className={`h-5 w-5 flex-shrink-0 ${styles.icon}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {alert.severity === 'info' ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    )}
                  </svg>
                  <p className={`text-sm font-medium ${styles.text}`}>
                    {alert.message}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const PortfolioRebalancing = ({
  rebalancing,
  rebalancingMetadata,
  rebalancingLoading,
  onRefreshRebalancing,
  taxLossHarvesting,
}: {
  rebalancing: Array<{
    symbol: string
    name: string
    currentAllocation: number
    targetAllocation: number
    action: 'Buy' | 'Sell'
    amount: number
    reason: string
    risk: 'Low' | 'Medium' | 'High'
  }>
  rebalancingMetadata: {
    iterationCount: number
    evaluationScore: number
    improvementsMade: string[]
    evaluationPassed: boolean
  } | null
  rebalancingLoading: boolean
  onRefreshRebalancing: () => Promise<void>
  taxLossHarvesting: Array<{
    symbol: string
    name: string
    unrealizedLoss: number
    taxSavings: number
    replacementOptions: Array<{ symbol: string; name: string; reason: string }>
    washSaleRisk: 'Low' | 'Medium' | 'High'
    currentValue: number
    lossPercentage: number
  }>
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefreshRebalancing = async () => {
    setIsRefreshing(true)
    try {
      await onRefreshRebalancing()
    } finally {
      setIsRefreshing(false)
    }
  }
  const recommendations = rebalancing

  const totalSuggestedTrades = recommendations.reduce(
    (sum, rec) => sum + Math.abs(rec.amount),
    0,
  )
  const actionsRequired = recommendations.length

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High':
        return 'bg-red-100 text-red-700'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700'
      case 'Low':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Portfolio Rebalancing</h2>
            <p className="text-sm text-slate-600">
              AI-powered recommendations to optimize your portfolio allocation
            </p>
          </div>
          {rebalancingMetadata && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5">
              <div className="text-right">
                <div className="text-xs font-medium text-slate-600">AI Quality Score</div>
                <div className={`text-sm font-bold ${
                  rebalancingMetadata.evaluationPassed 
                    ? 'text-green-600' 
                    : rebalancingMetadata.evaluationScore >= 60 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
                }`}>
                  {rebalancingMetadata.evaluationScore}%
                </div>
              </div>
              <div className="h-8 w-px bg-slate-300"></div>
              <div className="text-right">
                <div className="text-xs font-medium text-slate-600">Iterations</div>
                <div className="text-sm font-semibold text-slate-900">
                  {rebalancingMetadata.iterationCount}
                </div>
              </div>
              {rebalancingMetadata.evaluationPassed && (
                <div className="ml-1 rounded-full bg-green-500 p-1">
                  <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-blue-600">Total Suggested Trades</div>
            <div className="text-2xl font-bold text-blue-900">{formatCurrency(totalSuggestedTrades)}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-blue-600">Actions Required</div>
            <div className="text-2xl font-bold text-blue-900">{actionsRequired}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {recommendations.map((rec) => (
          <div
            key={rec.symbol}
            className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{rec.symbol}</span>
                  <span className="text-xs text-slate-600">{rec.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getRiskColor(rec.risk)}`}
                  >
                    {rec.risk}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Current allocation</span>
                  <span className="font-semibold text-slate-900">
                    {rec.currentAllocation.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-teal-500 transition-all"
                    style={{ width: `${Math.min(rec.currentAllocation, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Target allocation</span>
                  <span className="font-semibold text-slate-900">
                    {rec.targetAllocation.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-teal-500 transition-all"
                    style={{ width: `${Math.min(rec.targetAllocation, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-600">Action</div>
                <div
                  className={`text-sm font-semibold ${
                    rec.action === 'Sell' ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {rec.action} {formatCurrency(rec.amount)}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-600">Reason</div>
              <p className="text-xs leading-relaxed text-slate-700">{rec.reason}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Tax Loss Harvesting Opportunities</h3>
        {taxLossHarvesting.length === 0 ? (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm text-slate-600">
              No tax loss harvesting opportunities found. All holdings are currently at a gain or break-even.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {taxLossHarvesting.map((opportunity) => {
              const getWashSaleRiskColor = (risk: string) => {
                switch (risk) {
                  case 'High':
                    return 'text-red-600'
                  case 'Medium':
                    return 'text-yellow-600'
                  case 'Low':
                    return 'text-green-600'
                  default:
                    return 'text-slate-600'
                }
              }

              const replacementText =
                opportunity.replacementOptions.length > 0
                  ? opportunity.replacementOptions
                      .map(
                        (opt) =>
                          `${opt.symbol} (${opt.name})${opt.reason ? ` - ${opt.reason}` : ''}`,
                      )
                      .join(' or ')
                  : 'No replacement options available'

              return (
                <div
                  key={opportunity.symbol}
                  className="rounded-lg bg-green-50 border border-green-200 p-4"
                >
                  <div className="mb-3">
                    <div className="text-sm font-bold text-slate-900">{opportunity.symbol}</div>
                    <div className="text-xs text-slate-600">{opportunity.name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-slate-600 mb-1">Unrealized Loss</div>
                      <div className="text-sm font-semibold text-red-600">
                        {formatCurrency(opportunity.unrealizedLoss)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {opportunity.lossPercentage.toFixed(1)}% loss
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-slate-600 mb-1">Tax Savings</div>
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(opportunity.taxSavings)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Current value: {formatCurrencyShort(opportunity.currentValue)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-slate-600 mb-1">Replacement</div>
                      <p className="text-xs text-slate-700">{replacementText}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-slate-600 mb-1">Wash Sale Risk</div>
                      <div
                        className={`text-xs font-semibold ${getWashSaleRiskColor(opportunity.washSaleRisk)}`}
                      >
                        {opportunity.washSaleRisk}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleRefreshRebalancing}
        disabled={isRefreshing || rebalancingLoading}
        className="w-full rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {(isRefreshing || rebalancingLoading) ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Regenerating Recommendations...
          </>
        ) : (
          'Regenerate Rebalancing Plan'
        )}
      </button>
    </div>
  )
}
