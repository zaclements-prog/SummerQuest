import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextProblem, type Problem } from '../../problem'
import { seededRng } from '../../random'
import { createProvider } from '..'
import { effectiveConfig, GRADE_LEVELS } from '../../gradeTiers'
import { G5_PASSAGES } from '../content/g5Reading'
import { G5_QUESTIONS_PER_PASSAGE, g5ReadingPool, makeG5ReadingProvider } from '../g5Reading'
import { G5_SCIENCE_PASSAGES, SPHERE_EVENTS, SPHERE_THINGS, WATER_GRAPHS } from '../content/g5Science'
import { FOOD_CHAINS, foodWebItem, makeG5ScienceProvider, matterItem, skyItem, spheresItem } from '../g5Science'
import { SPHERE_MOVES, isSpheresProvider, makeG5SpheresProvider, movePrompt, reachable } from '../g5Spheres'
import { SPHERES, TRAVELERS, TRAVELER_START, spheresStep } from '../../cycle/spheresCore'
import { G5_CHECKLISTS, G5_WRITING_PROMPTS, isG5WritingProblem, makeG5WritingProvider, type G5WritingMode } from '../g5Writing'
import { g5Checks, g5WritingFeedback } from '../../g5WritingGrader'
import { heuristicFeedback } from '../../writingGrader'
import { SKILLS } from '../../../tutoring/skills'

/**
 * Grade 5 (phase 3): Reading Reef, Writing Workshop, Science Summit. Banks are
 * checked item by item; generated questions are re-solved from their own
 * numbers over many seeds.
 */

afterEach(() => vi.restoreAllMocks())
const seeded = (s: string) => vi.spyOn(Math, 'random').mockImplementation(seededRng(s))
const BAD = /undefined|NaN|\bnull\b|\[object|Infinity|[{}]| {2}/

function clean(what: string, s: string) {
  expect(typeof s, what).toBe('string')
  expect(s.trim(), what).toBe(s)
  expect(BAD.test(s), `${what}: ${s}`).toBe(false)
  expect(/[ \t][,.!;:]|[a-z] \?/i.test(s), `${what} space before punctuation: ${s}`).toBe(false)
  expect(/\b(\w+) \1\b/i.test(s), `${what} repeats a word: ${s}`).toBe(false)
}

function fair(p: Problem) {
  const where = `${p.prompt} | ${JSON.stringify(p.options)} → ${p.answer}`
  expect(p.options.length, where).toBeGreaterThanOrEqual(2)
  expect(p.options.length, where).toBeLessThanOrEqual(6)
  expect(p.options.filter((o) => o === p.answer).length, where).toBe(1)
  expect(new Set(p.options.map((o) => String(o).toLowerCase())).size, where).toBe(p.options.length)
  clean('prompt', p.prompt)
  for (const o of p.options) clean('option', String(o))
  if (p.hint) clean('hint', p.hint)
  expect(SKILLS[p.skill!.id], `${p.skill?.id} is registered`).toBeDefined()
}

const len = (x: unknown) => String(x).trim().length
const strictlyLongest = (q: { answer: string; options: string[] }) => q.options.filter((o) => len(o) >= len(q.answer)).length === 1
const strictlyShortest = (q: { answer: string; options: string[] }) => q.options.filter((o) => len(o) <= len(q.answer)).length === 1

function biasOk(name: string, items: { answer: string; options: string[] }[]) {
  const longest = items.filter(strictlyLongest).length / items.length
  const shortest = items.filter(strictlyShortest).length / items.length
  expect(longest, `${name}: key is the longest in ${Math.round(longest * 100)}%`).toBeLessThanOrEqual(0.3)
  expect(shortest, `${name}: key is the shortest in ${Math.round(shortest * 100)}%`).toBeLessThanOrEqual(0.35)
}

// ── Reading Reef ───────────────────────────────────────────────────────────

describe('Reading Reef (5th grade): the level-5 bank', () => {
  it('holds 20+ passages, both shelves, several questions each, fiction and nonfiction', () => {
    expect(G5_PASSAGES.length).toBeGreaterThanOrEqual(20)
    expect(new Set(G5_PASSAGES.map((p) => p.title)).size).toBe(G5_PASSAGES.length)
    for (const shelf of ['literature', 'informational'] as const) expect(g5ReadingPool(shelf).length).toBeGreaterThanOrEqual(10)
    for (const p of G5_PASSAGES) expect(p.questions.length, p.title).toBeGreaterThanOrEqual(3)
    const forms = new Set(G5_PASSAGES.map((p) => p.form))
    for (const f of ['story', 'poem', 'paired', 'article', 'biography']) expect(forms.has(f as never), f).toBe(true)
    // paired texts on both shelves (comparing two texts)
    for (const shelf of ['literature', 'informational']) expect(G5_PASSAGES.some((p) => p.form === 'paired' && p.shelf === shelf)).toBe(true)
  })

  it('covers theme, comparing, figurative language, structure, point of view and main ideas', () => {
    const skills = new Set(G5_PASSAGES.flatMap((p) => p.questions.map((q) => q.skill)))
    for (const s of ['theme', 'compare', 'figurative', 'structure', 'pov', 'main-idea', 'evidence', 'character']) expect(skills.has(s as never), s).toBe(true)
  })

  it('every question: one key among unique options, clean text, passages of a sensible length', () => {
    for (const p of G5_PASSAGES) {
      clean('title', p.title)
      for (const para of p.text.split(/\n+/)) clean(`${p.title} text`, para)
      const words = p.text.split(/\s+/).length
      expect(words, p.title).toBeGreaterThanOrEqual(80)
      expect(words, p.title).toBeLessThanOrEqual(220)
      for (const q of p.questions) {
        clean('question', q.question)
        expect(q.options.filter((o) => o === q.answer).length, q.question).toBe(1)
        expect(q.options.length).toBe(4)
        expect(new Set(q.options.map((o) => o.toLowerCase())).size, q.question).toBe(4)
        for (const o of q.options) clean('option', o)
      }
    }
  })

  it('has no answer-length bias on either shelf', () => {
    for (const shelf of ['literature', 'informational'] as const) biasOk(shelf, g5ReadingPool(shelf).flatMap((p) => p.questions))
  })

  it('serves a passage at a time (up to three questions), each prompt matching its passage', async () => {
    seeded('g5-read')
    for (const shelf of ['literature', 'informational', 'mixed'] as const) {
      const prov = makeG5ReadingProvider({ shelf })
      let run = 0
      let prev = ''
      for (let i = 0; i < 300; i++) {
        const p = await nextProblem(prov)
        fair(p)
        expect(p.visual?.kind).toBe('passage')
        if (p.visual?.kind !== 'passage') continue
        expect(p.visual.question).toBe(p.prompt)
        const passage = G5_PASSAGES.find((x) => x.title === (p.visual as { passageTitle: string }).passageTitle)!
        expect(passage.questions.find((q) => q.question === p.prompt)?.answer).toBe(p.answer)
        if (shelf !== 'mixed') expect(passage.shelf).toBe(shelf)
        run = passage.title === prev ? run + 1 : 1
        prev = passage.title
        expect(run).toBeLessThanOrEqual(G5_QUESTIONS_PER_PASSAGE)
      }
    }
  })
})

// ── Science Summit ─────────────────────────────────────────────────────────

const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number)

describe('Science Summit (5th grade): generated questions, re-solved', () => {
  it('conservation of mass: the answer follows from the numbers', () => {
    seeded('g5-matter')
    for (let i = 0; i < 800; i++) {
      const it = matterItem()
      const n = nums(it.prompt)
      let want: string
      if (/sealed bag holds an ice cube|freezes it/.test(it.prompt)) want = `exactly ${n[0]} grams`
      else if (/In a sealed bag/.test(it.prompt)) want = `exactly ${n[0] + n[1]} grams`
      else if (/In an open cup/.test(it.prompt)) want = `less than ${n[0] + n[1]} grams`
      else if (/magnet/.test(it.prompt)) want = `exactly ${n[1]} grams`
      else if (/evaporates/.test(it.prompt)) want = `exactly ${n[1]} grams`
      else if (/dissolves/.test(it.prompt)) want = `exactly ${n[0] + n[1]} grams`
      else throw new Error(`unknown matter item: ${it.prompt}`)
      expect(it.answer, it.prompt).toBe(want)
      expect(it.options.filter((o) => o === it.answer).length).toBe(1)
      expect(new Set(it.options).size).toBe(it.options.length)
      for (const x of n) expect(x).toBeGreaterThan(0)
    }
  })

  it('food chains: producer, prey, energy and decomposers come from the chain itself', () => {
    seeded('g5-food')
    for (let i = 0; i < 600; i++) {
      const it = foodWebItem()
      const fc = FOOD_CHAINS.find((c) => it.prompt.includes(c.chain.join(' → ')) || it.prompt.includes(`in the ${c.place}.`))!
      expect(fc, it.prompt).toBeDefined()
      const { chain } = fc
      if (/which living thing is the producer/.test(it.prompt)) expect(it.answer).toBe(chain[0])
      else if (/what does the (.+) eat\?/.test(it.prompt)) {
        const eater = /what does the (.+) eat\?/.exec(it.prompt)![1]
        expect(it.answer).toBe(chain[chain.indexOf(eater) - 1])
      } else if (/energy/.test(it.prompt)) expect(it.answer).toBe('the sun')
      else if (/disappeared/.test(it.prompt)) expect(it.answer).toBe('It would have less food.')
      else expect(it.answer).toBe('decomposers such as fungi and bacteria')
      expect(new Set(it.options).size).toBe(it.options.length)
      expect(it.options).toContain(it.answer)
    }
  })

  it('spheres: things and events sort into the right spheres; the water graphs add up', () => {
    seeded('g5-spheres-quick')
    for (let i = 0; i < 400; i++) {
      const it = spheresItem()
      const thing = SPHERE_THINGS.find((x) => it.prompt === `Which of Earth’s spheres does ${x.thing} belong to?`)
      const event = SPHERE_EVENTS.find((x) => it.prompt.startsWith(x.event))
      if (thing) expect(it.answer).toBe(thing.sphere)
      else if (event) for (const s of event.spheres) expect(it.answer).toContain(s)
      else expect(it.visual?.kind).toBe('barGraph')
      expect(it.options).toContain(it.answer)
      expect(new Set(it.options).size).toBe(it.options.length)
    }
    for (const gph of WATER_GRAPHS) expect(gph.bars.reduce((s, b) => s + b.value, 0)).toBe(100)
    const [all, fresh] = WATER_GRAPHS
    expect(all.questions[1].answer).toBe(`${all.bars[1].value + all.bars[2].value} cups`)
    expect(fresh.questions[2].answer).toBe(`${fresh.bars[1].value + fresh.bars[2].value} cups`)
  })

  it('shadows point away from the sun, and shorten toward noon', () => {
    seeded('g5-sky')
    for (let i = 0; i < 400; i++) {
      const it = skyItem()
      if (/eastern sky/.test(it.prompt)) expect(it.answer).toBe('toward the west')
      if (/western sky/.test(it.prompt)) expect(it.answer).toBe('toward the east')
      if (/southern sky/.test(it.prompt)) expect(it.answer).toBe('toward the north')
      const m = /at (.+) and again at (.+)\. How/.exec(it.prompt)
      if (m) expect(it.answer).toBe(m[2] === 'noon' ? 'It gets shorter.' : 'It gets longer.')
      expect(it.options).toContain(it.answer)
    }
  })

  it('the passages: clean, one key each, no answer-length bias', () => {
    for (const p of G5_SCIENCE_PASSAGES) {
      clean('title', p.title)
      for (const para of p.text.split(/\n+/)) clean(p.title, para)
      for (const q of p.questions) {
        expect(q.options.filter((o) => o === q.answer).length, q.question).toBe(1)
        expect(new Set(q.options).size).toBe(q.options.length)
      }
    }
    for (const s of ['matter', 'foodWebs', 'spheres', 'sky']) expect(G5_SCIENCE_PASSAGES.filter((p) => p.strand === s).length, s).toBeGreaterThanOrEqual(4)
    biasOk('science passages', G5_SCIENCE_PASSAGES.flatMap((p) => p.questions))
  })

  it('a stage serves only its strands, passages and quick items in turn, every question fair', async () => {
    seeded('g5-sci-provider')
    for (const strands of [['matter', 'foodWebs'], ['spheres', 'sky'], ['matter', 'foodWebs', 'spheres', 'sky']] as const) {
      const prov = makeG5ScienceProvider({ strands: [...strands] })
      for (let i = 0; i < 400; i++) {
        const p = await nextProblem(prov)
        fair(p)
        const strand = p.topic.replace('g5-science-', '')
        expect(strands as readonly string[]).toContain(strand)
        expect(p.visual?.kind === 'passage').toBe(i % 2 === 0)
      }
    }
  })
})

describe('Cloud Keeper spheres tier: the moves', () => {
  it('no prompt or clue names the sphere it moves into; every move really moves', () => {
    for (const mv of SPHERE_MOVES) {
      expect(mv.from).not.toBe(mv.to)
      expect(mv.event.toLowerCase()).not.toContain(mv.to)
      expect(mv.clue.toLowerCase()).not.toContain(mv.to)
      expect(movePrompt(mv).toLowerCase().split(mv.to).length - 1, movePrompt(mv)).toBe(0)
      expect(mv.clue.length).toBeLessThanOrEqual(32)
      clean('event', mv.event)
      clean('prompt', movePrompt(mv))
    }
    expect(new Set(SPHERE_MOVES.map((m) => m.event)).size).toBe(SPHERE_MOVES.length)
  })

  it('every sphere a traveler can reach has a way out (journeys never dead-end), and each journey visits 3+ spheres', () => {
    for (const t of TRAVELERS) {
      const seen = reachable(t)
      expect(seen.has(TRAVELER_START[t])).toBe(true)
      expect(seen.size, t).toBeGreaterThanOrEqual(3)
      for (const s of seen) expect(SPHERE_MOVES.some((m) => m.traveler === t && m.from === s), `${t} out of ${s}`).toBe(true)
    }
  })

  it('nextFrom chains: the answer is where the traveler goes, never the same event twice running', async () => {
    seeded('g5-spheres')
    const prov = makeG5SpheresProvider()
    expect(isSpheresProvider(prov)).toBe(true)
    for (const t of TRAVELERS) {
      let at = TRAVELER_START[t]
      let last = ''
      for (let i = 0; i < 60; i++) {
        const p = prov.nextFrom(t, at)
        fair(p)
        expect(p.prompt).not.toBe(last)
        last = p.prompt
        expect([...p.options].sort()).toEqual([...SPHERES].sort())
        const move = SPHERE_MOVES.find((m) => movePrompt(m) === p.prompt)!
        expect(move.from).toBe(at)
        expect(p.answer).toBe(move.to)
        // a wrong station leaves it put; the right one moves it on
        for (const s of SPHERES) {
          const r = spheresStep(at, move.to, s)
          expect(r.ok).toBe(s === move.to)
          expect(r.at).toBe(s === move.to ? move.to : at)
          if (!r.ok) expect(r.hint!.split(' ').length).toBeLessThanOrEqual(4)
        }
        at = move.to
      }
    }
    for (let i = 0; i < 100; i++) fair(await nextProblem(prov))
  })
})

// ── Writing Workshop ───────────────────────────────────────────────────────

const GOOD: Record<G5WritingMode, string> = {
  opinion:
    'I think every school should have a garden, because gardens help students learn.\n\nFirst, a garden turns science into real experiments. For example, students can measure how tall bean plants grow each week. Another reason is that kids who grow vegetables are more willing to eat them. In addition, gardens give students a calm place to work together.\n\nFor these reasons, our school should plant a garden this spring. Therefore, I hope the principal agrees.',
  informative:
    'A caterpillar goes through four amazing stages before it becomes a butterfly.\n\nFirst, a female butterfly lays tiny eggs on a leaf. After about 5 days, a caterpillar hatches and starts eating. Another stage begins when the caterpillar forms a hard case called a chrysalis.\n\nInside the chrysalis, the body changes completely because special cells rebuild it. For example, wings grow where there were none.\n\nIn conclusion, the life cycle of a butterfly is full of surprising changes.',
  narrative:
    'Maya and Leo were walking home from school when Leo spotted something shiny in the grass near the park gate.\n\n“Look at this!” Leo shouted. He held up an old brass key. Maya felt a nervous shiver. “Where do you think it goes?” she whispered.\n\nLater that afternoon, they tried the key in the rusty shed behind Maya’s house. Suddenly, the lock clicked. The door creaked open, and they smelled dust and old paint.\n\nAfter that, the shed became their secret clubhouse, and they were proud of their discovery.',
}

describe('Writing Workshop (5th grade): prompts, checklists and the offline grader', () => {
  it('20 clean prompts per mode, each a task; checklists ask for paragraphs, linking words, evidence and dialogue', () => {
    for (const mode of ['opinion', 'informative', 'narrative'] as const) {
      const ps = G5_WRITING_PROMPTS[mode]
      expect(ps.length).toBeGreaterThanOrEqual(20)
      expect(new Set(ps).size).toBe(ps.length)
      for (const p of ps) {
        clean('prompt', p)
        expect(p).toMatch(/[.!?]$/)
      }
      expect(G5_CHECKLISTS[mode].length).toBe(5)
    }
    const all = Object.values(G5_CHECKLISTS).flat().join(' ')
    for (const w of ['paragraph', 'because', 'example', 'quotation marks', 'transitions', 'conclusion']) expect(all).toContain(w)
  })

  it('the provider hands out its mode’s prompts with the checklist attached', async () => {
    for (const mode of ['opinion', 'informative', 'narrative'] as const) {
      const prov = makeG5WritingProvider({ mode })
      const seen = new Set<string>()
      for (let i = 0; i < 20; i++) {
        const p = await nextProblem(prov)
        expect(isG5WritingProblem(p)).toBe(true)
        if (isG5WritingProblem(p)) expect(p.g5Writing).toEqual({ mode, checklist: G5_CHECKLISTS[mode] })
        expect(SKILLS[p.skill!.id]).toBeDefined()
        seen.add(p.prompt)
      }
      expect(seen.size).toBe(20)
    }
  })

  it('a strong piece checks off the list for 3 stars; a weak one gets the missing items as tips', () => {
    for (const mode of ['opinion', 'informative', 'narrative'] as const) {
      const fb = g5WritingFeedback(GOOD[mode], 80, mode)
      expect(fb.checks.filter((c) => !c.met).map((c) => c.label), mode).toEqual([])
      expect(fb.stars, mode).toBe(3)
      const flat = GOOD[mode].replace(/\n+/g, ' ').replace(/[“”"]/g, '').replace(/\b(because|for example|another|in conclusion|for these reasons|later|suddenly|after that|first)\b/gi, 'and')
      const weak = g5WritingFeedback(flat, 80, mode)
      expect(weak.stars, mode).toBeLessThan(3)
      expect(weak.improvements.length).toBeGreaterThan(0)
    }
  })

  it('dialogue needs its punctuation inside the quotation marks', () => {
    const met = (t: string) => g5Checks(t, 'narrative', 50)[1].met
    expect(met('“Wait for me,” said Mia.')).toBe(true)
    expect(met('"Look out!" yelled Max.')).toBe(true)
    expect(met('Mia said wait for me.')).toBe(false)
    expect(met('“Wait for me” said Mia.')).toBe(false)
  })

  it('keyboard mashing earns nothing', () => {
    const mash = Array.from({ length: 90 }, () => 'qwrt zxcv').join(' ')
    for (const mode of ['opinion', 'informative', 'narrative'] as const) expect(g5WritingFeedback(mash, 80, mode).stars).toBe(0)
  })

  it('grades 2–4 keep their own grader', () => {
    expect(heuristicFeedback('The dog ran fast.', 6).celebrations).toContain('Nice capital letter and ending punctuation!')
  })
})

describe('grade-5 kinds pass through the grade tiers as written', () => {
  it('every grade leaves them unchanged', () => {
    const cfgs = [
      { kind: 'g5Reading', shelf: 'literature' },
      { kind: 'g5Writing', mode: 'opinion' },
      { kind: 'g5Science', strands: ['matter'] },
      { kind: 'g5Spheres' },
    ] as const
    for (const c of cfgs) for (const g of GRADE_LEVELS) for (const i of [0, 1, 2, 3]) expect(effectiveConfig(c, g, i)).toEqual(c)
    expect(createProvider({ kind: 'g5Spheres' }).topic).toBe('g5-science-spheres')
  })
})
