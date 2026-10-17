import { create } from 'zustand'

export type HomeMode = 'play' | 'decorate'
interface HomeUi {
  mode: HomeMode
  placingItemId: string | null // placing a NEW item from the bag
  movingUid: string | null // repositioning an item already in the room
  movingItemId: string | null // catalog id of the item being moved (for the ghost preview)
  /** A placed item tapped in decorate mode: the HUD shows Rotate / Move / Put away for it. */
  selectedUid: string | null
  /** The shop drawer (decorate mode) is open. It folds away after you place something, so you see it. */
  shopOpen: boolean
  rotation: number
  setMode: (m: HomeMode) => void
  startPlacing: (id: string) => void
  startMoving: (uid: string, itemId: string, rot: number) => void
  cancelPlacing: () => void
  select: (uid: string | null) => void
  setShopOpen: (open: boolean) => void
  rotate: () => void
}
export const useHomeUi = create<HomeUi>((set, get) => ({
  mode: 'play',
  placingItemId: null,
  movingUid: null,
  movingItemId: null,
  selectedUid: null,
  shopOpen: true,
  rotation: 0,
  setMode: (mode) => set({ mode, placingItemId: null, movingUid: null, movingItemId: null, selectedUid: null, shopOpen: true }),
  startPlacing: (placingItemId) =>
    set({ placingItemId, movingUid: null, movingItemId: null, selectedUid: null, rotation: 0, mode: 'decorate', shopOpen: false }),
  // Move an already-placed item without removing it: keep its rotation as the starting point.
  startMoving: (movingUid, movingItemId, rotation) =>
    set({ movingUid, movingItemId, placingItemId: null, selectedUid: null, rotation, mode: 'decorate', shopOpen: false }),
  cancelPlacing: () => set({ placingItemId: null, movingUid: null, movingItemId: null, selectedUid: null }),
  select: (selectedUid) => set({ selectedUid, placingItemId: null, movingUid: null, movingItemId: null, shopOpen: false }),
  setShopOpen: (shopOpen) => set({ shopOpen }),
  rotate: () => set({ rotation: (get().rotation + 90) % 360 }),
}))
