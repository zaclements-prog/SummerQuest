import type { ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import type { NumberSentenceSpec } from '../../games/listenPlay/activities/numberSentenceSpec'
import type { VoiceRef } from '../../voice/types'
import { randInt, shuffle } from '../random'
import { makePositionGuard } from './kShared'
import {
  askLine,
  countOnHelp,
  doubleHelp,
  fact,
  factProblem,
  makeTenHelp,
  nearHelp,
  turnHelp,
  type FactQuestion,
  type Mixup,
} from './g1Facts'

/**
 * Adding Mesa (1st grade, 1.OA.3 and 1.OA.6): add within 20, a number
 * sentence on screen and a picture of the strategy under it, answered with
 * numeral cards (the `numberSentence` activity).
 *
 * - `countOn` (Count on): count on from the bigger number (a box with 8 in
 *   it, three dots to count on: "nine, ten, eleven"), the smaller number
 *   written first now and then ("3 + 8": start with the bigger one), and
 *   turn-around facts ("3 + 5 = 8, so 5 + 3 = ?");
 * - `facts` (Doubles and tens): doubles (6 + 6), near doubles (6 + 7: the
 *   double and one more) and making ten (8 + 5: 8 and 2 make 10, and 3 more).
 *
 * A round ramps (the shell `reset()`s the provider as a round starts): the
 * first questions are acted out (tap each dot, move the counters into the
 * ten) and small, the later ones bigger with the picture there to help.
 * Never the same fact twice in a round.
 */

export type G1AddingMode = 'countOn' | 'facts'

export interface G1AddingConfig {
  mode?: G1AddingMode
}

const SKILL = {
  countOn: { id: 'g1-count-on', label: 'counting on to add' },
  doubles: { id: 'g1-doubles', label: 'doubles and near doubles' },
  makeTen: { id: 'g1-make-ten', label: 'making ten to add' },
}

const PRAISE: Record<'countOn' | 'doubles' | 'makeTen', VoiceRef[]> = {
  countOn: [fact('niceCountingOn'), { line: 'k-story-math/greatAdding' }],
  doubles: [fact('doublesPro'), { line: 'k-story-math/greatAdding' }],
  makeTen: [fact('tenPro'), fact('thinkPro')],
}

/**
 * What a child adding `a + b` tends to say instead: counting the first number
 * again (one short), one of the numbers, or taking away. The first is the
 * card shown, so it takes turns: one short half the time, else one of the others.
 */
function addMixups(a: number, b: number): Mixup[] {
  const next: Mixup = [a + b - 1, fact('noteNext')]
  const others: Mixup[] = shuffle<Mixup>([
    [Math.max(a, b), fact('notePart')],
    [Math.abs(a - b), fact('noteTookAway')],
  ])
  return randInt(0, 1) === 1 ? [next, ...others] : [...others, next]
}

/** Count on: the bigger number in the box, the smaller one as dots; `smallerFirst` writes "3 + 8". */
function countOnQ(big: number, small: number, smallerFirst: boolean, act: boolean): FactQuestion {
  const [a, b] = smallerFirst ? [small, big] : [big, small]
  return {
    sentence: [a, '+', b, '=', '?'],
    model: { kind: 'countOn', start: big, on: small },
    ask: askLine({ kind: 'add', a, b }),
    hint: fact('hintCountOn'),
    act: act ? fact('actCountOn') : undefined,
    help: countOnHelp(big, small, smallerFirst),
    mixups: addMixups(a, b),
  }
}

/** A turn-around fact: "3 + 5 = 8" written above, "5 + 3 = ?" asked; two rows that swap. */
function turnQ(a: number, b: number): FactQuestion {
  return {
    given: [a, '+', b, '=', a + b],
    sentence: [b, '+', a, '=', '?'],
    model: { kind: 'rows', top: a, bottom: b, turn: true },
    ask: askLine({ kind: 'add', a: b, b: a }),
    hint: fact('hintTurn'),
    help: turnHelp(b, a),
    mixups: [[a + b + 1, null], [b, fact('notePart')], [a + b - 1, null]],
  }
}

/** A double: "6 + 6 = ?", two rows of six. */
function doubleQ(n: number): FactQuestion {
  return {
    sentence: [n, '+', n, '=', '?'],
    model: { kind: 'rows', top: n, bottom: n },
    ask: askLine({ kind: 'add', a: n, b: n }),
    hint: fact('hintDouble'),
    help: doubleHelp(n),
    mixups: [[n, fact('notePart')], [2 * n - 1, null]],
  }
}

/** A near double: "6 + 7 = ?" (or "7 + 6"), rows of six and seven, the extra one marked. */
function nearQ(n: number, bigFirst: boolean): FactQuestion {
  const [a, b] = bigFirst ? [n + 1, n] : [n, n + 1]
  return {
    sentence: [a, '+', b, '=', '?'],
    model: { kind: 'rows', top: n, bottom: n + 1 },
    ask: askLine({ kind: 'add', a, b }),
    hint: fact('hintNear'),
    help: nearHelp(n),
    mixups: [[2 * n, fact('noteDouble')], [2 * n + 2, null], [n + 1, fact('notePart')]],
  }
}

/** Make ten: "8 + 5 = ?", 8 in one ten-frame and 5 in the other; two move over to make a ten. */
function makeTenQ(a: number, b: number, swap: boolean, act: boolean): FactQuestion {
  const [x, y] = swap ? [b, a] : [a, b]
  return {
    sentence: [x, '+', y, '=', '?'],
    model: { kind: 'makeTen', a, b },
    ask: askLine({ kind: 'add', a: x, b: y }),
    hint: fact('hintMakeTen'),
    act: act ? fact('actMove') : undefined,
    help: makeTenHelp(a, b),
    mixups: [[10, fact('noteTen')], ...addMixups(a, b)],
  }
}

export function makeG1AddingProvider(cfg: G1AddingConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'countOn'
  const places = makePositionGuard()
  let serial = 0
  let asked = 0
  const seen = new Set<string>()

  /** The `i`-th question of a round, before the no-repeat check. */
  function make(i: number): { q: FactQuestion; skill: keyof typeof SKILL } {
    const coin = () => randInt(0, 1) === 1
    if (mode === 'countOn') {
      switch (i) {
        case 0:
          return { q: countOnQ(randInt(5, 9), randInt(1, 2), false, true), skill: 'countOn' }
        case 1:
          return { q: countOnQ(randInt(6, 10), randInt(2, 3), false, true), skill: 'countOn' }
        case 2:
          // the smaller number first: start with the bigger one
          return { q: countOnQ(randInt(7, 12), randInt(2, 3), true, true), skill: 'countOn' }
        case 3: {
          const a = randInt(2, 4)
          return { q: turnQ(a, randInt(a + 2, 8)), skill: 'countOn' }
        }
        case 4: {
          const small = randInt(2, 4)
          return { q: countOnQ(randInt(9, Math.min(14, 20 - small)), small, coin(), false), skill: 'countOn' }
        }
        default: {
          if (coin()) {
            const a = randInt(3, 6)
            return { q: turnQ(a, randInt(a + 2, Math.min(10, 18 - a))), skill: 'countOn' }
          }
          const small = randInt(2, 4)
          return { q: countOnQ(randInt(11, Math.min(17, 20 - small)), small, coin(), false), skill: 'countOn' }
        }
      }
    }
    // doubles and tens
    switch (i) {
      case 0:
        return { q: doubleQ(randInt(2, 5)), skill: 'doubles' }
      case 1: {
        const a = randInt(8, 9)
        return { q: makeTenQ(a, randInt(11 - a + 1, 6), false, true), skill: 'makeTen' }
      }
      case 2:
        return { q: nearQ(randInt(3, 6), false), skill: 'doubles' }
      case 3: {
        const a = randInt(7, 9)
        return { q: makeTenQ(a, randInt(Math.max(4, 11 - a), 8), false, false), skill: 'makeTen' }
      }
      case 4:
        return { q: doubleQ(randInt(6, 10)), skill: 'doubles' }
      default: {
        if (coin()) return { q: nearQ(randInt(6, 9), coin()), skill: 'doubles' }
        const a = randInt(6, 9)
        return { q: makeTenQ(a, randInt(Math.max(11 - a, 4), Math.min(9, 18 - a)), coin(), false), skill: 'makeTen' }
      }
    }
  }

  return {
    topic: 'g1Adding',
    reset() {
      asked = 0
      seen.clear()
      places.reset()
    },
    next(): ListenProblem {
      const i = asked++
      // never the same fact twice in a round
      for (let tries = 0; ; tries++) {
        const { q, skill } = make(i % 6)
        const sig = q.sentence.join(' ')
        if (seen.has(sig) && tries < 12) continue
        seen.add(sig)
        const p = factProblem(q, places, { id: `g1add-${serial++}`, topic: 'g1Adding', subtopic: (q.model.kind === 'rows' ? (q.model.turn ? 'turn' : q.model.top === q.model.bottom ? 'double' : 'near') : q.model.kind), skill: SKILL[skill], praise: PRAISE[skill] })
        places.note(p.options.indexOf(p.answer))
        return p
      }
    },
  }
}

export const isG1AddingSpec = (s: unknown): s is NumberSentenceSpec => (s as { kind?: string } | null)?.kind === 'numberSentence'
