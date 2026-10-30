import { describe, expect, it } from 'vitest'
import {
  DAY,
  HALF_DAY,
  crossesHour,
  crossesNoon,
  durationText,
  fmtTime,
  handAngles,
  hour12,
  sameTime,
  snapHours,
  snapTime,
  turnBetween,
  turnHourHand,
  turnMinuteHand,
  wrapTime,
} from '../clock'
import { DENOMS, dollars, fewestPieces, priceText, trayAdd, trayCount, trayTotal, type Denom } from '../money'
import { UPGRADE_AT, shiftStars, stepPoints, tipFor, upgradesFor } from '../score'

describe('shack clock', () => {
  it('reads times on a 12-hour clock, with a.m. and p.m. on the whole day', () => {
    expect(fmtTime(10 * 60)).toBe('10:00')
    expect(fmtTime(0)).toBe('12:00')
    expect(fmtTime(12 * 60 + 5)).toBe('12:05')
    expect(fmtTime(13 * 60 + 15)).toBe('1:15')
    expect(fmtTime(10 * 60 + 30, true)).toBe('10:30 a.m.')
    expect(fmtTime(12 * 60, true)).toBe('12:00 p.m.')
    expect(fmtTime(15 * 60 + 45, true)).toBe('3:45 p.m.')
    expect(fmtTime(-30)).toBe('11:30')
    expect(hour12(0)).toBe(12)
    expect(hour12(13 * 60)).toBe(1)
  })

  it('10:00 a.m. plus 5 and a half hours is 3:30 p.m. (the skill this game is for)', () => {
    const end = 10 * 60 + 5 * 60 + 30
    expect(fmtTime(end, true)).toBe('3:30 p.m.')
    expect(crossesNoon(10 * 60, end)).toBe(true)
    expect(crossesNoon(8 * 60, 11 * 60 + 59)).toBe(false)
  })

  it('a geared clock: one turn of the long hand is one hour, and past 12 the hour moves on', () => {
    let t = 10 * 60 + 45
    // drag the long hand a quarter turn (90°) clockwise in small moves, across the 12
    for (let k = 0; k < 9; k++) t = turnMinuteHand(t, 10)
    expect(snapTime(t, 5, HALF_DAY)).toBe(11 * 60)
    // a whole turn backwards
    t = turnMinuteHand(t, -360)
    expect(snapTime(t, 5, HALF_DAY)).toBe(10 * 60)
    // the hour hand: 30° is an hour, the minutes stay
    // (10:15 + 2 hours is 12:15: 15 minutes past 12 on a 12-hour clock)
    expect(snapHours(turnHourHand(10 * 60 + 15, 61), 15, HALF_DAY)).toBe(15)
    // on the whole-day clock, going past noon makes it p.m.
    expect(fmtTime(snapTime(turnMinuteHand(11 * 60 + 50, 120), 5, DAY), true)).toBe('12:10 p.m.')
  })

  it('snaps to the step and wraps into the span', () => {
    expect(snapTime(62, 5, HALF_DAY)).toBe(60)
    expect(snapTime(44, 30, HALF_DAY)).toBe(30)
    expect(snapTime(-5, 5, HALF_DAY)).toBe(715)
    expect(snapTime(DAY + 10, 5, DAY)).toBe(10)
    expect(wrapTime(HALF_DAY + 30, HALF_DAY)).toBe(30)
    expect(sameTime(13 * 60, 60, HALF_DAY)).toBe(true)
    expect(sameTime(13 * 60, 60, DAY)).toBe(false)
  })

  it('places the hands (the hour hand creeps between hours)', () => {
    expect(handAngles(3 * 60)).toEqual({ hour: 90, minute: 0 })
    expect(handAngles(3 * 60 + 30)).toEqual({ hour: 105, minute: 180 })
    expect(turnBetween(350, 10)).toBe(20)
    expect(turnBetween(10, 350)).toBe(-20)
  })

  it('says lengths of time the way a story would', () => {
    expect(durationText(2, 15)).toBe('2 hours 15 minutes')
    expect(durationText(1, 0)).toBe('1 hour')
    expect(durationText(0, 45)).toBe('45 minutes')
    expect(durationText(5, 30, 'half')).toBe('5 and a half hours')
    expect(durationText(1, 30, 'half')).toBe('1 and a half hours')
    expect(durationText(0, 30, 'half')).toBe('half an hour')
    expect(durationText(2, 30, 'minutesOnly')).toBe('150 minutes')
    expect(crossesHour(10 * 60 + 45, 30)).toBe(true)
    expect(crossesHour(10 * 60 + 15, 30)).toBe(false)
  })
})

describe('shack money', () => {
  const ALL = DENOMS.map((d) => d.id)
  it('the fewest pieces always make the amount exactly', () => {
    for (let c = 1; c <= 2000; c += 7) {
      const tray = fewestPieces(c, ALL)
      expect(trayTotal(tray)).toBe(c)
    }
    expect(fewestPieces(365, ALL)).toEqual({ dollar: 3, quarter: 2, dime: 1, nickel: 1 })
    // a 2nd-grade drawer has no $5 bill
    const g2: Denom[] = ['dollar', 'quarter', 'dime', 'nickel', 'penny']
    expect(fewestPieces(735, g2)).toEqual({ dollar: 7, quarter: 1, dime: 1 })
  })

  it('the tray adds and puts back, never below zero', () => {
    let t = trayAdd({}, 'quarter')
    t = trayAdd(t, 'quarter')
    t = trayAdd(t, 'dime')
    expect(trayTotal(t)).toBe(60)
    expect(trayCount(t)).toBe(3)
    t = trayAdd(t, 'dime', -1)
    t = trayAdd(t, 'dime', -1)
    expect(t).toEqual({ quarter: 2 })
  })

  it('prices read as a 2nd–3rd grader reads them, or as dollars and cents', () => {
    expect(priceText(75)).toBe('75¢')
    expect(priceText(200)).toBe('$2')
    expect(priceText(150)).toBe('$1.50')
    expect(priceText(75, true)).toBe('$0.75')
    expect(dollars(2005)).toBe('$20.05')
  })
})

describe('shack score', () => {
  it('every customer tips at least one star', () => {
    expect(tipFor(['first', 'first'])).toBe(3)
    expect(tipFor([])).toBe(3)
    expect(tipFor(['first', 'helped'])).toBe(2)
    expect(tipFor(['retry'])).toBe(2)
    expect(tipFor(['first', 'shown'])).toBe(1)
  })

  it('stars count the steps right first time (helped counts, as in the quiz games)', () => {
    expect(shiftStars(9, 10)).toBe(3)
    expect(shiftStars(6, 9)).toBe(2)
    expect(shiftStars(3, 9)).toBe(1)
    expect(shiftStars(1, 9)).toBe(0)
    expect(shiftStars(0, 0)).toBe(0)
  })

  it('upgrades come at the tip thresholds, at least one in any finished shift', () => {
    expect(upgradesFor(0)).toBe(0)
    expect(upgradesFor(UPGRADE_AT[0])).toBe(1)
    expect(upgradesFor(18)).toBe(UPGRADE_AT.length)
    // six customers tipping the minimum one star each
    expect(upgradesFor(6)).toBeGreaterThanOrEqual(1)
    expect(stepPoints('first')).toBeGreaterThan(stepPoints('helped'))
    expect(stepPoints('helped')).toBeGreaterThan(stepPoints('shown'))
  })
})
