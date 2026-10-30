/**
 * Snack Shack's money (src/games/SnackShack.tsx): coins and bills in whole
 * cents, the cash drawer each grade gets, what the change tray holds and the
 * fewest pieces that make an amount. Pure and tested.
 */

export type Denom = 'penny' | 'nickel' | 'dime' | 'quarter' | 'dollar' | 'five' | 'ten'

export interface DenomInfo {
  id: Denom
  cents: number
  /** The big label on the coin or bill. */
  label: string
  /** Said and shown in help ("a quarter", "2 dimes"). */
  one: string
  many: string
  bill: boolean
}

/** Biggest first (the order the fewest-pieces count uses). */
export const DENOMS: readonly DenomInfo[] = [
  { id: 'ten', cents: 1000, label: '$10', one: 'a 10 dollar bill', many: 'ten-dollar bills', bill: true },
  { id: 'five', cents: 500, label: '$5', one: 'a 5 dollar bill', many: 'five-dollar bills', bill: true },
  { id: 'dollar', cents: 100, label: '$1', one: 'a 1 dollar bill', many: 'one-dollar bills', bill: true },
  { id: 'quarter', cents: 25, label: '25¢', one: 'a quarter', many: 'quarters', bill: false },
  { id: 'dime', cents: 10, label: '10¢', one: 'a dime', many: 'dimes', bill: false },
  { id: 'nickel', cents: 5, label: '5¢', one: 'a nickel', many: 'nickels', bill: false },
  { id: 'penny', cents: 1, label: '1¢', one: 'a penny', many: 'pennies', bill: false },
]

export function denomInfo(id: Denom): DenomInfo {
  return DENOMS.find((d) => d.id === id)!
}

/** What is in the change tray: how many of each piece. */
export type Tray = Partial<Record<Denom, number>>

export function trayTotal(tray: Tray): number {
  let sum = 0
  for (const d of DENOMS) sum += (tray[d.id] ?? 0) * d.cents
  return sum
}

export function trayCount(tray: Tray): number {
  return DENOMS.reduce((n, d) => n + (tray[d.id] ?? 0), 0)
}

/** The tray with one more (or, `delta` −1, one fewer) of a piece; never below zero. */
export function trayAdd(tray: Tray, id: Denom, delta = 1): Tray {
  const n = Math.max(0, (tray[id] ?? 0) + delta)
  const next = { ...tray }
  if (n === 0) delete next[id]
  else next[id] = n
  return next
}

/** The fewest pieces from `drawer` that make `cents` exactly (greedy works for U.S. money). */
export function fewestPieces(cents: number, drawer: readonly Denom[]): Tray {
  let left = cents
  let tray: Tray = {}
  for (const d of DENOMS) {
    if (!drawer.includes(d.id)) continue
    const n = Math.floor(left / d.cents)
    if (n > 0) {
      tray = { ...tray, [d.id]: n }
      left -= n * d.cents
    }
  }
  return tray
}

/** "$3.75". */
export function dollars(cents: number): string {
  const c = Math.round(cents)
  return `$${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`
}

/** A price as a 2nd–3rd grader reads it: "75¢" under a dollar, "$2", "$1.50". */
export function priceText(cents: number, decimalsOnly = false): string {
  if (decimalsOnly) return dollars(cents)
  if (cents < 100) return `${cents}¢`
  return cents % 100 === 0 ? `$${cents / 100}` : dollars(cents)
}
