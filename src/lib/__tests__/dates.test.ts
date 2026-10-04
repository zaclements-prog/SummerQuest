import { describe, it, expect, afterEach } from 'vitest'
import { localDayKey, addDays } from '../dates'

const ORIGINAL_TZ = process.env.TZ
afterEach(() => {
  process.env.TZ = ORIGINAL_TZ
})

describe('localDayKey', () => {
  it('uses the local calendar day, not the UTC one', () => {
    process.env.TZ = 'America/Los_Angeles'
    // 5:30 PM Saturday in California is already Sunday in UTC.
    const at = Date.parse('2026-10-04T00:30:00Z')
    expect(new Date(at).toISOString().slice(0, 10)).toBe('2026-10-04')
    expect(localDayKey(at)).toBe('2026-10-03')
  })

  it('zero-pads months and days', () => {
    process.env.TZ = 'UTC'
    expect(localDayKey(Date.parse('2026-01-05T12:00:00Z'))).toBe('2026-01-05')
  })
})

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('is stable across a DST change', () => {
    process.env.TZ = 'America/Los_Angeles'
    expect(addDays('2026-03-09', -1)).toBe('2026-03-08') // DST starts 2026-03-08
    expect(addDays('2026-11-02', -1)).toBe('2026-11-01') // DST ends 2026-11-01
  })
})
