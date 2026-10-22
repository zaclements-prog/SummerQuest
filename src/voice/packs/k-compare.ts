import { defineVoicePack } from '../types'
import { numberWord } from '../../lib/numberWords'

/**
 * Things that go together, one for each: Number Dunes' "Line them up" (K.CC.6)
 * matches them one to one. The top row's thing (an animal, a baby) gets the
 * bottom row's. The pictures are emoji every Android tablet draws (Unicode 9
 * or older, one symbol each); `a` is the singular with its article.
 */
export const K_PAIRS = [
  { id: 'bees', top: { one: 'bee', many: 'bees', emoji: '🐝' }, bottom: { one: 'flower', a: 'a flower', many: 'flowers', emoji: '🌼' } },
  { id: 'bunnies', top: { one: 'bunny', many: 'bunnies', emoji: '🐰' }, bottom: { one: 'carrot', a: 'a carrot', many: 'carrots', emoji: '🥕' } },
  { id: 'monkeys', top: { one: 'monkey', many: 'monkeys', emoji: '🐵' }, bottom: { one: 'banana', a: 'a banana', many: 'bananas', emoji: '🍌' } },
  { id: 'cats', top: { one: 'cat', many: 'cats', emoji: '🐱' }, bottom: { one: 'fish', a: 'a fish', many: 'fish', emoji: '🐟' } },
  { id: 'bears', top: { one: 'bear', many: 'bears', emoji: '🐻' }, bottom: { one: 'ball', a: 'a ball', many: 'balls', emoji: '⚽' } },
  { id: 'hens', top: { one: 'hen', many: 'hens', emoji: '🐔' }, bottom: { one: 'egg', a: 'an egg', many: 'eggs', emoji: '🥚' } },
  { id: 'babies', top: { one: 'baby', many: 'babies', emoji: '👶' }, bottom: { one: 'bottle', a: 'a bottle', many: 'bottles', emoji: '🍼' } },
  { id: 'horses', top: { one: 'horse', many: 'horses', emoji: '🐴' }, bottom: { one: 'apple', a: 'an apple', many: 'apples', emoji: '🍎' } },
] as const

export type KPair = (typeof K_PAIRS)[number]
export type KPairId = KPair['id']

/** The numbers Number Dunes compares and orders (K.CC.6–7: within 10). */
export const K_DUNES_MAX = 10

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const w = numberWord

/** Lines built from a list: `{ [id]: text }`. */
const each = <T,>(xs: readonly T[], f: (x: T) => [string, string][]) => Object.fromEntries(xs.flatMap(f))
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
const pairsOf = (lo: number, hi: number) => range(lo, hi).flatMap((a) => range(lo, hi).filter((b) => b !== a).map((b) => [a, b] as const))

/**
 * Number Dunes (K.CC.6–7, K.CC.4c): matching two groups one to one (more,
 * fewer or the same), comparing two written numbers, one more and one less,
 * and putting numbers in order. Every sentence is recorded whole: the number
 * lines are built here for each pair of numbers that is ever asked, so none
 * is recorded that is never said.
 */
export default defineVoicePack({
  id: 'k-compare',
  lines: {
    // ── Line them up (the `match` activity) ──
    // "Are there more bees or more flowers? Or are they the same?": the rows light up,
    // then each answer card on its word (the bees' card, the flowers', ⚖️ on "same")
    ...each(K_PAIRS, (p) => [
      [`ask-more-${p.id}`, `Are there more ${p.top.many} or more ${p.bottom.many}? Or are they the same?`],
      [`ask-fewer-${p.id}`, `Are there fewer ${p.top.many} or fewer ${p.bottom.many}? Or are they the same?`],
    ]),
    // the cards' names, said as they are tapped
    ...each(K_PAIRS, (p) => [
      [`thing-${p.top.many}`, `${cap(p.top.many)}!`],
      [`thing-${p.bottom.many}`, `${cap(p.bottom.many)}!`],
    ]),
    same: 'The same!',
    // the help after a miss: the rows line up, the pairs are counted (listen/count…), then what's left over
    lineUp: "Let's line them up!",
    ...each(K_PAIRS, (p) => [
      [`same-${p.id}`, `Every ${p.top.one} has ${p.bottom.a}. They are the same!`],
      [`left-${p.id}-top`, `Some ${p.top.many} have no ${p.bottom.one}.`],
      [`left-${p.id}-bottom`, `Some ${p.bottom.many} have no ${p.top.one}.`],
      [`more-${p.top.many}`, `There are more ${p.top.many}!`],
      [`more-${p.bottom.many}`, `There are more ${p.bottom.many}!`],
      [`fewer-${p.top.many}`, `There are fewer ${p.top.many}!`],
      [`fewer-${p.bottom.many}`, `There are fewer ${p.bottom.many}!`],
    ]),

    // ── Which is more? (two written numbers, 1–10) ──
    // the cards light on their numbers; after a miss each card shows its ten-frame, counted
    ...each(pairsOf(1, K_DUNES_MAX), ([a, b]) => [
      [`more-${a}-${b}`, `Which number is more, ${w(a)} or ${w(b)}?`],
      [`less-${a}-${b}`, `Which number is less, ${w(a)} or ${w(b)}?`],
    ]),
    countEach: "Let's count the dots on each one.",
    // said after the count-along, the bigger number first or the smaller first as asked
    ...each(pairsOf(1, K_DUNES_MAX), ([a, b]) => (a > b ? [[`isMore-${a}-${b}`, `${cap(w(a))} is more than ${w(b)}.`]] : [[`isLess-${a}-${b}`, `${cap(w(a))} is less than ${w(b)}.`]])),

    // ── one more, one less (K.CC.4c): a ten-frame, a dot drops in or hops away on its words ──
    ...each(range(1, K_DUNES_MAX - 1), (n) => [
      [`oneMore-${n}`, `Here ${n === 1 ? 'is one dot' : `are ${w(n)} dots`}. One more comes! How many now?`],
      [`oneMoreIs-${n}`, `${cap(w(n))} and one more is ${w(n + 1)}.`],
    ]),
    ...each(range(2, K_DUNES_MAX), (n) => [
      [`oneLess-${n}`, `Here are ${w(n)} dots. One hops away! How many now?`],
      [`oneLessIs-${n}`, `${cap(w(n))}, take away one, is ${w(n - 1)}.`],
    ]),

    // ── numbers in order (the `numberOrder` activity) ──
    orderAsk: 'Put the numbers in order! Tap the smallest number first.',
    orderNext: 'Which number comes next? Tap it!',
    orderHelp: "Let's count them in order.",

    // ── praise (taking turns with the kit's own) ──
    greatMatching: 'Great matching!',
    inOrder: 'You put them in order!',
  },
})
