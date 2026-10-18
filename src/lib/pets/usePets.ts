import { useMemo } from 'react'
import { useProgress } from '../../store/progress'
import { petStatuses } from './growth'
import type { PetStatus } from './growth'

/** Every pet's growth right now (recomputed only when stars or finished lessons change). */
export function usePetStatuses(): PetStatus[] {
  const zones = useProgress((s) => s.zones)
  const lessonsDone = useProgress((s) => s.lessonsDone)
  return useMemo(() => petStatuses(zones, lessonsDone), [zones, lessonsDone])
}

/** creatureId → its status, for lookups. */
export function usePetStatusMap(): Record<string, PetStatus> {
  const list = usePetStatuses()
  return useMemo(() => Object.fromEntries(list.map((s) => [s.pet.creatureId, s])), [list])
}
