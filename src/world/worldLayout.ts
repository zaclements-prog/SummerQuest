import { WOODS_TREES, WOODS_TREE_RADIUS } from './areas/woodsTrees'

export type Collider =
  | { kind: 'box'; cx: number; cz: number; w: number; d: number }
  | { kind: 'circle'; cx: number; cz: number; r: number }

export type AreaKind = 'open' | 'building'

/** Hub buildings: their NPC opens a hub panel instead of (or as well as) a zone's stages. */
export type HubKind = 'schoolhouse' | 'library'

export interface WorldArea {
  id: string
  zoneId?: string // the zone its NPC opens (must resolve via getZone()); hubs may omit it
  hub?: HubKind
  label: string
  worldPos: [number, number] // x,z center
  kind: AreaKind
  theme: string // visual theme key (the area component decides the look)
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
    // every tree drawn in the woods is solid (single source of truth: woodsTrees.ts)
    colliders: WOODS_TREES.map((t) => ({ kind: 'circle' as const, cx: t.pos[0], cz: t.pos[1], r: WOODS_TREE_RADIUS })),
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

  // ── Hub buildings: the Schoolhouse (Tutor lessons, This Week's Focus, Daily
  //    Challenge) next to the House, and the Library beside Reading Reef (reading
  //    stages + reading/writing lessons). Their NPCs open an in-world panel. ──
  {
    id: 'schoolhouse', hub: 'schoolhouse', label: 'Schoolhouse',
    worldPos: [12, 1], kind: 'building', theme: 'schoolhouse',
    npc: { offset: [0, 3.7], emoji: '🦉' },
    door: { pos: [12, 3.5], width: 1.6 },
    colliders: buildingWalls(12, 1),
  },
  {
    id: 'library', hub: 'library', zoneId: 'reading-reef', label: 'Library',
    worldPos: [8, 21], kind: 'building', theme: 'library',
    npc: { offset: [0, 3.7], emoji: '📚' },
    door: { pos: [8, 23.5], width: 1.6 },
    colliders: buildingWalls(8, 21),
  },

  // ── Subject zones added to World mode. Open destinations whose gateway NPC
  //    opens /zone/:zoneId — the same tracked ZoneDetail → GameRunner flow as the
  //    2D map. NPC sits on the house-facing side; one central collider for the
  //    area's main landmark (the avatar walks around it to reach the NPC). ──
  {
    id: 'multiplication-mesa', zoneId: 'multiplication-mesa', label: 'Multiplication Mesa',
    worldPos: [-14, 12], kind: 'open', theme: 'mesa',
    npc: { offset: [3, -2.6], emoji: '🏜️' },
    colliders: [{ kind: 'circle', cx: -14, cz: 12, r: 2.5 }],
  },
  {
    id: 'division-dunes', zoneId: 'division-dunes', label: 'Division Dunes',
    worldPos: [14, 12], kind: 'open', theme: 'dunes',
    npc: { offset: [-3, -2.6], emoji: '🐪' },
    colliders: [{ kind: 'circle', cx: 14, cz: 12, r: 2.5 }],
  },
  {
    id: 'reading-reef', zoneId: 'reading-reef', label: 'Reading Reef',
    worldPos: [0, 18], kind: 'open', theme: 'reef',
    npc: { offset: [0, -4], emoji: '🐠' },
    colliders: [{ kind: 'circle', cx: 0, cz: 18, r: 2.5 }],
  },
  {
    id: 'data-delta', zoneId: 'data-delta', label: 'Data Delta',
    worldPos: [24, -2], kind: 'open', theme: 'delta',
    npc: { offset: [-4, 0.3], emoji: '📊' },
    colliders: [{ kind: 'circle', cx: 24, cz: -2, r: 2.5 }],
  },
  {
    id: 'science-summit', zoneId: 'science-summit', label: 'Science Summit',
    worldPos: [20, -18], kind: 'open', theme: 'summit',
    npc: { offset: [-3, 2.7], emoji: '🔬' },
    colliders: [{ kind: 'circle', cx: 20, cz: -18, r: 2.5 }],
  },
  {
    id: 'measurement-marsh', zoneId: 'measurement-marsh', label: 'Measurement Marsh',
    worldPos: [-24, -2], kind: 'open', theme: 'marsh',
    npc: { offset: [4, 0.3], emoji: '📐' },
    colliders: [{ kind: 'circle', cx: -24, cz: -2, r: 2.5 }],
  },
  {
    id: 'geometry-grove', zoneId: 'geometry-grove', label: 'Geometry Grove',
    worldPos: [-20, -18], kind: 'open', theme: 'grove',
    npc: { offset: [3, 2.7], emoji: '🔷' },
    colliders: [{ kind: 'circle', cx: -20, cz: -18, r: 2.5 }],
  },
  {
    id: 'place-value-plateau', zoneId: 'place-value-plateau', label: 'Place Value Plateau',
    worldPos: [-8, -26], kind: 'open', theme: 'plateau',
    npc: { offset: [1.2, 3.8], emoji: '🏔️' },
    colliders: [{ kind: 'circle', cx: -8, cz: -26, r: 2.5 }],
  },
  {
    id: 'tower-battlefront', zoneId: 'tower-battlefront', label: 'Tower Battlefront',
    worldPos: [10, -26], kind: 'open', theme: 'battlefront',
    npc: { offset: [-1.4, 3.7], emoji: '🏰' },
    colliders: [{ kind: 'circle', cx: 10, cz: -26, r: 2.5 }],
  },
]

const BOUND = 34
const PERIMETER: Collider[] = [
  { kind: 'box', cx: 0, cz: -BOUND, w: BOUND * 2, d: 1 },
  { kind: 'box', cx: 0, cz: BOUND, w: BOUND * 2, d: 1 },
  { kind: 'box', cx: -BOUND, cz: 0, w: 1, d: BOUND * 2 },
  { kind: 'box', cx: BOUND, cz: 0, w: 1, d: BOUND * 2 },
]

/**
 * Wall colliders for a square Building shell (Building.tsx): three solid walls and
 * the +z (door) wall split around a doorway gap that has no collider.
 */
function buildingWalls(cx: number, cz: number, size = 5, doorWidth = 1.6): Collider[] {
  const half = size / 2
  const seg = half - doorWidth / 2
  const segC = (half + doorWidth / 2) / 2
  return [
    { kind: 'box', cx: cx - half, cz, w: 0.3, d: size },
    { kind: 'box', cx: cx + half, cz, w: 0.3, d: size },
    { kind: 'box', cx, cz: cz - half, w: size, d: 0.3 },
    { kind: 'box', cx: cx - segC, cz: cz + half, w: seg, d: 0.3 },
    { kind: 'box', cx: cx + segC, cz: cz + half, w: seg, d: 0.3 },
  ]
}

export function areaById(id: string): WorldArea | undefined {
  return WORLD_AREAS.find((a) => a.id === id)
}

export function worldColliders(): Collider[] {
  return [...WORLD_AREAS.flatMap((a) => a.colliders), ...PERIMETER]
}
