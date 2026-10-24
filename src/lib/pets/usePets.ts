import { useMemo } from 'react'
import { useProgress } from '../../store/progress'
import { petStatuses, shownStage } from './growth'
import type { AnyPetStatus, PetGrowth, PetStatus } from './growth'
import { schoolPetStatus } from './schoolPet'

/** Every zone pet's growth right now, at the child's grade (recomputed only when stars, finished lessons or the grade change). */
export function usePetStatuses(): PetStatus[] {
  const zones = useProgress((s) => s.zones)
  const lessonsDone = useProgress((s) => s.lessonsDone)
  const grade = useProgress((s) => s.player?.grade)
  return useMemo(() => petStatuses(zones, lessonsDone, grade), [zones, lessonsDone, grade])
}

/** Every pet's status: the twelve zone pets, then the Schoolhouse raven. */
export function useAllPetStatuses(): AnyPetStatus[] {
  const zonePets = usePetStatuses()
  const school = useProgress((s) => s.schoolPet)
  return useMemo(() => [...zonePets, schoolPetStatus(school)], [zonePets, school])
}

/** creatureId → the stage it shows in the Home room and the World (see `shownStage`). */
export function useShownPetStages(): Record<string, PetGrowth> {
  const list = useAllPetStatuses()
  const seen = useProgress((s) => s.petsSeen)
  return useMemo(() => Object.fromEntries(list.map((s) => [s.pet.creatureId, shownStage(s.stage, seen[s.pet.creatureId])])), [list, seen])
}

/** creatureId → its status (zone pets and the raven), for lookups. */
export function usePetStatusMap(): Record<string, AnyPetStatus> {
  const list = useAllPetStatuses()
  return useMemo(() => Object.fromEntries(list.map((s) => [s.pet.creatureId, s])), [list])
}
