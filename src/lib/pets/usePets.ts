import { useMemo } from 'react'
import { useProgress } from '../../store/progress'
import { petStatuses, shownStage } from './growth'
import type { PetGrowth, PetStatus } from './growth'

/** Every pet's growth right now (recomputed only when stars or finished lessons change). */
export function usePetStatuses(): PetStatus[] {
  const zones = useProgress((s) => s.zones)
  const lessonsDone = useProgress((s) => s.lessonsDone)
  return useMemo(() => petStatuses(zones, lessonsDone), [zones, lessonsDone])
}

/** creatureId → the stage it shows in the Home room and the World (see `shownStage`). */
export function useShownPetStages(): Record<string, PetGrowth> {
  const list = usePetStatuses()
  const seen = useProgress((s) => s.petsSeen)
  return useMemo(() => Object.fromEntries(list.map((s) => [s.pet.creatureId, shownStage(s.stage, seen[s.pet.creatureId])])), [list, seen])
}

/** creatureId → its status, for lookups. */
export function usePetStatusMap(): Record<string, PetStatus> {
  const list = usePetStatuses()
  return useMemo(() => Object.fromEntries(list.map((s) => [s.pet.creatureId, s])), [list])
}
