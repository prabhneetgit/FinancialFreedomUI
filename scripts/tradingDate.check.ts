// Run: node scripts/tradingDate.check.ts
// Pacific zone so a UTC-based date key would roll over early in the ET evening.
process.env.TZ = 'America/Los_Angeles'

import assert from 'node:assert/strict'
import { getEasternTime, getCurrentTradingDate } from '../src/lib/tradingDate.ts'

// Tue 2026-09-29, EDT (UTC-4)
assert.equal(getEasternTime(new Date('2026-09-29T18:30:00Z')).getHours(), 14) // 2:30 PM, not "02"
assert.equal(getEasternTime(new Date('2026-09-30T04:15:00Z')).getHours(), 0) // 12:15 AM, not 12 or 24
assert.equal(getCurrentTradingDate(new Date('2026-09-29T18:30:00Z')), '2026-09-29') // afternoon is not pre-market
assert.equal(getCurrentTradingDate(new Date('2026-09-29T12:00:00Z')), '2026-09-28') // 8 AM pre-market -> previous day
assert.equal(getCurrentTradingDate(new Date('2026-09-29T23:30:00Z')), '2026-09-29') // 7:30 PM ET, still Tuesday

console.log('tradingDate ok')
