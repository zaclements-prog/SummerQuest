import type { Picture, PictureOption, ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { K_FLAT_SHAPES, K_SIDED_SHAPES, K_SOLID_SHAPES } from '../../voice/packs/k-shapes'
import type { VoiceRef } from '../../voice/types'
import { randInt, shuffle } from '../random'
import { countDistractors } from './kCounting'
import { avoidUsed, makeRecent, distinctColors, makeKindPicker, makePositionGuard, pickOne } from './kShared'

/**
 * Kindergarten shapes (K.G.2–4), voice-first, for the Listen & Play shell
 * (Shape Grove). Cards are shape pictures; nothing is read.
 *
 * - `name2d`: "Tap the triangle." (circle, square, triangle, rectangle, hexagon);
 * - `flatSolid`: "Tap the shape that is flat." / "…solid.", and "Tap the cube."
 *   (cube, sphere, cone, cylinder), each solid beside its flat look-alike;
 * - `hunt`: all of those, turned any way up, plus "Tap the shape with three
 *   sides.", "Tap the shape with no corners." and "How many sides does the
 *   hexagon have?" (the walkthrough traces the sides as it counts them).
 *
 * Every card gets its own colour, picked at random, so a colour never names
 * a shape. A square is never a wrong answer to "Tap the rectangle" (a square
 * is a rectangle too), and only one card ever fits the question.
 */

export type KFlatShape = (typeof K_FLAT_SHAPES)[number]
export type KSolidShape = (typeof K_SOLID_SHAPES)[number]
export type KShape = KFlatShape | KSolidShape
export type KShapesMode = 'name2d' | 'flatSolid' | 'hunt'
export type KShapeKind = 'name' | 'flat' | 'solid' | 'nameSolid' | 'withSides' | 'noCorners' | 'howManySides'

export interface KShapesConfig {
  mode?: KShapesMode
  /** Which question shapes to mix (default: the mode's). */
  kinds?: KShapeKind[]
  /** Cards per question: 2 or 3 (default 3). */
  choices?: 2 | 3
  /** Turn flat shapes any way up (default: on in `hunt`). */
  turn?: boolean
}

export const K_SHAPE_MODE_KINDS: Record<KShapesMode, KShapeKind[]> = {
  name2d: ['name'],
  flatSolid: ['flat', 'solid', 'nameSolid'],
  hunt: ['name', 'nameSolid', 'withSides', 'noCorners', 'howManySides'],
}

/** Straight sides per flat shape (a circle has none). */
export const K_SHAPE_SIDES: Record<KFlatShape, number> = { circle: 0, square: 4, triangle: 3, rectangle: 4, hexagon: 6 }

const SIDES_WORD = { 3: 'three', 4: 'four', 6: 'six' } as const

/** Each solid's flat look-alike: the distractor a five-year-old mixes it up with. */
const FLAT_TWIN: Record<KSolidShape, KFlatShape> = { cube: 'square', sphere: 'circle', cone: 'triangle', cylinder: 'rectangle' }
const SOLID_TWIN: Partial<Record<KFlatShape, KSolidShape>> = { square: 'cube', circle: 'sphere', triangle: 'cone', rectangle: 'cylinder' }

/** Ways up for a turned flat shape: upright most often; never 45° (a turned square reads as a "diamond"). */
const TURNS = [0, 0, 90, 180, 270, -15, 15]

const isSolid = (s: KShape): s is KSolidShape => (K_SOLID_SHAPES as readonly string[]).includes(s)
const label = (s: KShape): VoiceRef => ({ template: 'k-shapes/label', slots: { shape: s } })
/** After a miss, the right card lights up as it is named: "This is a square. Four sides, all the same." */
const teach = (s: KShape): VoiceRef => ({ line: `k-shapes/teach-${s}` })
const fact = (s: KShape): VoiceRef => (isSolid(s) ? { template: 'k-shapes/isSolid', slots: { shape: s } } : { template: 'k-shapes/isFlat', slots: { shape: s } })
const PRAISE: VoiceRef[] = [{ line: 'k-shapes/youKnowShapes' }, { line: 'k-shapes/shapeSpotter' }]
const SKILL = {
  flat: { id: 'k-shapes-2d', label: 'naming flat shapes' },
  solid: { id: 'k-shapes-3d', label: 'flat and solid shapes' },
  sides: { id: 'k-shapes-sides', label: 'sides and corners' },
}

export function makeKShapesProvider(cfg: KShapesConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'name2d'
  const kinds = cfg.kinds?.length ? cfg.kinds : K_SHAPE_MODE_KINDS[mode]
  const choices = cfg.choices ?? 3
  const turns = cfg.turn ?? mode === 'hunt'
  let serial = 0
  let lastTarget = ''
  /** This round's questions and the shapes they were about: never the same shape twice while others are left. */
  const seen = makeRecent<string>()
  const used = makeRecent<KShape>()
  /** What to keep out of a pick from `pool`: the shapes this round already asked about (all used up: the last one). */
  const avoid = <T extends KShape>(pool: readonly T[]): T[] => avoidUsed<T>(pool, used.list() as T[], lastTarget as T)
  const picker = makeKindPicker(kinds)
  const places = makePositionGuard()

  const turn = (s: KShape): number => (turns && !isSolid(s) && s !== 'circle' ? TURNS[randInt(0, TURNS.length - 1)] : 0)
  /** Shape pictures for the cards, each its own colour (and way up). */
  function shapeCards(shapes: KShape[], noteFor?: (s: KShape) => VoiceRef | null) {
    const colors = distinctColors(shapes.length)
    const pictureOptions = shapes.map<PictureOption>((s, i) => ({ value: s, picture: { kind: 'shape', shape: s, color: colors[i], turn: turn(s) }, speech: label(s) }))
    return { pictureOptions, notes: noteFor ? shapes.map(noteFor) : undefined }
  }

  /** `k` shapes from `pool`, none of them in `not`. */
  const some = <T,>(pool: readonly T[], k: number, not: readonly T[]): T[] => shuffle(pool.filter((x) => !not.includes(x))).slice(0, k)

  const base = (kind: KShapeKind) => ({ id: `kshape-${serial++}`, topic: 'kShapes', subtopic: kind, praise: PRAISE, walkthrough: 'none' as const })

  function make(kind: KShapeKind): ListenProblem {
    switch (kind) {
      case 'name': {
        const t = pickOne(K_FLAT_SHAPES, avoid(K_FLAT_SHAPES))
        // a square IS a rectangle: never a wrong answer to "Tap the rectangle"
        const others = some<KFlatShape>(K_FLAT_SHAPES, choices - 1, t === 'rectangle' ? [t, 'square'] : [t])
        const options = places.arrange([t, ...others], t)
        return {
          ...base(kind),
          prompt: `Tap the ${t}.`,
          options,
          answer: t,
          skill: SKILL.flat,
          speech: { template: 'k-shapes/tapShape', slots: { shape: t } },
          ...shapeCards(options),
          // a miss: the right shape is named, and its sides counted ("One, two, three, four.")
          reteach: teach(t),
          walkthrough: K_SHAPE_SIDES[t] ? ('answer' as const) : ('none' as const),
        }
      }
      case 'nameSolid': {
        const t = pickOne(K_SOLID_SHAPES, avoid(K_SOLID_SHAPES))
        // its flat look-alike, and another solid
        const others = [FLAT_TWIN[t], ...some(K_SOLID_SHAPES, choices - 2, [t])]
        const options = places.arrange([t, ...others], t)
        return {
          ...base(kind),
          prompt: `Tap the ${t}.`,
          options,
          answer: t,
          skill: SKILL.solid,
          speech: { template: 'k-shapes/tapShape', slots: { shape: t } },
          // (a flat card tapped by mistake: "A circle is flat.")
          ...shapeCards(options, (s) => (s === t || isSolid(s) ? null : fact(s))),
          reteach: teach(t),
        }
      }
      case 'flat':
      case 'solid': {
        // one of the kind asked for, among the other kind (its look-alike first)
        const t: KShape = kind === 'flat' ? pickOne(K_FLAT_SHAPES, avoid(K_FLAT_SHAPES)) : pickOne(K_SOLID_SHAPES, avoid(K_SOLID_SHAPES))
        const twin: KShape | undefined = kind === 'flat' ? SOLID_TWIN[t as KFlatShape] : FLAT_TWIN[t as KSolidShape]
        const pool: readonly KShape[] = kind === 'flat' ? K_SOLID_SHAPES : K_FLAT_SHAPES
        const others = [...(twin ? [twin] : []), ...some(pool, choices - 1, twin ? [twin] : [])].slice(0, choices - 1)
        const options = places.arrange([t, ...others], t)
        return {
          ...base(kind),
          prompt: kind === 'flat' ? 'Tap the shape that is flat.' : 'Tap the shape that is solid.',
          options,
          answer: t,
          skill: SKILL.solid,
          speech: { line: kind === 'flat' ? 'k-shapes/tapFlat' : 'k-shapes/tapSolid' },
          // "A cube is solid." about a wrong card
          ...shapeCards(options, (s) => (s === t ? null : fact(s))),
          // then "A circle is flat." about the right one
          reteach: fact(t),
        }
      }
      case 'withSides': {
        const n = pickOne<3 | 4 | 6>([3, 4, 6], lastTarget === 'triangle' ? [3] : lastTarget === 'hexagon' ? [6] : [])
        const t: KFlatShape = n === 3 ? 'triangle' : n === 6 ? 'hexagon' : pickOne(['square', 'rectangle'] as const)
        const others = some(
          K_FLAT_SHAPES.filter((s) => K_SHAPE_SIDES[s] !== n),
          choices - 1,
          [],
        )
        const options = places.arrange([t, ...others], t)
        return {
          ...base(kind),
          prompt: `Tap the shape with ${SIDES_WORD[n]} sides.`,
          options,
          answer: t,
          skill: SKILL.sides,
          speech: { line: `k-shapes/sides${n}` },
          ...shapeCards(options),
          // a wrong card's sides are counted: "One, two, three, four."
          walkthrough: 'picked',
          // then the right one is named: "This is a triangle. It has three sides."
          reteach: teach(t),
        }
      }
      case 'noCorners': {
        const others = some<KFlatShape>(K_FLAT_SHAPES, choices - 1, ['circle'])
        const options = places.arrange<KShape>(['circle', ...others], 'circle')
        return {
          ...base(kind),
          prompt: 'Tap the shape with no corners.',
          options,
          answer: 'circle',
          skill: SKILL.sides,
          speech: { line: 'k-shapes/noCorners' },
          ...shapeCards(options),
          reteach: teach('circle'),
        }
      }
      case 'howManySides': {
        const t = pickOne(K_SIDED_SHAPES, avoid(K_SIDED_SHAPES))
        const n = K_SHAPE_SIDES[t]
        const options = places.arrange([n, ...countDistractors(n, 3, 6, choices - 1)], n)
        const picture: Picture = { kind: 'shape', shape: t, color: randInt(0, 7), turn: turn(t) }
        return {
          ...base(kind),
          prompt: `How many sides does the ${t} have?`,
          options,
          answer: n,
          skill: SKILL.sides,
          speech: { template: 'k-shapes/howManySides', slots: { shape: t } },
          picture,
          pictureOptions: options.map<PictureOption>((v) => ({ value: v, picture: { kind: 'numeral', n: v }, speech: { template: 'listen/number', slots: { n: v } } })),
          cues: [
            { target: 'picture' },
            { target: 'cards', cue: 'have' },
          ],
          // the shape's sides light up one by one as they're counted
          walkthrough: 'count',
        }
      }
    }
  }

  return {
    topic: 'kShapes',
    reset() {
      serial = 0
      lastTarget = ''
      seen.clear()
      used.clear()
      picker.reset()
      places.reset()
    },
    next(): ListenProblem {
      // never the same question twice in a round (nor in a row)
      for (let tries = 0; ; tries++) {
        const p = make(picker.next())
        const shown = p.picture?.kind === 'shape' ? p.picture.shape : p.answer
        const sig = `${p.prompt}|${shown}`
        if ((!seen.has(sig) && String(shown) !== lastTarget) || tries >= 8) {
          seen.add(sig)
          lastTarget = String(shown)
          if (typeof shown === 'string') used.add(shown as KShape)
          places.note(p.options.indexOf(p.answer))
          return p
        }
      }
    },
  }
}
