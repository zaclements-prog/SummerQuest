import { create } from 'zustand'

interface ActiveNpc { areaId: string; zoneId: string; label: string }
interface WorldUi {
  insideBuildingId: string | null
  activeNpc: ActiveNpc | null
  enteredFromWorld: boolean
  setInsideBuilding: (id: string | null) => void
  setActiveNpc: (npc: ActiveNpc | null) => void
  setEnteredFromWorld: (v: boolean) => void
}
// NOT persisted — world position/inside state are transient per visit.
export const useWorldUi = create<WorldUi>((set) => ({
  insideBuildingId: null,
  activeNpc: null,
  enteredFromWorld: false,
  setInsideBuilding: (insideBuildingId) => set({ insideBuildingId }),
  setActiveNpc: (activeNpc) => set({ activeNpc }),
  setEnteredFromWorld: (enteredFromWorld) => set({ enteredFromWorld }),
}))
