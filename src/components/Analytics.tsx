import { useMemo } from 'react'
import { portfolioSummary, holdings } from '../data/mockPortfolioData'

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

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-CA').format(value)
}

type SectorData = {
  name: string
  amount: number
  percentage: number
  color: string
}

const SectorAllocationChart = () => {
  const sectorData = useMemo(() => {
    const sectorMap: Record<string, number> = {}

    holdings.forEach((holding) => {
      let sector: string
      if (holding.tag === 'Technology') {
        sector = 'Technology'
      } else if (holding.tag === 'Index Fund' || holding.tag === 'Technology ETF') {
        sector = 'Index'
      } else if (holding.tag === 'Cryptocurrency') {
        sector = 'Cryptocurrency'
      } else if (holding.tag === 'Consumer') {
        sector = 'Financial'
      } else if (holding.tag === 'Automotive') {
        sector = 'Automotive'
      } else {
        sector = 'Other'
      }

      sectorMap[sector] = (sectorMap[sector] || 0) + holding.amountCad
    })

    const total = Object.values(sectorMap).reduce((sum, val) => sum + val, 0)

    const sectorConfigs = [
      { name: 'Technology', displayName: 'Technology', color: '#3B82F6' },
      { name: 'Index', displayName: 'Index Fund', color: '#10B981' },
      { name: 'Cryptocurrency', displayName: 'Cryptocurrency', color: '#F97316' },
      { name: 'Financial', displayName: 'Financial', color: '#A855F7' },
      { name: 'Automotive', displayName: 'Automotive', color: '#EF4444' },
    ]

    const sectors: SectorData[] = sectorConfigs
      .map((config) => ({
        name: config.displayName,
        amount: sectorMap[config.name] || 0,
        percentage: sectorMap[config.name] ? (sectorMap[config.name] / total) * 100 : 0,
        color: config.color,
      }))
      .filter((sector) => sector.amount > 0)
      .sort((a, b) => b.amount - a.amount)

    return sectors
  }, [])

  const total = sectorData.reduce((sum, sector) => sum + sector.amount, 0)
  const technologyPercentage = sectorData.find((s) => s.name === 'Technology')?.percentage || 0

  const radius = 120
  const centerX = 150
  const centerY = 150

  const createArc = (startAngle: number, endAngle: number, largeArc: boolean) => {
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    const x1 = centerX + radius * Math.cos(startRad)
    const y1 = centerY + radius * Math.sin(startRad)
    const x2 = centerX + radius * Math.cos(endRad)
    const y2 = centerY + radius * Math.sin(endRad)
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc ? 1 : 0} 1 ${x2} ${y2} Z`
  }

  const getLabelPosition = (angle: number, percentage: number) => {
    const midAngle = angle + (percentage / 100) * 360 * 0.5
    const labelRadius = radius * 0.7
    const rad = (midAngle * Math.PI) / 180
    return {
      x: centerX + labelRadius * Math.cos(rad),
      y: centerY + labelRadius * Math.sin(rad),
    }
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

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-slate-900">Sector Allocation</h2>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex-shrink-0">
          <svg width={300} height={300} viewBox="0 0 300 300" className="mx-auto">
            {sectorsWithAngles.map((sector) => {
              const largeArc = sector.sectorAngle > 180 ? 1 : 0
              const labelPos = getLabelPosition(sector.startAngle, sector.percentage)
              const path = createArc(sector.startAngle, sector.endAngle, largeArc === 1)

              return (
                <g key={sector.name}>
                  <path
                    d={path}
                    fill={sector.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                  {sector.percentage >= 3 && (
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white text-xs font-semibold"
                      style={{ fontSize: '11px' }}
                    >
                      {sector.name} {formatPercentNoSign(sector.percentage)}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        <div className="flex-1">
          <div className="flex flex-col gap-3">
            {sectorData.map((sector) => (
              <div key={sector.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: sector.color }}
                  ></div>
                  <span className="text-sm font-medium text-slate-900">{sector.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-700">
                    {formatPercentNoSign(sector.percentage)}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {formatCurrencyShort(sector.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {technologyPercentage > 40 && (
        <div className="mt-6 rounded-md bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm font-medium text-yellow-800">
            Concentration Risk: Technology represents over 40% of your portfolio. Consider
            diversifying to reduce sector-specific risk.
          </p>
        </div>
      )}
    </div>
  )
}

const PortfolioPerformanceChart = () => {
  const chartData = [
    { date: 'Jun 30', portfolio: 9.0, sp500: 8.95 },
    { date: 'Jul 14', portfolio: 8.85, sp500: 8.9 },
    { date: 'Jul 31', portfolio: 9.1, sp500: 9.0 },
    { date: 'Aug 14', portfolio: 9.35, sp500: 9.15 },
    { date: 'Aug 31', portfolio: 9.6, sp500: 9.3 },
    { date: 'Sep 14', portfolio: 9.8, sp500: 9.45 },
    { date: 'Sep 30', portfolio: 10.0, sp500: 9.6 },
    { date: 'Oct 14', portfolio: 10.3, sp500: 9.75 },
    { date: 'Oct 31', portfolio: 10.6, sp500: 9.95 },
    { date: 'Nov 14', portfolio: 10.9, sp500: 10.15 },
    { date: 'Nov 30', portfolio: 11.3, sp500: 10.35 },
    { date: 'Dec 14', portfolio: 11.6, sp500: 10.5 },
    { date: 'Dec 29', portfolio: 11.85, sp500: 10.5 },
  ]

  const width = 800
  const height = 300
  const padding = { top: 20, right: 40, bottom: 40, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const minValue = 8.5
  const maxValue = 12.0
  const valueRange = maxValue - minValue

  const scaleX = (index: number) => {
    return padding.left + (index / (chartData.length - 1)) * chartWidth
  }

  const scaleY = (value: number) => {
    return padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight
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
          {[0, 3, 6, 9, 12].map((value) => {
            const y = scaleY(value)
            return (
              <g key={value}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" fill="#64748B">
                  ${value.toFixed(1)}M
                </text>
              </g>
            )
          })}
        </g>

        <g className="text-xs text-slate-500">
          {chartData
            .filter((_, index) => index % 2 === 0)
            .map((point, idx) => {
              const originalIndex = chartData.findIndex((p) => p.date === point.date)
              const x = scaleX(originalIndex)
              return (
                <text
                  key={point.date}
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
          return (
            <g key={index}>
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
  const totalValue = portfolioSummary.totalValueCad
  const totalGain = portfolioSummary.totalGainCad
  const totalGainPct = portfolioSummary.totalGainPct

  const annualDividendIncome = 76_728
  const dividendYield = (annualDividendIncome / totalValue) * 100

  const stockCount = holdings.filter((h) => h.category === 'Stocks').length
  const etfCount = holdings.filter((h) => h.category === 'ETFs').length
  const cryptoCount = holdings.filter((h) => h.category === 'Crypto').length
  const totalHoldings = holdings.length

  const portfolioReturn = 20.87
  const sp500Return = 14.51
  const outperformance = portfolioReturn - sp500Return

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-slate-600">Total Portfolio Value</div>
          <div className="text-3xl font-bold text-slate-900">{formatCurrency(totalValue)}</div>
          <div className="text-sm font-semibold text-green-600">
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
            Your Portfolio: <span className="font-semibold text-green-600">{formatPercent(portfolioReturn)}</span>
          </div>
          <div className="text-sm text-slate-700">
            S&P 500: <span className="font-semibold text-slate-900">{formatPercent(sp500Return)}</span>
          </div>
          <div className="text-sm text-slate-700">
            Outperformance:{' '}
            <span className="font-semibold text-green-600">{formatPercent(outperformance)}</span>
          </div>
        </div>

        <PortfolioPerformanceChart />

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

      <SectorAllocationChart />

      <div className="grid gap-6 lg:grid-cols-2">
        <RiskAnalytics />
        <PortfolioRebalancing />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PositionSizingAnalysis />
        <DividendIncomeTracker />
      </div>
    </div>
  )
}

const PositionSizingAnalysis = () => {
  const totalValue = portfolioSummary.totalValueCad
  const sortedHoldings = [...holdings].sort((a, b) => b.amountCad - a.amountCad)
  const topHoldings = sortedHoldings.slice(0, 5)

  const top3Percentage = topHoldings.slice(0, 3).reduce((sum, h) => sum + (h.amountCad / totalValue) * 100, 0)
  const top5Percentage = topHoldings.reduce((sum, h) => sum + (h.amountCad / totalValue) * 100, 0)

  const hasHighConcentration = topHoldings.some((h) => (h.amountCad / totalValue) * 100 > 15)

  const getBarColor = (index: number) => {
    return index < 2 ? 'bg-yellow-500' : 'bg-blue-500'
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
            const percentage = (holding.amountCad / totalValue) * 100
            return (
              <div key={holding.id} className="flex items-center gap-3">
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
                    <span className="text-slate-600">{percentage.toFixed(1)}%</span>
                    <span className="font-semibold text-slate-900">{formatCurrencyShort(holding.amountCad)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full ${getBarColor(index)} transition-all`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {hasHighConcentration && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-yellow-600"
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
            <p className="text-sm font-medium text-yellow-800">
              Moderate Concentration. Some positions exceed 15% of portfolio. Monitor closely and
              consider rebalancing.
            </p>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Position Sizing Guidelines</h3>
        <ul className="flex flex-col gap-2 text-xs text-slate-700">
          <li className="flex items-start gap-2">
            <span className="mt-0.5">•</span>
            <span>Individual stocks: 5-10% maximum per position</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">•</span>
            <span>ETFs/Index Funds: 10-25% per position acceptable</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">•</span>
            <span>Sector concentration: No sector should exceed 30-35%</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">•</span>
            <span>Top 5 holdings: Should not exceed 50% of total portfolio</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

type DividendHolding = {
  symbol: string
  name: string
  yield: number
  annualDividend: number
}

const DividendIncomeTracker = () => {
  const annualDividendIncome = 76_728
  const quarterlyDividend = annualDividendIncome / 4
  const monthlyDividend = annualDividendIncome / 12
  const totalValue = portfolioSummary.totalValueCad
  const portfolioYield = (annualDividendIncome / totalValue) * 100

  const dividendHoldings: DividendHolding[] = [
    { symbol: 'JPM', name: 'JPMorgan Chase', yield: 2.35, annualDividend: 16_920 },
    { symbol: 'VTI', name: 'Vanguard Total Stock', yield: 1.52, annualDividend: 13_528 },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', yield: 1.35, annualDividend: 28_350 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', yield: 0.75, annualDividend: 10_875 },
    { symbol: 'AAPL', name: 'Apple Inc.', yield: 0.52, annualDividend: 6_500 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', yield: 0.03, annualDividend: 555 },
  ]

  const fiveYearProjection = annualDividendIncome * Math.pow(1.05, 5)
  const monthlyReinvestment = monthlyDividend
  const monthlyRate = 0.08 / 12
  const months = 60
  const reinvestmentGrowth = Math.round(monthlyReinvestment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate))

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">$ Dividend Income Tracker</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="text-xs font-medium text-green-600 mb-1">Annual</div>
          <div className="text-xl font-bold text-green-900">{formatCurrency(annualDividendIncome)}</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="text-xs font-medium text-blue-600 mb-1">Quarterly</div>
          <div className="text-xl font-bold text-blue-900">{formatCurrency(quarterlyDividend)}</div>
        </div>
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="text-xs font-medium text-purple-600 mb-1">Monthly</div>
          <div className="text-xl font-bold text-purple-900">{formatCurrency(monthlyDividend)}</div>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="text-xs font-medium text-orange-600 mb-1">Portfolio Yield</div>
          <div className="text-xl font-bold text-orange-900">{portfolioYield.toFixed(2)}%</div>
        </div>
      </div>

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
                  <div className="text-sm font-semibold text-slate-900">{holding.yield.toFixed(2)}%</div>
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
              Assuming 5% annual dividend growth, your dividend income could grow to approximately{' '}
              {formatCurrency(fiveYearProjection)} per year.
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
              Reinvesting dividends can compound returns. {formatCurrency(monthlyReinvestment)}/month
              reinvested at 8% could add {formatCurrency(reinvestmentGrowth)} over 5 years.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const RiskAnalytics = () => {
  const riskMetrics = [
    { label: 'Sharpe Ratio', value: '1.85', description: 'Risk-adjusted return' },
    { label: 'Portfolio Beta', value: '1.23', description: 'vs Market' },
    { label: 'Volatility', value: '28.3%', description: 'Annual std dev' },
    { label: 'Value at Risk', value: '-4.2%', description: '95% confidence, 1-day' },
    { label: 'Max Drawdown', value: '-12.4%', description: 'Peak to trough' },
    { label: 'Information Ratio', value: '1.42', description: 'vs Benchmark' },
  ]

  const fearGreedValue = 68
  const fearGreedLabel = 'Greed'

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Risk Analytics</h2>
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          Good
        </span>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Key Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          {riskMetrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="text-xs font-medium text-slate-600">{metric.label}</div>
              <div className="text-xl font-bold text-slate-900">{metric.value}</div>
              <div className="text-xs text-slate-500">{metric.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Market Sentiment</h3>
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Fear & Greed Index</span>
              <span className="text-sm font-semibold text-slate-900">{fearGreedValue}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-orange-500 transition-all"
                style={{ width: `${fearGreedValue}%` }}
              ></div>
            </div>
            <div className="mt-1 text-xs text-slate-600">{fearGreedLabel}</div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-medium text-slate-600">VIX</div>
              <div className="text-lg font-bold text-slate-900">14.2</div>
              <div className="text-xs text-green-600">Low volatility</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs font-medium text-slate-600">Put/Call Ratio</div>
              <div className="text-lg font-bold text-slate-900">0.78</div>
              <div className="text-xs text-green-600">Bullish</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs font-medium text-slate-600">Market Breadth</div>
              <div className="text-lg font-bold text-slate-900">62.5%</div>
              <div className="text-xs text-green-600">Above 200-day MA</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 flex-shrink-0 text-yellow-600"
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
          <p className="text-sm font-medium text-yellow-800">
            Portfolio volatility is elevated. Consider rebalancing to reduce risk exposure.
          </p>
        </div>
      </div>
    </div>
  )
}

type RebalancingRecommendation = {
  symbol: string
  name: string
  currentAllocation: number
  targetAllocation: number
  action: string
  amount: number
  reason: string
  risk: 'Low' | 'Medium' | 'High'
}

const PortfolioRebalancing = () => {
  const recommendations: RebalancingRecommendation[] = [
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      currentAllocation: 17.0,
      targetAllocation: 12.0,
      action: 'Sell',
      amount: -556_000,
      reason:
        'Overweight position due to strong performance. Reduce to manage concentration risk and lock in gains. Tech sector at 51% vs 40% target.',
      risk: 'High',
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      currentAllocation: 6.9,
      targetAllocation: 4.0,
      action: 'Sell',
      amount: -315_000,
      reason:
        'Underperforming with -5.7% loss. High volatility (58.3%) and beta (2.01) adding portfolio risk. Consider tax loss harvesting.',
      risk: 'High',
    },
    {
      symbol: 'JPM',
      name: 'JPMorgan Chase',
      currentAllocation: 6.6,
      targetAllocation: 10.0,
      action: 'Buy',
      amount: 380_000,
      reason:
        'Underweight in financial sector. Strong fundamentals and dividend yield. Add to diversify away from tech concentration.',
      risk: 'Medium',
    },
    {
      symbol: 'SPY',
      name: 'SPDR S&P 500 ETF',
      currentAllocation: 18.9,
      targetAllocation: 20.0,
      action: 'Buy',
      amount: 123_000,
      reason: 'Slight underweight. Increase exposure to broad market for better diversification.',
      risk: 'Low',
    },
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      currentAllocation: 7.6,
      targetAllocation: 8.0,
      action: 'Buy',
      amount: 44_000,
      reason: 'Slight underweight. Maintain crypto allocation for portfolio diversification.',
      risk: 'Medium',
    },
  ]

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
        <h2 className="text-lg font-semibold text-slate-900">Portfolio Rebalancing</h2>
        <p className="text-sm text-slate-600">
          AI-powered recommendations to optimize your portfolio allocation
        </p>
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
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <div className="mb-3">
            <div className="text-sm font-bold text-slate-900">TSLA</div>
            <div className="text-xs text-slate-600">Tesla Inc.</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">Unrealized Loss</div>
              <div className="text-sm font-semibold text-red-600">$-45,000</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-slate-600 mb-1">Tax Savings</div>
              <div className="text-sm font-semibold text-green-600">$13,500</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">Replacement</div>
              <p className="text-xs text-slate-700">
                <span className="font-semibold">F</span> (Ford) or <span className="font-semibold">RIVN</span> (Rivian) - Similar EV exposure
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-slate-600 mb-1">Wash Sale Risk</div>
              <div className="text-xs font-semibold text-green-600">Low</div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="w-full rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
      >
        Execute Rebalancing Plan
      </button>
    </div>
  )
}
