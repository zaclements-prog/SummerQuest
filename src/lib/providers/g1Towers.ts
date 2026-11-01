import type { Picture, PictureOption, ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { ADD_10, ADD_20, SUB_10, SUB_20, factAnswer, factId, factQuestion, factText, type G1Fact } from '../../voice/packs/g1-towers'
import type { VoiceRef } from '../../voice/types'
import { randInt, shuffle } from '../random'
import { makeKindPicker, makePositionGuard, pickOne } from './kShared'

/**
 * Counting Towers for 1st grade (Tower Battlefront, 1.OA.6): the spoken
 * addition and subtraction questions the 1st-grade Daily Challenge asks for
 * the zone (its tower stages play Puddle Patrol, src/games/tower-defense/
 * PuddlePatrol.tsx, whose Puddings carry the same number sentences), answered
 * with big numeral cards. Each shows a number sentence ("3 + 4") and says it ("Three plus four.
 * Tap the answer."). A wrong pick hears the strategy (count on from the bigger
 * number, count back, or count up) and tries again.
 *
 * - `add10` (g1-towers-1): add within 10; small numbers to add on first
 *   (2 or less, then 3 or less), then any;
 * - `sub10` (g1-towers-2): take away within 10, the same way;
 * - `mix20` (g1-towers-3): adding and taking away within 20, taking turns
 *   (never three of one in a row): facts within 10 first, then past ten.
 */

export type G1TowersMode = 'add10' | 'sub10' | 'mix20'

export interface G1TowersConfig {
  mode: G1TowersMode
}

const say = (v: number): VoiceRef => ({ template: 'listen/number', slots: { n: v } })
const numeralCard = (v: number): PictureOption => ({ value: v, picture: { kind: 'numeral', n: v }, speech: say(v) })

const ADD_SKILL = { id: 'g1-towers-add', label: 'adding within 20' }
const SUB_SKILL = { id: 'g1-towers-sub', label: 'taking away within 20' }
const ADD_PRAISE: VoiceRef[] = [{ line: 'g1-towers/greatAdding' }, { line: 'k-towers/towerPower' }, { line: 'g1-towers/mathPower' }]
const SUB_PRAISE: VoiceRef[] = [{ line: 'g1-towers/greatTakingAway' }, { line: 'k-towers/towerPower' }, { line: 'g1-towers/mathPower' }]

/**
 * Two wrong numeral cards for a fact: the near misses a counting-on (or back)
 * slip gives (one more, one less, two away) and, taking away, the two numbers
 * added. All 0–20, all different.
 */
export function factDistractors(f: G1Fact, max = 20): number[] {
  const ans = factAnswer(f)
  const near = [ans + 1, ans - 1, ans + 2, ans - 2]
  const pool = f.op === '-' ? [...near, f.a + f.b] : near
  const ok = (n: number) => n >= 0 && n <= max && n !== ans
  const out: number[] = []
  for (const n of shuffle(pool.slice(0, 2)).concat(shuffle(pool.slice(2)))) {
    if (out.length >= 2) break
    if (ok(n) && !out.includes(n)) out.push(n)
  }
  return out
}

/**
 * The picture after a miss: the counters in ten-frames. Adding: the bigger
 * number in red, the one counted on in blue (ten and some more: a full frame
 * and the rest). Taking away: the start, the ones taken crossed out.
 */
export function factHelpPicture(f: G1Fact): Picture {
  if (f.op === '-') return { kind: 'tenFrame', count: f.a, gone: f.b }
  return { kind: 'tenFrame', count: f.a + f.b, split: Math.max(f.a, f.b) }
}

/** What is said about a wrong card: ten and some more is just that ("Ten and nine more is nineteen."); else the strategy. */
export function factNote(f: G1Fact): VoiceRef {
  if (f.op === '+' && (f.a === 10 || f.b === 10)) return { line: `g1-facts/tenAnd-${f.a === 10 ? f.b : f.a}` }
  return { line: `g1-towers/how-${factId(f)}` }
}

export function makeG1TowersProvider(cfg: G1TowersConfig): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode
  const picker = makeKindPicker<'+' | '-'>(['+', '-'])
  const places = makePositionGuard()
  let asked = 0
  let serial = 0
  let last = ''

  /** How far into the stage: 0 (the first two questions), 1 (the next two), 2 (the rest). */
  const step = () => (asked <= 2 ? 0 : asked <= 4 ? 1 : 2)

  /** The facts to draw from now. */
  function pool(): readonly G1Fact[] {
    const s = step()
    const small = (fs: readonly G1Fact[], k: number) => fs.filter((f) => f.b <= k)
    if (mode === 'add10') return s === 0 ? small(ADD_10, 2) : s === 1 ? small(ADD_10, 3) : ADD_10
    if (mode === 'sub10') return s === 0 ? small(SUB_10, 2) : s === 1 ? small(SUB_10, 3) : SUB_10
    const op = picker.next()
    if (s === 0) return op === '+' ? ADD_10.filter((f) => f.a + f.b >= 6) : SUB_10.filter((f) => f.a >= 6)
    return op === '+' ? ADD_20 : SUB_20
  }

  function make(): ListenProblem {
    let f: G1Fact
    let tries = 0
    do f = pickOne(pool())
    while (factId(f) === last && tries++ < 8)
    last = factId(f)
    const answer = factAnswer(f)
    const options = places.arrange([answer, ...factDistractors(f)], answer)
    const i = options.indexOf(answer)
    // (the reshuffles kept landing it in one place: it moves along one)
    if (places.wouldRepeat(i)) {
      const j = (i + 1 + randInt(0, options.length - 2)) % options.length
      ;[options[i], options[j]] = [options[j], options[i]]
    }
    const add = f.op === '+'
    return {
      id: `g1towers-${serial++}`,
      topic: 'g1Towers',
      subtopic: add ? 'add' : 'sub',
      difficulty: Math.max(f.a, answer),
      prompt: factQuestion(f),
      options,
      answer,
      skill: add ? ADD_SKILL : SUB_SKILL,
      praise: add ? ADD_PRAISE : SUB_PRAISE,
      speech: { line: `g1-towers/${factId(f)}` },
      // the number sentence ("3 + 4"): numbers and signs, nothing to read
      picture: { kind: 'word', text: factText(f) },
      pictureOptions: options.map(numeralCard),
      cues: [{ target: 'picture' }, { target: 'cards', cue: 'Tap' }],
      walkthrough: 'none',
      // after a wrong pick, the strategy ("Start at four. Count on three: five, six, seven!"),
      // or for ten and some more just that ("Ten and nine more is nineteen."), with the counters shown
      notes: options.map((v) => (v === answer ? null : factNote(f))),
      helpPicture: factHelpPicture(f),
    }
  }

  return {
    topic: 'g1Towers',
    reset() {
      asked = 0
      serial = 0
      last = ''
      picker.reset()
      places.reset()
    },
    next(): ListenProblem {
      asked++
      const p = make()
      places.note(p.options.indexOf(p.answer))
      return p
    },
  }
}
