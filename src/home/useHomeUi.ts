import { create } from 'zustand'

export type HomeMode = 'play' | 'decorate'
interface HomeUi {
  mode: HomeMode
  placingItemId: string | null
  rotation: number
  setMode: (m: HomeMode) => void
  startPlacing: (id: string) => void
  cancelPlacing: () => void
  rotate: () => void
}
export const useHomeUi = create<HomeUi>((set, get) => ({
  mode: 'play',
  placingItemId: null,
  rotation: 0,
  setMode: (mode) => set({ mode, placingItemId: null }),
  startPlacing: (placingItemId) => set({ placingItemId, rotation: 0, mode: 'decorate' }),
  cancelPlacing: () => set({ placingItemId: null }),
  rotate: () => set({ rotation: (get().rotation + 90) % 360 }),
}))
