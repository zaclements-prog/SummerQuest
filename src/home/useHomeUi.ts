import { create } from 'zustand'

export type HomeMode = 'play' | 'decorate'
interface HomeUi {
  mode: HomeMode
  placingItemId: string | null // placing a NEW item from the bag
  movingUid: string | null // repositioning an item already in the room
  movingItemId: string | null // catalog id of the item being moved (for the ghost preview)
  rotation: number
  setMode: (m: HomeMode) => void
  startPlacing: (id: string) => void
  startMoving: (uid: string, itemId: string, rot: number) => void
  cancelPlacing: () => void
  rotate: () => void
}
export const useHomeUi = create<HomeUi>((set, get) => ({
  mode: 'play',
  placingItemId: null,
  movingUid: null,
  movingItemId: null,
  rotation: 0,
  setMode: (mode) => set({ mode, placingItemId: null, movingUid: null, movingItemId: null }),
  startPlacing: (placingItemId) =>
    set({ placingItemId, movingUid: null, movingItemId: null, rotation: 0, mode: 'decorate' }),
  // Move an already-placed item without removing it: keep its rotation as the starting point.
  startMoving: (movingUid, movingItemId, rotation) =>
    set({ movingUid, movingItemId, placingItemId: null, rotation, mode: 'decorate' }),
  cancelPlacing: () => set({ placingItemId: null, movingUid: null, movingItemId: null }),
  rotate: () => set({ rotation: (get().rotation + 90) % 360 }),
}))
