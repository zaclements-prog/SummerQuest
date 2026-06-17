import { create } from 'zustand'

interface ActiveNpc { areaId: string; zoneId: string; label: string }
interface WorldUi {
  insideBuildingId: string | null
  activeNpc: ActiveNpc | null
  setInsideBuilding: (id: string | null) => void
  setActiveNpc: (npc: ActiveNpc | null) => void
}
// NOT persisted — world position/inside state are transient per visit.
export const useWorldUi = create<WorldUi>((set) => ({
  insideBuildingId: null,
  activeNpc: null,
  setInsideBuilding: (insideBuildingId) => set({ insideBuildingId }),
  setActiveNpc: (activeNpc) => set({ activeNpc }),
}))
