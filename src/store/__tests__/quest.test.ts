// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress, QUEST_BONUS } from '../progress'
import { migrateV3toV4 } from '../migrations'

const KEY = 'summerquest-progress-v1'
const s = () => useProgress.getState()
const QUEST = { day: '2026-10-23', zoneId: 'multiplication-mesa', stageId: 'mm-1', reason: 'first' as const }

beforeEach(() => {
  localStorage.clear()
  s().resetPlayer()
  useProgress.setState({ player: { emoji: '🦊', color: '#f97316', name: 'T', grade: 3 } })
})

describe("the World's quest in the store", () => {
  it('a star on the quest stage completes it once, with a small coin bonus', () => {
    s().setQuest(QUEST)
    const coins = s().coins
    s().awardStage(QUEST.zoneId, QUEST.stageId, 2, 50)
    expect(s().quest?.doneAt).toBeGreaterThan(0)
    expect(s().coins).toBe(coins + QUEST_BONUS)
    // playing it again pays nothing more
    s().awardStage(QUEST.zoneId, QUEST.stageId, 3, 60)
    expect(s().coins).toBe(coins + QUEST_BONUS)
  })

  it('no star, or another stage, does not complete it', () => {
    s().setQuest(QUEST)
    s().awardStage(QUEST.zoneId, QUEST.stageId, 0, 5)
    s().awardStage(QUEST.zoneId, 'mm-2', 3, 50)
    expect(s().quest?.doneAt).toBeUndefined()
  })

  it('the celebration is marked once the quest is done; the big card can be put away', () => {
    s().setQuest(QUEST)
    s().markQuestCelebrated()
    expect(s().quest?.celebrated).toBeUndefined() // not done yet
    s().dismissQuestCard()
    expect(s().quest?.dismissed).toBe(true)
    s().awardStage(QUEST.zoneId, QUEST.stageId, 1, 10)
    s().markQuestCelebrated()
    expect(s().quest?.celebrated).toBe(true)
  })

  it('a new day’s pick replaces the old quest', () => {
    s().setQuest(QUEST)
    s().awardStage(QUEST.zoneId, QUEST.stageId, 1, 10)
    s().setQuest({ ...QUEST, day: '2026-10-24', stageId: 'mm-2', reason: 'nextStage' })
    expect(s().quest).toEqual({ ...QUEST, day: '2026-10-24', stageId: 'mm-2', reason: 'nextStage' })
  })

  it('resetting the player clears it', () => {
    s().setQuest(QUEST)
    s().resetPlayer()
    expect(s().quest).toBeNull()
  })
})

describe('save format v4 (quest)', () => {
  it('v3 → v4 adds an empty quest and keeps everything else', () => {
    const v3 = { coins: 40, toursSeen: ['world'], zones: { a: { zoneId: 'a', stages: {} } } }
    expect(migrateV3toV4(v3)).toEqual({ ...v3, quest: null })
  })

  it('a v3 save loads: progress kept, no quest yet', async () => {
    const player = { emoji: '🦊', color: '#f97316', name: 'T', grade: 2 }
    localStorage.setItem(KEY, JSON.stringify({ version: 3, state: { player, coins: 40, toursSeen: ['world'] } }))
    await useProgress.persist.rehydrate()
    expect(s().player).toEqual(player)
    expect(s().coins).toBe(40)
    expect(s().toursSeen).toEqual(['world'])
    expect(s().quest).toBeNull()
  })

  it('a v4 quest round-trips; a malformed one is dropped', async () => {
    const quest = { ...QUEST, doneAt: 5, celebrated: true }
    localStorage.setItem(KEY, JSON.stringify({ version: 4, state: { quest } }))
    await useProgress.persist.rehydrate()
    expect(s().quest).toEqual(quest)

    localStorage.setItem(KEY, JSON.stringify({ version: 4, state: { quest: { ...QUEST, reason: 'bogus' } } }))
    await useProgress.persist.rehydrate()
    expect(s().quest).toBeNull()
  })
})
