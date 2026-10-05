import { describe, it, expect } from 'vitest'
import { SPAWN, WORLD_AREAS, areaById, npcPosition, worldColliders } from '../worldLayout'
import { collidesAt } from '../collision'
import { zoneStageRows, lessonRows, focusRows } from '../hubContent'
import { allLessons } from '../../tutoring/lessons'

describe('world hub layout', () => {
  it('has a Schoolhouse and a Library building with doors', () => {
    for (const id of ['schoolhouse', 'library']) {
      const a = areaById(id)!
      expect(a.kind).toBe('building')
      expect(a.hub).toBe(id)
      expect(a.door).toBeTruthy()
    }
  })

  it('every NPC can be walked to from the spawn point (no collider walls it off)', () => {
    const colliders = worldColliders()
    const STEP = 0.25
    const R = 0.3 // avatar body radius
    const LIMIT = 34
    const key = (x: number, z: number) => `${Math.round(x / STEP)},${Math.round(z / STEP)}`
    const seen = new Set<string>([key(SPAWN[0], SPAWN[1])])
    const queue: [number, number][] = [[SPAWN[0], SPAWN[1]]]
    while (queue.length) {
      const [x, z] = queue.shift()!
      for (const [dx, dz] of [[STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP]]) {
        const nx = x + dx
        const nz = z + dz
        const k = key(nx, nz)
        if (seen.has(k) || Math.abs(nx) > LIMIT || Math.abs(nz) > LIMIT || collidesAt(colliders, nx, nz, R)) continue
        seen.add(k)
        queue.push([nx, nz])
      }
    }
    for (const a of WORLD_AREAS.filter((a) => a.npc)) {
      const [nx, nz] = npcPosition(a)!
      let reachable = false
      for (let dx = -1.5; dx <= 1.5 && !reachable; dx += STEP)
        for (let dz = -1.5; dz <= 1.5 && !reachable; dz += STEP)
          if (Math.hypot(dx, dz) <= 1.5 && seen.has(key(nx + dx, nz + dz))) reachable = true
      expect(reachable, `${a.id} NPC at ${nx},${nz}`).toBe(true)
    }
  })
})

describe('hub panel content', () => {
  it('lists a zone\'s stages with the same locks as the zone page', () => {
    const fresh = zoneStageRows('reading-reef', { zones: {} })
    expect(fresh.map((r) => r.locked)).toEqual([false, true, true])
    expect(fresh[0].href).toBe('/play/reading-reef/read-3rd')
    const progressed = zoneStageRows('reading-reef', {
      zones: { 'reading-reef': { stages: { 'read-3rd': { stars: 2 } } } },
    })
    expect(progressed.map((r) => r.locked)).toEqual([false, false, true])
    expect(progressed[0].stars).toBe(2)
    expect(zoneStageRows('nope', { zones: {} })).toEqual([])
  })

  it('offers every lesson, coach-recommended ones first', () => {
    const now = Date.now()
    const misses = Array.from({ length: 6 }, (_, i) => ({
      id: `a${i}`, at: now - i * 1000, zoneId: 'division-dunes', topic: 'division',
      skillId: 'div-basic', skillLabel: 'basic division facts', correct: false,
    }))
    const rows = lessonRows({ attempts: misses, sessions: [] }, undefined, now)
    expect(rows).toHaveLength(allLessons.length)
    expect(rows[0]).toMatchObject({ id: 'division', recommended: true, href: '/tutor/division' })
    expect(lessonRows({ attempts: [], sessions: [] }, ['reading', 'writing']).map((r) => r.id).sort()).toEqual(['reading', 'writing'])

    // Focus practice links respect locks: div-practice is locked for a fresh player → first step.
    const focus = focusRows({ zones: {}, attempts: misses, sessions: [] }, 3, now)
    expect(focus[0]).toMatchObject({ practiceHref: '/play/division-dunes/div-concept', learnHref: '/tutor/division' })
  })
})
