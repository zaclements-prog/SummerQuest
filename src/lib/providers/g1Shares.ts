import type { PictureOption, ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { CUT_INFO, THING_BASE, cutsFor, shareArtName, type ShareBase, type ShareCut, type ShareThing } from '../../games/listenPlay/shareGeometry'
import type { ShareTapSpec } from '../../games/listenPlay/activities/shareTapSpec'
import { G1_SHARE_THINGS } from '../../voice/packs/g1-shares'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { randInt } from '../random'
import { makeDeck, makePositionGuard, pickOne } from './kShared'

/**
 * 1st grade equal shares (Fair Share Falls, 1.G.3), voice-first, for the
 * Listen & Play shell. Circles and rectangles (a pizza, a pie, a sandwich, a
 * cake, a garden) cut into two or four shares, drawn exactly
 * (src/games/listenPlay/sharesArt.tsx): the cards are those drawings.
 *
 * - `equal` ("Equal shares", the concept): which one is cut into equal
 *   shares, how many equal shares, which one is cut in half;
 * - `halvesFourths` ("Halves and fourths", practice): cut in half, cut into
 *   fourths, how many, and the `shareTap` activity: "Tap the half of the
 *   pizza." / "Tap a fourth of the pizza." on a pizza cut into a half and two
 *   fourths;
 * - `size` ("Smaller shares", the mastery): is the blue share a half or a
 *   fourth (the only printed words: two word cards), which blue share is
 *   bigger or smaller (more equal shares make smaller shares), plus a tap and
 *   halves or fourths.
 *
 * Wrong cards are what a 1st grader mixes up: two shares that aren't equal
 * for halves, four shares for halves, a half for a fourth. Each gets its word
 * ("Those shares are not the same size.").
 */

export type G1SharesMode = 'equal' | 'halvesFourths' | 'size'

export interface G1SharesConfig {
  mode?: G1SharesMode
}

type Kind = 'equal' | 'halves' | 'fourths' | 'howMany' | 'tapHalf' | 'tapFourth' | 'nameShare' | 'bigger' | 'smaller' | 'halvesOrFourths'

const PLAN: Record<G1SharesMode, Kind[]> = {
  equal: ['equal', 'equal', 'howMany', 'halves', 'equal', 'howMany'],
  halvesFourths: ['halves', 'fourths', 'tapHalf', 'howMany', 'fourths', 'tapFourth'],
  size: ['nameShare', 'bigger', 'tapFourth', 'smaller', 'halvesOrFourths', 'nameShare'],
}

const SKILL = {
  equal: { id: 'g1-shares-equal', label: 'equal shares' },
  halves: { id: 'g1-shares-halves', label: 'halves and fourths' },
  size: { id: 'g1-shares-size', label: 'more shares, smaller shares' },
} as const

const PRAISE: VoiceRef[] = [{ line: 'g1-shares/fairShares' }, { line: 'g1-shares/shareExpert' }]
const TURNS = [0, 90, 180, 270]

/** The equal and unequal cuts a thing's outline takes, two shares or four. */
export function cutChoices(base: ShareBase) {
  const all = cutsFor(base)
  const of = (parts: number, equal: boolean) => all.filter((c) => c !== 'mix' && CUT_INFO[c].parts === parts && CUT_INFO[c].equal === equal)
  return { equal2: of(2, true), equal4: of(4, true), unequal2: of(2, false), unequal4: of(4, false) }
}

const line = (id: string): VoiceRef => ({ line: `g1-shares/${id}` })

export function makeG1SharesProvider(cfg: G1SharesConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'equal'
  const plan = PLAN[mode]
  const places = makePositionGuard()
  const thingDeck = makeDeck(G1_SHARE_THINGS)
  // two shares or four, taking turns
  const partsDeck = makeDeck([2, 4] as const)
  let asked = 0
  let serial = 0
  let lastTapTurn = -1

  const turnFor = (thing: ShareThing) => (THING_BASE[thing] === 'rect' ? 0 : TURNS[randInt(0, 3)])
  /** A card of this thing, cut this way (value: the cut). */
  const cutCard = (thing: ShareThing, cut: ShareCut): PictureOption => ({ value: cut, picture: { kind: 'art', name: shareArtName({ thing, cut, turn: turnFor(thing) }) } })

  const base = (kind: Kind, skill: keyof typeof SKILL, speech: VoiceRef) => ({
    id: `g1shares-${serial++}`,
    topic: 'g1Shares',
    subtopic: kind,
    skill: SKILL[skill],
    praise: PRAISE,
    speech,
    prompt: voiceText(speech),
    walkthrough: 'none' as const,
  })

  /** Cards of one thing: the answer cut and the others, arranged so the answer moves around; a note for each wrong one. */
  function cutQuestion(kind: Kind, skill: keyof typeof SKILL, thing: ShareThing, speech: VoiceRef, answer: ShareCut, others: ShareCut[], note: (c: ShareCut) => VoiceRef): ListenProblem {
    const cuts = places.arrange([answer, ...others], answer)
    return {
      ...base(kind, skill, speech),
      options: cuts,
      answer,
      pictureOptions: cuts.map((c) => cutCard(thing, c)),
      notes: cuts.map((c) => (c === answer ? null : note(c))),
    }
  }

  function make(kind: Kind): ListenProblem {
    const thing = thingDeck.next()
    const ch = cutChoices(THING_BASE[thing])
    const slots = { thing }
    switch (kind) {
      case 'equal': {
        const eq = pickOne([...ch.equal2, ...ch.equal4])
        return cutQuestion(kind, 'equal', thing, { template: 'g1-shares/equal', slots }, eq, [pickOne(ch.unequal2), pickOne(ch.unequal4)], () => line('notEqual'))
      }
      case 'halves':
        return cutQuestion(kind, mode === 'equal' ? 'equal' : 'halves', thing, { template: 'g1-shares/halves', slots }, pickOne(ch.equal2), [pickOne(ch.unequal2), pickOne(ch.equal4)], (c) => (CUT_INFO[c].equal ? line('isFourths') : line('notEqual')))
      case 'fourths':
        return cutQuestion(kind, 'halves', thing, { template: 'g1-shares/fourths', slots }, pickOne(ch.equal4), [pickOne(ch.unequal4), pickOne(ch.equal2)], (c) => (CUT_INFO[c].equal ? line('isHalves') : line('notEqual')))
      case 'halvesOrFourths':
        return make(randInt(0, 1) ? 'halves' : 'fourths')
      case 'howMany': {
        const parts = partsDeck.next()
        const cut = pickOne(parts === 2 ? ch.equal2 : ch.equal4)
        const nums = places.arrange([2, 3, 4], parts)
        return {
          ...base(kind, 'equal', line('howMany')),
          picture: { kind: 'art', name: shareArtName({ thing, cut, turn: turnFor(thing) }) },
          options: nums,
          answer: parts,
          pictureOptions: nums.map((n) => ({ value: n, picture: { kind: 'numeral', n }, speech: { template: 'listen/number', slots: { n } } })),
          notes: nums.map((n) => (n === parts ? null : line(`thereAre${parts}`))),
          cues: [{ target: 'picture' }, { target: 'cards', cue: 'equal shares' }],
        }
      }
      case 'tapHalf':
      case 'tapFourth': {
        // the half sits somewhere new each time
        const turn = THING_BASE[thing] === 'rect' ? 0 : pickOne(TURNS, [lastTapTurn])
        if (THING_BASE[thing] !== 'rect') lastTapTurn = turn
        const ask = kind === 'tapHalf' ? 'half' : 'fourth'
        const spec: ShareTapSpec = { kind: 'shareTap', thing, turn, ask }
        return { ...base(kind, mode === 'size' ? 'size' : 'halves', { template: `g1-shares/${kind}`, slots }), options: [], answer: ask, activity: spec }
      }
      case 'nameShare': {
        // (the word cards keep their order, half then fourth: the picture moves the answer around)
        let parts = partsDeck.next()
        if (places.wouldRepeat(parts === 2 ? 0 : 1)) parts = parts === 2 ? 4 : 2
        const cut = pickOne(parts === 2 ? ch.equal2 : ch.equal4)
        const answer = parts === 2 ? 'half' : 'fourth'
        const words = ['half', 'fourth']
        return {
          ...base(kind, 'size', line('nameShare')),
          picture: { kind: 'art', name: shareArtName({ thing, cut, colored: randInt(0, parts - 1), turn: turnFor(thing) }) },
          // (the order they are said in: "a half or a fourth")
          options: words,
          answer,
          pictureOptions: words.map((w) => ({ value: w, picture: { kind: 'word', text: w }, speech: line(w) })),
          notes: words.map((w) => (w === answer ? null : line(parts === 2 ? 'eachHalf' : 'eachFourth'))),
          cues: [{ target: 'picture' }, { target: 'card0', cue: 'a half' }, { target: 'card1', cue: 'a fourth' }],
        }
      }
      case 'bigger':
      case 'smaller': {
        const half = pickOne(ch.equal2)
        const fourth = pickOne(ch.equal4)
        const answer = kind === 'bigger' ? 'half' : 'fourth'
        const vals = places.arrange(['half', 'fourth'], answer)
        const turn = turnFor(thing)
        return {
          ...base(kind, 'size', line(kind)),
          options: vals,
          answer,
          pictureOptions: vals.map((v) => ({
            value: v,
            picture: { kind: 'art', name: shareArtName({ thing, cut: v === 'half' ? half : fourth, colored: randInt(0, v === 'half' ? 1 : 3), turn }) },
          })),
          notes: vals.map((v) => (v === answer ? null : line(v === 'fourth' ? 'fourthSmaller' : 'halfBigger'))),
        }
      }
    }
  }

  return {
    topic: 'g1Shares',
    reset() {
      asked = 0
      serial = 0
      lastTapTurn = -1
      thingDeck.reset()
      partsDeck.reset()
      places.reset()
    },
    next(): ListenProblem {
      const i = asked < plan.length ? asked : Math.floor(plan.length / 2) + ((asked - plan.length) % Math.ceil(plan.length / 2))
      asked++
      const p = make(plan[i])
      const at = p.options.indexOf(p.answer)
      if (at >= 0) places.note(at)
      return p
    },
  }
}
