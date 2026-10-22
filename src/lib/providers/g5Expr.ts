import type { Problem, ProblemProvider } from '../problem'
import { randInt } from '../random'
import { EVAL_SHAPES, EXPR_PHRASES, WOODS_STORIES } from './content/g5Woods'
import { evalExpr, exactValue, firstStep, mistakenValues } from './g5ExprMath'
import { fmt, numberOptions, pick, textOptions, weighted } from './g5Shared'

/**
 * 5th-grade Word Problem Woods (K–5 plan, grade-5 contract): numerical
 * expressions (5.OA.1–2) and two-rule patterns (5.OA.3), and multi-step story
 * problems. Answers are worked out by the expression reader (g5ExprMath)
 * from the expression itself; wrong choices are the values the usual mistakes
 * give (straight left to right, grouping ignored) or the expressions kids
 * write for a story or a phrase.
 *
 * Modes:
 * - `expressions`: write the expression for a phrase ("add 8 and 7, then multiply by 2"
 *   → 2 × (8 + 7)), read one without working it out, work one out, two-rule patterns;
 * - `evaluate`: work expressions out, fast (the Trail Race);
 * - `mastery`: multi-step story problems, their expressions, patterns and order of operations.
 */

export type G5ExprMode = 'expressions' | 'evaluate' | 'mastery'
export interface G5ExprConfig {
  mode: G5ExprMode
}

export const G5_EXPR_SKILLS = {
  write: { id: 'g5-expr-write', label: 'writing and reading expressions' },
  order: { id: 'g5-expr-order', label: 'order of operations' },
  patterns: { id: 'g5-expr-patterns', label: 'patterns with two rules' },
  multiStep: { id: 'g5-wp-multistep', label: 'multi-step word problems' },
} as const

const TOPIC = 'g5-expressions'

/** The expression with its grouping symbols taken out (a kid who skips them). */
const stripGroups = (s: string) => s.replace(/[()[\]]/g, '')

/** Wrong expressions to show: only those that really mean something else (another value). */
function differentExprs(right: string, wrong: string[]): string[] {
  const want = evalExpr(right)
  return wrong.filter((w) => {
    const v = evalExpr(w)
    return Number.isFinite(v) && Math.abs(v - want) > 1e-9
  })
}

// ── work it out ─────────────────────────────────────────────────────────────

/** An expression from the shapes whose every step is a whole number and whose answer is 1–300. */
export function drawExpression(): string {
  for (let i = 0; i < 400; i++) {
    const s = pick(EVAL_SHAPES)(randInt)
    const v = exactValue(s)
    if (!Number.isInteger(v) || v < 1 || v > 300) continue
    const m = mistakenValues(s)
    // the shape must be one where a mistake changes the answer
    if (![m.leftToRight, m.noGrouping, m.groupsLeftToRight].some((x) => x !== v)) continue
    return s
  }
  return '(6 + 4) × 5'
}

function evaluateProblem(id: string): Problem {
  const s = drawExpression()
  const v = exactValue(s)
  const m = mistakenValues(s)
  const step = firstStep(s)
  const { options, answer } = numberOptions(v, [m.leftToRight, m.noGrouping, m.groupsLeftToRight, v + 10], () => v + pick([-2, -1, 1, 2, 10]))
  return {
    id,
    prompt: `${s} = ?`,
    options,
    answer,
    topic: TOPIC,
    subtopic: 'evaluate',
    difficulty: (s.match(/[()[\]]/g)?.length ?? 0) / 2 + 1,
    skill: { ...G5_EXPR_SKILLS.order },
    hint: `Grouping first, then × and ÷, then + and −.${step ? ` Start with ${step.l} ${step.op} ${step.r} = ${step.v}.` : ''}`,
  }
}

// ── write and read expressions ──────────────────────────────────────────────

function writeProblem(id: string): Problem {
  const ph = pick(EXPR_PHRASES)
  const n = ph.make()
  const right = ph.right(n)
  const wrong = differentExprs(right, [...ph.wrong(n), stripGroups(right)])
  const { options, answer } = textOptions(right, wrong)
  return {
    id,
    prompt: `Which expression means: ${ph.words(n)}`,
    options,
    answer,
    topic: TOPIC,
    subtopic: `write-${ph.id}`,
    difficulty: 2,
    skill: { ...G5_EXPR_SKILLS.write },
    hint: 'Do first what the words say to do first. If that step is + or − before a × or ÷, it needs parentheses.',
  }
}

/** "How does 3 × (18,932 + 921) compare with 18,932 + 921?" — read it, don't work it out. */
function interpretProblem(id: string): Problem {
  const a = randInt(1200, 49000)
  const b = randInt(120, 990)
  const sum = `${fmt(a)} + ${fmt(b)}`
  if (Math.random() < 0.7) {
    const k = randInt(2, 9)
    const { options, answer } = textOptions(`It is ${k} times as large`, [`It is ${k} more`, `It is ${k} less`, 'They are equal'])
    return {
      id,
      prompt: `Without working it out: how does ${k} × (${sum}) compare with ${sum}?`,
      options,
      answer,
      topic: TOPIC,
      subtopic: 'interpret-times',
      difficulty: 2,
      skill: { ...G5_EXPR_SKILLS.write },
      hint: `${k} × ( ) means ${k} groups of whatever is inside the parentheses.`,
    }
  }
  const { options, answer } = textOptions('It is half as large', ['It is 2 less', 'It is twice as large', 'They are equal'])
  return {
    id,
    prompt: `Without working it out: how does (${sum}) ÷ 2 compare with ${sum}?`,
    options,
    answer,
    topic: TOPIC,
    subtopic: 'interpret-half',
    difficulty: 2,
    skill: { ...G5_EXPR_SKILLS.write },
    hint: 'Dividing by 2 cuts the whole sum into two equal halves.',
  }
}

// ── two-rule patterns ───────────────────────────────────────────────────────

/** Two patterns from 0: A adds `a`, B adds `b = k × a` (so B is always k times A). */
export function patternPair(): { a: number; b: number; k: number } {
  const a = randInt(2, 6)
  const k = randInt(2, 4)
  return { a, b: a * k, k }
}

function patternProblem(id: string): Problem {
  const { a, b, k } = patternPair()
  const kind = pick(['times', 'next', 'when'] as const)
  const base = { id, topic: TOPIC, subtopic: `pattern-${kind}`, difficulty: 3, skill: { ...G5_EXPR_SKILLS.patterns } }
  const terms = (step: number) => [0, 1, 2, 3].map((i) => i * step).join(', ')
  if (kind === 'times') {
    return {
      ...base,
      prompt: `Pattern A starts at 0 and adds ${a}. Pattern B starts at 0 and adds ${b}. Each term in B is how many times the matching term in A?`,
      ...numberOptions(k, [b - a, a, b, k + 1]),
      hint: `Write a few terms: A is ${terms(a)}, B is ${terms(b)}. Compare them.`,
    }
  }
  if (kind === 'next') {
    return {
      ...base,
      prompt: `Pattern A: ${terms(a)}. Pattern B: ${terms(b)}. Which ordered pair (A, B) comes next?`,
      ...textOptions(`(${4 * a}, ${4 * b})`, [`(${4 * a}, ${3 * b + a})`, `(${4 * b}, ${4 * a})`, `(${5 * a}, ${5 * b})`]),
      hint: `Add ${a} to the last A term and ${b} to the last B term.`,
    }
  }
  const m = randInt(5, 12)
  return {
    ...base,
    prompt: `Pattern A starts at 0 and adds ${a}. Pattern B starts at 0 and adds ${b}. When A is ${m * a}, what is B?`,
    ...numberOptions(m * b, [m * a + (b - a), (m + 1) * b, (m - 1) * b, m * a + b]),
    hint: `${m * a} is ${m} steps of ${a}, so B has taken ${m} steps of ${b}.`,
  }
}

// ── multi-step stories ──────────────────────────────────────────────────────

/** A story's numbers, drawn until its expression is whole all the way and its wrong ideas give other answers. */
export function drawStory(): { story: (typeof WOODS_STORIES)[number]; n: Record<string, number>; expr: string; value: number } {
  for (let i = 0; i < 200; i++) {
    const story = pick(WOODS_STORIES)
    const n = story.make()
    const expr = story.expr(n)
    const value = exactValue(expr)
    if (Number.isInteger(value) && value > 0) return { story, n, expr, value }
  }
  const story = WOODS_STORIES[0]
  const n = { p: 4, m: 24, g: 30 }
  return { story, n, expr: story.expr(n), value: exactValue(story.expr(n)) }
}

function storyProblem(id: string, asExpression: boolean): Problem {
  const { story, n, expr, value } = drawStory()
  const base = { id, topic: TOPIC, subtopic: `story-${story.id}`, difficulty: 4, skill: { ...G5_EXPR_SKILLS.multiStep } }
  if (asExpression) {
    return {
      ...base,
      prompt: `${story.text(n)} Which expression solves it?`,
      ...textOptions(expr, differentExprs(expr, story.wrong(n))),
      hint: 'Find the two steps in the story. The first step goes first in the expression.',
    }
  }
  const wrongValues = story.wrong(n).map(evalExpr)
  return {
    ...base,
    prompt: story.text(n),
    ...numberOptions(value, wrongValues, () => value + pick([-10, -1, 1, 10])),
    hint: `It takes more than one step. Write it as one expression: ${expr}.`,
  }
}

// ── the provider ────────────────────────────────────────────────────────────

export function makeG5ExprProvider(cfg: G5ExprConfig): ProblemProvider {
  let serial = 0
  return {
    topic: TOPIC,
    next(): Problem {
      const id = `g5expr-${cfg.mode}-${serial++}`
      switch (cfg.mode) {
        case 'expressions': {
          const k = weighted([
            ['write', 0.4],
            ['interpret', 0.15],
            ['evaluate', 0.25],
            ['pattern', 0.2],
          ] as const)
          if (k === 'write') return writeProblem(id)
          if (k === 'interpret') return interpretProblem(id)
          if (k === 'pattern') return patternProblem(id)
          return evaluateProblem(id)
        }
        case 'evaluate':
          return evaluateProblem(id)
        case 'mastery': {
          const k = weighted([
            ['story', 0.45],
            ['storyExpr', 0.15],
            ['pattern', 0.15],
            ['evaluate', 0.15],
            ['write', 0.1],
          ] as const)
          if (k === 'story') return storyProblem(id, false)
          if (k === 'storyExpr') return storyProblem(id, true)
          if (k === 'pattern') return patternProblem(id)
          if (k === 'write') return writeProblem(id)
          return evaluateProblem(id)
        }
      }
    },
  }
}

/** For tests and the lesson: one problem of a given shape. */
export const g5ExprMakers = { evaluateProblem, writeProblem, interpretProblem, patternProblem, storyProblem }
