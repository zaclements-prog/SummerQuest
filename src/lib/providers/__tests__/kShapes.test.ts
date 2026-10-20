import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeKShapesProvider, K_SHAPE_SIDES, type KShapesConfig } from '../kShapes'
import { seededRng } from '../../random'
import { voiceText } from '../../../voice/registry'
import { K_FLAT_SHAPES, K_SOLID_SHAPES } from '../../../voice/packs/k-shapes'
import { isSolidShape, shapeCorners, shapeSides } from '../../../games/listenPlay/shapeGeometry'
import { cardsFor, walkthroughCounts } from '../../../games/listenPlay/script'
import type { ListenProblem } from '../../../games/listenPlay/types'
import type { Picture } from '../../problem'

afterEach(() => vi.restoreAllMocks())

function draw(cfg: KShapesConfig, seed: string, n = 400): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = makeKShapesProvider(cfg)
  return Array.from({ length: n }, () => p.next())
}

type ShapePic = Extract<Picture, { kind: 'shape' }>
const shapesOf = (q: ListenProblem) => q.pictureOptions!.map((o) => o.picture as ShapePic)

describe('kindergarten shapes: name that shape (K.G.2)', () => {
  it('"Tap the triangle.": the named flat shape once, among other flat shapes', () => {
    const targets = new Set<string>()
    for (const q of draw({ mode: 'name2d' }, 'kshape-name')) {
      const named = /^Tap the (\w+)\.$/.exec(q.prompt)![1]
      expect(q.answer).toBe(named)
      targets.add(named)
      expect(voiceText(q.speech!)).toBe(q.prompt)
      const shapes = shapesOf(q).map((s) => s.shape)
      expect(shapes).toEqual(q.options)
      expect(shapes.filter((s) => s === named)).toHaveLength(1)
      for (const s of shapes) expect(K_FLAT_SHAPES).toContain(s)
      // a square is a rectangle too: never a wrong answer to "Tap the rectangle"
      if (named === 'rectangle') expect(shapes).not.toContain('square')
      // the first stage shows every shape upright
      for (const s of shapesOf(q)) expect(s.turn ?? 0).toBe(0)
      expect(q.pictureOptions!.map((o) => voiceText(o.speech!))).toEqual(shapes.map((s) => `${s}!`))
      expect(q.picture).toBeUndefined() // the shapes take the stage
    }
    expect([...targets].sort()).toEqual([...K_FLAT_SHAPES].sort())
  })

  it('a colour never gives a shape away: each card its own colour, every shape in many colours', () => {
    const colours: Record<string, Set<number>> = {}
    for (const q of draw({ mode: 'hunt' }, 'kshape-colour').filter((q) => q.subtopic !== 'howManySides')) {
      const cs = shapesOf(q).map((s) => s.color!)
      expect(new Set(cs).size).toBe(cs.length)
      for (const s of shapesOf(q)) (colours[s.shape] ??= new Set()).add(s.color!)
    }
    for (const [shape, set] of Object.entries(colours)) expect(set.size, shape).toBeGreaterThanOrEqual(5)
  })
})

describe('kindergarten shapes: flat or solid (K.G.3)', () => {
  const qs = () => draw({ mode: 'flatSolid' }, 'kshape-flat')

  it('mixes "flat", "solid" and naming the solids', () => {
    expect(new Set(qs().map((q) => q.subtopic))).toEqual(new Set(['flat', 'solid', 'nameSolid']))
  })

  it('exactly one card is flat (or solid), and it is the answer; a wrong card hears what it is', () => {
    for (const q of qs()) {
      const shapes = shapesOf(q).map((s) => s.shape)
      if (q.subtopic === 'flat' || q.subtopic === 'solid') {
        const fits = shapes.filter((s) => isSolidShape(s) === (q.subtopic === 'solid'))
        expect(fits).toEqual([q.answer])
        expect(voiceText(q.speech!)).toBe(q.prompt)
      } else {
        expect(K_SOLID_SHAPES).toContain(q.answer)
        expect(voiceText(q.speech!)).toBe(`Tap the ${q.answer}.`)
        // beside its flat look-alike (a sphere and a circle)
        expect(shapes.some((s) => !isSolidShape(s))).toBe(true)
      }
      q.notes!.forEach((n, i) => {
        if (shapes[i] === q.answer) return expect(n).toBeNull()
        if (q.subtopic === 'nameSolid' && isSolidShape(shapes[i])) return expect(n).toBeNull()
        expect(voiceText(n!)).toBe(`A ${shapes[i]} is ${isSolidShape(shapes[i]) ? 'solid' : 'flat'}.`)
      })
    }
  })
})

describe('kindergarten shapes: the shape hunt (K.G.2–4)', () => {
  const qs = () => draw({ mode: 'hunt' }, 'kshape-hunt', 600)

  it('mixes every kind, and turns flat shapes any way up (never a 45° "diamond")', () => {
    const all = qs()
    expect(new Set(all.map((q) => q.subtopic))).toEqual(new Set(['name', 'nameSolid', 'withSides', 'noCorners', 'howManySides']))
    const turns = new Set(all.flatMap((q) => shapesOf(q).filter((s) => s.shape !== 'circle' && !isSolidShape(s.shape)).map((s) => s.turn ?? 0)))
    expect(turns.size).toBeGreaterThan(3)
    for (const t of turns) expect(Math.abs(t) % 90).not.toBe(45)
  })

  it('"Tap the shape with three sides.": exactly one card has that many sides', () => {
    for (const q of qs().filter((q) => q.subtopic === 'withSides')) {
      const word = /with (\w+) sides/.exec(q.prompt)![1]
      const n = ({ three: 3, four: 4, six: 6 } as Record<string, number>)[word]
      const shapes = shapesOf(q).map((s) => s.shape)
      expect(shapes.filter((s) => shapeSides(s) === n)).toEqual([q.answer])
      expect(voiceText(q.speech!)).toBe(q.prompt)
      // a wrong card's own sides are counted
      const wrong = shapes.findIndex((s) => s !== q.answer)
      const plan = walkthroughCounts(q, cardsFor(q), wrong, [0, 1, 2])
      const sides = shapeSides(shapes[wrong])
      expect(plan.map((c) => c.count)).toEqual(sides ? [sides] : [])
    }
  })

  it('"Tap the shape with no corners.": the circle, among shapes with corners', () => {
    for (const q of qs().filter((q) => q.subtopic === 'noCorners')) {
      expect(q.answer).toBe('circle')
      expect(shapesOf(q).filter((s) => !shapeSides(s.shape))).toHaveLength(1)
    }
  })

  it('"How many sides does the hexagon have?": the answer is the sides it has; the walkthrough traces them', () => {
    const seen = new Set<string>()
    for (const q of qs().filter((q) => q.subtopic === 'howManySides')) {
      const pic = q.picture as ShapePic
      seen.add(pic.shape)
      expect(q.prompt).toBe(`How many sides does the ${pic.shape} have?`)
      expect(q.answer).toBe(K_SHAPE_SIDES[pic.shape as keyof typeof K_SHAPE_SIDES])
      expect(q.answer).toBe(shapeSides(pic.shape))
      for (const o of q.options as number[]) expect(o).toSatisfy((n: number) => n >= 3 && n <= 6)
      const wrong = q.options.findIndex((o) => o !== q.answer)
      expect(walkthroughCounts(q, cardsFor(q), wrong, [0, 1, 2])).toEqual([{ where: 'picture', target: 'lp-picture', count: q.answer, sides: true }])
    }
    expect([...seen].sort()).toEqual(['hexagon', 'rectangle', 'square', 'triangle'])
  })
})

describe('shape geometry', () => {
  it('counts sides from the top, clockwise, however a shape is turned', () => {
    for (const shape of ['triangle', 'square', 'rectangle', 'hexagon'] as const) {
      for (const turn of [0, 90, 180, 270, -15, 15]) {
        const c = shapeCorners(shape, turn)!
        expect(c).toHaveLength(shapeSides(shape)!)
        // side 0 is the highest one
        const mid = (i: number) => (c[i][1] + c[(i + 1) % c.length][1]) / 2
        for (let i = 1; i < c.length; i++) expect(mid(0)).toBeLessThanOrEqual(mid(i) + 1e-6)
        // every corner stays in the picture
        for (const [x, y] of c) for (const v of [x, y]) expect(v).toSatisfy((n: number) => n >= 2 && n <= 98)
        // clockwise on screen: positive signed area (y points down)
        let area = 0
        for (let i = 0; i < c.length; i++) area += c[i][0] * c[(i + 1) % c.length][1] - c[(i + 1) % c.length][0] * c[i][1]
        expect(area).toBeGreaterThan(0)
      }
    }
    expect(shapeCorners('circle')).toBeNull()
    expect(shapeSides('cube')).toBeNull()
  })
})
