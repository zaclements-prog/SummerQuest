import { afterEach, describe, expect, it, vi } from 'vitest'
import { seededRng } from '../../random'
import { createProvider } from '..'
import { GRAPH_PICTURE, asksRow, graphAnswer, graphQuestion, graphTotal, isGraphSpec, makeG1GraphsProvider, topicLine, type G1GraphsMode, type GraphSpec } from '../g1Graphs'
import { G1_GRAPH_THINGS, G1_GRAPH_TOPICS, isLineId, rowLineId } from '../../../voice/packs/g1-graphs'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { SKILLS } from '../../../tutoring/skills'
import { getZone, zoneStages } from '../../../curriculum'

/**
 * Graph Delta (1.MD.4): every graph a 1st grader is given, over many seeds,
 * asks a question with exactly one answer (never a tie for the most or the
 * fewest, never a "how many more" of zero), the numeral cards are the answer
 * and sensible mistakes, the pictures are emoji every tablet draws, and every
 * line it says resolves.
 */

afterEach(() => vi.restoreAllMocks())

const SEEDS = 40
const said = (ref: VoiceRef | null | undefined) => {
  expect(ref).toBeTruthy()
  return voiceText(ref!)
}

/** Unicode 9 or older, one symbol (a text-default symbol may carry U+FE0F). */
function oldEmoji(e: string): boolean {
  const cps = [...e].map((c) => c.codePointAt(0)!).filter((cp) => cp !== 0xfe0f)
  if (cps.length !== 1) return false
  const cp = cps[0]
  return cp < 0x1f6d3 || (cp >= 0x1f910 && cp <= 0x1f91e) || (cp >= 0x1f940 && cp <= 0x1f94b) || (cp >= 0x1f950 && cp <= 0x1f95e) || (cp >= 0x1f980 && cp <= 0x1f991) || cp === 0x1f9c0
}

function round(mode: G1GraphsMode, seed: string, n = 12): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = makeG1GraphsProvider({ mode })
  return Array.from({ length: n }, () => p.next())
}
const spec = (q: ListenProblem): GraphSpec => {
  expect(isGraphSpec(q.activity)).toBe(true)
  return q.activity as GraphSpec
}

describe('Graph Delta: the stages', () => {
  it('are the contract’s three stages: make a graph, read the graph, tally marks', () => {
    const set = zoneStages(getZone('data-delta')!, 1)
    expect(set.map((s) => [s.id, (s.providerConfig as { mode?: string }).mode])).toEqual([
      ['g1-graphs-1', 'build'],
      ['g1-graphs-2', 'read'],
      ['g1-graphs-3', 'tally'],
    ])
    for (const s of set) expect(createProvider(s.providerConfig).topic).toBe('g1Graphs')
  })

  it('ramp: making picture graphs first (how many, the most, the fewest), then reading, then tallies', () => {
    for (let s = 0; s < 10; s++) {
      const build = round('build', `ramp-b-${s}`, 5).map(spec)
      expect(build.every((g) => g.tray && g.style === 'picture')).toBe(true)
      expect(build.map((g) => g.ask).slice(0, 4)).toEqual(['howMany', 'howMany', 'most', 'fewest'])
      expect(build[0].rows).toHaveLength(2)
      expect(build.slice(1).every((g) => g.rows.length === 3)).toBe(true)
      const read = round('read', `ramp-r-${s}`, 6).map(spec)
      expect(read.every((g) => !g.tray && g.style === 'picture')).toBe(true)
      expect(read.map((g) => g.ask).slice(0, 5)).toEqual(['howMany', 'most', 'howMany', 'fewest', 'inAll'])
      const tally = round('tally', `ramp-t-${s}`, 6).map(spec)
      expect(tally[0].tray && tally[0].style === 'tally').toBeTruthy()
      expect(tally.slice(1, 4).map((g) => g.ask)).toEqual(['howMany', 'more', 'fewer'])
    }
  })
})

describe('every Graph Delta question', () => {
  for (const mode of ['build', 'read', 'tally'] as const) {
    it(`${mode}: one answer, fair cards, pictures every tablet draws, every line said`, () => {
      const rowAt: number[] = []
      for (let s = 0; s < SEEDS; s++) {
        for (const q of round(mode, `${mode}-${s}`)) {
          const g = spec(q)
          // the rows: two or three different things of the topic, each its own picture
          const topic = G1_GRAPH_TOPICS[g.topic] as readonly string[]
          expect(g.rows.length).toBeGreaterThanOrEqual(2)
          expect(g.rows.length).toBeLessThanOrEqual(3)
          expect(new Set(g.rows).size).toBe(g.rows.length)
          for (const r of g.rows) {
            expect(topic).toContain(r)
            expect(oldEmoji(GRAPH_PICTURE[r]), r).toBe(true)
          }
          expect(new Set(g.rows.map((r) => GRAPH_PICTURE[r])).size).toBe(g.rows.length)
          // the counts: all different (so the most and the fewest are one row), each fits its row
          expect(new Set(g.counts).size).toBe(g.counts.length)
          for (const n of g.counts) {
            expect(n).toBeGreaterThanOrEqual(1)
            expect(n).toBeLessThanOrEqual(g.style === 'tally' ? 9 : 7)
          }
          // made by sorting: the tray holds every pick, and is never sorted already
          if (g.tray) {
            expect(g.counts.map((_, r) => g.tray!.filter((x) => x === r).length)).toEqual([...g.counts])
            const runs = g.tray.reduce((k, r, i) => k + (i > 0 && r !== g.tray![i - 1] ? 1 : 0), 1)
            expect(runs).toBeGreaterThan(g.rows.length)
          }
          // the answer, worked out again
          const c = g.counts
          const [a, b] = g.about ?? []
          let want: number
          switch (g.ask) {
            case 'howMany':
              expect(c[a]).toBeGreaterThanOrEqual(2)
              want = c[a]
              break
            case 'inAll':
              want = c.reduce((x, y) => x + y, 0)
              expect(want).toBeLessThanOrEqual(20)
              break
            case 'more':
              want = c[a] - c[b]
              break
            case 'fewer':
              want = c[b] - c[a]
              break
            case 'most':
              want = c.indexOf(Math.max(...c))
              break
            case 'fewest':
              want = c.indexOf(Math.min(...c))
              break
          }
          expect(graphAnswer(g)).toBe(want)
          if (asksRow(g)) {
            expect(c.filter((n) => n === c[want])).toHaveLength(1)
            expect(q.answer).toBe(g.rows[want])
            expect(g.cards).toBeUndefined()
            rowAt.push(want)
          } else {
            expect(want).toBeGreaterThanOrEqual(1)
            expect(q.answer).toBe(want)
            expect(g.cards).toHaveLength(3)
            expect(new Set(g.cards).size).toBe(3)
            expect(g.cards!.filter((n) => n === want)).toHaveLength(1)
            for (const n of g.cards!) {
              expect(n).toBeGreaterThanOrEqual(1)
              expect(n).toBeLessThanOrEqual(20)
            }
            // "how many more": the bigger row's own count is the mistake on offer
            if (g.ask === 'more' || g.ask === 'fewer') expect(g.cards).toContain(Math.max(c[a], c[b]))
          }
          expect(graphTotal(g)).toBe(c.reduce((x, y) => x + y, 0))
          // what is said
          expect(q.prompt).toBe(`${said(topicLine(g.topic))} ${said(graphQuestion(g))}`)
          expect(q.speech).toEqual(graphQuestion(g))
          for (const r of g.rows) {
            said({ line: rowLineId(r) })
            said({ line: isLineId(r) })
          }
          expect(SKILLS[q.skill!.id], q.skill!.id).toBeDefined()
          for (const p of q.praise ?? []) said(p)
        }
      }
      // the row to tap moves about
      if (rowAt.length) expect(new Set(rowAt).size).toBeGreaterThanOrEqual(2)
    })
  }

  it('every thing has a picture, a row name and a line for what it is', () => {
    for (const t of G1_GRAPH_THINGS) {
      expect(oldEmoji(GRAPH_PICTURE[t]), t).toBe(true)
      said({ line: rowLineId(t) })
      said({ line: isLineId(t) })
      said({ template: 'g1-graphs/howMany', slots: { thing: t } })
    }
  })
})
