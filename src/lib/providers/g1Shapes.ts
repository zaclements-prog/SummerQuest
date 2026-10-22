import type { Picture, PictureOption, ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { G1_FLATS, SHAPE_TURNS, boxArtName, flatSides, shapeArtName, type G1Flat, type ShapeArt, type ShapeFlaw } from '../../games/listenPlay/g1ShapesArt'
import { DECOYS, MAKES_CARDS, RECIPES, RECIPE, type Recipe, type SnapSpec } from '../../games/listenPlay/activities/snapSpec'
import { G1_SOLIDS, G1_SOLID_THINGS, G1_STILL_SHAPES } from '../../voice/packs/g1-shapes'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { randInt, shuffle } from '../random'
import { distinctColors, makeDeck, makePositionGuard, pickOne } from './kShared'

/**
 * 1st grade shapes (Shape Grove, 1.G.1–2), voice-first, for the Listen & Play
 * shell.
 *
 * - `attributes` ("Still a triangle?", the concept): which one is still a
 *   triangle (square, rectangle, circle): turned, big or small, any colour,
 *   beside one that is open and one with a curved side (or the wrong number
 *   of sides, or stretched into an oval); tap the shape with three sides and
 *   three corners (four, five, six), or no corners;
 * - `compose` ("Put shapes together", practice): the `snap` activity — which
 *   piece finishes the square, and what shape two pieces make;
 * - `solids` ("Roll or stack", the mastery): which can roll, which can't,
 *   which you can stack, which can roll AND stack, which stacks but can't
 *   roll (sphere, cube, cylinder and a box: never the cone, which rolls in a
 *   circle and can't be stacked on), things shaped like a cube, cone,
 *   cylinder or sphere, and one "still a …?" to remember.
 *
 * Every card is a drawing (`art`: src/games/listenPlay/g1ShapesArt.tsx), the
 * kit's solids, or an emoji; each wrong one gets a word about it ("That one
 * is not closed. It has an opening.").
 */

export type G1ShapesMode = 'attributes' | 'compose' | 'solids'

export interface G1ShapesConfig {
  mode?: G1ShapesMode
}

type Kind = 'still' | 'sides' | 'noCorners' | 'fill' | 'makes' | 'roll' | 'cantRoll' | 'stack' | 'rollStack' | 'stackNoRoll' | 'likeShape'

const PLAN: Record<G1ShapesMode, Kind[]> = {
  attributes: ['still', 'still', 'sides', 'still', 'noCorners', 'sides'],
  compose: ['fill', 'makes', 'fill', 'makes', 'fill', 'makes'],
  solids: ['roll', 'likeShape', 'stack', 'rollStack', 'still', 'stackNoRoll'],
}

const SKILL = {
  attributes: { id: 'g1-shapes-attributes', label: 'what makes a shape' },
  compose: { id: 'g1-shapes-compose', label: 'putting shapes together' },
  solids: { id: 'g1-shapes-solids', label: 'solids that roll and stack' },
} as const

const PRAISE: VoiceRef[] = [{ line: 'g1-shapes/shapeSmart' }, { line: 'g1-shapes/shapeBuilder' }]

/** The solids a roll / stack card can be (the cone never: see above). */
export type RollSolid = 'sphere' | 'cube' | 'cylinder' | 'box'
export const ROLLS: Record<RollSolid, boolean> = { sphere: true, cylinder: true, cube: false, box: false }
export const STACKS: Record<RollSolid, boolean> = { sphere: false, cylinder: true, cube: true, box: true }

/** Shapes with this many sides (and corners): 0 for the round ones. */
const withSides = (n: number) => G1_FLATS.filter((s) => flatSides(s) === n)

const g = (id: string): VoiceRef => ({ line: `g1-shapes/${id}` })

type SolidThing = { readonly id: string; readonly emoji: string; readonly name: string }

export function makeG1ShapesProvider(cfg: G1ShapesConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'attributes'
  const plan = PLAN[mode]
  const places = makePositionGuard()
  const stillDeck = makeDeck(G1_STILL_SHAPES)
  const sidesDeck = makeDeck([3, 4, 5, 6] as const)
  const recipeDeck = makeDeck(RECIPES)
  const solidDeck = makeDeck(G1_SOLIDS)
  let asked = 0
  let serial = 0

  const base = (kind: Kind, skill: keyof typeof SKILL, speech: VoiceRef) => ({
    id: `g1shapes-${serial++}`,
    topic: 'g1Shapes',
    subtopic: kind,
    skill: SKILL[skill],
    praise: PRAISE,
    speech,
    prompt: voiceText(speech),
    walkthrough: 'none' as const,
  })

  /** A shape drawing card, with a word about it when it isn't the answer. */
  interface Card {
    art: ShapeArt
    note: VoiceRef | null
  }
  /**
   * A drawing of a shape, any colour, turned any way, big or small: on every
   * card alike, so the odd one out is never the one that looks different.
   * `changed`: never upright and big at once (the shape that is "still a
   * triangle" shows it can be turned or small).
   */
  const art = (shape: G1Flat, color: number, flaw?: ShapeFlaw, changed = false): ShapeArt => {
    let turn: number = pickOne(SHAPE_TURNS)
    let small = randInt(0, 2) === 0
    if (changed && turn === 0 && !small) {
      if (randInt(0, 1)) small = true
      else turn = pickOne(SHAPE_TURNS.filter((t) => t !== 0))
    }
    return { shape, ...(flaw ? { flaw } : {}), color, turn, ...(small ? { small } : {}) }
  }
  /** A word about a shape that isn't the one asked for. */
  const sidesNote = (s: G1Flat): VoiceRef => (flatSides(s) ? { template: 'g1-shapes/hasSides', slots: { n: flatSides(s) } } : g('round'))

  function shapeQuestion(kind: Kind, speech: VoiceRef, answer: Card, others: Card[]): ListenProblem {
    const names = [answer, ...others].map((c) => shapeArtName(c.art))
    const order = places.arrange(names, names[0])
    const byName = new Map([answer, ...others].map((c) => [shapeArtName(c.art), c]))
    return {
      ...base(kind, mode === 'solids' ? 'solids' : 'attributes', speech),
      options: order,
      answer: names[0],
      pictureOptions: order.map((n) => ({ value: n, picture: { kind: 'art', name: n } })),
      notes: order.map((n) => (n === names[0] ? null : byName.get(n)!.note)),
    }
  }

  function still(): ListenProblem {
    const name = stillDeck.next()
    // every card its own colour: a colour never names a shape
    const [c0, c1, c2, c3] = distinctColors(4)
    const speech: VoiceRef = { template: 'g1-shapes/still', slots: { shape: name } }
    switch (name) {
      case 'triangle': {
        const t = pickOne(['triangle', 'rightTriangle', 'thinTriangle'] as const)
        const flawed = pickOne(['triangle', 'rightTriangle'] as const)
        const pool: Card[] = [
          { art: art(flawed, c1, 'open'), note: g('open') },
          { art: art(pickOne(['triangle', 'rightTriangle'] as const), c2, 'curved'), note: g('curved') },
          { art: art('trapezoid', c3, undefined), note: sidesNote('trapezoid') },
        ]
        return shapeQuestion('still', speech, { art: art(t, c0, undefined, true), note: null }, shuffle(pool).slice(0, 2))
      }
      case 'square': {
        const pool: Card[] = [
          { art: art('rectangle', c1, undefined), note: g('notSame') },
          { art: art('square', c2, 'open'), note: g('open') },
          { art: art('square', c3, 'curved'), note: g('curved') },
        ]
        // (the rectangle every time: a square's sides are all the same length)
        return shapeQuestion('still', speech, { art: art('square', c0, undefined, true), note: null }, [pool[0], pickOne(pool.slice(1))])
      }
      case 'rectangle': {
        const pool: Card[] = [
          { art: art('rectangle', c1, 'open'), note: g('open') },
          { art: art('rectangle', c2, 'curved'), note: g('curved') },
          { art: art('pentagon', c3, undefined), note: sidesNote('pentagon') },
        ]
        return shapeQuestion('still', speech, { art: art('rectangle', c0, undefined, true), note: null }, shuffle(pool).slice(0, 2))
      }
      case 'circle': {
        const pool: Card[] = [
          { art: art('oval', c1, undefined), note: g('isOval') },
          { art: art('circle', c2, 'open'), note: g('open') },
          { art: art('hexagon', c3, undefined), note: g('hasCorners') },
        ]
        return shapeQuestion('still', speech, { art: art('circle', c0, undefined, true), note: null }, [pool[0], pickOne(pool.slice(1))])
      }
    }
  }

  function sides(kind: 'sides' | 'noCorners'): ListenProblem {
    const n = kind === 'noCorners' ? 0 : sidesDeck.next()
    const answer = pickOne(withSides(n))
    const others = shuffle(G1_FLATS.filter((s) => flatSides(s) !== n && (n !== 0 || flatSides(s) > 0)))
    // two others with two different side counts (never two round ones)
    const picked: G1Flat[] = []
    for (const s of others) if (picked.length < 2 && !picked.some((p) => flatSides(p) === flatSides(s))) picked.push(s)
    const [c0, c1, c2] = distinctColors(3)
    return shapeQuestion(kind, g(kind === 'noCorners' ? 'noCorners' : `sides${n}`), { art: art(answer, c0), note: null }, [
      { art: art(picked[0], c1), note: kind === 'noCorners' ? g('hasCorners') : sidesNote(picked[0]) },
      { art: art(picked[1], c2), note: kind === 'noCorners' ? g('hasCorners') : sidesNote(picked[1]) },
    ])
  }

  function snap(ask: 'fill' | 'makes'): ListenProblem {
    const recipe: Recipe = recipeDeck.next()
    const def = RECIPE[recipe]
    const answer = ask === 'fill' ? def.gapShape : def.makes
    const cards = places.arrange(ask === 'fill' ? [def.gapShape, ...DECOYS[recipe]] : [...MAKES_CARDS[recipe]], answer)
    const spec: SnapSpec = { kind: 'snap', ask, recipe, cards }
    const speech: VoiceRef = ask === 'fill' ? { template: 'g1-shapes/fill', slots: { shape: def.makes } } : g(`makes-${recipe}`)
    return { ...base(ask, 'compose', speech), options: [...cards], answer, activity: spec }
  }

  /** A solid card: the kit's solids, a box drawing. */
  const solidPicture = (s: RollSolid, color: number): Picture => (s === 'box' ? { kind: 'art', name: boxArtName(color) } : { kind: 'shape', shape: s, color })
  const solidNote = (s: RollSolid): VoiceRef => g(`solid-${s}`)

  function rollStack(kind: 'roll' | 'cantRoll' | 'stack' | 'rollStack' | 'stackNoRoll'): ListenProblem {
    let answer: RollSolid
    let others: RollSolid[]
    switch (kind) {
      case 'roll':
        answer = pickOne(['sphere', 'cylinder'] as const)
        others = ['cube', 'box']
        break
      case 'cantRoll':
        answer = pickOne(['cube', 'box'] as const)
        others = ['sphere', 'cylinder']
        break
      case 'stack':
        // (the sphere is the only solid here that can't be stacked: two cards)
        answer = pickOne(['cube', 'cylinder', 'box'] as const)
        others = ['sphere']
        break
      case 'rollStack':
        answer = 'cylinder'
        others = [pickOne(['cube', 'box'] as const), 'sphere']
        break
      case 'stackNoRoll':
        answer = pickOne(['cube', 'box'] as const)
        others = ['sphere', 'cylinder']
        break
    }
    const vals = places.arrange([answer, ...others], answer)
    const colors = distinctColors(vals.length)
    return {
      ...base(kind, 'solids', g(kind)),
      options: vals,
      answer,
      pictureOptions: vals.map((v, i) => ({ value: v, picture: solidPicture(v, colors[i]), speech: { template: 'g1-shapes/label', slots: { shape: v } } })),
      notes: vals.map((v) => (v === answer ? null : solidNote(v))),
    }
  }

  function likeShape(): ListenProblem {
    const solid = solidDeck.next()
    const others = shuffle(G1_SOLIDS.filter((s) => s !== solid)).slice(0, 2)
    const thing = (s: (typeof G1_SOLIDS)[number]): SolidThing => pickOne<SolidThing>(G1_SOLID_THINGS[s])
    const cards = [solid, ...others].map((s) => ({ solid: s, t: thing(s) }))
    const right = cards[0].t.id
    const ids = places.arrange(cards.map((c) => c.t.id), right)
    const by = new Map(cards.map((c) => [c.t.id, c]))
    return {
      ...base('likeShape', 'solids', { template: 'g1-shapes/likeShape', slots: { solid } }),
      options: ids,
      answer: right,
      pictureOptions: ids.map<PictureOption>((id) => ({ value: id, picture: { kind: 'emoji', emoji: by.get(id)!.t.emoji }, speech: g(`thing-${id}`) })),
      notes: ids.map((id) => (id === right ? null : { template: 'g1-shapes/shapedLike', slots: { solid: by.get(id)!.solid } })),
    }
  }

  function make(kind: Kind): ListenProblem {
    switch (kind) {
      case 'still':
        return still()
      case 'sides':
      case 'noCorners':
        return sides(kind)
      case 'fill':
      case 'makes':
        return snap(kind)
      case 'likeShape':
        return likeShape()
      default:
        return rollStack(kind)
    }
  }

  return {
    topic: 'g1Shapes',
    reset() {
      asked = 0
      serial = 0
      stillDeck.reset()
      sidesDeck.reset()
      recipeDeck.reset()
      solidDeck.reset()
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
