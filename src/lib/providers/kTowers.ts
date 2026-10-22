import type { PictureOption, ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { K_TOWER_THINGS } from '../../voice/packs/k-towers'
import type { VoiceRef } from '../../voice/types'
import { randInt } from '../random'
import { countDistractors } from './kCounting'
import { makeKindPicker, makePositionGuard, pickOne } from './kShared'

/**
 * Counting Towers (Tower Battlefront for K–1): the questions that build and
 * power the towers, voice-first, answered with big numeral or group cards.
 * The tower game (src/games/tower-defense/KTowers.tsx) asks one per build;
 * the K Daily Challenge plays them in Listen & Play.
 *
 * - `count` (k-towers-1, K.CC.5): "How many critters? Tap the number." —
 *   groups within 10, starting small (2–5, then up to 8, then 10);
 * - `compare` (k-towers-2, K.CC.6): "Which group has more?" / "…fewer?" —
 *   two groups of up to 10, far apart at first (3–4), then close (1–3);
 * - `mixed` (k-towers-3, K.CC.4–7): how many (up to 20), the group with 12
 *   (two cards past 10), more / fewer, and which number is bigger (to 20).
 *
 * The things counted are the game's own: critters, towers, gems, rockets
 * (`k-towers` lines); more / fewer / bigger reuse Counting Mesa's `k-math`
 * lines (they name no thing). A wrong pick counts along (the question's
 * group, each group, or up to the bigger number), as on Counting Mesa.
 */

export type KTowersMode = 'count' | 'compare' | 'mixed'
export type KTowersKind = 'howMany' | 'findGroup' | 'more' | 'fewer' | 'bigger'
export type KTowerThing = (typeof K_TOWER_THINGS)[number]

export interface KTowersConfig {
  mode: KTowersMode
}

/** The picture for each tower thing (`k-towers` pack): every Android tablet draws them (Unicode 6). */
export const K_TOWER_EMOJI: Record<KTowerThing, string> = {
  critters: '👾',
  towers: '🏰',
  gems: '💎',
  rockets: '🚀',
}

const MODE_KINDS: Record<KTowersMode, KTowersKind[]> = {
  count: ['howMany'],
  compare: ['more', 'fewer'],
  mixed: ['howMany', 'findGroup', 'more', 'fewer', 'bigger'],
}

/** The largest count (or numeral) each mode reaches. */
export const K_TOWERS_MAX: Record<KTowersMode, number> = { count: 10, compare: 10, mixed: 20 }

const say = (v: number): VoiceRef => ({ template: 'listen/number', slots: { n: v } })
const numeralCard = (v: number): PictureOption => ({ value: v, picture: { kind: 'numeral', n: v }, speech: say(v) })
const groupCard = (v: number, emoji: string): PictureOption => ({ value: v, picture: { kind: 'group', count: v, emoji }, speech: say(v) })

const COUNT_PRAISE: VoiceRef[] = [{ line: 'k-math/greatCounting' }, { line: 'k-towers/towerPower' }]
const COMPARE_PRAISE: VoiceRef[] = [{ line: 'k-math/sharpEyes' }, { line: 'k-towers/towerPower' }]

export function makeKTowersProvider(cfg: KTowersConfig): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode
  const kinds = MODE_KINDS[mode] ?? MODE_KINDS.count
  const picker = makeKindPicker(kinds)
  const places = makePositionGuard()
  let asked = 0
  let serial = 0
  let lastThing = ''
  let lastN = -1
  let lastSig = ''

  /**
   * The cards in a fresh order, the answer never in one place three times
   * running (when the reshuffles keep landing it there, it moves along one).
   */
  function arrange(options: number[], answer: number): number[] {
    const out = places.arrange(options, answer)
    const i = out.indexOf(answer)
    if (places.wouldRepeat(i)) {
      const j = (i + 1) % out.length
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  /** How far into the stage: 0 (the first two questions), 1 (the next two), 2 (the rest). */
  const step = () => (asked <= 2 ? 0 : asked <= 4 ? 1 : 2)

  function pickThing(): KTowerThing {
    const t = pickOne(K_TOWER_THINGS, [lastThing as KTowerThing])
    lastThing = t
    return t
  }

  function pickN(lo: number, hi: number): number {
    if (lo >= hi) return hi
    let n: number
    do n = randInt(lo, hi)
    while (n === lastN)
    return n
  }

  const base = (n: number, kind: KTowersKind) => ({ id: `ktowers-${serial++}`, topic: 'kTowers', subtopic: kind, difficulty: n })
  const countSkill = { id: 'k-towers-count', label: 'counting to 20' }
  const compareSkill = { id: 'k-towers-compare', label: 'more and fewer' }

  function howMany(): ListenProblem {
    const thing = pickThing()
    const emoji = K_TOWER_EMOJI[thing]
    const [lo, hi] = mode === 'mixed' ? ([[3, 10], [6, 15], [8, 20]] as const)[step()] : ([[2, 5], [3, 8], [4, 10]] as const)[step()]
    const n = pickN(lo, hi)
    const max = K_TOWERS_MAX[mode]
    const options = arrange([n, ...countDistractors(n, 1, max, 2)], n)
    return {
      ...base(n, 'howMany'),
      prompt: `How many ${thing}? Tap the number.`,
      options,
      answer: n,
      skill: countSkill,
      praise: COUNT_PRAISE,
      speech: { template: 'k-towers/howMany', slots: { thing } },
      picture: { kind: 'group', count: n, emoji },
      pictureOptions: options.map(numeralCard),
      visual: { kind: 'array', rows: 1, cols: n, itemEmoji: emoji },
      cues: [{ target: 'picture' }, { target: 'cards', cue: 'Tap' }],
    }
  }

  function findGroup(): ListenProblem {
    const thing = pickThing()
    const emoji = K_TOWER_EMOJI[thing]
    const [lo, hi] = ([[2, 8], [5, 14], [8, 20]] as const)[step()]
    const n = pickN(lo, hi)
    // past ten a group card is crowded: two cards, not three
    const cards = n > 10 ? 2 : 3
    const options = arrange([n, ...countDistractors(n, 1, K_TOWERS_MAX.mixed, cards - 1)], n)
    return {
      ...base(n, 'findGroup'),
      prompt: `Tap the group with ${n} ${thing}.`,
      options,
      answer: n,
      skill: countSkill,
      praise: COUNT_PRAISE,
      speech: { template: 'k-towers/findGroup', slots: { n, thing } },
      picture: { kind: 'numeral', n },
      pictureOptions: options.map((v) => groupCard(v, emoji)),
      visual: { kind: 'array', rows: 1, cols: n, itemEmoji: emoji },
      cues: [{ target: 'cards' }, { target: 'picture', cue: 'with' }, { target: 'cards', cue: 1 }],
    }
  }

  /** Two groups to compare: far apart early in the stage, closer later. */
  function twoCounts(): [number, number] {
    const early = step() === 0
    const d = early ? randInt(3, 4) : randInt(1, 3)
    const small = randInt(1, 10 - d)
    return [small, small + d]
  }

  function compare(kind: 'more' | 'fewer'): ListenProblem {
    const thing = pickThing()
    const emoji = K_TOWER_EMOJI[thing]
    const [small, big] = twoCounts()
    const answer = kind === 'more' ? big : small
    const options = arrange([small, big], answer)
    return {
      ...base(big, kind),
      prompt: kind === 'more' ? 'Which group has more?' : 'Which group has fewer?',
      options,
      answer,
      skill: compareSkill,
      praise: COMPARE_PRAISE,
      speech: { line: kind === 'more' ? 'k-math/whichMore' : 'k-math/whichFewer' },
      pictureOptions: options.map((v) => groupCard(v, emoji)),
      cues: [{ target: 'cards' }],
      walkthrough: 'each',
    }
  }

  function bigger(): ListenProblem {
    const [lo, hi] = ([[1, 10], [5, 15], [8, 20]] as const)[step()]
    const d = randInt(1, 3)
    const a = randInt(lo, hi - d)
    const b = a + d
    const options = arrange([a, b], b)
    return {
      ...base(b, 'bigger'),
      prompt: 'Which number is bigger?',
      options,
      answer: b,
      skill: compareSkill,
      praise: COMPARE_PRAISE,
      speech: { line: 'k-math/whichBigger' },
      pictureOptions: options.map(numeralCard),
      cues: [{ target: 'cards' }],
      walkthrough: 'countUp',
    }
  }

  function make(kind: KTowersKind): ListenProblem {
    switch (kind) {
      case 'howMany':
        return howMany()
      case 'findGroup':
        return findGroup()
      case 'more':
      case 'fewer':
        return compare(kind)
      case 'bigger':
        return bigger()
    }
  }

  return {
    topic: 'kTowers',
    reset() {
      asked = 0
      serial = 0
      lastThing = ''
      lastN = -1
      lastSig = ''
      picker.reset()
      places.reset()
    },
    next(): ListenProblem {
      asked++
      // never the same question twice in a row
      for (let tries = 0; ; tries++) {
        const p = make(picker.next())
        const sig = `${p.prompt}|${JSON.stringify(p.picture ?? null)}|${JSON.stringify(p.pictureOptions?.map((o) => o.value))}`
        if (sig !== lastSig || tries >= 8) {
          lastSig = sig
          if (typeof p.answer === 'number') lastN = p.answer
          places.note(p.options.indexOf(p.answer))
          return p
        }
      }
    },
  }
}
