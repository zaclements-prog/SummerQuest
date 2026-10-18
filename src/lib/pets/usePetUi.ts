import { create } from 'zustand'

/**
 * Transient pet UI flags shared across screens (not persisted):
 * - the Tutor's lesson-complete card is a calm moment for a pet celebration;
 * - while a celebration is on screen, that card holds its "on to practice"
 *   countdown, so the hatch isn't cut short by a page change.
 */
interface PetUi {
  lessonCompleteOpen: boolean
  momentOpen: boolean
  setLessonCompleteOpen: (open: boolean) => void
  setMomentOpen: (open: boolean) => void
}

export const usePetUi = create<PetUi>((set) => ({
  lessonCompleteOpen: false,
  momentOpen: false,
  setLessonCompleteOpen: (lessonCompleteOpen) => set({ lessonCompleteOpen }),
  setMomentOpen: (momentOpen) => set({ momentOpen }),
}))
