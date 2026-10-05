import { create } from 'zustand'
import type { HubKind } from './worldLayout'

/** The NPC the avatar is standing next to (zoneId for subject gateways, hub for hub buildings). */
export interface ActiveNpc { areaId: string; label: string; zoneId?: string; hub?: HubKind }
interface WorldUi {
  insideBuildingId: string | null
  activeNpc: ActiveNpc | null
  /** The NPC whose in-world panel (stages / lessons) is open; the avatar is paused meanwhile. */
  panel: ActiveNpc | null
  enteredFromWorld: boolean
  /** Where the avatar stood when it left for a stage/lesson — it reappears there. */
  returnSpot: [number, number] | null
  setInsideBuilding: (id: string | null) => void
  setActiveNpc: (npc: ActiveNpc | null) => void
  openPanel: (npc: ActiveNpc) => void
  closePanel: () => void
  setEnteredFromWorld: (v: boolean) => void
  setReturnSpot: (spot: [number, number] | null) => void
}
// NOT persisted — world position/inside state are transient per visit.
export const useWorldUi = create<WorldUi>((set) => ({
  insideBuildingId: null,
  activeNpc: null,
  panel: null,
  enteredFromWorld: false,
  returnSpot: null,
  setInsideBuilding: (insideBuildingId) => set({ insideBuildingId }),
  setActiveNpc: (activeNpc) => set({ activeNpc }),
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
  setEnteredFromWorld: (enteredFromWorld) => set({ enteredFromWorld }),
  setReturnSpot: (returnSpot) => set({ returnSpot }),
}))
