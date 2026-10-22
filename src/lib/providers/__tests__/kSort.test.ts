import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProvider } from '..'
import { RULE_LINE, SORT_BOX_PICTURES, SORT_PICTURES, SORT_SIZE_PICTURES, boxCounts, boxName, isLine, makeKSortProvider, mostBox, type KSortMode, type SortSpec } from '../kSort'
import { K_SORT_GROUPS } from '../../../voice/packs/k-sort'
import { seededRng } from '../../random'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import { SKILLS } from '../../../tutoring/skills'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { curriculum, zoneStages } from '../../../curriculum'

/**
 * Sorting Delta (K.MD.3): every question can be sorted one way only (each
 * thing belongs to exactly one box, the boxes are told apart by pictures,
 * colours or size), the count cards hold the count once, "which has more?"
 * only comes with one biggest group, each stage ramps the way the plan says,
 * and everything said resolves. Many seeds, a fresh provider each.
 */

afterEach(() => vi.restoreAllMocks())

const SEEDS = Array.from({ length: 12 }, (_, i) => `s${i}`)
const ROUNDS = 8

function draw(mode: KSortMode, seed: string, n = 5 * ROUNDS): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(`ksort:${mode}:${seed}`))
  const p = makeKSortProvider({ mode })
  const out = Array.from({ length: n }, () => p.next())
  vi.restoreAllMocks()
  return out
}
const runs = (mode: KSortMode) => SEEDS.map((s) => draw(mode, s))
const spec = (q: ListenProblem) => q.activity as SortSpec
const said = (ref: VoiceRef | null | undefined) => {
  expect(ref).toBeTruthy()
  return voiceText(ref!)
}

/** Unicode 9 or older, one symbol (a text-default symbol may carry U+FE0F). */
function oldEmoji(e: string): boolean {
  const cps = [...e].map((c) => c.codePointAt(0)!).filter((cp) => cp !== 0xfe0f)
  if (cps.length !== 1) return false
  const cp = cps[0]
  return (
    cp < 0x1f6d3 ||
    (cp >= 0x1f6e0 && cp <= 0x1f6f6) ||
    (cp >= 0x1f910 && cp <= 0x1f91e) ||
    (cp >= 0x1f920 && cp <= 0x1f927) ||
    (cp >= 0x1f930 && cp <= 0x1f93e) ||
    (cp >= 0x1f940 && cp <= 0x1f94b) ||
    (cp >= 0x1f950 && cp <= 0x1f95e) ||
    (cp >= 0x1f980 && cp <= 0x1f991) ||
    cp === 0x1f9c0
  )
}

const KIND = ['animals', 'food', 'toys']
const COLOR = ['red', 'blue', 'yellow', 'green']

function fair(q: ListenProblem) {
  const s = spec(q)
  const where = `${q.prompt} ${JSON.stringify(s)}`
  expect(s.kind, where).toBe('sort')
  expect(q.options, where).toEqual([])
  expect(q.prompt, where).toBe(said(q.speech))
  expect(q.speech, where).toEqual(RULE_LINE[s.rule])
  for (const p of q.praise ?? []) said(p)
  expect(SKILLS[q.skill!.id], where).toBeDefined()
  // 2–3 different boxes, all of the rule
  expect(s.groups.length, where).toBeGreaterThanOrEqual(2)
  expect(s.groups.length, where).toBeLessThanOrEqual(3)
  expect(new Set(s.groups).size, where).toBe(s.groups.length)
  const ruleGroups = s.rule === 'kind' ? KIND : s.rule === 'color' ? COLOR : ['big', 'small']
  for (const g of s.groups) expect(ruleGroups, where).toContain(g)
  // 4–6 things, each in exactly one box, every box gets one or more
  expect(s.items.length, where).toBeGreaterThanOrEqual(4)
  expect(s.items.length, where).toBeLessThanOrEqual(6)
  const counts = boxCounts(s)
  for (const n of counts) expect(n, where).toBeGreaterThanOrEqual(1)
  expect(q.answer, where).toBe(counts.join('-'))
  for (const it of s.items) {
    expect(it.box, where).toBeGreaterThanOrEqual(0)
    expect(it.box, where).toBeLessThan(s.groups.length)
    expect(oldEmoji(it.pic), `${it.pic} draws on every tablet`).toBe(true)
    const g = s.groups[it.box]
    if (s.rule === 'size') {
      expect(SORT_SIZE_PICTURES, where).toContain(it.pic)
      expect(!!it.small, where).toBe(g === 'small')
    } else {
      expect(SORT_PICTURES[g as keyof typeof SORT_PICTURES], where).toContain(it.pic)
      expect(it.small, where).toBeUndefined()
      // never one that could go in another box of this question
      for (const other of s.groups) if (other !== g) expect(SORT_PICTURES[other as keyof typeof SORT_PICTURES], `${it.pic} also fits ${other}: ${where}`).not.toContain(it.pic)
      // a box's own example pictures never come up as things to sort
      if (s.rule === 'kind') for (const k of s.groups) expect(SORT_BOX_PICTURES[k as 'animals'], where).not.toContain(it.pic)
    }
  }
  // no picture twice in one box (sorting by size, the same picture comes big and small, in different boxes)
  for (let b = 0; b < s.groups.length; b++) {
    const pics = s.items.filter((it) => it.box === b).map((it) => it.pic)
    expect(new Set(pics).size, where).toBe(pics.length)
  }
  if (s.rule !== 'size') expect(new Set(s.items.map((it) => it.pic)).size, where).toBe(s.items.length)
  // the tray never starts sorted
  const runs = s.items.reduce((r, it, i) => r + (i > 0 && it.box !== s.items[i - 1].box ? 1 : 0), 1)
  expect(runs, where).toBeGreaterThan(s.groups.length)
  // counting: a box with two or more; three different numeral cards, the count once
  expect(counts[s.countBox], where).toBeGreaterThanOrEqual(2)
  expect(s.countCards, where).toHaveLength(3)
  expect(new Set(s.countCards).size, where).toBe(3)
  expect(s.countCards.filter((n) => n === counts[s.countBox]), where).toHaveLength(1)
  for (const n of s.countCards) {
    expect(Number.isInteger(n) && n >= 1 && n <= 10, where).toBe(true)
    // each is a neighbour of the count (one or two away): close enough to make the child count
    expect(Math.abs(n - counts[s.countBox]), where).toBeLessThanOrEqual(2)
  }
  // which has more: one biggest box
  if (s.more) expect(mostBox(s), where).not.toBeNull()
  expect(q.skill!.id, where).toBe(s.more ? 'k-sort-compare' : 'k-sort')
}

describe('Sorting Delta questions (kSort)', () => {
  it('the stage configs in the curriculum: three modes, rounds of five', () => {
    const stages = zoneStages(curriculum.zones.find((z) => z.id === 'data-delta')!, 0)
    expect(stages.map((s) => s.providerConfig)).toEqual([
      { kind: 'kSort', mode: 'kind' },
      { kind: 'kSort', mode: 'colorSize' },
      { kind: 'kSort', mode: 'mix' },
    ])
    for (const s of stages) expect(s.params?.questionCount).toBe(5)
    expect((createProvider(stages[0].providerConfig).next() as ListenProblem).activity?.kind).toBe('sort')
  })

  for (const mode of ['kind', 'colorSize', 'mix'] as const) {
    it(`${mode}: every question can be sorted one way only, counted and compared (${SEEDS.length} seeds × ${ROUNDS} rounds)`, () => {
      for (const run of runs(mode)) for (const q of run) fair(q)
    })

    it(`${mode}: the right count card and the box with more move around`, () => {
      for (const run of runs(mode)) {
        const cardAt = run.map((q) => spec(q).countCards.indexOf(boxCounts(spec(q))[spec(q).countBox]))
        for (let i = 2; i < cardAt.length; i++) expect(cardAt[i] === cardAt[i - 1] && cardAt[i] === cardAt[i - 2], cardAt.join('')).toBe(false)
        const moreAt = run.filter((q) => spec(q).more).map((q) => mostBox(spec(q)))
        for (let i = 2; i < moreAt.length; i++) expect(moreAt[i] === moreAt[i - 1] && moreAt[i] === moreAt[i - 2], moreAt.join('')).toBe(false)
      }
    })
  }

  it('Animals or food ramps: two boxes, four things, then five, then six; animals and food (toys once a round)', () => {
    for (const run of runs('kind')) {
      for (let r = 0; r < ROUNDS; r++) {
        const round = run.slice(r * 5, r * 5 + 5).map(spec)
        expect(round.map((s) => s.items.length)).toEqual([4, 4, 5, 5, 6])
        expect(round.every((s) => s.rule === 'kind' && s.groups.length === 2 && !s.more)).toBe(true)
        expect(round.filter((s) => s.groups.includes('toys'))).toHaveLength(1)
        expect(round[3].groups).toContain('toys')
      }
    }
  })

  it('Colors and sizes: colour, size, colour, size, then three colour boxes; "which has more?" from the third', () => {
    for (const run of runs('colorSize')) {
      for (let r = 0; r < ROUNDS; r++) {
        const round = run.slice(r * 5, r * 5 + 5).map(spec)
        expect(round.map((s) => s.rule)).toEqual(['color', 'size', 'color', 'size', 'color'])
        expect(round.map((s) => s.groups.length)).toEqual([2, 2, 2, 2, 3])
        expect(round.map((s) => s.more)).toEqual([false, false, true, true, true])
      }
    }
  })

  it('Sort and count: six things each time, three boxes by kind or colour, two by size, always "which has more?"', () => {
    for (const run of runs('mix')) {
      for (let r = 0; r < ROUNDS; r++) {
        const round = run.slice(r * 5, r * 5 + 5).map(spec)
        expect(round.map((s) => s.rule)).toEqual(['kind', 'color', 'size', 'kind', 'color'])
        expect(round.every((s) => s.items.length === 6 && s.more)).toBe(true)
        expect(round.map((s) => s.groups.length)).toEqual([3, 3, 2, 3, 3])
      }
    }
  })

  it('the picture lists are in step with the voice pack, and every picture is one tablets draw', () => {
    expect(Object.keys(SORT_PICTURES).sort()).toEqual(K_SORT_GROUPS.filter((g) => g !== 'big' && g !== 'small').sort())
    for (const pics of [...Object.values(SORT_PICTURES), ...Object.values(SORT_BOX_PICTURES), SORT_SIZE_PICTURES]) for (const p of pics) expect(oldEmoji(p), p).toBe(true)
    // no picture in two colour groups, or in two kind groups
    for (const set of [COLOR, KIND]) {
      const all = set.flatMap((g) => SORT_PICTURES[g as keyof typeof SORT_PICTURES])
      expect(new Set(all).size, set.join()).toBe(all.length)
    }
    // nothing ambiguous between animals and food (fish, eggs, chickens)
    for (const p of ['🐟', '🥚', '🐔', '🦀', '🦐']) for (const g of KIND) expect(SORT_PICTURES[g as 'food']).not.toContain(p)
  })

  it('everything the activity says resolves: the rule, each box, what each thing is, counting and comparing', () => {
    for (const g of K_SORT_GROUPS) {
      said(boxName(g))
      said(isLine(g))
    }
    for (const r of Object.values(RULE_LINE)) said(r)
    expect(voiceText({ line: 'k-sort/howMany' })).toMatch(/Tap/)
    expect(voiceText({ line: 'k-sort/whichMore' })).toMatch(/Tap/)
    said({ line: 'k-sort/putEach' })
  })

  it('reset() starts the round over', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('ksort-reset'))
    const p = makeKSortProvider({ mode: 'kind' })
    p.next()
    p.next()
    p.next()
    p.reset?.()
    expect(spec(p.next()).items).toHaveLength(4)
  })
})
