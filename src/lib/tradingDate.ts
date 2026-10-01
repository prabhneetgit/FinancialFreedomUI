export function getEasternTime(now: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23', // en-US defaults to 12-hour: 2:30 PM would parse as hour 2
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

// ET wall-clock date as YYYY-MM-DD. Not toISOString(): that converts to UTC and rolls over early west of UTC.
const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function getCurrentTradingDate(now: Date = new Date()): string {
  const et = getEasternTime(now)
  const hour = et.getHours()
  const minute = et.getMinutes()
  const dayOfWeek = et.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  
  if (isWeekend) {
    const daysBack = dayOfWeek === 0 ? 2 : 1
    const tradingDate = new Date(et)
    tradingDate.setDate(tradingDate.getDate() - daysBack)
    return toDateKey(tradingDate)
  }
  
  if (hour < 9 || (hour === 9 && minute < 30)) {
    const tradingDate = new Date(et)
    tradingDate.setDate(tradingDate.getDate() - 1)
    while (tradingDate.getDay() === 0 || tradingDate.getDay() === 6) {
      tradingDate.setDate(tradingDate.getDate() - 1)
    }
    return toDateKey(tradingDate)
  }
  
  return toDateKey(et)
}
