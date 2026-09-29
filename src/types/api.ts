export type HoldingCategory = 'Stocks' | 'ETFs' | 'Crypto' | 'Sector'

export type MarketPeriodType = 'MORNING' | 'MIDDAY' | 'CLOSING'
export type StockPeriodType = 'Daily Brief' | 'Weekly Brief'
export type TrendPeriodType = 'This Year' | 'This Month' | 'This week' | 'Today' | 'Short Future' | 'Long Future'
export type RecommendationType = 'Buy' | 'Sell' | 'Hold'
export type SentimentType = 'Bullish' | 'Bearish' | 'Neutral'
export type RiskLevelType = 'Low' | 'Medium' | 'High'
export type ActionType = 'Buy' | 'Sell'

export interface PortfolioHolding {
  id: string
  symbol: string
  name: string
  category: HoldingCategory
  amountCad: number
  changePct: number
  lastActivity: string
  notes: string
  tag: string
}

export interface PortfolioSummary {
  totalValueCad: number
  totalGainCad: number
  totalGainPct: number
}

export interface SectorAllocation {
  name: string
  amount: number
  percentage: number
  color?: string
}

export interface StockInsight {
  period: StockPeriodType
  text: string
}

export interface MarketInsight {
  period: MarketPeriodType
  text: string
}

export interface TrendAnalysis {
  period: TrendPeriodType
  recommendation: RecommendationType
  quickInsight: string
  reasoning: string
  keyMetrics: Record<string, string | number | undefined>
}

export interface OptionLeg {
  legType: string
  optionType: string
  strikePrice: number
  expiration: string
  premium: number
  quantity: number
  delta?: number
  iv?: number
}

export interface OptionStrategy {
  name: string
  sentiment: SentimentType
  expirationDate: string
  daysToExpiration: number
  riskLevel: RiskLevelType
  strikePrice: number
  premium: number
  breakEven: number
  currentPrice: number
  maxProfit: number | string
  maxLoss: number | string
  delta: number
  iv: number
  description: string
  
  // Enhanced fields - all optional
  strategyType?: string
  strategyCategory?: string
  riskType?: string
  ticker?: string
  legs?: OptionLeg[]
  
  // Additional strikes for spreads
  strikePriceLower?: number
  strikePriceUpper?: number
  
  // Break-even for multi-leg
  breakEvenLower?: number
  breakEvenUpper?: number
  
  // Probability and expected value
  probabilityOfProfit?: number
  expectedValue?: number
  riskRewardRatio?: string
  capitalRequired?: number
  returnOnCapital?: number
  
  // Extended Greeks
  gamma?: number
  theta?: number
  vega?: number
  ivRank?: number
  
  // Management guidance
  profitTarget?: string
  stopLoss?: string
  managementNotes?: string
  adjustmentPlan?: string
  idealConditions?: string
}

export interface StockDetail {
  symbol: string
  currency?: string
  price: number
  change: number
  changePct: number
  priceCad: number
  changeCad: number
  insights: StockInsight[]
  recommendation: RecommendationType
  longTermBias: RecommendationType
  trendAnalyses: TrendAnalysis[]
  optionStrategies?: OptionStrategy[]
}

export interface PerformanceMetrics {
  portfolioReturn: number
  sp500Return: number
  outperformance: number
  sharpeRatio?: number
  annualDividendIncome?: number
  dividendYield?: number
}

export type RiskStatusType = 'Good' | 'Moderate' | 'Needs Attention'

export interface RiskMetrics {
  portfolioBeta: number
  volatility: number
  valueAtRisk: number
  maxDrawdown: number
  sharpeRatio?: number
  informationRatio?: number
  riskStatus: RiskStatusType
  riskAssessment?: string
}

export interface RebalancingRecommendation {
  symbol: string
  name: string
  currentAllocation: number
  targetAllocation: number
  action: ActionType
  amount: number
  reason: string
  risk: RiskLevelType
}

export interface RebalancingMetadata {
  iterationCount: number
  evaluationScore: number
  improvementsMade: string[]
  evaluationPassed: boolean
}

export interface RebalancingResponse {
  recommendations: RebalancingRecommendation[]
  metadata: RebalancingMetadata
}

export interface PortfolioAnalytics {
  summary: PortfolioSummary
  sectorAllocation: SectorAllocation[]
}

export type WashSaleRiskType = 'Low' | 'Medium' | 'High'

export interface ReplacementOption {
  symbol: string
  name: string
  reason: string
}

export interface TaxLossHarvestingOpportunity {
  symbol: string
  name: string
  unrealizedLoss: number
  taxSavings: number
  replacementOptions: ReplacementOption[]
  washSaleRisk: WashSaleRiskType
  currentValue: number
  lossPercentage: number
}

export type ConcentrationLevelType = 'Healthy' | 'Moderate' | 'High'

export interface PositionSizingHolding {
  symbol: string
  amountCad: number
  percentage: number
  category: HoldingCategory
}

export interface PositionSizingGuideline {
  category: HoldingCategory | null
  description: string
  threshold: number | null
}

export interface PositionSizingAnalysis {
  top3Percentage: number
  top5Percentage: number
  concentrationLevel: ConcentrationLevelType
  topHoldings: PositionSizingHolding[]
  warnings: string[]
  guidelines: PositionSizingGuideline[]
}

export interface NewsItem {
  title?: string
  author?: string
  publishedUtc?: string
  articleUrl?: string
  description?: string
}

export interface PriceInfo {
  current?: number
  change?: number
  changePercent?: number
  previousClose?: number
  currency?: string
}

export interface CompanyInfo {
  name?: string
  description?: string
  marketCap?: number
  currency?: string
  primaryExchange?: string
  homepageUrl?: string
  totalEmployees?: number
  listDate?: string
}

export interface TechnicalIndicators {
  rsi?: number
  macd?: number
  macdSignal?: number
  macdHistogram?: number
}

export interface MarketStatus {
  market?: string
  exchanges?: string
  serverTime?: string
}

export interface TickerInsightsResponse {
  ticker: string
  price: PriceInfo
  company: CompanyInfo
  news: NewsItem[]
  technicalIndicators: TechnicalIndicators
  marketStatus: MarketStatus
}

export interface DividendHolding {
  symbol: string
  name: string
  dividendYield: number
  annualDividend: number
  holdingValue: number
}

export interface DividendIncomeData {
  annualIncome: number
  quarterlyIncome: number
  monthlyIncome: number
  portfolioYield: number
  dividendHoldings: DividendHolding[]
  fiveYearProjection: number
  reinvestmentGrowth: number
  incomeProjectionText: string
  investmentTipText: string
}

export interface PerformanceDataPoint {
  date: string
  portfolio: number
  sp500: number
}

export interface PerformanceHistoryData {
  dataPoints: PerformanceDataPoint[]
  portfolioReturn: number
  sp500Return: number
  outperformance: number
  startValue: number
  currentValue: number
}

export type DiversificationStatusType = 'Well Diversified' | 'Moderately Diversified' | 'Needs Improvement'

export interface SectorSuggestion {
  sector: string
  action: string
  targetPercentage: number
  currentPercentage: number
  reasoning: string
  priority: RiskLevelType
}

export interface SectorDiversificationAnalysis {
  status: DiversificationStatusType
  score: number
  summary: string
  strengths: string[]
  risks: string[]
  suggestions: SectorSuggestion[]
  idealAllocation: Record<string, number>
}

export type FearGreedLabelType = 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
export type VixStatusType = 'Low volatility' | 'Moderate volatility' | 'High volatility' | 'Extreme volatility'
export type PutCallStatusType = 'Bullish' | 'Neutral' | 'Bearish'
export type MarketBreadthStatusType = 'Above 200-day MA' | 'Near 200-day MA' | 'Below 200-day MA'
export type AlertSeverityType = 'info' | 'warning' | 'error'

export interface MarketSentimentAlert {
  message: string
  severity: AlertSeverityType
}

export interface MarketSentiment {
  fearGreedValue: number
  fearGreedLabel: FearGreedLabelType
  vixValue: number
  vixStatus: VixStatusType
  putCallRatio: number
  putCallStatus: PutCallStatusType
  marketBreadth: number
  marketBreadthStatus: MarketBreadthStatusType
  alerts: MarketSentimentAlert[]
}