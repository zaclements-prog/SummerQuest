import type { Problem, ProblemProvider, ProblemVisual } from '../problem'
import { randInt, shuffle } from '../random'
import { pair, pick, withDistractors } from './g5MgdKit'
import { G5_ASN, G5_SHAPE_ITEMS } from './content/g5Shapes'

/**
 * 5th-grade Geometry Grove:
 *
 * - `coordinates` (5.G.1–2): read and plot points (x, y) in the first quadrant,
 *   what the axes, the origin and each number of a pair mean, moving on the
 *   grid, and real-world maps and graphs (the `coordPlane` visual). Wrong
 *   options swap x and y, land one square off, or read the other axis.
 * - `classify` (5.G.3–4): the family tree of quadrilaterals and the kinds of
 *   triangles: always / sometimes / never, which statement is true, and naming
 *   a shape from its angles and sides (content/g5Shapes).
 * - `mixed`: the boss, both.
 */

export type G5GeometryMode = 'coordinates' | 'classify' | 'mixed'
export interface G5GeometryConfig {
  mode: G5GeometryMode
}

export const G5_COORD_SKILL = { id: 'g5-coordinates', label: 'the coordinate plane' }
export const G5_CLASSIFY_SKILL = { id: 'g5-classify', label: 'classifying shapes' }

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'M', 'N', 'P', 'R', 'T']

// ── coordinates ──────────────────────────────────────────────────────────────

const coord = (id: string, prompt: string, answer: string, options: string[], hint: string, subtopic: string, visual?: ProblemVisual): Problem => ({
  id,
  prompt,
  answer,
  options,
  topic: 'g5-coordinates',
  subtopic,
  visual,
  hint,
  skill: G5_COORD_SKILL,
})

/** `n` different grid points inside a 10 × 10 plane, the first with x ≠ y (so its swap is another place). */
function points(n: number, lo = 1, hi = 9): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  while (out.length < n) {
    const p = { x: randInt(lo, hi), y: randInt(lo, hi) }
    if (out.length === 0 && p.x === p.y) continue
    if (out.some((q) => q.x === p.x && q.y === p.y)) continue
    out.push(p)
  }
  return out
}

const plane = (pts: { x: number; y: number; label?: string }[], extra: Partial<Extract<ProblemVisual, { kind: 'coordPlane' }>> = {}): ProblemVisual => ({
  kind: 'coordPlane',
  xMax: 10,
  yMax: 10,
  points: pts,
  ...extra,
})

/** "What are the coordinates of point B?" */
function readPoint(id: string): Problem {
  const pts = points(4)
  const labels = shuffle(LETTERS.slice(0, 8)).slice(0, 4)
  const t = pts[0]
  const answer = pair(t.x, t.y)
  const options = withDistractors(answer, [pair(t.y, t.x), pair(t.x, t.y + 1), pair(t.x + 1, t.y), pair(pts[1].x, pts[1].y), pair(t.x - 1, t.y)], (i) => pair(t.x + i, t.y + i))
  const shown = shuffle(pts.map((p, i) => ({ ...p, label: labels[i] })))
  return coord(id, `What are the coordinates of point ${labels[0]}?`, answer, options, 'Start at the origin. Count across to find x first, then count up to find y.', 'read', plane(shown))
}

/** "Which point is at (4, 2)?" — one of the others sits at (2, 4). */
function findPoint(id: string): Problem {
  const pts = points(4)
  const t = pts[0]
  // the swap trap: another point at (y, x)
  pts[1] = { x: t.y, y: t.x }
  const uniq = pts.filter((p, i) => pts.findIndex((q) => q.x === p.x && q.y === p.y) === i)
  while (uniq.length < 4) {
    const p = { x: randInt(1, 9), y: randInt(1, 9) }
    if (!uniq.some((q) => q.x === p.x && q.y === p.y)) uniq.push(p)
  }
  const labels = shuffle(LETTERS.slice(0, 4))
  const shown = uniq.map((p, i) => ({ ...p, label: labels[i] }))
  return coord(id, `Which point is at ${pair(t.x, t.y)}?`, labels[0], [...labels].sort(), `Go across ${t.x}, then up ${t.y}.`, 'find', plane(shuffle(shown)))
}

/** Moving on the grid: from the origin, or from a point. */
function move(id: string): Problem {
  const a = randInt(1, 6)
  const b = randInt(1, 6)
  if (Math.random() < 0.4) {
    const options = withDistractors(pair(a, b), [pair(b, a), pair(a + b, 0), pair(a, a + b), pair(0, a + b)], (i) => pair(a + i, b))
    return coord(id, `Start at the origin. Move ${a} ${a === 1 ? 'unit' : 'units'} right and ${b} ${b === 1 ? 'unit' : 'units'} up. Where are you?`, pair(a, b), options, 'Moving right changes x, the first number. Moving up changes y.', 'move')
  }
  const sx = randInt(1, 4)
  const sy = randInt(1, 4)
  const answer = pair(sx + a, sy + b)
  const options = withDistractors(answer, [pair(sx + b, sy + a), pair(sx + a, sy), pair(sx, sy + b), pair(a, b)], (i) => pair(sx + a + i, sy + b))
  return coord(id, `Start at ${pair(sx, sy)}. Move ${a} ${a === 1 ? 'unit' : 'units'} right and ${b} ${b === 1 ? 'unit' : 'units'} up. Where are you now?`, answer, options, `Add ${a} to x, the first number, and ${b} to y, the second.`, 'move')
}

/** What the axes, the origin and each number of a pair mean. */
function axes(id: string): Problem {
  const n = randInt(2, 9)
  // (two different numbers, so "what does the 7 tell you?" has one answer)
  const m = (n + randInt(1, 7) - 2) % 8 + 2
  switch (randInt(0, 4)) {
    case 0: {
      const onY = Math.random() < 0.5
      const answer = onY ? 'the y-axis' : 'the x-axis'
      return coord(id, `Point P is at ${onY ? pair(0, n) : pair(n, 0)}. Which axis is it on?`, answer, shuffle(['the x-axis', 'the y-axis', 'both axes', 'neither axis']), onY ? 'An x-coordinate of 0 means you never move across: you stay on the y-axis.' : 'A y-coordinate of 0 means you never move up: you stay on the x-axis.', 'axes')
    }
    case 1:
      return coord(id, 'What is the point (0, 0) called?', 'the origin', shuffle(['the origin', 'the x-axis', 'the y-axis', 'the corner point']), 'Every trip on the grid starts at (0, 0).', 'axes')
    case 2: {
      const first = Math.random() < 0.5
      const answer = first ? 'how far to go across from the origin' : 'how far to go up from the origin'
      return coord(
        id,
        `In the ordered pair ${pair(n, m)}, what does the ${first ? n : m} tell you?`,
        answer,
        shuffle(['how far to go across from the origin', 'how far to go up from the origin', 'how far apart two points are', 'the name of the point']),
        'The first number is x: go across. The second number is y: go up.',
        'axes',
      )
    }
    case 3: {
      const options = withDistractors(pair(n, 0), [pair(0, n), pair(n, n), pair(1, n)], (i) => pair(n + i, n))
      return coord(id, 'Which point is on the x-axis?', pair(n, 0), options, 'A point on the x-axis has not moved up at all: its y-coordinate is 0.', 'axes')
    }
    default: {
      const options = withDistractors(pair(0, n), [pair(n, 0), pair(n, n), pair(n, 1)], (i) => pair(n, n + i))
      return coord(id, 'Which point is on the y-axis?', pair(0, n), options, 'A point on the y-axis has not moved across at all: its x-coordinate is 0.', 'axes')
    }
  }
}

const PLACES = [
  ['school', 'S'],
  ['library', 'L'],
  ['park', 'P'],
  ['museum', 'M'],
  ['gym', 'G'],
  ['zoo', 'Z'],
  ['bakery', 'B'],
  ['fire station', 'F'],
] as const

/** Two places in a line on a city map: how many blocks apart (5.G.2). */
function distance(id: string): Problem {
  const [p1, p2] = shuffle(PLACES).slice(0, 2)
  const same = randInt(1, 9)
  let a = randInt(1, 9)
  let b = randInt(1, 9)
  while (Math.abs(a - b) < 2) b = randInt(1, 9)
  if (a > b && Math.random() < 0.5) [a, b] = [b, a]
  const vertical = Math.random() < 0.5
  const P1 = vertical ? { x: same, y: a } : { x: a, y: same }
  const P2 = vertical ? { x: same, y: b } : { x: b, y: same }
  const d = Math.abs(a - b)
  const options = withDistractors(String(d), [String(a + b), String(Math.max(a, b)), String(same), String(d + 1), String(d - 1)], (i) => String(d + i + 1))
  return coord(
    id,
    `On this map, the ${p1[0]} (${p1[1]}) is at ${pair(P1.x, P1.y)} and the ${p2[0]} (${p2[1]}) is at ${pair(P2.x, P2.y)}. How many blocks apart are they?`,
    String(d),
    options,
    vertical ? `They share x = ${same}. Count up from ${Math.min(a, b)} to ${Math.max(a, b)}.` : `They share y = ${same}. Count across from ${Math.min(a, b)} to ${Math.max(a, b)}.`,
    'distance',
    plane([
      { ...P1, label: p1[1] },
      { ...P2, label: p2[1] },
    ]),
  )
}

interface Graph {
  what: string
  xLabel: string
  yLabel: string
  start: readonly number[]
  rate: readonly number[]
  /** The y-axis counts by this (every point lands on a grid line). */
  yStep: (rate: number) => number
  askY: (x: number) => string
  askX: (y: number) => string
}

const GRAPHS: readonly Graph[] = [
  {
    what: "a sunflower's height in inches, week by week",
    xLabel: 'Week',
    yLabel: 'Inches',
    start: [0, 2, 4],
    rate: [2, 4],
    yStep: () => 2,
    askY: (k) => `How tall was the sunflower in week ${k}, in inches?`,
    askX: (y) => `In which week was the sunflower ${y} inches tall?`,
  },
  {
    what: "the money in Kai's piggy bank, week by week",
    xLabel: 'Week',
    yLabel: 'Dollars',
    start: [0, 5, 10],
    rate: [5, 10],
    yStep: () => 5,
    askY: (k) => `How many dollars were in the piggy bank in week ${k}?`,
    askX: (y) => `In which week did the piggy bank hold ${y} dollars?`,
  },
  {
    what: 'how far a hiking club walked, hour by hour',
    xLabel: 'Hours',
    yLabel: 'Miles',
    start: [0],
    rate: [2, 3, 4],
    yStep: (r) => (r === 3 ? 3 : 2),
    askY: (k) => `How many miles had the club walked after ${k} hours?`,
    askX: (y) => `After how many hours had the club walked ${y} miles?`,
  },
  {
    what: 'how many pages Rosa had read, day by day',
    xLabel: 'Day',
    yLabel: 'Pages',
    start: [0, 10],
    rate: [10, 20],
    yStep: () => 10,
    askY: (k) => `How many pages had Rosa read by day ${k}?`,
    askX: (y) => `On which day had Rosa read ${y} pages in all?`,
  },
]

/** A real-world graph: read a point (5.G.2). */
function graphRead(id: string): Problem {
  const g = pick(GRAPHS)
  const start = pick(g.start)
  const rate = pick(g.rate)
  const yStep = g.yStep(rate)
  const yMax = Math.ceil((start + rate * 5) / yStep) * yStep
  const pts = [1, 2, 3, 4, 5].map((k) => ({ x: k, y: start + rate * k }))
  const k = randInt(2, 4)
  const y = start + rate * k
  const visual = plane(pts, { xMax: 6, yMax, yStep, line: true, xLabel: g.xLabel, yLabel: g.yLabel })
  if (Math.random() < 0.6) {
    const options = withDistractors(String(y), [String(start + rate * (k + 1)), String(start + rate * (k - 1)), String(k), String(y + yStep)], (i) => String(y + i * rate))
    return coord(id, `The graph shows ${g.what}. ${g.askY(k)}`, String(y), options, `Find ${k} on the x-axis, go straight up to the point, then across to the y-axis.`, 'graph', visual)
  }
  const options = withDistractors(String(k), [String(k + 1), String(k - 1), String(y), String(k + 2)], (i) => String(k + i + 2))
  return coord(id, `The graph shows ${g.what}. ${g.askX(y)}`, String(k), options, `Find ${y} on the y-axis, go across to the point, then down to the x-axis.`, 'graph', visual)
}

function coordinates(id: string): Problem {
  const r = Math.random()
  if (r < 0.25) return readPoint(id)
  if (r < 0.45) return findPoint(id)
  if (r < 0.6) return move(id)
  if (r < 0.7) return axes(id)
  if (r < 0.85) return distance(id)
  return graphRead(id)
}

// ── classifying shapes ───────────────────────────────────────────────────────

const shape = (id: string, prompt: string, answer: string, options: string[], hint: string, subtopic: string): Problem => ({
  id,
  prompt,
  answer,
  options,
  topic: 'g5-classify',
  subtopic,
  hint,
  skill: G5_CLASSIFY_SKILL,
})

/** A quadrilateral named from its angles and sides (always two pairs of parallel sides). */
function quadName(id: string): Problem {
  const right = Math.random() < 0.5
  const equal = Math.random() < 0.5
  const a = randInt(3, 6)
  const b = a + randInt(2, 4)
  const answer = right && equal ? 'square' : right ? 'rectangle' : equal ? 'rhombus' : 'parallelogram'
  const sides = equal ? `four sides of ${a} cm` : `two sides of ${a} cm and two of ${b} cm`
  return shape(
    id,
    `A quadrilateral has two pairs of parallel sides, ${right ? 'four right angles' : 'no right angles'}, and ${sides}. Which name describes it best?`,
    answer,
    shuffle(['square', 'rectangle', 'rhombus', 'parallelogram']),
    'Right angles make a rectangle. Equal sides make a rhombus. Both make a square.',
    'quadrilateral',
  )
}

/** A triangle's kind from its three angles. */
function triangleAngles(id: string): Problem {
  const kind = pick(['acute', 'right', 'obtuse'] as const)
  let ang: number[]
  if (kind === 'right') {
    const a = randInt(4, 14) * 5
    ang = [90, a, 90 - a]
  } else if (kind === 'obtuse') {
    const o = randInt(19, 28) * 5
    const a = randInt(2, (180 - o) / 5 - 2) * 5
    ang = [o, a, 180 - o - a]
  } else {
    // three angles under 90°
    for (;;) {
      const a = randInt(8, 17) * 5
      const b = randInt(8, 17) * 5
      const c = 180 - a - b
      if (c > 0 && c < 90) {
        ang = [a, b, c]
        break
      }
    }
  }
  const [x, y, z] = shuffle(ang)
  return shape(
    id,
    `A triangle has angles of ${x}°, ${y}° and ${z}°. What kind of triangle is it?`,
    kind,
    shuffle(['acute', 'right', 'obtuse']),
    'One 90° angle makes it right. One angle over 90° makes it obtuse. All three under 90° make it acute.',
    'triangle',
  )
}

/** A triangle's kind from its three sides. */
function triangleSides(id: string): Problem {
  const kind = pick(['equilateral', 'isosceles', 'scalene'] as const)
  let s: number[]
  if (kind === 'equilateral') {
    const a = randInt(3, 12)
    s = [a, a, a]
  } else if (kind === 'isosceles') {
    const a = randInt(4, 10)
    let c = randInt(2, 2 * a - 1)
    if (c === a) c = a + 1
    s = [a, a, c]
  } else {
    for (;;) {
      const [a, b, c] = [randInt(3, 12), randInt(3, 12), randInt(3, 12)]
      const [p, q, r] = [a, b, c].sort((u, v) => u - v)
      if (p !== q && q !== r && p + q > r) {
        s = [a, b, c]
        break
      }
    }
  }
  const [x, y, z] = shuffle(s)
  return shape(
    id,
    `A triangle has sides of ${x} cm, ${y} cm and ${z} cm. Which name describes it best?`,
    kind,
    shuffle(['equilateral', 'isosceles', 'scalene']),
    'Three equal sides: equilateral. Exactly two equal sides: isosceles. No equal sides: scalene.',
    'triangle',
  )
}

function makeClassifier() {
  // the hand-written items come round in a shuffled order (no repeats until all are used)
  type Bank = { kind: 'asn'; i: number } | { kind: 'item'; i: number }
  const all: Bank[] = [...G5_ASN.map((_, i) => ({ kind: 'asn', i }) as Bank), ...G5_SHAPE_ITEMS.map((_, i) => ({ kind: 'item', i }) as Bank)]
  let queue: Bank[] = []
  return (id: string): Problem => {
    const r = Math.random()
    if (r < 0.12) return quadName(id)
    if (r < 0.22) return triangleAngles(id)
    if (r < 0.3) return triangleSides(id)
    if (queue.length === 0) queue = shuffle(all)
    const b = queue.shift()!
    if (b.kind === 'asn') {
      const it = G5_ASN[b.i]
      return shape(id, `Always, sometimes or never? ${it.text}`, it.answer, ['always', 'sometimes', 'never'], it.why, 'hierarchy')
    }
    const it = G5_SHAPE_ITEMS[b.i]
    return shape(id, it.question, it.options[0], shuffle(it.options), it.why, 'hierarchy')
  }
}

// ── the provider ─────────────────────────────────────────────────────────────

export function makeG5GeometryProvider(cfg: G5GeometryConfig): ProblemProvider {
  let serial = 0
  const classify = makeClassifier()
  return {
    topic: 'g5-geometry',
    next(): Problem {
      const id = `g5-geo-${cfg.mode}-${serial++}`
      switch (cfg.mode) {
        case 'coordinates':
          return coordinates(id)
        case 'classify':
          return classify(id)
        case 'mixed':
          return serial % 2 === 1 ? coordinates(id) : classify(id)
      }
    },
  }
}
