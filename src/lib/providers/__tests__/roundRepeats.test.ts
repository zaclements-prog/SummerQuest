import { afterEach, describe, expect, it, vi } from 'vitest'
import { curriculum } from '../../../curriculum'
import { createProvider, type ProviderConfig } from '..'
import { seededRng } from '../../random'
import type { ListenProblem } from '../../../games/listenPlay/types'

afterEach(() => vi.restoreAllMocks())

/** What makes two questions "the same question": what's said, the answer and what's shown with it (not colours or ids). */
function questionKey(q: ListenProblem): string {
  const strip = (o: unknown) => JSON.stringify(o ?? null, (k, v) => (k === 'color' || k === 'turn' || k === 'id' ? undefined : v))
  const own = q.picture ?? q.pair ?? q.activity
  // a question with nothing of its own on show is told apart by its cards ("Which one is measured the right way?")
  const cards = own ? '' : strip((q.pictureOptions ?? []).map((o) => strip(o.picture)).sort())
  return `${q.prompt}|${JSON.stringify(q.answer)}|${strip(q.picture)}|${strip(q.pair)}|${strip(q.activity)}|${cards}`
}

describe('K–1 rounds never ask the same question twice', () => {
  const stages = curriculum.zones.flatMap((z) => (['k1', 'g1'] as const).flatMap((b) => z.stagesByBand?.[b] ?? [])).filter((s) => s.gameId === 'listenPlay')

  it('covers the Listen & Play stages', () => {
    expect(stages.map((s) => s.id)).toEqual(expect.arrayContaining(['k-count-1', 'k-shapes-1', 'k-shapes-3', 'k-science-1', 'g1-tens-3']))
  })

  it.each(stages.map((s) => [s.id, s] as const))('%s', (_id, st) => {
    const total = Math.min(6, Math.max(3, Math.round(Number((st.params as { questionCount?: number } | undefined)?.questionCount) || 5)))
    for (let seed = 0; seed < 120; seed++) {
      vi.spyOn(Math, 'random').mockImplementation(seededRng(`${st.id}-round-${seed}`))
      const p = createProvider(st.providerConfig as ProviderConfig)
      p.reset?.()
      const seen = new Set<string>()
      for (let i = 0; i < total; i++) {
        const key = questionKey(p.next() as ListenProblem)
        expect(seen.has(key), `${st.id} seed ${seed}: ${key}`).toBe(false)
        seen.add(key)
      }
      vi.restoreAllMocks()
    }
  })
})
