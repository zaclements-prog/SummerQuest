import { describe, it, expect } from 'vitest'
import {
  STATIC_PROMPTS,
  WRITING_PROMPTS_BY_GRADE,
  poolForKind,
  makeWritingPromptProvider,
} from '../writingPrompt'
import { nextProblem } from '../../problem'
import { DEFAULT_GRADE, GRADE_LEVELS, type GradeLevel } from '../../gradeTiers'
import { useProgress } from '../../../store/progress'
import type { WritingKind } from '../writingPrompt'

/**
 * Grade-banded writing prompts (handoff A1/A4).
 *
 * A child draws from SHARED_PROMPTS plus their grade's shelf. Once a grade has
 * a shelf, that grade's pool must hold at least 30 prompts per kind (the daily-
 * player repeat target). Grades with no shelf yet fall back to the shared list —
 * they get filled, and thus gated, by handoff steps A2/A3/A4.
 */

const KINDS: WritingKind[] = ['sentence', 'paragraph', 'story']

/** Grades with authored content today (a shelf key means "authored"). */
const authoredGrades = (): GradeLevel[] =>
  GRADE_LEVELS.filter((g) => WRITING_PROMPTS_BY_GRADE[g] !== undefined)

describe('writing prompt pools per grade', () => {
  it('every authored grade reaches 30+ prompts for every kind', () => {
    // Construction rule for steps A2-A4: a grade's floor arms once all three
    // kinds are open and every kind carries at least 18 grade-written prompts
    // (shared 12 + 18 = the 30 floor). Before that, open kinds must simply be
    // non-empty, so batches can land one at a time without skipping the gate.
    const FLOOR_AUTHORED = 18
    for (const grade of authoredGrades()) {
      const shelf = WRITING_PROMPTS_BY_GRADE[grade]!
      const open = KINDS.filter((k) => shelf[k] !== undefined)
      for (const kind of open) {
        expect(shelf[kind].length, `G${grade} ${kind} shelf is empty`).toBeGreaterThan(0)
      }
      const complete = open.length === KINDS.length && KINDS.every((k) => shelf[k].length >= FLOOR_AUTHORED)
      if (complete) {
        for (const kind of KINDS) {
          const pool = poolForKind(kind, grade)
          expect(pool.length, `G${grade} ${kind} needs 30+ prompts`).toBeGreaterThanOrEqual(30)
        }
      }
    }
  })

  it('grade shelves add new text (no duplicates with shared or across kinds)', () => {
    for (const grade of GRADE_LEVELS) {
      const shelf = WRITING_PROMPTS_BY_GRADE[grade]
      if (!shelf) continue
      const seenAcrossKinds = new Set<string>()
      for (const kind of KINDS) {
        const items = shelf[kind]
        expect(items.length, `G${grade} ${kind} shelf must not be an empty list`).toBeGreaterThan(0)
        const pool = poolForKind(kind, grade)
        expect(new Set(pool).size, `G${grade} ${kind} pool has duplicate prompts`).toBe(pool.length)
        for (const item of items) {
          expect(seenAcrossKinds.has(item), `prompt reused across kinds in G${grade}`).toBe(false)
          seenAcrossKinds.add(item)
        }
      }
    }
  })

  it('every prompt is a clean, task-ending sentence', () => {
    for (const grade of GRADE_LEVELS) {
      for (const kind of KINDS) {
        for (const prompt of poolForKind(kind, grade)) {
          expect(prompt.length, 'prompt is empty').toBeGreaterThan(10)
          expect(prompt).toBe(prompt.trim())
          expect(prompt).not.toMatch(/ {2}/)
          expect(prompt).not.toMatch(/undefined|NaN|\[object/)
          expect(/[.!?]$/.test(prompt), `prompt should end with a task: "${prompt}"`).toBe(true)
        }
      }
    }
  })
})

describe('provider honors the grade shelf without changing the API', () => {
  it('serves only pool members and cycles without repeats inside one pass', async () => {
    const grade: GradeLevel = 2
    const provider = makeWritingPromptProvider({ kind: 'sentence', grade })
    const pool = poolForKind('sentence', grade)
    const seen = new Set<string>()
    for (let i = 0; i < pool.length; i++) {
      const p = await nextProblem(provider)
      expect(pool).toContain(p.prompt)
      expect(seen.has(p.prompt), `repeat within one pass: "${p.prompt}"`).toBe(false)
      seen.add(p.prompt)
    }
  })

  it('reads the profile grade when the config omits it', async () => {
    useProgress.setState({
      player: { emoji: '🦊', color: 'coral', name: 'Test', grade: 3 },
    })
    const provider = makeWritingPromptProvider({ kind: 'paragraph' })
    const pool = poolForKind('paragraph', 3)
    const prompts = new Set<string>()
    for (let i = 0; i < 40; i++) prompts.add((await nextProblem(provider)).prompt)
    for (const p of prompts) expect(pool).toContain(p)
    useProgress.getState().resetPlayer()
  })

  it('falls back to the app default grade with no profile', async () => {
    useProgress.getState().resetPlayer()
    const provider = makeWritingPromptProvider({ kind: 'story' })
    const pool = poolForKind('story', DEFAULT_GRADE)
    for (let i = 0; i < STATIC_PROMPTS.story.length; i++) {
      expect(pool).toContain((await nextProblem(provider)).prompt)
    }
  })

  it('every grade pool always includes the whole shared list', () => {
    for (const grade of GRADE_LEVELS) {
      for (const kind of KINDS) {
        const pool = poolForKind(kind, grade)
        for (const shared of STATIC_PROMPTS[kind]) {
          expect(pool, `G${grade} ${kind} lost a shared prompt`).toContain(shared)
        }
      }
    }
  })

  it('keeps the problem shape WritingPad relies on', async () => {
    const provider = makeWritingPromptProvider({ kind: 'paragraph', grade: 4 })
    const p = await nextProblem(provider)
    expect(p.topic).toBe('writing-paragraph')
    expect(p.skill).toEqual({ id: 'write-craft', label: 'writing' })
    expect(p.options).toEqual(['open'])
    expect(p.answer).toBe('open')
    expect(p.difficulty).toBe(2)
  })
})
