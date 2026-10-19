import { describe, expect, it } from 'vitest'
import {
  add,
  compare,
  decimalText,
  div,
  dotCells,
  eq,
  fractionBar,
  fractionText,
  fromDecimal,
  gcd,
  isInteger,
  isTerminating,
  mul,
  numberValue,
  numberWords,
  parseRational,
  rat,
  speakValue,
  sub,
  toInt,
} from '..'
import { seededRng } from '../../random'

describe('rationals', () => {
  it('normalizes sign and gcd', () => {
    expect(rat(6, 8)).toEqual({ n: 3, d: 4 })
    expect(rat(3, -6)).toEqual({ n: -1, d: 2 })
    expect(rat(0, -5)).toEqual({ n: 0, d: 1 })
    expect(() => rat(1, 0)).toThrow()
    expect(() => rat(1.5, 2)).toThrow()
  })

  it('reads decimals and fractions exactly', () => {
    expect(fromDecimal('1.5')).toEqual({ n: 3, d: 2 })
    expect(fromDecimal('0.25')).toEqual({ n: 1, d: 4 })
    expect(fromDecimal(0.1)).toEqual({ n: 1, d: 10 })
    expect(fromDecimal('-2.125')).toEqual({ n: -17, d: 8 })
    expect(parseRational('3/4')).toEqual({ n: 3, d: 4 })
    expect(parseRational('1 1/2')).toEqual({ n: 3, d: 2 })
    expect(parseRational('12')).toEqual({ n: 12, d: 1 })
  })

  it('0.1 + 0.2 is exactly 0.3', () => {
    expect(eq(add(fromDecimal('0.1'), fromDecimal('0.2')), fromDecimal('0.3'))).toBe(true)
  })

  it('compares exactly (bigger denominator = smaller piece; a longer decimal is not bigger)', () => {
    expect(compare(rat(1, 3), rat(1, 4))).toBe(1)
    expect(compare(fromDecimal('0.25'), fromDecimal('0.5'))).toBe(-1)
    expect(compare(rat(2, 4), fromDecimal('0.5'))).toBe(0)
  })

  it('field laws hold on random values', () => {
    const r = seededRng('rational-laws')
    const pick = () => rat(Math.floor(r() * 41) - 20, Math.floor(r() * 12) + 1)
    for (let i = 0; i < 2000; i++) {
      const a = pick()
      const b = pick()
      const c = pick()
      expect(eq(add(a, b), add(b, a))).toBe(true)
      expect(eq(mul(a, add(b, c)), add(mul(a, b), mul(a, c)))).toBe(true)
      expect(eq(sub(add(a, b), b), a)).toBe(true)
      if (b.n !== 0) expect(eq(mul(div(a, b), b), a)).toBe(true)
      expect(gcd(Math.abs(a.n), a.d)).toBeLessThanOrEqual(1 + (a.n === 0 ? a.d : 0))
      expect(a.d).toBeGreaterThan(0)
      // compare agrees with the doubles when they differ by more than rounding
      const da = a.n / a.d
      const db = b.n / b.d
      if (Math.abs(da - db) > 1e-9) expect(compare(a, b)).toBe(da < db ? -1 : 1)
    }
  })

  it('knows whole and terminating values', () => {
    expect(isInteger(mul(rat(1, 2), rat(8)))).toBe(true)
    expect(toInt(mul(fromDecimal('1.5'), rat(6)))).toBe(9)
    expect(() => toInt(rat(7, 2))).toThrow()
    expect(isTerminating(rat(3, 40))).toBe(true)
    expect(isTerminating(rat(1, 3))).toBe(false)
  })
})

describe('display forms', () => {
  it('writes decimals exactly', () => {
    expect(decimalText(rat(3, 2))).toBe('1.5')
    expect(decimalText(rat(1, 4))).toBe('0.25')
    expect(decimalText(rat(12))).toBe('12')
    expect(decimalText(rat(-17, 8))).toBe('-2.125')
    expect(decimalText(rat(1, 3))).toBeNull()
  })

  it('writes fractions with glyphs and mixed numbers', () => {
    expect(fractionText(rat(1, 2))).toBe('½')
    expect(fractionText(rat(3, 4))).toBe('¾')
    expect(fractionText(rat(3, 2))).toBe('1½')
    expect(fractionText(rat(5, 12))).toBe('5/12')
    expect(fractionText(rat(17, 12))).toBe('1 5/12')
    expect(fractionText(rat(1, 2), { glyphs: false })).toBe('1/2')
  })

  it('speaks values', () => {
    expect(numberWords(0)).toBe('zero')
    expect(numberWords(42)).toBe('forty-two')
    expect(numberWords(312)).toBe('three hundred twelve')
    expect(speakValue(rat(3, 4))).toBe('three quarters')
    expect(speakValue(rat(1, 2))).toBe('one half')
    expect(speakValue(rat(3, 2))).toBe('one and a half')
    expect(speakValue(fromDecimal('0.25'), 'decimal')).toBe('zero point two five')
    expect(numberValue(fromDecimal('1.5'), 'decimal')).toMatchObject({ text: '1.5', speech: 'one point five' })
  })

  it('lays out dots as ten-frames and fractions as bars', () => {
    expect(dotCells(7)).toEqual([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [1, 1]])
    expect(fractionBar(rat(7, 4))).toEqual({ parts: 4, filled: 3, wholes: 1 })
  })
})
