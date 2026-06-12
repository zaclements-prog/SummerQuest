import { describe, it, expect } from 'vitest'
import { allLessons, getLesson } from '../lessons'
import { SKILLS, skillMeta } from '../skills'

describe('lessons', () => {
  it('multiplication lesson exists with steps + narration', () => {
    const l = getLesson('multiplication')!
    expect(l).toBeTruthy()
    expect(l.steps.length).toBeGreaterThanOrEqual(2)
    for (const s of l.steps) expect(s.narration.length).toBeGreaterThan(0)
  })
  it('every lesson points at a real practice stage id used by SKILLS', () => {
    const stageIds = new Set(Object.values(SKILLS).map((s) => s.practiceStageId))
    for (const l of allLessons) expect(stageIds.has(l.practiceStageId)).toBe(true)
  })
  it('every skill lessonId resolves to a registered lesson', () => {
    for (const id of Object.keys(SKILLS)) {
      const lessonId = skillMeta(id).lessonId
      expect(getLesson(lessonId), `missing lesson ${lessonId}`).toBeTruthy()
    }
  })
})
