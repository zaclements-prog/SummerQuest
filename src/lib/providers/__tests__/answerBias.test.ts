import { describe, it, expect } from 'vitest'
import type { ProblemAnswer } from '../../problem'
import { nextProblem } from '../../problem'
import { PASSAGES as READING_PASSAGES } from '../readingComprehension'
import { PASSAGES as SCIENCE_PASSAGES } from '../science'
import { QUESTIONS as GEOMETRY_QUESTIONS } from '../geometry'
import { makeDataGraphProvider } from '../dataGraph'

/**
 * Content-quality guard for the hand-written multiple-choice banks.
 *
 * Test-wise kids learn that "the longest answer is usually right". If the key
 * is the strictly longest option in more than ~30% of a bank's items, that
 * shortcut beats actually reading. We also guard the opposite cue (the key is
 * suspiciously often the shortest) so a future rewrite can't overcorrect.
 */

const MAX_LONGEST_SHARE = 0.3
const MAX_SHORTEST_SHARE = 0.35

interface McItem {
  label: string
  answer: ProblemAnswer
  options: ProblemAnswer[]
}

type Level = 3 | 4

function passageBank(
  passages: Array<{
    title: string
    level: Level
    questions: Array<{ question: string; answer: string; options: string[] }>
  }>,
  level: Level,
): McItem[] {
  return passages
    .filter((p) => p.level === level)
    .flatMap((p) =>
      p.questions.map((q) => ({
        label: `${p.title} :: ${q.question}`,
        answer: q.answer,
        options: q.options,
      })),
    )
}

function geometryBank(level: Level): McItem[] {
  return GEOMETRY_QUESTIONS.filter((q) => q.level === level).map((q) => ({
    label: q.question,
    answer: q.answer,
    options: q.options,
  }))
}

/**
 * dataGraph keeps its bank private, so collect it from the static provider.
 * The provider deals a shuffled pass over the whole pool before reshuffling,
 * so the first repeated item means every item has been seen.
 */
async function dataGraphBank(level: Level): Promise<McItem[]> {
  const provider = makeDataGraphProvider({ level })
  const seen = new Map<string, McItem>()
  for (let draws = 0; draws < 1000; draws++) {
    const p = await nextProblem(provider)
    const title = p.visual?.kind === 'barGraph' ? p.visual.title : ''
    const key = `${title} :: ${p.prompt} :: ${[...p.options].map(String).sort().join('|')}`
    if (seen.has(key)) break
    seen.set(key, { label: `${title} :: ${p.prompt}`, answer: p.answer, options: p.options })
  }
  return [...seen.values()]
}

const len = (x: ProblemAnswer) => String(x).trim().length

/** True when the key is longer than every other option (ties don't count). */
function keyIsStrictlyLongest(item: McItem): boolean {
  const a = len(item.answer)
  return item.options.filter((o) => len(o) >= a).length === 1
}

/** True when the key is shorter than every other option (ties don't count). */
function keyIsStrictlyShortest(item: McItem): boolean {
  const a = len(item.answer)
  return item.options.filter((o) => len(o) <= a).length === 1
}

function checkBank(name: string, getItems: () => McItem[] | Promise<McItem[]>) {
  describe(name, () => {
    it('every item is well formed', async () => {
      const items = await getItems()
      expect(items.length, `${name} should not be empty`).toBeGreaterThan(0)
      for (const item of items) {
        expect(item.options.length, item.label).toBeGreaterThanOrEqual(2)
        expect(item.options, `${item.label}: answer must be one of the options`).toContain(item.answer)
        const normalized = item.options.map((o) => String(o).trim().toLowerCase())
        expect(new Set(normalized).size, `${item.label}: options must be unique`).toBe(item.options.length)
        for (const o of item.options) expect(len(o), `${item.label}: empty option`).toBeGreaterThan(0)
      }
    })

    it(`the key is the strictly longest option in at most ${MAX_LONGEST_SHARE * 100}% of items`, async () => {
      const items = await getItems()
      const longest = items.filter(keyIsStrictlyLongest)
      const share = longest.length / items.length
      expect(
        share,
        `${name}: ${longest.length}/${items.length} keys are the longest option:\n` +
          longest.map((i) => `  - ${i.label} => ${String(i.answer)}`).join('\n'),
      ).toBeLessThanOrEqual(MAX_LONGEST_SHARE)
    })

    it(`the key is the strictly shortest option in at most ${MAX_SHORTEST_SHARE * 100}% of items`, async () => {
      const items = await getItems()
      const shortest = items.filter(keyIsStrictlyShortest)
      const share = shortest.length / items.length
      expect(
        share,
        `${name}: ${shortest.length}/${items.length} keys are the shortest option:\n` +
          shortest.map((i) => `  - ${i.label} => ${String(i.answer)}`).join('\n'),
      ).toBeLessThanOrEqual(MAX_SHORTEST_SHARE)
    })
  })
}

describe('multiple-choice banks have no answer-length bias', () => {
  checkBank('reading level 3', () => passageBank(READING_PASSAGES, 3))
  checkBank('reading level 4', () => passageBank(READING_PASSAGES, 4))
  checkBank('science level 3', () => passageBank(SCIENCE_PASSAGES, 3))
  checkBank('science level 4', () => passageBank(SCIENCE_PASSAGES, 4))
  checkBank('geometry level 3', () => geometryBank(3))
  checkBank('geometry level 4', () => geometryBank(4))
  checkBank('dataGraph level 3', () => dataGraphBank(3))
  checkBank('dataGraph level 4', () => dataGraphBank(4))
})

describe('dataGraph bank collection', () => {
  it('collects each chart once per level (sanity check for the sampler)', async () => {
    const l3 = await dataGraphBank(3)
    const l4 = await dataGraphBank(4)
    expect(l3.length).toBeGreaterThanOrEqual(10)
    expect(l4.length).toBeGreaterThanOrEqual(10)
  })
})
