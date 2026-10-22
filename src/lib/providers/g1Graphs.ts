import type { ProblemProvider } from '../problem'
import type { ListenActivitySpec, ListenProblem } from '../../games/listenPlay/types'
import { G1_GRAPH_TOPICS, type GraphThing, type GraphTopic } from '../../voice/packs/g1-graphs'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { randInt, shuffle } from '../random'
import { makeDeck, makePositionGuard } from './kShared'

/**
 * 1st-grade data (Graph Delta, 1.MD.4), for the Listen & Play `graph`
 * activity: what our friends picked (their favorite fruit, pet, treat or ball
 * game), shown as a graph of two or three rows, each row marked with its
 * picture (never a word): one picture for each friend, or one tally mark.
 *
 * Each stage is a round that ramps:
 * - `build` (Make a graph): the friends' picks wait in a tray; the child puts
 *   each one in its row (a picture graph), then "How many friends like
 *   apples?", "Which one has the most?", the fewest, how many in all;
 * - `read` (Read the graph): a graph that is made already, three rows: how
 *   many, the most, the fewest, how many in all, how many more;
 * - `tally` (Tally marks): a tally graph made by sorting (each pick becomes a
 *   mark), then tally graphs to read: how many, how many more and how many
 *   fewer, in all, the most.
 *
 * The most and the fewest are never a tie; "how many more" always has a
 * positive answer. The numeral cards are the answer and the mistakes children
 * make (one off; the bigger row's own count for "how many more").
 */

export type GraphAsk = 'howMany' | 'most' | 'fewest' | 'inAll' | 'more' | 'fewer'
export type GraphStyle = 'picture' | 'tally'

/** Each thing's picture: emoji every Android tablet draws (Unicode 9 or older). */
export const GRAPH_PICTURE: Record<GraphThing, string> = {
  apples: '🍎',
  bananas: '🍌',
  grapes: '🍇',
  strawberries: '🍓',
  dogs: '🐶',
  cats: '🐱',
  fish: '🐟',
  rabbits: '🐰',
  cookies: '🍪',
  'ice cream': '🍦',
  cake: '🍰',
  donuts: '🍩',
  soccer: '⚽',
  basketball: '🏀',
  baseball: '⚾',
  football: '🏈',
}

/** A `graph` question (`ListenProblem.activity`). */
export interface GraphSpec extends ListenActivitySpec {
  kind: 'graph'
  topic: GraphTopic
  /** The rows, top to bottom (two or three things of the topic). */
  rows: readonly GraphThing[]
  /** How many friends picked each row's thing. */
  counts: readonly number[]
  /** One picture for each friend, or one tally mark. */
  style: GraphStyle
  /** The child makes the graph first: the friends' picks in the tray, as a row index each (the tray's order). */
  tray?: readonly number[]
  ask: GraphAsk
  /** `howMany`: [the row]; `more` / `fewer`: [a, b] ("how many more like a than b?"). */
  about?: readonly number[]
  /** The numeral cards (every ask but the most and the fewest, which tap a row). */
  cards?: readonly number[]
}

export const isGraphSpec = (s: { kind: string } | undefined): s is GraphSpec => s?.kind === 'graph'

export const graphTotal = (s: Pick<GraphSpec, 'counts'>) => s.counts.reduce((a, b) => a + b, 0)

/** The answer: a number, or (the most, the fewest) the row's index. */
export function graphAnswer(s: GraphSpec): number {
  const c = s.counts
  const [a, b] = s.about ?? [0, 0]
  switch (s.ask) {
    case 'howMany':
      return c[a]
    case 'inAll':
      return graphTotal(s)
    case 'more':
      return c[a] - c[b]
    case 'fewer':
      return c[b] - c[a]
    case 'most':
      return c.indexOf(Math.max(...c))
    case 'fewest':
      return c.indexOf(Math.min(...c))
  }
}

/** Is the answer a row (tapped) rather than a numeral card? */
export const asksRow = (s: Pick<GraphSpec, 'ask'>) => s.ask === 'most' || s.ask === 'fewest'

/** "Our friends picked their favorite fruit." */
export const topicLine = (t: GraphTopic): VoiceRef => ({ line: `g1-graphs/topic-${t}` })

/** The question, as it is said once the graph is there. */
export function graphQuestion(s: GraphSpec): VoiceRef {
  const [a, b] = s.about ?? [0, 0]
  switch (s.ask) {
    case 'howMany':
      return { template: 'g1-graphs/howMany', slots: { thing: s.rows[a] } }
    case 'most':
      return { line: 'g1-graphs/most' }
    case 'fewest':
      return { line: 'g1-graphs/fewest' }
    case 'inAll':
      return { line: 'g1-graphs/inAll' }
    case 'more':
    case 'fewer':
      return { template: `g1-graphs/${s.ask}`, slots: { pair: `${s.rows[a]} than ${s.rows[b]}` } }
  }
}

export type G1GraphsMode = 'build' | 'read' | 'tally'

export interface G1GraphsConfig {
  /** `build` (Make a graph, the default), `read` (Read the graph) or `tally` (Tally marks). */
  mode?: G1GraphsMode
}

interface Plan {
  style: GraphStyle
  build: boolean
  rows: 2 | 3
  ask: GraphAsk
  /** How many friends in each row: [min, max]. */
  range: readonly [number, number]
  /** The total, when the graph is built (the tray holds this many). */
  total?: readonly [number, number]
}

function roundPlan(mode: G1GraphsMode, coin: () => boolean): Plan[] {
  switch (mode) {
    case 'build':
      return [
        { style: 'picture', build: true, rows: 2, ask: 'howMany', range: [1, 4], total: [5, 5] },
        { style: 'picture', build: true, rows: 3, ask: 'howMany', range: [1, 4], total: [6, 6] },
        { style: 'picture', build: true, rows: 3, ask: 'most', range: [1, 4], total: [6, 7] },
        { style: 'picture', build: true, rows: 3, ask: 'fewest', range: [1, 4], total: [6, 7] },
        { style: 'picture', build: true, rows: 3, ask: coin() ? 'inAll' : 'more', range: [1, 4], total: [7, 8] },
      ]
    case 'read':
      return [
        { style: 'picture', build: false, rows: 3, ask: 'howMany', range: [1, 6] },
        { style: 'picture', build: false, rows: 3, ask: 'most', range: [1, 7] },
        { style: 'picture', build: false, rows: 3, ask: 'howMany', range: [2, 7] },
        { style: 'picture', build: false, rows: 3, ask: 'fewest', range: [1, 7] },
        { style: 'picture', build: false, rows: 3, ask: 'inAll', range: [1, 5] },
        { style: 'picture', build: false, rows: 3, ask: coin() ? 'more' : 'fewer', range: [1, 7] },
      ]
    case 'tally':
      return [
        { style: 'tally', build: true, rows: coin() ? 2 : 3, ask: 'howMany', range: [1, 5], total: [6, 7] },
        { style: 'tally', build: false, rows: 3, ask: 'howMany', range: [3, 9] },
        { style: 'tally', build: false, rows: 3, ask: 'more', range: [2, 9] },
        { style: 'tally', build: false, rows: 3, ask: 'fewer', range: [2, 9] },
        { style: coin() ? 'picture' : 'tally', build: false, rows: 3, ask: coin() ? 'more' : 'fewer', range: [1, 7] },
        { style: 'tally', build: false, rows: 3, ask: coin() ? 'inAll' : 'most', range: [2, 6] },
      ]
  }
}

const SKILL: Record<'make' | 'read' | 'compare', { id: string; label: string }> = {
  make: { id: 'g1-graphs-make', label: 'making picture graphs' },
  read: { id: 'g1-graphs-read', label: 'reading picture and tally graphs' },
  compare: { id: 'g1-graphs-compare', label: 'how many more and how many fewer' },
}

const PRAISE: VoiceRef[] = [{ line: 'g1-graphs/greatGraphing' }, { line: 'g1-graphs/readGraph' }]

export function makeG1GraphsProvider(cfg: G1GraphsConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode: G1GraphsMode = cfg.mode === 'read' || cfg.mode === 'tally' ? cfg.mode : 'build'
  const topics = makeDeck(Object.keys(G1_GRAPH_TOPICS) as GraphTopic[])
  const cardPlaces = makePositionGuard()
  const rowPlaces = makePositionGuard()
  const coin = () => randInt(0, 1) === 0
  let plan: Plan[] = []
  let asked = 0
  let serial = 0

  /** Row counts in range, all different (so the most and the fewest are one row each), adding up to `total` when given. */
  function countsFor(p: Plan): number[] {
    for (let tries = 0; ; tries++) {
      const [lo, hi] = p.range
      const c = Array.from({ length: p.rows }, () => randInt(lo, hi))
      if (new Set(c).size !== c.length) continue
      if (p.total) {
        const sum = c.reduce((a, b) => a + b, 0)
        if ((sum < p.total[0] || sum > p.total[1]) && tries < 400) continue
      }
      if (p.ask === 'inAll' && c.reduce((a, b) => a + b, 0) > 20) continue
      return c
    }
  }

  /** The tray: every pick, mixed up (never already in rows: no run of one row as long as the row). */
  function trayFor(counts: number[]): number[] {
    const picks = counts.flatMap((n, r) => Array.from({ length: n }, () => r))
    const runsOf = (xs: number[]) => xs.reduce((k, r, i) => k + (i > 0 && r !== xs[i - 1] ? 1 : 0), 1)
    // the most mixed of a few shuffles (well mixed is soon found: stop there)
    let best = shuffle(picks)
    for (let tries = 0; tries < 30 && runsOf(best) <= counts.length + 1; tries++) {
      const next = shuffle(picks)
      if (runsOf(next) > runsOf(best)) best = next
    }
    return best
  }

  /** Numeral cards: the answer, one off, and (how many more) the bigger row's own count. */
  function cardsFor(n: number, ask: GraphAsk, bigRow: number): number[] {
    const near = n <= 1 ? [n + 1, n + 2] : [n - 1, n + 1]
    const others = near.filter((x) => x !== bigRow)
    const pool = (ask === 'more' || ask === 'fewer') && bigRow !== n ? [bigRow, others[randInt(0, others.length - 1)]] : near
    const cards = cardPlaces.arrange([n, ...pool], n)
    cardPlaces.note(cards.indexOf(n))
    return cards
  }

  function question(p: Plan): GraphSpec {
    for (let tries = 0; ; tries++) {
      const topic = topics.next()
      const rows = shuffle(G1_GRAPH_TOPICS[topic]).slice(0, p.rows) as GraphThing[]
      const counts = countsFor(p)
      const spec: GraphSpec = { kind: 'graph', topic, rows, counts, style: p.style, ask: p.ask, ...(p.build ? { tray: trayFor(counts) } : {}) }
      if (p.ask === 'howMany') {
        // ask about a row with two or more (counting to one is no counting)
        const ok = counts.map((n, r) => ({ n, r })).filter((x) => x.n >= 2)
        spec.about = [(ok.length ? ok[randInt(0, ok.length - 1)] : { r: 0 }).r]
      } else if (p.ask === 'more' || p.ask === 'fewer') {
        // two rows, `a` with more (or fewer) than `b`
        const [x, y] = shuffle(counts.map((_, r) => r)).slice(0, 2)
        const big = counts[x] > counts[y] ? x : y
        const small = big === x ? y : x
        spec.about = p.ask === 'more' ? [big, small] : [small, big]
      }
      if (asksRow(spec)) {
        const at = graphAnswer(spec)
        if (rowPlaces.wouldRepeat(at) && tries < 12) continue
        rowPlaces.note(at)
      } else {
        const n = graphAnswer(spec)
        const bigRow = p.ask === 'more' || p.ask === 'fewer' ? Math.max(...(spec.about ?? []).map((r) => counts[r])) : n
        spec.cards = cardsFor(n, p.ask, bigRow)
      }
      return spec
    }
  }

  return {
    topic: 'g1Graphs',
    reset() {
      asked = 0
      serial = 0
      plan = []
      cardPlaces.reset()
      rowPlaces.reset()
    },
    next(): ListenProblem {
      const len = mode === 'build' ? 5 : 6
      if (asked % len === 0) plan = roundPlan(mode, coin)
      const p = plan[asked % len]
      asked++
      const spec = question(p)
      const ask = graphQuestion(spec)
      const answer = graphAnswer(spec)
      return {
        id: `g1graphs-${serial++}`,
        topic: 'g1Graphs',
        subtopic: `${spec.style}-${spec.ask}${spec.tray ? '-build' : ''}`,
        prompt: `${voiceText(topicLine(spec.topic))} ${voiceText(ask)}`,
        // (answered through the activity: sorting, then a numeral card or a row)
        options: [],
        answer: asksRow(spec) ? spec.rows[answer] : answer,
        difficulty: graphTotal(spec),
        skill: spec.tray ? SKILL.make : spec.ask === 'more' || spec.ask === 'fewer' ? SKILL.compare : SKILL.read,
        speech: ask,
        praise: PRAISE,
        activity: spec,
      }
    },
  }
}
