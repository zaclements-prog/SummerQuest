import type { ProblemProvider } from '../problem'
import type { ListenActivitySpec, ListenProblem } from '../../games/listenPlay/types'
import type { K_SORT_GROUPS } from '../../voice/packs/k-sort'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { randInt, shuffle } from '../random'
import { makeDeck, makePositionGuard } from './kShared'

/**
 * Kindergarten sorting and counting (Sorting Delta, K.MD.3), for the Listen
 * & Play `sort` activity: a few things to put into two or three boxes, each
 * box marked with pictures, a colour swatch or a size (never a word); then
 * "How many in this group?" with numeral cards, and later "Which group has
 * more?" (the child taps a box).
 *
 * Each stage is a round of five that ramps:
 * - `kind` (Animals or food): two boxes, four things, then five, then six;
 *   the boxes are animals and food (and once a round, toys);
 * - `colorSize` (Colors and sizes): by colour and by size, two boxes and then
 *   three, and "Which group has more?" from the third question on;
 * - `mix` (Sort and count): three boxes by kind or colour, two by size, six
 *   things each time, then count a group and say which has more.
 *
 * A thing never belongs to two boxes: the colour pictures are one clear
 * colour, and things that are both an animal and food (fish, eggs) are left out.
 */

export type SortGroup = (typeof K_SORT_GROUPS)[number]
export type SortRule = 'kind' | 'color' | 'size'

/** Pictures on each box: two examples (they never come up as things to sort). */
export const SORT_BOX_PICTURES: Record<'animals' | 'food' | 'toys', readonly [string, string]> = {
  animals: ['🐶', '🐱'],
  food: ['🍎', '🍌'],
  toys: ['⚽', '🎈'],
}

/** The things to sort, by group: emoji every Android tablet draws (Unicode 9 or older), one clear group each. */
export const SORT_PICTURES: Record<Exclude<SortGroup, 'big' | 'small'>, readonly string[]> = {
  animals: ['🐭', '🐰', '🐻', '🐷', '🐸', '🐵', '🐘', '🐴', '🐮', '🐯', '🦁', '🐼', '🐨', '🐧', '🐢'],
  food: ['🍇', '🍓', '🍉', '🍪', '🍕', '🍞', '🧀', '🥕', '🍩', '🍦', '🍐', '🍒', '🍋', '🍔', '🍰'],
  toys: ['🏀', '🎲', '🥁', '🏈', '🎮', '🎾', '🛴', '🏐', '🎯'],
  red: ['🍎', '🍓', '🍒', '❤️', '📕', '🚒', '🍅', '🐞', '🌹', '🚗'],
  blue: ['💙', '📘', '🐳', '💧', '👖', '🔵', '🌀'],
  yellow: ['💛', '⭐', '🍋', '🍌', '🐥', '🌻', '🚕'],
  green: ['💚', '📗', '🐸', '🍀', '🌲', '🐢', '🥒', '🍏', '🌵', '🍃'],
}
/** Things sorted by size: each can come big or small. */
export const SORT_SIZE_PICTURES: readonly string[] = ['🍎', '🐶', '⭐', '🚗', '🐟', '⚽', '🌻', '🐱', '🐻', '🍪', '🎈', '🐸']

export interface SortItem {
  pic: string
  /** The box it goes in (an index into `groups`). */
  box: number
  /** Sorting by size: drawn small (else big). */
  small?: boolean
}

/** A `sort` question (`ListenProblem.activity`). */
export interface SortSpec extends ListenActivitySpec {
  kind: 'sort'
  rule: SortRule
  /** The boxes, left to right. */
  groups: readonly SortGroup[]
  /** The things to sort, in the tray's order. */
  items: readonly SortItem[]
  /** Once sorted: the box whose things are counted ("How many in this group?"). */
  countBox: number
  /** The numeral cards for that count (one of them is the answer). */
  countCards: readonly number[]
  /** Then "Which group has more?": only when one box has the most. */
  more: boolean
}

export const isSortSpec = (s: { kind: string } | undefined): s is SortSpec => s?.kind === 'sort'

/** How many things each box gets once sorted. */
export const boxCounts = (s: Pick<SortSpec, 'groups' | 'items'>): number[] => s.groups.map((_, b) => s.items.filter((it) => it.box === b).length)

/** The box with the most (null when two share the most). */
export function mostBox(s: Pick<SortSpec, 'groups' | 'items'>): number | null {
  const c = boxCounts(s)
  const top = Math.max(...c)
  return c.filter((n) => n === top).length === 1 ? c.indexOf(top) : null
}

/** "Let's sort!", "Let's sort by color!", "Let's sort by size!" */
export const RULE_LINE: Record<SortRule, VoiceRef> = {
  kind: { line: 'k-sort/letsSort' },
  color: { line: 'k-sort/byColor' },
  size: { line: 'k-sort/bySize' },
}
/** A box's name, said as it lights up. */
export const boxName = (g: SortGroup): VoiceRef => ({ line: `k-sort/box-${g}` })
/** What a thing is, said when it went in the wrong box. */
export const isLine = (g: SortGroup): VoiceRef => ({ line: `k-sort/is-${g}` })

const PRAISE: VoiceRef[] = [{ line: 'k-sort/greatSorting' }, { line: 'k-sort/allSorted' }]

export type KSortMode = 'kind' | 'colorSize' | 'mix'

export interface KSortConfig {
  /** `kind` (Animals or food, the default), `colorSize` (Colors and sizes) or `mix` (Sort and count). */
  mode?: KSortMode
}

interface Plan {
  rule: SortRule
  boxes: 2 | 3
  /** How many go in each box (shuffled across the boxes). */
  split: readonly number[]
  more: boolean
}

function roundPlan(mode: KSortMode, coin: () => boolean): Plan[] {
  switch (mode) {
    case 'kind':
      return [
        { rule: 'kind', boxes: 2, split: [2, 2], more: false },
        { rule: 'kind', boxes: 2, split: [3, 1], more: false },
        { rule: 'kind', boxes: 2, split: [3, 2], more: false },
        { rule: 'kind', boxes: 2, split: [3, 2], more: false },
        { rule: 'kind', boxes: 2, split: [4, 2], more: false },
      ]
    case 'colorSize':
      return [
        { rule: 'color', boxes: 2, split: coin() ? [2, 2] : [3, 1], more: false },
        { rule: 'size', boxes: 2, split: [2, 2], more: false },
        { rule: 'color', boxes: 2, split: [3, 2], more: true },
        { rule: 'size', boxes: 2, split: [3, 2], more: true },
        { rule: 'color', boxes: 3, split: [3, 2, 1], more: true },
      ]
    case 'mix':
      return [
        { rule: 'kind', boxes: 3, split: [3, 2, 1], more: true },
        { rule: 'color', boxes: 3, split: [3, 2, 1], more: true },
        { rule: 'size', boxes: 2, split: [4, 2], more: true },
        { rule: 'kind', boxes: 3, split: coin() ? [3, 2, 1] : [4, 1, 1], more: true },
        { rule: 'color', boxes: 3, split: [3, 2, 1], more: true },
      ]
  }
}

const KINDS = ['animals', 'food', 'toys'] as const
const COLORS = ['red', 'blue', 'yellow', 'green'] as const

export function makeKSortProvider(cfg: KSortConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'kind'
  const decks: Record<string, { next(ok?: (x: string) => boolean): string }> = Object.fromEntries(Object.entries(SORT_PICTURES).map(([g, pics]) => [g, makeDeck(pics)]))
  const sizeDeck = makeDeck(SORT_SIZE_PICTURES)
  const cardPlaces = makePositionGuard()
  const morePlaces = makePositionGuard()
  const coin = () => randInt(0, 1) === 0
  let plan: Plan[] = []
  let asked = 0
  let serial = 0
  let kindRounds = 0
  let lastColors = ''

  /** Which groups the boxes are, left to right. */
  function boxesFor(p: Plan, at: number): SortGroup[] {
    if (p.rule === 'size') return coin() ? ['big', 'small'] : ['small', 'big']
    if (p.rule === 'color') {
      for (let tries = 0; ; tries++) {
        const cs = shuffle(COLORS).slice(0, p.boxes)
        const key = [...cs].sort().join()
        if (key !== lastColors || tries > 6) {
          lastColors = key
          return cs
        }
      }
    }
    if (p.boxes === 3) return shuffle(KINDS)
    // two boxes: animals and food, with toys once a round (in place of one of them)
    if (mode === 'kind' && at === 3) {
      kindRounds++
      return shuffle(kindRounds % 2 ? ['toys', 'food'] : ['animals', 'toys'])
    }
    return shuffle(['animals', 'food'])
  }

  /** `n` different pictures from the group (none twice in one question). */
  function picsOf(g: SortGroup, n: number, used: Set<string>): string[] {
    const deck = decks[g]
    const out: string[] = []
    for (let i = 0; i < n; i++) {
      const pic = deck.next((x) => !used.has(x))
      used.add(pic)
      out.push(pic)
    }
    return out
  }

  /** The numeral cards for a count of `n`: n with its neighbours, the answer moving between places. */
  function countCards(n: number): number[] {
    const near = n <= 1 ? [n + 1, n + 2] : [n - 1, n + 1]
    const cards = cardPlaces.arrange([n, ...near], n)
    cardPlaces.note(cards.indexOf(n))
    return cards
  }

  function question(p: Plan, at: number): SortSpec {
    for (let tries = 0; ; tries++) {
      const groups = boxesFor(p, at)
      // which box gets how many (the split shuffled over the boxes)
      const counts = shuffle(p.split).slice(0, groups.length)
      const used = new Set<string>()
      let items: SortItem[]
      if (p.rule === 'size') {
        // the same pictures come big and small: only the size tells the boxes apart
        // (no picture twice in one box)
        const kinds: string[] = []
        for (let i = 0; i < Math.max(...counts); i++) {
          const pic = sizeDeck.next((x) => !used.has(x))
          used.add(pic)
          kinds.push(pic)
        }
        items = groups.flatMap((g, box) => shuffle(kinds).slice(0, counts[box]).map((pic) => ({ pic, box, ...(g === 'small' ? { small: true } : {}) })))
      } else {
        items = groups.flatMap((g, box) => picsOf(g, counts[box], used).map((pic) => ({ pic, box })))
      }
      items = shuffle(items)
      // the tray never starts sorted already (all of one box, then all of the other)
      const runs = items.reduce((r, it, i) => r + (i > 0 && it.box !== items[i - 1].box ? 1 : 0), 1)
      if (runs <= groups.length && tries < 12) continue
      const spec0 = { groups, items }
      // count a box with two or more when there is one (counting to one is no counting)
      const countable = counts.map((n, b) => ({ n, b })).filter((x) => x.n >= 2)
      const countBox = (countable.length ? countable[randInt(0, countable.length - 1)] : { b: 0 }).b
      const most = mostBox(spec0)
      const more = p.more && most !== null
      if (more && morePlaces.wouldRepeat(most!) && tries < 12) continue
      if (more) morePlaces.note(most!)
      return { kind: 'sort', rule: p.rule, groups, items, countBox, countCards: countCards(counts[countBox]), more }
    }
  }

  return {
    topic: 'kSort',
    reset() {
      asked = 0
      serial = 0
      plan = []
      cardPlaces.reset()
      morePlaces.reset()
    },
    next(): ListenProblem {
      if (asked % 5 === 0) plan = roundPlan(mode, coin)
      const at = asked % 5
      const p = plan[at]
      asked++
      const spec = question(p, at)
      const speech = RULE_LINE[spec.rule]
      const counts = boxCounts(spec)
      return {
        id: `ksort-${serial++}`,
        topic: 'kSort',
        subtopic: `${spec.rule}-${spec.groups.length}`,
        prompt: voiceText(speech),
        // (answered by sorting, then counting, then picking a box: the activity checks each step)
        options: [],
        answer: counts.join('-'),
        difficulty: spec.items.length,
        skill: spec.more ? { id: 'k-sort-compare', label: 'counting and comparing groups' } : { id: 'k-sort', label: 'sorting into groups' },
        speech,
        praise: PRAISE,
        activity: spec,
      }
    },
  }
}
