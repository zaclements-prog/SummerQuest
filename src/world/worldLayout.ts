export type Collider =
  | { kind: 'box'; cx: number; cz: number; w: number; d: number }
  | { kind: 'circle'; cx: number; cz: number; r: number }

export type AreaKind = 'open' | 'building'

export interface WorldArea {
  id: string
  zoneId: string // must resolve via getZone()
  label: string
  worldPos: [number, number] // x,z center
  kind: AreaKind
  theme: 'house' | 'woods' | 'falls' | 'workshop'
  npc?: { offset: [number, number]; emoji: string } // emoji reserved for a future floating NPC label
  colliders: Collider[]
  door?: { pos: [number, number]; width: number } // buildings only
  size?: number // building footprint size in world units (default 5)
}

// Phase-1 layout. Areas are spaced around a central spawn (the house at origin).
export const WORLD_AREAS: WorldArea[] = [
  {
    // The house has no NPC gateway — you enter by walking in — so zoneId is an
    // unused placeholder here, kept non-null to satisfy the layout type + test.
    id: 'house', zoneId: 'word-problem-woods', label: 'Your House',
    worldPos: [0, 0], kind: 'building', theme: 'house', size: 10,
    door: { pos: [0, 5], width: 1.6 },
    colliders: [
      { kind: 'box', cx: -5, cz: 0, w: 0.3, d: 10 },
      { kind: 'box', cx: 5, cz: 0, w: 0.3, d: 10 },
      { kind: 'box', cx: 0, cz: -5, w: 10, d: 0.3 },
      { kind: 'box', cx: -2.9, cz: 5, w: 4.2, d: 0.3 },
      { kind: 'box', cx: 2.9, cz: 5, w: 4.2, d: 0.3 },
    ],
  },
  {
    id: 'word-problem-woods', zoneId: 'word-problem-woods', label: 'Word Problem Woods',
    worldPos: [-12, -8], kind: 'open', theme: 'woods',
    npc: { offset: [0, 2.5], emoji: '🌲' },
    colliders: [
      { kind: 'circle', cx: -14, cz: -10, r: 0.6 },
      { kind: 'circle', cx: -10, cz: -11, r: 0.6 },
      { kind: 'circle', cx: -15, cz: -6, r: 0.6 },
      { kind: 'circle', cx: -9, cz: -6, r: 0.6 },
    ],
  },
  {
    id: 'fraction-falls', zoneId: 'fraction-falls', label: 'Fraction Falls',
    worldPos: [12, -8], kind: 'open', theme: 'falls',
    npc: { offset: [-2, 3], emoji: '💧' },
    colliders: [
      { kind: 'box', cx: 12, cz: -11, w: 6, d: 3 },
      { kind: 'circle', cx: 13, cz: -5.5, r: 0.7 },
    ],
  },
  {
    id: 'writing-workshop', zoneId: 'writing-workshop', label: 'Writing Workshop',
    worldPos: [0, -14], kind: 'building', theme: 'workshop',
    door: { pos: [0, -11.5], width: 1.6 },
    colliders: [
      { kind: 'box', cx: -2.5, cz: -14, w: 0.3, d: 5 },
      { kind: 'box', cx: 2.5, cz: -14, w: 0.3, d: 5 },
      { kind: 'box', cx: 0, cz: -16.5, w: 5, d: 0.3 },
      { kind: 'box', cx: -1.65, cz: -11.5, w: 1.7, d: 0.3 },
      { kind: 'box', cx: 1.65, cz: -11.5, w: 1.7, d: 0.3 },
    ],
  },
]

const BOUND = 23
const PERIMETER: Collider[] = [
  { kind: 'box', cx: 0, cz: -BOUND, w: BOUND * 2, d: 1 },
  { kind: 'box', cx: 0, cz: BOUND, w: BOUND * 2, d: 1 },
  { kind: 'box', cx: -BOUND, cz: 0, w: 1, d: BOUND * 2 },
  { kind: 'box', cx: BOUND, cz: 0, w: 1, d: BOUND * 2 },
]

export function areaById(id: string): WorldArea | undefined {
  return WORLD_AREAS.find((a) => a.id === id)
}

export function worldColliders(): Collider[] {
  return [...WORLD_AREAS.flatMap((a) => a.colliders), ...PERIMETER]
}
