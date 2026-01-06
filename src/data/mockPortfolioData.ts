export type HoldingCategory = 'Stocks' | 'ETFs' | 'Crypto' | 'Sector'

export type PortfolioHolding = {
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

export const holdings: PortfolioHolding[] = [
  {
    id: 'holding-1',
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF',
    category: 'ETFs',
    amountCad: 2_100_000,
    changePct: 11.1,
    lastActivity: '2025-12-26',
    notes: 'Diversified exposure to S&P 500, steady performance.',
    tag: 'Index Fund',
  },
  {
    id: 'holding-2',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    category: 'Stocks',
    amountCad: 1_850_000,
    changePct: 29.8,
    lastActivity: '2025-12-29',
    notes: 'AI chip demand unprecedented, data center momentum strong.',
    tag: 'Technology',
  },
  {
    id: 'holding-3',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    category: 'Stocks',
    amountCad: 1_450_000,
    changePct: 14.2,
    lastActivity: '2025-12-27',
    notes: 'Azure growth continues, OpenAI partnership benefits.',
    tag: 'Technology',
  },
  {
    id: 'holding-4',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    category: 'Stocks',
    amountCad: 1_250_000,
    changePct: 11.1,
    lastActivity: '2025-12-29',
    notes: 'Strong performance in Q4, iPhone services momentum.',
    tag: 'Technology',
  },
  {
    id: 'holding-5',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    category: 'Stocks',
    amountCad: 980_000,
    changePct: 9.5,
    lastActivity: '2025-12-28',
    notes: 'AI initiatives showing promise, cloud growth stable.',
    tag: 'Technology',
  },
  {
    id: 'holding-6',
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    category: 'Stocks',
    amountCad: 720_000,
    changePct: 8.9,
    lastActivity: '2025-12-24',
    notes: 'AWS growth stabilization; retail margins improving.',
    tag: 'Consumer',
  },
  {
    id: 'holding-6b',
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    category: 'Stocks',
    amountCad: 640_000,
    changePct: 7.4,
    lastActivity: '2025-12-25',
    notes: 'EV leader with energy storage growth.',
    tag: 'Automotive',
  },
  {
    id: 'holding-7',
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    category: 'ETFs',
    amountCad: 1_200_000,
    changePct: 15.3,
    lastActivity: '2025-12-27',
    notes: 'Tech-heavy ETF with strong performance.',
    tag: 'Technology ETF',
  },
  {
    id: 'holding-8',
    symbol: 'BTC',
    name: 'Bitcoin',
    category: 'Crypto',
    amountCad: 850_000,
    changePct: 18.5,
    lastActivity: '2025-12-29',
    notes: 'Digital gold, store of value.',
    tag: 'Cryptocurrency',
  },
  {
    id: 'holding-9',
    symbol: 'ETH',
    name: 'Ethereum',
    category: 'Crypto',
    amountCad: 720_000,
    changePct: 22.1,
    lastActivity: '2025-12-29',
    notes: 'Smart contract platform, DeFi ecosystem.',
    tag: 'Cryptocurrency',
  },
]

export const watchlistHoldings: PortfolioHolding[] = [
  {
    id: 'watch-1',
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    category: 'Stocks',
    amountCad: 640_000,
    changePct: 7.4,
    lastActivity: '2025-12-25',
    notes: 'Watching margin trends and Cybertruck ramp.',
    tag: 'Automotive',
  },
  {
    id: 'watch-2',
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    category: 'Stocks',
    amountCad: 720_000,
    changePct: 8.9,
    lastActivity: '2025-12-24',
    notes: 'AWS growth stabilization; retail margins improving.',
    tag: 'Consumer',
  },
]

export const portfolioSummary = {
  totalValueCad: 11_120_000,
  totalGainCad: 1_252_000,
  totalGainPct: 12.7,
}

export type StockInsight = {
  period: 'MORNING' | 'MIDDAY' | 'CLOSING'
  text: string
}

export type TrendPeriod = 'This Year' | 'This Month' | 'This week' | 'Today' | 'Short Future' | 'Long Future'

export type TrendAnalysis = {
  period: TrendPeriod
  recommendation: 'Buy' | 'Sell' | 'Hold'
  quickInsight: string
  reasoning: string
  keyMetrics: {
    ytdReturn?: string
    vsSP500?: string
    taxImpact?: string
    riskLevel?: string
    weekReturn?: string
    dayReturn?: string
    shortTermOutlook?: string
    longTermOutlook?: string
  }
}

export type OptionStrategy = {
  name: string
  sentiment: 'Bullish' | 'Bearish' | 'Neutral'
  expirationDate: string
  daysToExpiration: number
  riskLevel: 'Low' | 'Medium' | 'High'
  strikePrice: number
  premium: number
  breakEven: number
  currentPrice: number
  maxProfit: number
  maxLoss: number | string
  delta: number
  iv: number
  description: string
}

export type StockDetail = {
  symbol: string
  priceCad: number
  changeCad: number
  changePct: number
  insights: StockInsight[]
  recommendation: 'Buy' | 'Sell' | 'Hold'
  longTermBias: 'Buy' | 'Sell' | 'Hold'
  trendAnalyses: TrendAnalysis[]
  optionStrategies?: OptionStrategy[]
}

export const stockDetails: Record<string, StockDetail> = {
  NVDA: {
    symbol: 'NVDA',
    priceCad: 1_850_000,
    changeCad: 425_000,
    changePct: 29.8,
    insights: [
      {
        period: 'MORNING',
        text: 'NVIDIA continues to dominate AI chip market with H100 and upcoming H200 GPUs seeing unprecedented demand. Major cloud providers unable to secure enough inventory.',
      },
      {
        period: 'MIDDAY',
        text: 'Market digesting supply updates; analysts reaffirm overweight ratings citing strong data center backlog.',
      },
      {
        period: 'CLOSING',
        text: 'Volatility eased into close; investors watching next earnings for forward guidance and supply expansion.',
      },
    ],
    recommendation: 'Sell',
    longTermBias: 'Buy',
    optionStrategies: [
      {
        name: 'Bull Call Spread',
        sentiment: 'Bullish',
        expirationDate: '2025-02-21',
        daysToExpiration: 53,
        riskLevel: 'High',
        strikePrice: 185.0,
        premium: 3.5,
        breakEven: 188.5,
        currentPrice: 185.5,
        maxProfit: 650,
        maxLoss: 350,
        delta: 0.45,
        iv: 28.5,
        description: 'Strong technical support at $180. Expected earnings beat could drive stock to $195. Risk/reward ratio of 1.86:1 is favorable.',
      },
      {
        name: 'Covered Call',
        sentiment: 'Neutral',
        expirationDate: '2025-01-17',
        daysToExpiration: 18,
        riskLevel: 'Medium',
        strikePrice: 195.0,
        premium: 2.25,
        breakEven: 183.25,
        currentPrice: 185.5,
        maxProfit: 1175,
        maxLoss: 'Premium',
        delta: -0.25,
        iv: 26.0,
        description: 'Generate 1.2% monthly income on existing shares. Strike is 5% above current price, provides upside while collecting premium.',
      },
    ],
    trendAnalyses: [
      {
        period: 'This Year',
        recommendation: 'Sell',
        quickInsight: 'Strong YTD gains of +24.5% suggest profit-taking before year-end for tax optimization',
        reasoning:
          'After a strong 24.5% gain this year, taking profits now allows you to lock in capital gains at current tax rates. Year-end typically sees increased volatility and potential pullbacks as institutional investors rebalance. This position has outperformed the S&P 500 by 8%, making it an ideal candidate for partial profit-taking while maintaining core exposure.',
        keyMetrics: {
          ytdReturn: '+24.5%',
          vsSP500: '+8.0%',
          taxImpact: '$3,200',
          riskLevel: 'Elevated',
        },
      },
      {
        period: 'This Month',
        recommendation: 'Sell',
        quickInsight: 'Month-end rebalancing and profit-taking pressure expected',
        reasoning:
          'Institutional investors typically rebalance portfolios at month-end, which can create selling pressure. Combined with the strong performance this month, taking some profits now could be prudent.',
        keyMetrics: {
          weekReturn: '+5.2%',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'This week',
        recommendation: 'Buy',
        quickInsight: 'Short-term momentum remains positive with strong volume',
        reasoning:
          'Recent trading activity shows continued institutional interest and strong volume. Technical indicators suggest near-term upside potential.',
        keyMetrics: {
          weekReturn: '+2.1%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'Today',
        recommendation: 'Buy',
        quickInsight: 'Intraday strength suggests continued buying interest',
        reasoning:
          'Strong intraday performance and positive sentiment from recent news flow support a buy recommendation for today.',
        keyMetrics: {
          dayReturn: '+0.8%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'Short Future',
        recommendation: 'Buy',
        quickInsight: 'Near-term catalysts support continued strength',
        reasoning:
          'Upcoming product launches and strong demand fundamentals suggest continued positive momentum in the short term.',
        keyMetrics: {
          shortTermOutlook: 'Positive',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'Long Future',
        recommendation: 'Buy',
        quickInsight: 'AI infrastructure demand remains robust long-term',
        reasoning:
          'The AI revolution is still in early stages. NVIDIA is well-positioned to benefit from continued growth in data center demand, autonomous vehicles, and other AI applications over the next 3-5 years.',
        keyMetrics: {
          longTermOutlook: 'Very Positive',
          riskLevel: 'Moderate',
        },
      },
    ],
  },
  MSFT: {
    symbol: 'MSFT',
    priceCad: 1_450_000,
    changeCad: 180_000,
    changePct: 14.2,
    insights: [
      {
        period: 'MORNING',
        text: 'Azure and Office demand remain resilient while AI services attach grows.',
      },
      {
        period: 'MIDDAY',
        text: 'Enterprise pipelines steady; cloud margins benefitting from utilization discipline.',
      },
      {
        period: 'CLOSING',
        text: 'Investors watching Copilot adoption metrics and OpenAI partnership updates.',
      },
    ],
    recommendation: 'Hold',
    longTermBias: 'Buy',
    trendAnalyses: [
      {
        period: 'This Year',
        recommendation: 'Hold',
        quickInsight: 'Steady performance with balanced risk-reward profile',
        reasoning:
          'Microsoft has shown consistent growth this year with strong cloud and AI positioning. Current valuation is fair, making it a solid hold position.',
        keyMetrics: {
          ytdReturn: '+14.2%',
          vsSP500: '+2.5%',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'This Month',
        recommendation: 'Hold',
        quickInsight: 'Stable month with steady enterprise demand',
        reasoning: 'Enterprise spending remains consistent, supporting current valuation levels.',
        keyMetrics: {
          weekReturn: '+1.8%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'This week',
        recommendation: 'Buy',
        quickInsight: 'Positive momentum from AI announcements',
        reasoning: 'Recent AI product updates and partnerships create near-term upside potential.',
        keyMetrics: {
          weekReturn: '+0.9%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'Today',
        recommendation: 'Buy',
        quickInsight: 'Intraday strength on positive sentiment',
        reasoning: 'Strong buying interest today suggests continued positive momentum.',
        keyMetrics: {
          dayReturn: '+0.5%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'Short Future',
        recommendation: 'Buy',
        quickInsight: 'AI integration across products supports growth',
        reasoning: 'Copilot and AI services integration should drive near-term revenue growth.',
        keyMetrics: {
          shortTermOutlook: 'Positive',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'Long Future',
        recommendation: 'Buy',
        quickInsight: 'Strong competitive position in cloud and AI',
        reasoning:
          'Microsoft is well-positioned for long-term growth with Azure, Office 365, and AI services creating a strong ecosystem.',
        keyMetrics: {
          longTermOutlook: 'Positive',
          riskLevel: 'Moderate',
        },
      },
    ],
  },
  AAPL: {
    symbol: 'AAPL',
    priceCad: 1_250_000,
    changeCad: 138_000,
    changePct: 11.1,
    insights: [
      {
        period: 'MORNING',
        text: 'Services revenue and higher-end iPhone mix offsetting softer hardware cycles.',
      },
      {
        period: 'MIDDAY',
        text: 'Wearables steady; supply chain commentary constructive for next half.',
      },
      {
        period: 'CLOSING',
        text: 'Street focused on AR/VR roadmap and on-device AI differentiation.',
      },
    ],
    recommendation: 'Hold',
    longTermBias: 'Buy',
    optionStrategies: [
      {
        name: 'Bull Call Spread',
        sentiment: 'Bullish',
        expirationDate: '2025-02-21',
        daysToExpiration: 53,
        riskLevel: 'High',
        strikePrice: 185.0,
        premium: 3.5,
        breakEven: 188.5,
        currentPrice: 185.5,
        maxProfit: 650,
        maxLoss: 350,
        delta: 0.45,
        iv: 28.5,
        description: 'Strong technical support at $180. Expected earnings beat could drive stock to $195. Risk/reward ratio of 1.86:1 is favorable.',
      },
      {
        name: 'Covered Call',
        sentiment: 'Neutral',
        expirationDate: '2025-01-17',
        daysToExpiration: 18,
        riskLevel: 'Medium',
        strikePrice: 195.0,
        premium: 2.25,
        breakEven: 183.25,
        currentPrice: 185.5,
        maxProfit: 1175,
        maxLoss: 'Premium',
        delta: -0.25,
        iv: 26.0,
        description: 'Generate 1.2% monthly income on existing shares. Strike is 5% above current price, provides upside while collecting premium.',
      },
    ],
    trendAnalyses: [
      {
        period: 'This Year',
        recommendation: 'Hold',
        quickInsight: 'Solid performance with services growth offsetting hardware cycles',
        reasoning:
          'Apple has maintained steady growth through services revenue despite softer hardware cycles. Current valuation is reasonable given the strong ecosystem.',
        keyMetrics: {
          ytdReturn: '+11.1%',
          vsSP500: '-0.5%',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'This Month',
        recommendation: 'Hold',
        quickInsight: 'Stable performance with consistent services revenue',
        reasoning: 'Services segment continues to show resilience, supporting current valuation.',
        keyMetrics: {
          weekReturn: '+1.2%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'This week',
        recommendation: 'Buy',
        quickInsight: 'Positive momentum from product announcements',
        reasoning: 'Recent product updates and strong services performance create near-term upside.',
        keyMetrics: {
          weekReturn: '+0.7%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'Today',
        recommendation: 'Buy',
        quickInsight: 'Intraday strength on positive sentiment',
        reasoning: 'Strong buying interest today suggests continued positive momentum.',
        keyMetrics: {
          dayReturn: '+0.4%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'Short Future',
        recommendation: 'Buy',
        quickInsight: 'Product cycle and services growth support near-term gains',
        reasoning: 'Upcoming product launches and services expansion should drive growth.',
        keyMetrics: {
          shortTermOutlook: 'Positive',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'Long Future',
        recommendation: 'Buy',
        quickInsight: 'Strong ecosystem and brand loyalty support long-term growth',
        reasoning:
          'Apple ecosystem and brand strength position it well for long-term growth, especially with AR/VR and AI integration.',
        keyMetrics: {
          longTermOutlook: 'Positive',
          riskLevel: 'Moderate',
        },
      },
    ],
  },
  GOOGL: {
    symbol: 'GOOGL',
    priceCad: 980_000,
    changeCad: 93_000,
    changePct: 9.5,
    insights: [
      {
        period: 'MORNING',
        text: 'Search revenue stable; cloud growth moderating but profitable.',
      },
      {
        period: 'MIDDAY',
        text: 'AI model launches broaden monetization experiments across ads and cloud.',
      },
      {
        period: 'CLOSING',
        text: 'Capex guide watched for alignment with AI infrastructure investments.',
      },
    ],
    recommendation: 'Buy',
    longTermBias: 'Buy',
    trendAnalyses: [
      {
        period: 'This Year',
        recommendation: 'Buy',
        quickInsight: 'Strong AI initiatives and cloud growth support buy recommendation',
        reasoning:
          'Google has shown strong performance with AI initiatives gaining traction and cloud growth stabilizing. Current valuation is attractive for entry.',
        keyMetrics: {
          ytdReturn: '+9.5%',
          vsSP500: '-2.1%',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'This Month',
        recommendation: 'Buy',
        quickInsight: 'Positive momentum from AI product launches',
        reasoning: 'Recent AI model launches and cloud improvements support near-term gains.',
        keyMetrics: {
          weekReturn: '+2.1%',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'This week',
        recommendation: 'Buy',
        quickInsight: 'Strong technical indicators support continued buying',
        reasoning: 'Technical analysis and positive sentiment suggest continued upside potential.',
        keyMetrics: {
          weekReturn: '+1.1%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'Today',
        recommendation: 'Buy',
        quickInsight: 'Intraday strength on positive news flow',
        reasoning: 'Positive sentiment from recent announcements supports today buying.',
        keyMetrics: {
          dayReturn: '+0.6%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'Short Future',
        recommendation: 'Buy',
        quickInsight: 'AI monetization and cloud growth support near-term gains',
        reasoning: 'AI services and cloud expansion should drive revenue growth in the short term.',
        keyMetrics: {
          shortTermOutlook: 'Positive',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'Long Future',
        recommendation: 'Buy',
        quickInsight: 'Strong position in search and AI supports long-term growth',
        reasoning:
          'Google maintains dominant position in search while expanding AI capabilities, supporting long-term growth prospects.',
        keyMetrics: {
          longTermOutlook: 'Positive',
          riskLevel: 'Moderate',
        },
      },
    ],
  },
  SPY: {
    symbol: 'SPY',
    priceCad: 2_100_000,
    changeCad: 233_000,
    changePct: 11.1,
    insights: [
      {
        period: 'MORNING',
        text: 'Broad market tracking continues to benefit from tech-led strength.',
      },
      {
        period: 'MIDDAY',
        text: 'Flows supportive; volatility contained with balanced sector performance.',
      },
      {
        period: 'CLOSING',
        text: 'Rebalancing near month-end expected to keep range bound trading.',
      },
    ],
    recommendation: 'Hold',
    longTermBias: 'Buy',
    optionStrategies: [
      {
        name: 'Bull Call Spread',
        sentiment: 'Bullish',
        expirationDate: '2025-02-21',
        daysToExpiration: 53,
        riskLevel: 'High',
        strikePrice: 185.0,
        premium: 3.5,
        breakEven: 188.5,
        currentPrice: 185.5,
        maxProfit: 650,
        maxLoss: 350,
        delta: 0.45,
        iv: 28.5,
        description: 'Strong technical support at $180. Expected earnings beat could drive stock to $195. Risk/reward ratio of 1.86:1 is favorable.',
      },
      {
        name: 'Covered Call',
        sentiment: 'Neutral',
        expirationDate: '2025-01-17',
        daysToExpiration: 18,
        riskLevel: 'Medium',
        strikePrice: 195.0,
        premium: 2.25,
        breakEven: 183.25,
        currentPrice: 185.5,
        maxProfit: 1175,
        maxLoss: 'Premium',
        delta: -0.25,
        iv: 26.0,
        description: 'Generate 1.2% monthly income on existing shares. Strike is 5% above current price, provides upside while collecting premium.',
      },
    ],
    trendAnalyses: [
      {
        period: 'This Year',
        recommendation: 'Hold',
        quickInsight: 'Broad market ETF with steady performance matching S&P 500',
        reasoning:
          'SPY tracks the S&P 500 and provides diversified exposure. Current performance is in line with market expectations, making it a solid hold for diversification.',
        keyMetrics: {
          ytdReturn: '+11.1%',
          vsSP500: '0.0%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'This Month',
        recommendation: 'Hold',
        quickInsight: 'Stable month with balanced sector performance',
        reasoning: 'ETF performance remains stable with balanced sector allocation.',
        keyMetrics: {
          weekReturn: '+0.8%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'This week',
        recommendation: 'Buy',
        quickInsight: 'Positive market momentum supports buying',
        reasoning: 'Broad market strength suggests continued positive momentum.',
        keyMetrics: {
          weekReturn: '+0.5%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'Today',
        recommendation: 'Buy',
        quickInsight: 'Market strength supports today buying',
        reasoning: 'Positive market sentiment supports buying today.',
        keyMetrics: {
          dayReturn: '+0.2%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'Short Future',
        recommendation: 'Buy',
        quickInsight: 'Diversified exposure supports near-term stability',
        reasoning: 'Broad market exposure provides stability and growth potential.',
        keyMetrics: {
          shortTermOutlook: 'Positive',
          riskLevel: 'Low',
        },
      },
      {
        period: 'Long Future',
        recommendation: 'Buy',
        quickInsight: 'Long-term market growth supports buy recommendation',
        reasoning: 'S&P 500 has historically provided solid long-term returns, making SPY a good long-term hold.',
        keyMetrics: {
          longTermOutlook: 'Positive',
          riskLevel: 'Low',
        },
      },
    ],
  },
  TSLA: {
    symbol: 'TSLA',
    priceCad: 640_000,
    changeCad: 44_000,
    changePct: 7.4,
    insights: [
      {
        period: 'MORNING',
        text: 'Production steady; investors tracking Cybertruck ramp pace.',
      },
      {
        period: 'MIDDAY',
        text: 'Auto margins sensitive to pricing; energy storage outlook supportive.',
      },
      {
        period: 'CLOSING',
        text: 'Sentiment tied to FSD progress and regulatory milestones.',
      },
    ],
    recommendation: 'Hold',
    longTermBias: 'Buy',
    trendAnalyses: [
      {
        period: 'This Year',
        recommendation: 'Hold',
        quickInsight: 'Volatile performance with production ramp progress',
        reasoning:
          'Tesla has shown volatility this year with production challenges and margin pressure. Current valuation reflects uncertainty, making it a hold.',
        keyMetrics: {
          ytdReturn: '+7.4%',
          vsSP500: '-3.7%',
          riskLevel: 'Elevated',
        },
      },
      {
        period: 'This Month',
        recommendation: 'Hold',
        quickInsight: 'Mixed signals from production and margin trends',
        reasoning: 'Production updates are positive but margin concerns remain, creating uncertainty.',
        keyMetrics: {
          weekReturn: '+1.5%',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'This week',
        recommendation: 'Buy',
        quickInsight: 'Positive momentum from production updates',
        reasoning: 'Recent production announcements create near-term positive sentiment.',
        keyMetrics: {
          weekReturn: '+0.8%',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'Today',
        recommendation: 'Buy',
        quickInsight: 'Intraday strength on positive news',
        reasoning: 'Positive sentiment from recent news supports buying today.',
        keyMetrics: {
          dayReturn: '+0.3%',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'Short Future',
        recommendation: 'Hold',
        quickInsight: 'Production ramp and margin trends need monitoring',
        reasoning: 'Cybertruck ramp and margin trends will determine near-term performance.',
        keyMetrics: {
          shortTermOutlook: 'Neutral',
          riskLevel: 'Elevated',
        },
      },
      {
        period: 'Long Future',
        recommendation: 'Buy',
        quickInsight: 'Long-term EV and energy storage growth supports buy',
        reasoning:
          'Tesla is well-positioned for long-term growth in EV adoption and energy storage, despite near-term volatility.',
        keyMetrics: {
          longTermOutlook: 'Positive',
          riskLevel: 'Moderate',
        },
      },
    ],
  },
  AMZN: {
    symbol: 'AMZN',
    priceCad: 720_000,
    changeCad: 59_000,
    changePct: 8.9,
    insights: [
      {
        period: 'MORNING',
        text: 'AWS optimization headwinds fading; ads segment remains strong.',
      },
      {
        period: 'MIDDAY',
        text: 'Logistics efficiency gains underpin retail margin expansion.',
      },
      {
        period: 'CLOSING',
        text: 'AI services attach within AWS a key watch item for next quarter.',
      },
    ],
    recommendation: 'Buy',
    longTermBias: 'Buy',
    trendAnalyses: [
      {
        period: 'This Year',
        recommendation: 'Buy',
        quickInsight: 'AWS optimization and retail margin improvements support buy',
        reasoning:
          'Amazon has shown strong performance with AWS optimization headwinds fading and retail margins improving. Current valuation is attractive.',
        keyMetrics: {
          ytdReturn: '+8.9%',
          vsSP500: '-2.2%',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'This Month',
        recommendation: 'Buy',
        quickInsight: 'Positive momentum from AWS and ads growth',
        reasoning: 'AWS and ads segments showing strength, supporting near-term gains.',
        keyMetrics: {
          weekReturn: '+1.9%',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'This week',
        recommendation: 'Buy',
        quickInsight: 'Strong technical indicators support continued buying',
        reasoning: 'Technical analysis and positive sentiment suggest continued upside.',
        keyMetrics: {
          weekReturn: '+0.9%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'Today',
        recommendation: 'Buy',
        quickInsight: 'Intraday strength on positive sentiment',
        reasoning: 'Positive sentiment from recent updates supports buying today.',
        keyMetrics: {
          dayReturn: '+0.5%',
          riskLevel: 'Low',
        },
      },
      {
        period: 'Short Future',
        recommendation: 'Buy',
        quickInsight: 'AWS and retail improvements support near-term gains',
        reasoning: 'AWS optimization and retail efficiency gains should drive growth.',
        keyMetrics: {
          shortTermOutlook: 'Positive',
          riskLevel: 'Moderate',
        },
      },
      {
        period: 'Long Future',
        recommendation: 'Buy',
        quickInsight: 'Strong position in cloud and e-commerce supports long-term growth',
        reasoning:
          'Amazon maintains strong positions in cloud computing and e-commerce, supporting long-term growth prospects.',
        keyMetrics: {
          longTermOutlook: 'Positive',
          riskLevel: 'Moderate',
        },
      },
    ],
  },
}

export const featuredDetail: StockDetail = {
  symbol: 'NVDA',
  priceCad: 1_850_000,
  changeCad: 425_000,
  changePct: 29.8,
  insights: [
    {
      period: 'MORNING',
      text: 'NVIDIA continues to dominate AI chip market with H100 and upcoming H200 GPUs seeing unprecedented demand. Major cloud providers unable to secure enough inventory.',
    },
    {
      period: 'MIDDAY',
      text: 'Market digesting supply updates; analysts reaffirm overweight ratings citing strong data center backlog.',
    },
    {
      period: 'CLOSING',
      text: 'Volatility eased into close; investors watching next earnings for forward guidance and supply expansion.',
    },
  ],
  recommendation: 'Sell',
  longTermBias: 'Buy',
  optionStrategies: stockDetails.NVDA.optionStrategies,
  trendAnalyses: stockDetails.NVDA.trendAnalyses,
}

