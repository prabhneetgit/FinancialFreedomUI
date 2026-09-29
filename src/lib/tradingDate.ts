export function getEasternTime(): Date {
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

export function getCurrentTradingDate(): string {
  const et = getEasternTime()
  const hour = et.getHours()
  const minute = et.getMinutes()
  const dayOfWeek = et.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  
  if (isWeekend) {
    const daysBack = dayOfWeek === 0 ? 2 : 1
    const tradingDate = new Date(et)
    tradingDate.setDate(tradingDate.getDate() - daysBack)
    return tradingDate.toISOString().split('T')[0]
  }
  
  if (hour < 9 || (hour === 9 && minute < 30)) {
    const tradingDate = new Date(et)
    tradingDate.setDate(tradingDate.getDate() - 1)
    while (tradingDate.getDay() === 0 || tradingDate.getDay() === 6) {
      tradingDate.setDate(tradingDate.getDate() - 1)
    }
    return tradingDate.toISOString().split('T')[0]
  }
  
  return et.toISOString().split('T')[0]
}
