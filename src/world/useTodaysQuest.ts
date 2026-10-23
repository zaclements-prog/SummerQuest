import { useEffect, useMemo } from 'react'
import { getStage, getZone } from '../curriculum'
import { localDayKey } from '../lib/dates'
import { chooseQuest, questStillValid } from '../lib/quest'
import { useProgress, type DailyQuest } from '../store/progress'
import type { GuideStep } from '../guide/store'

/** K–1: what the quest card says (and 🔊 says again), pointing at its star. */
export const QUEST_FIRST_LINE: GuideStep = { voice: { line: 'quest/first' }, target: 'quest-start', cue: 'star', dim: false }
export const QUEST_TODAY_LINE: GuideStep = { voice: { line: 'quest/today' }, target: 'quest-today', cue: 'star', dim: false }

/**
 * The World's quest for today: picks one (lib/quest) the first time the World
 * opens on a new day, or when the grade changed under the old one, and keeps
 * it for the rest of the day. A finished quest stays (done) until tomorrow.
 * Null when there's nothing to suggest (every star is in).
 */
export function useTodaysQuest() {
  const quest = useProgress((s) => s.quest)
  const grade = useProgress((s) => s.player?.grade)
  const hasPlayer = useProgress((s) => s.player != null)

  const stale = !quest || quest.day !== localDayKey() || !questStillValid(quest, grade)
  useEffect(() => {
    if (!hasPlayer || !stale) return
    const st = useProgress.getState()
    const pick = chooseQuest({ zones: st.zones, factStats: st.factStats, grade })
    if (pick) st.setQuest({ day: localDayKey(), ...pick })
  }, [hasPlayer, stale, grade])

  return useMemo(() => {
    if (stale || !quest) return null
    const zone = getZone(quest.zoneId)
    const stage = getStage(quest.zoneId, quest.stageId, grade)
    return zone && stage ? { quest: quest as DailyQuest, zone, stage } : null
  }, [stale, quest, grade])
}
