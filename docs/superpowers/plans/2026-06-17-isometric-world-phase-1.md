# Isometric Explorable World — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new, parallel `/world` route: a walkable isometric world with a follow-camera where the player's creature roams between a decoratable house and themed subject areas (Word Problem Woods, Fraction Falls, Writing Workshop), using NPC proximity gateways into the existing zone screens and in-place wall/roof transparency when inside buildings.

**Architecture:** One React-Three-Fiber `<Canvas>` renders a data-driven world (`src/world/worldLayout.ts`). The Home avatar's WASD + axis-separated collision is extracted into a shared `useWanderWalk` hook that takes an injected `collide(x,z)` predicate; the world passes authored collider volumes, Home keeps its tile grid. Buildings fade their two camera-facing walls + roof when the avatar's position is inside their footprint. The existing 2D `/map` and 3D `/home` are untouched; `/world` is reached via a discreet beta link.

**Tech Stack:** Vite 8, React 19, TypeScript, @react-three/fiber v9, @react-three/drei v10, three v0.184, Zustand, Tailwind v4, Vitest (jsdom), react-router-dom v7.

**Spec:** `docs/superpowers/specs/2026-06-17-isometric-world-design.md`

---

## File Structure

**New files**
- `src/world/worldLayout.ts` — `Collider`, `WorldArea` types; Phase-1 area data; `WORLD_AREAS`, `areaById`, `worldColliders()`.
- `src/world/collision.ts` — pure geometry: `collidesAt`, `insideFootprint`, `slideMove`, `frontFacingWalls`.
- `src/world/useWanderWalk.ts` — shared movement hook (WASD + idle wander + collision + walk animation), extracted from `AvatarCreature`.
- `src/world/useWorldUi.ts` — transient (non-persisted) Zustand store: `insideBuildingId`, `activeNpc`, `spawn`.
- `src/world/WorldScreen.tsx` — the `/world` route: `<Canvas>` + scene + HUD.
- `src/world/WorldCameraRig.tsx` — isometric follow-camera.
- `src/world/WorldGround.tsx` — ground plane + subtle area tinting.
- `src/world/WorldAvatar.tsx` — creature + accessories + `useWanderWalk` + reports position to a ref for the camera.
- `src/world/Npc.tsx` — NPC model + proximity detection + interact → navigate to `/zone/:zoneId`.
- `src/world/Building.tsx` — generic walls+roof+doorway with transparency-when-inside; renders interior children.
- `src/world/areas/WordProblemWoods.tsx`, `FractionFalls.tsx`, `WritingWorkshop.tsx`, `House.tsx`.
- `src/world/WorldHud.tsx` — interaction prompt + back link.
- `src/world/WorldStudio.tsx` — dev gallery for tuning areas (reached via `/world?studio=1`).
- `src/world/__tests__/worldLayout.test.ts`, `src/world/__tests__/collision.test.ts`.

**Modified files**
- `src/home/models/parts.tsx` — (none required; reused).
- `src/home/world/AvatarCreature.tsx` — refactor movement to call `useWanderWalk` (behavior unchanged).
- `src/App.tsx` — add the `/world` route.
- `src/screens/WorldMap.tsx` — add the discreet "🌍 World (beta)" link.

**Conventions to follow (read first):**
- `src/home/world/AvatarCreature.tsx` — current movement/collision/animation (source of the extraction).
- `src/home/world/CreatureAccessories.tsx`, `src/home/models/registry.tsx` (`creatureBuilder`), `src/home/models/walkState.ts` — avatar rendering + walk flag.
- `src/screens/HomeScreen.tsx` — Canvas setup pattern.
- `src/home/world/Lights.tsx`, `RoomShell.tsx`, `TileGrid.tsx`, `PlacedItems.tsx` — reused inside the house.
- `src/lib/home/grid.ts` — tile collision used by Home today.

---

## Task 1: World layout data + types

**Files:**
- Create: `src/world/worldLayout.ts`
- Test: `src/world/__tests__/worldLayout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/world/__tests__/worldLayout.test.ts
import { describe, it, expect } from 'vitest'
import { WORLD_AREAS, areaById, worldColliders } from '../worldLayout'
import { getZone } from '../../curriculum'

describe('world layout', () => {
  it('has unique area ids', () => {
    const ids = WORLD_AREAS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('maps every area to a real curriculum zone', () => {
    for (const a of WORLD_AREAS) expect(getZone(a.zoneId), a.id).toBeTruthy()
  })

  it('gives every building a door and at least one collider', () => {
    for (const a of WORLD_AREAS.filter((a) => a.kind === 'building')) {
      expect(a.door, a.id).toBeTruthy()
      expect(a.colliders.length, a.id).toBeGreaterThan(0)
    }
  })

  it('areaById finds areas and returns undefined otherwise', () => {
    expect(areaById('fraction-falls')?.label).toBe('Fraction Falls')
    expect(areaById('nope')).toBeUndefined()
  })

  it('worldColliders() flattens every area collider plus the world bounds', () => {
    const total = WORLD_AREAS.reduce((n, a) => n + a.colliders.length, 0)
    expect(worldColliders().length).toBeGreaterThanOrEqual(total)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/world/__tests__/worldLayout.test.ts`
Expected: FAIL — cannot find module `../worldLayout`.

- [ ] **Step 3: Implement the layout module**

```ts
// src/world/worldLayout.ts
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
  npc?: { offset: [number, number]; emoji: string }
  colliders: Collider[]
  door?: { pos: [number, number]; width: number } // buildings only
}

// Phase-1 layout. Areas are spaced around a central spawn (the house at origin).
export const WORLD_AREAS: WorldArea[] = [
  {
    id: 'house', zoneId: 'word-problem-woods', label: 'Your House',
    worldPos: [0, 0], kind: 'building', theme: 'house',
    door: { pos: [0, 2.5], width: 1.6 },
    colliders: [
      // four wall segments around a 5x5 footprint, leaving a doorway on the +z wall
      { kind: 'box', cx: -2.5, cz: 0, w: 0.3, d: 5 },
      { kind: 'box', cx: 2.5, cz: 0, w: 0.3, d: 5 },
      { kind: 'box', cx: 0, cz: -2.5, w: 5, d: 0.3 },
      { kind: 'box', cx: -1.85, cz: 2.5, w: 1.7, d: 0.3 },
      { kind: 'box', cx: 1.85, cz: 2.5, w: 1.7, d: 0.3 },
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
    npc: { offset: [-2.5, 1.5], emoji: '💧' },
    colliders: [
      { kind: 'box', cx: 12, cz: -11, w: 6, d: 3 }, // the falls + upper pool (impassable)
      { kind: 'circle', cx: 9.5, cz: -6.5, r: 0.7 }, // bank rocks
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
      { kind: 'box', cx: -1.85, cz: -11.5, w: 1.7, d: 0.3 },
      { kind: 'box', cx: 1.85, cz: -11.5, w: 1.7, d: 0.3 },
    ],
  },
]

// World perimeter: a ring of boxes keeping the avatar inside a ~46x46 play area.
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/world/__tests__/worldLayout.test.ts`
Expected: PASS (5 tests). Note `getZone('word-problem-woods')` and `getZone('fraction-falls')` and `getZone('writing-workshop')` already exist in the curriculum.

- [ ] **Step 5: Commit**

```bash
git add src/world/worldLayout.ts src/world/__tests__/worldLayout.test.ts
git commit -m "feat(world): data-driven Phase-1 world layout + types"
```

---

## Task 2: Collision & geometry pure functions

**Files:**
- Create: `src/world/collision.ts`
- Test: `src/world/__tests__/collision.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/world/__tests__/collision.test.ts
import { describe, it, expect } from 'vitest'
import { collidesAt, insideFootprint, slideMove, frontFacingWalls } from '../collision'
import type { Collider } from '../worldLayout'

const wall: Collider[] = [{ kind: 'box', cx: 0, cz: 0, w: 2, d: 0.4 }] // a thin wall on x-axis
const tree: Collider[] = [{ kind: 'circle', cx: 5, cz: 0, r: 0.5 }]

describe('collidesAt', () => {
  it('blocks inside a box (with radius)', () => {
    expect(collidesAt(wall, 0, 0, 0.3)).toBe(true)
    expect(collidesAt(wall, 0, 0.19, 0.05)).toBe(true) // edge of the wall
  })
  it('passes clearly outside a box', () => {
    expect(collidesAt(wall, 0, 1.5, 0.3)).toBe(false)
  })
  it('blocks inside a circle (with radius) and passes outside', () => {
    expect(collidesAt(tree, 5, 0, 0.3)).toBe(true)
    expect(collidesAt(tree, 5, 1.2, 0.3)).toBe(false)
  })
})

describe('insideFootprint', () => {
  const fp = { cx: 0, cz: 0, w: 5, d: 5 }
  it('is true within the footprint + margin and false outside', () => {
    expect(insideFootprint(fp, 1, 1, 0.2)).toBe(true)
    expect(insideFootprint(fp, 3, 0, 0.2)).toBe(false) // x 3 > half 2.5 + margin
  })
})

describe('slideMove', () => {
  // collide blocks any z >= 1 (a wall to the "north")
  const collide = (_x: number, z: number) => z >= 1
  it('moves freely when unobstructed', () => {
    expect(slideMove(0, 0, 0.5, 0.0, collide)).toEqual({ x: 0.5, z: 0 })
  })
  it('slides along a wall: blocked axis is dropped, free axis keeps moving', () => {
    // trying to move +x and +z into the wall: x advances, z is blocked
    expect(slideMove(0, 0.9, 0.5, 0.5, collide)).toEqual({ x: 0.5, z: 0.9 })
  })
})

describe('frontFacingWalls', () => {
  it('returns the +x and +z walls for the default iso camera (looking toward -x,-z)', () => {
    expect(frontFacingWalls()).toEqual(['px', 'pz'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/world/__tests__/collision.test.ts`
Expected: FAIL — cannot find module `../collision`.

- [ ] **Step 3: Implement collision.ts**

```ts
// src/world/collision.ts
import type { Collider } from './worldLayout'

/** True when a disc of `radius` at (x,z) overlaps any collider. */
export function collidesAt(colliders: Collider[], x: number, z: number, radius: number): boolean {
  for (const c of colliders) {
    if (c.kind === 'box') {
      const hx = c.w / 2 + radius
      const hz = c.d / 2 + radius
      if (Math.abs(x - c.cx) <= hx && Math.abs(z - c.cz) <= hz) return true
    } else {
      const dx = x - c.cx
      const dz = z - c.cz
      const rr = c.r + radius
      if (dx * dx + dz * dz <= rr * rr) return true
    }
  }
  return false
}

export interface Footprint { cx: number; cz: number; w: number; d: number }

/** True when (x,z) is within the footprint shrunk by `margin` (so "inside" the walls). */
export function insideFootprint(fp: Footprint, x: number, z: number, margin: number): boolean {
  return Math.abs(x - fp.cx) <= fp.w / 2 - margin && Math.abs(z - fp.cz) <= fp.d / 2 - margin
}

/** Axis-separated step: advance each axis only if its destination is clear. */
export function slideMove(
  x: number, z: number, dx: number, dz: number,
  collide: (x: number, z: number) => boolean,
): { x: number; z: number } {
  let nx = x
  let nz = z
  if (!collide(x + dx, z)) nx = x + dx
  if (!collide(nx, z + dz)) nz = z + dz
  return { x: nx, z: nz }
}

/** With a fixed iso camera looking toward (-x,-z), the +x and +z walls face the camera. */
export function frontFacingWalls(): ('px' | 'pz')[] {
  return ['px', 'pz']
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/world/__tests__/collision.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/world/collision.ts src/world/__tests__/collision.test.ts
git commit -m "feat(world): collision + slide-move + footprint geometry"
```

---

## Task 3: Extract shared movement hook `useWanderWalk` (refactor Home, no behavior change)

**Files:**
- Create: `src/world/useWanderWalk.ts`
- Modify: `src/home/world/AvatarCreature.tsx`

Context: `AvatarCreature` currently owns WASD keys, the per-frame camera-relative move with axis-separated collision (`slideMove`-equivalent), clamping to `ROOM_LIMIT`, and `walkState` updates. We move that into a reusable hook that takes an injected `collide(x,z)` predicate, a `bound`, and a `paused` flag. Home passes its tile collider; the world (Task 7+) passes `worldColliders()`.

- [ ] **Step 1: Implement the hook**

```ts
// src/world/useWanderWalk.ts
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { walkState } from '../home/models/walkState'
import { slideMove } from './collision'

const WALK_SPEED = 3
const COLLIDE_RADIUS = 0.3

const _f = new Vector3()
const _r = new Vector3()
const _m = new Vector3()

/**
 * WASD + idle-wander movement for the creature, shared by Home and World.
 * `collide(x,z)` returns true when that point is blocked. `bound` clamps the
 * avatar to [-bound, bound] on x/z. While `paused()` is true (e.g. emoting) the
 * avatar holds still. Updates `group.position`/`group.rotation.y` and the shared
 * `walkState`, and returns whether it moved this frame via `walkState.moving`.
 */
export function useWanderWalk(opts: {
  group: RefObject<Group | null>
  collide: (x: number, z: number) => boolean
  bound: number
  paused?: () => boolean
}) {
  const { group, collide, bound, paused } = opts
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const target = useRef(new Vector3())

  useEffect(() => {
    const set = (e: KeyboardEvent, down: boolean) => {
      switch (e.key.toLowerCase()) {
        case 'w': keys.current.w = down; break
        case 'a': keys.current.a = down; break
        case 's': keys.current.s = down; break
        case 'd': keys.current.d = down; break
        default: return
      }
    }
    const onDown = (e: KeyboardEvent) => set(e, true)
    const onUp = (e: KeyboardEvent) => set(e, false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    if (paused?.()) { walkState.t += dt; walkState.moving = false; return }

    const clamp = (v: number) => Math.max(-bound, Math.min(bound, v))
    const blocked = (x: number, z: number) => collide(x, z)
    let moving = false
    const k = keys.current

    if (k.w || k.a || k.s || k.d) {
      state.camera.getWorldDirection(_f); _f.y = 0
      if (_f.lengthSq() < 1e-4) _f.set(0, 0, -1)
      _f.normalize()
      _r.set(-_f.z, 0, _f.x)
      _m.set(0, 0, 0)
      if (k.w) _m.add(_f)
      if (k.s) _m.sub(_f)
      if (k.d) _m.add(_r)
      if (k.a) _m.sub(_r)
      if (_m.lengthSq() > 1e-4) {
        _m.normalize()
        const step = WALK_SPEED * dt
        // axis-separated, testing the leading edge so we stop flush at obstacles
        const dx = _m.x * step
        const dz = _m.z * step
        const probe = (x: number, z: number, sx: number, sz: number) =>
          blocked(clamp(x) + Math.sign(sx) * COLLIDE_RADIUS, clamp(z) + Math.sign(sz) * COLLIDE_RADIUS)
        const cur = { x: g.position.x, z: g.position.z }
        const moved = slideMove(cur.x, cur.z, dx, dz, (x, z) =>
          probe(x, z, x - cur.x || _m.x, z - cur.z || _m.z))
        g.position.x = clamp(moved.x)
        g.position.z = clamp(moved.z)
        g.rotation.y = Math.atan2(_m.x, _m.z)
        target.current.set(g.position.x, 0, g.position.z)
        moving = true
      }
    } else {
      const pos = g.position
      if (pos.distanceTo(target.current) < 0.2) {
        target.current.set((Math.sin(walkState.t * 1.7) * bound) * 0.7, 0, (Math.cos(walkState.t) * bound) * 0.7)
      }
      const dir = target.current.clone().sub(pos); dir.y = 0
      if (dir.length() > 0.05) {
        dir.normalize()
        const step = Math.min(1.2 * dt, pos.distanceTo(target.current))
        const moved = slideMove(pos.x, pos.z, dir.x * step, dir.z * step, blocked)
        let any = false
        if (moved.x !== pos.x) { pos.x = clamp(moved.x); any = true }
        if (moved.z !== pos.z) { pos.z = clamp(moved.z); any = true }
        if (!any) target.current.copy(pos)
        g.rotation.y = Math.atan2(dir.x, dir.z)
        moving = any
      }
    }

    walkState.t += dt
    walkState.moving = moving
  })
}
```

Note: the idle wander here uses a deterministic wander target (no `Math.random()`, which is unavailable in some sandboxes and avoids the prior pattern); the existing Home wander used `Math.random()` inside the component — replacing it with this deterministic version is acceptable and keeps the creature ambling. Confirm the Home creature still ambles after refactor.

- [ ] **Step 2: Refactor `AvatarCreature` to use the hook**

In `src/home/world/AvatarCreature.tsx`, delete the local `keys` ref, the WASD `useEffect`, and the movement portion of the `useFrame` (the `controlled`/idle blocks that set `g.position`), and instead call the hook. Keep the inner-group animation (`jump`/`stepBob`/emote rotation), the emote (`onPointerDown`), and the `useOccupiedTiles`-based collider. Replace the movement with:

```tsx
import { useWanderWalk } from '../../world/useWanderWalk'
import { worldToTile, tileKey, GRID_SIZE } from '../../lib/home/grid'
// ...
const occupied = useOccupiedTiles()
const occupiedRef = useRef(occupied); occupiedRef.current = occupied
const ROOM_LIMIT = (GRID_SIZE * 1) / 2 - 0.6

useWanderWalk({
  group,
  bound: ROOM_LIMIT,
  paused: () => emoteStart.current !== 0 && (performance.now() - emoteStart.current) / EMOTE_MS < 1,
  collide: (x, z) => {
    const t = worldToTile(x, z)
    if (t.gx < 0 || t.gz < 0 || t.gx >= GRID_SIZE || t.gz >= GRID_SIZE) return false
    return occupiedRef.current.has(tileKey(t))
  },
})
```

Keep the existing inner-animation `useFrame` that reads `walkState.moving`.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all existing tests still PASS (no test imports the deleted internals).

- [ ] **Step 4: Manual check (vision-in-the-loop)**

Start dev server, open `/home`, press W/A/S/D — the creature walks and collides with furniture exactly as before; it ambles when idle. (Use the screenshot workflow; seed a save with placed furniture; restore the save + stop the server when done.)

- [ ] **Step 5: Commit**

```bash
git add src/world/useWanderWalk.ts src/home/world/AvatarCreature.tsx
git commit -m "refactor(home): extract shared useWanderWalk movement hook"
```

---

## Task 4: World UI store + HUD

**Files:**
- Create: `src/world/useWorldUi.ts`, `src/world/WorldHud.tsx`

- [ ] **Step 1: Implement the transient store**

```ts
// src/world/useWorldUi.ts
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
```

- [ ] **Step 2: Implement the HUD**

```tsx
// src/world/WorldHud.tsx
import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useWorldUi } from './useWorldUi'
import { sfx } from '../lib/sound'

export default function WorldHud() {
  const activeNpc = useWorldUi((s) => s.activeNpc)
  const navigate = useNavigate()

  const enter = () => {
    if (!activeNpc) return
    sfx.click()
    navigate(`/zone/${activeNpc.zoneId}`)
  }

  // Keyboard: E enters the active NPC's zone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.key === 'e' || e.key === 'E') && activeNpc) enter() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNpc])

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <Link to="/map" onClick={() => sfx.click()} className="pointer-events-auto kid-text bg-ocean-900/70 text-white px-3 py-1 rounded-full text-sm">← Map</Link>
        <span className="kid-text bg-ocean-900/50 text-white/90 px-3 py-1 rounded-full text-xs">🌍 World (beta) · W A S D to walk</span>
      </div>
      {activeNpc && (
        <button
          onClick={enter}
          className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 kid-text bg-quest-500 text-quest-900 px-5 py-2 rounded-full shadow-lg text-lg animate-pulse"
        >
          Press E to enter {activeNpc.label} →
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/world/useWorldUi.ts src/world/WorldHud.tsx
git commit -m "feat(world): transient world-ui store + interaction HUD"
```

---

## Task 5: World scene scaffold — route, camera, ground, avatar (walkable empty world)

**Files:**
- Create: `src/world/WorldCameraRig.tsx`, `src/world/WorldGround.tsx`, `src/world/WorldAvatar.tsx`, `src/world/WorldScreen.tsx`
- Modify: `src/App.tsx`, `src/screens/WorldMap.tsx`

- [ ] **Step 1: Implement the follow-camera**

```tsx
// src/world/WorldCameraRig.tsx
import { useThree, useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import { Vector3 } from 'three'

const OFFSET = new Vector3(11, 13, 11) // fixed iso angle, looking toward (-x,-z)
const _want = new Vector3()
const _look = new Vector3()

/** Smoothly keeps the camera at a fixed iso offset from the avatar. */
export default function WorldCameraRig({ targetRef }: { targetRef: RefObject<Vector3> }) {
  const camera = useThree((s) => s.camera)
  useFrame((_, dt) => {
    const t = targetRef.current
    if (!t) return
    _want.copy(t).add(OFFSET)
    camera.position.lerp(_want, Math.min(1, dt * 4))
    _look.copy(t); _look.y += 0.6
    camera.lookAt(_look)
  })
  return null
}
```

- [ ] **Step 2: Implement the ground**

```tsx
// src/world/WorldGround.tsx
export default function WorldGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[48, 48]} />
      <meshStandardMaterial color="#9ccb6b" />
    </mesh>
  )
}
```

- [ ] **Step 3: Implement the world avatar**

```tsx
// src/world/WorldAvatar.tsx
import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { useProgress } from '../store/progress'
import { creatureBuilder } from '../home/models/registry'
import CreatureAccessories from '../home/world/CreatureAccessories'
import { walkState } from '../home/models/walkState'
import { useWanderWalk } from './useWanderWalk'
import { worldColliders } from './worldLayout'
import { collidesAt } from './collision'

export default function WorldAvatar({ posRef }: { posRef: RefObject<Vector3> }) {
  const activeCreature = useProgress((s) => s.activeCreature)
  const group = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])
  const colliders = useMemo(() => worldColliders(), [])

  useWanderWalk({
    group,
    bound: 22,
    collide: (x, z) => collidesAt(colliders, x, z, 0),
  })

  useFrame(({ clock }) => {
    if (group.current && posRef.current) posRef.current.copy(group.current.position)
    if (inner.current) {
      const bob = walkState.moving ? Math.abs(Math.sin(walkState.t * 9)) * 0.05 : 0
      inner.current.position.y = bob + Math.sin(clock.elapsedTime * 1.2) * 0.03
      inner.current.rotation.z = walkState.moving ? Math.sin(walkState.t * 9) * 0.05 : 0
    }
  })

  if (!activeCreature) return null
  return (
    <group ref={group} position={[0, 0, 4]}>
      <group ref={inner}>
        <b.Builder />
        <CreatureAccessories />
      </group>
    </group>
  )
}
```

- [ ] **Step 4: Implement the world screen**

```tsx
// src/world/WorldScreen.tsx
import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Vector3 } from 'three'
import Lights from '../home/world/Lights'
import WorldGround from './WorldGround'
import WorldCameraRig from './WorldCameraRig'
import WorldAvatar from './WorldAvatar'
import WorldHud from './WorldHud'

export default function WorldScreen() {
  const posRef = useRef(new Vector3(0, 0, 4))
  return (
    <div className="flex-1 relative">
      <Canvas shadows camera={{ position: [11, 13, 15], fov: 42 }} style={{ position: 'absolute', inset: 0 }}>
        <color attach="background" args={['#bfe3f2']} />
        <Lights />
        <WorldGround />
        <WorldCameraRig targetRef={posRef} />
        <WorldAvatar posRef={posRef} />
      </Canvas>
      <WorldHud />
    </div>
  )
}
```

- [ ] **Step 5: Add the route + beta link**

In `src/App.tsx`: add `const WorldScreen = lazy(() => import('./world/WorldScreen'))` near the `HomeScreen` lazy import, and add inside `<Routes>`:

```tsx
<Route path="/world" element={<RequireAvatar><Suspense fallback={<div className="flex-1 grid place-items-center text-white kid-text text-2xl">Loading the world…</div>}><WorldScreen /></Suspense></RequireAvatar>} />
```

In `src/screens/WorldMap.tsx`, add a beta link beside the existing quick links (after the Tutor `<Link>` around line 64-70):

```tsx
<Link to="/world" onClick={() => sfx.click()} className="kid-text flex items-center gap-1 px-4 py-2 rounded-full bg-monster-500 text-white shadow hover:scale-105 transition">🌍 World (beta)</Link>
```

- [ ] **Step 6: Verify (build + manual)**

Run: `npm run build` → expect success.
Manual: start dev server, click "🌍 World (beta)" from the map; the creature stands on green ground; W/A/S/D walks it; the camera follows; it stops at the invisible perimeter (~±22). Screenshot to confirm framing; adjust `OFFSET`/fov if needed.

- [ ] **Step 7: Commit**

```bash
git add src/world/WorldCameraRig.tsx src/world/WorldGround.tsx src/world/WorldAvatar.tsx src/world/WorldScreen.tsx src/App.tsx src/screens/WorldMap.tsx
git commit -m "feat(world): walkable /world scene with follow-cam + beta link"
```

---

## Task 6: NPC component (proximity gateway → zone screen)

**Files:**
- Create: `src/world/Npc.tsx`

- [ ] **Step 1: Implement the NPC**

```tsx
// src/world/Npc.tsx
import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { useWorldUi } from './useWorldUi'

const INTERACT_R = 2.2
const _d = new Vector3()

/** A little character that opens `zoneId` when the avatar is within range. */
export default function Npc({
  areaId, zoneId, label, position, emoji, posRef,
}: {
  areaId: string; zoneId: string; label: string
  position: [number, number, number]; emoji: string; posRef: RefObject<Vector3>
}) {
  const body = useRef<Group>(null)
  const setActiveNpc = useWorldUi((s) => s.setActiveNpc)
  const activeAreaId = useWorldUi((s) => s.activeNpc?.areaId)

  useFrame(({ clock }) => {
    if (body.current) body.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 2)) * 0.12
    const p = posRef.current
    if (!p) return
    _d.set(position[0], 0, position[2])
    const near = _d.distanceTo(new Vector3(p.x, 0, p.z)) < INTERACT_R
    if (near && activeAreaId !== areaId) setActiveNpc({ areaId, zoneId, label })
    else if (!near && activeAreaId === areaId) setActiveNpc(null)
  })

  return (
    <group position={position}>
      <group ref={body}>
        {/* simple low-poly NPC: body + head */}
        <mesh castShadow position={[0, 0.5, 0]}><capsuleGeometry args={[0.22, 0.5, 4, 8]} /><meshStandardMaterial color="#caa36b" /></mesh>
        <mesh castShadow position={[0, 1.05, 0]}><sphereGeometry args={[0.24, 12, 10]} /><meshStandardMaterial color="#e8c79a" /></mesh>
      </group>
      {/* floating subject sign */}
      <mesh position={[0, 1.7, 0]}><boxGeometry args={[0.5, 0.5, 0.06]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <Sign emoji={emoji} />
    </group>
  )
}

function Sign({ emoji }: { emoji: string }) {
  // Rendered via a canvas texture in implementation; for the scaffold a colored marker stands in.
  return <mesh position={[0, 1.7, 0.04]}><circleGeometry args={[0.18, 16]} /><meshBasicMaterial color="#f59e0b" /></mesh>
}
```

Implementation note: replace `Sign` with a drei `<Billboard>` + `<Text>` (already available via `@react-three/drei`) showing `emoji`, so each gateway is labeled. The proximity logic is the contract that matters.

- [ ] **Step 2: Verify wiring**

This is exercised in Tasks 7-8 (placed in areas). No standalone test — proximity uses live positions; the `collidesAt`/distance math is already unit-tested in Task 2.

- [ ] **Step 3: Commit**

```bash
git add src/world/Npc.tsx
git commit -m "feat(world): proximity NPC gateway component"
```

---

## Task 7: Word Problem Woods (open area)

**Files:**
- Create: `src/world/areas/WordProblemWoods.tsx`
- Modify: `src/world/WorldScreen.tsx` (render the area + its NPC)

- [ ] **Step 1: Implement the area**

```tsx
// src/world/areas/WordProblemWoods.tsx
const TREES: [number, number, number][] = [
  [-14, 0, -10], [-10, 0, -11], [-15, 0, -6], [-9, 0, -6], [-12, 0, -9], [-13, 0, -7],
]
function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.5, 0]}><cylinderGeometry args={[0.12, 0.16, 1, 6]} /><meshStandardMaterial color="#7a5230" /></mesh>
      <mesh castShadow position={[0, 1.5, 0]}><coneGeometry args={[0.7, 1.4, 7]} /><meshStandardMaterial color="#2f7d3f" /></mesh>
      <mesh castShadow position={[0, 2.1, 0]}><coneGeometry args={[0.5, 1.0, 7]} /><meshStandardMaterial color="#3a9150" /></mesh>
    </group>
  )
}
export default function WordProblemWoods() {
  return (
    <group>
      {/* darker grassy clearing under the woods */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12, 0.01, -8]} receiveShadow>
        <circleGeometry args={[7, 24]} /><meshStandardMaterial color="#6fae52" />
      </mesh>
      {TREES.map((p, i) => <Tree key={i} position={p} />)}
    </group>
  )
}
```

- [ ] **Step 2: Render it + its NPC in `WorldScreen`**

Add imports and, inside `<Canvas>` after `<WorldGround />`:

```tsx
import WordProblemWoods from './areas/WordProblemWoods'
import Npc from './Npc'
import { areaById } from './worldLayout'
// ...
<WordProblemWoods />
{(() => { const a = areaById('word-problem-woods')!; return (
  <Npc areaId={a.id} zoneId={a.zoneId} label={a.label}
       position={[a.worldPos[0] + a.npc!.offset[0], 0, a.worldPos[1] + a.npc!.offset[1]]}
       emoji={a.npc!.emoji} posRef={posRef} />
)})()}
```

- [ ] **Step 3: Verify (vision-in-the-loop)**

Start dev server, walk into the woods; trees block the avatar (colliders from Task 1); approaching the NPC shows "Press E to enter Word Problem Woods"; pressing E navigates to `/zone/word-problem-woods`. Screenshot and tune tree density/colors/positions until it reads as "heavily wooded."

- [ ] **Step 4: Commit**

```bash
git add src/world/areas/WordProblemWoods.tsx src/world/WorldScreen.tsx
git commit -m "feat(world): Word Problem Woods area + gateway"
```

---

## Task 8: Fraction Falls (open area)

**Files:**
- Create: `src/world/areas/FractionFalls.tsx`
- Modify: `src/world/WorldScreen.tsx`

- [ ] **Step 1: Implement the area**

```tsx
// src/world/areas/FractionFalls.tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'

export default function FractionFalls() {
  const water = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    // gentle vertical scroll to suggest falling water
    if (water.current) water.current.position.y = 1.6 + Math.sin(clock.elapsedTime * 3) * 0.05
  })
  return (
    <group position={[12, 0, -8]}>
      {/* cliff */}
      <mesh castShadow position={[0, 1.5, -3]}><boxGeometry args={[5, 3, 1.4]} /><meshStandardMaterial color="#8a8f98" /></mesh>
      {/* falling water sheet */}
      <mesh ref={water} position={[0, 1.6, -2.2]}><boxGeometry args={[2.2, 3.2, 0.2]} /><meshStandardMaterial color="#5db4e6" transparent opacity={0.8} /></mesh>
      {/* splash pool */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -0.5]} receiveShadow>
        <circleGeometry args={[3, 28]} /><meshStandardMaterial color="#3f9bd6" transparent opacity={0.85} />
      </mesh>
      {/* bank rocks */}
      <mesh castShadow position={[-2.5, 0.3, 1.5]}><dodecahedronGeometry args={[0.6]} /><meshStandardMaterial color="#9a9a93" /></mesh>
    </group>
  )
}
```

- [ ] **Step 2: Render it + NPC in `WorldScreen`** (mirror Task 7, area id `'fraction-falls'`).

- [ ] **Step 3: Verify (vision-in-the-loop)** — the waterfall reads as a fall + pool; the falls box collider blocks walking into it; NPC on the bank enters `/zone/fraction-falls`. Tune.

- [ ] **Step 4: Commit**

```bash
git add src/world/areas/FractionFalls.tsx src/world/WorldScreen.tsx
git commit -m "feat(world): Fraction Falls area + gateway"
```

---

## Task 9: Building component (walls + roof + doorway, transparency when inside)

**Files:**
- Create: `src/world/Building.tsx`
- Modify: `src/world/WorldAvatar.tsx` (publish inside-building state)

- [ ] **Step 1: Avatar publishes which building it's inside**

In `WorldAvatar`, after updating `posRef`, compute inside-state from footprints and push to the store:

```tsx
import { useWorldUi } from './useWorldUi'
import { insideFootprint } from './collision'
import { WORLD_AREAS } from './worldLayout'
// ...
const setInsideBuilding = useWorldUi((s) => s.setInsideBuilding)
const insideRef = useRef<string | null>(null)
// inside useFrame, after posRef update:
const p = group.current!.position
let inside: string | null = null
for (const a of WORLD_AREAS) {
  if (a.kind !== 'building') continue
  if (insideFootprint({ cx: a.worldPos[0], cz: a.worldPos[1], w: 5, d: 5 }, p.x, p.z, 0.1)) { inside = a.id; break }
}
if (inside !== insideRef.current) { insideRef.current = inside; setInsideBuilding(inside) }
```

- [ ] **Step 2: Implement the building shell**

```tsx
// src/world/Building.tsx
import type { ReactNode } from 'react'
import { useWorldUi } from './useWorldUi'
import { frontFacingWalls } from './collision'

/**
 * A 5x5 building centered at (cx,cz) with a doorway gap on its +z wall. The two
 * camera-facing walls (+x, +z) and the roof fade out when the avatar is inside.
 */
export default function Building({
  id, cx, cz, doorWidth = 1.6, wall = '#cdbb98', roof = '#9a5a3c', children,
}: {
  id: string; cx: number; cz: number; doorWidth?: number
  wall?: string; roof?: string; children?: ReactNode
}) {
  const inside = useWorldUi((s) => s.insideBuildingId) === id
  const front = frontFacingWalls() // ['px','pz']
  const H = 2.4
  const half = 2.5
  const op = (faces: ('px' | 'pz')[]) => (inside && faces.some((f) => front.includes(f)) ? 0.12 : 1)

  const Wall = ({ pos, args, faces }: { pos: [number, number, number]; args: [number, number, number]; faces: ('px' | 'pz')[] }) => (
    <mesh castShadow position={pos}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={wall} transparent opacity={op(faces)} depthWrite={op(faces) > 0.5} />
    </mesh>
  )
  const door = doorWidth / 2
  return (
    <group position={[cx, 0, cz]}>
      {/* -x and -z walls (back, never transparent) */}
      <Wall pos={[-half, H / 2, 0]} args={[0.3, H, 5]} faces={[]} />
      <Wall pos={[0, H / 2, -half]} args={[5, H, 0.3]} faces={[]} />
      {/* +x wall (front-right) */}
      <Wall pos={[half, H / 2, 0]} args={[0.3, H, 5]} faces={['px']} />
      {/* +z wall (front) split around the doorway */}
      <Wall pos={[-(half + door) / 2 - door / 2, H / 2, half]} args={[half - door, H, 0.3]} faces={['pz']} />
      <Wall pos={[(half + door) / 2 + door / 2, H / 2, half]} args={[half - door, H, 0.3]} faces={['pz']} />
      {/* roof */}
      <mesh castShadow position={[0, H + 0.15, 0]}>
        <boxGeometry args={[5.3, 0.3, 5.3]} />
        <meshStandardMaterial color={roof} transparent opacity={inside ? 0.12 : 1} depthWrite={!inside} />
      </mesh>
      {children}
    </group>
  )
}
```

Note the wall colliders authored in Task 1 already match this 5x5 footprint + doorway, so collision and visuals agree.

- [ ] **Step 3: Verify** — covered when buildings are placed in Tasks 10-11.

- [ ] **Step 4: Commit**

```bash
git add src/world/Building.tsx src/world/WorldAvatar.tsx
git commit -m "feat(world): building shell with inside-transparency"
```

---

## Task 10: Writing Workshop (enterable building)

**Files:**
- Create: `src/world/areas/WritingWorkshop.tsx`
- Modify: `src/world/WorldScreen.tsx`

- [ ] **Step 1: Implement the area**

```tsx
// src/world/areas/WritingWorkshop.tsx
import Building from '../Building'
import { areaById } from '../worldLayout'

export default function WritingWorkshop() {
  const a = areaById('writing-workshop')!
  return (
    <Building id={a.id} cx={a.worldPos[0]} cz={a.worldPos[1]} wall="#d9c8a0" roof="#7a4b8a">
      {/* interior: a writing desk + quill (visible once the front walls fade) */}
      <mesh castShadow position={[0, 0.5, -1.2]}><boxGeometry args={[1.6, 0.2, 0.9]} /><meshStandardMaterial color="#8a5a2b" /></mesh>
      <mesh castShadow position={[0, 0.9, -1.2]} rotation={[0, 0, 0.4]}><cylinderGeometry args={[0.02, 0.04, 0.7, 6]} /><meshStandardMaterial color="#efe6d2" /></mesh>
    </Building>
  )
}
```

- [ ] **Step 2: Render it in `WorldScreen`** (`import WritingWorkshop`; add `<WritingWorkshop />`). The Writing Workshop uses a **doorway gateway**: since it's a building, place the gateway NPC just outside the door (reuse the `<Npc>` pattern with `areaById('writing-workshop')` and a door-side offset, e.g. `[0, 2]`).

- [ ] **Step 3: Verify (vision-in-the-loop)** — walk to the workshop; outside, the roof+front walls are solid; walk through the doorway and they fade so the interior desk shows; walk out and they restore; the NPC by the door enters `/zone/writing-workshop`. Tune wall height/colors and the transparency opacity for readability.

- [ ] **Step 4: Commit**

```bash
git add src/world/areas/WritingWorkshop.tsx src/world/WorldScreen.tsx
git commit -m "feat(world): Writing Workshop building + enter/transparency"
```

---

## Task 11: Your House (building reusing the decorate room)

**Files:**
- Create: `src/world/areas/House.tsx`
- Modify: `src/world/WorldScreen.tsx`

Context: the house is the spawn point and reuses the existing room visuals/decor. For Phase 1, render the existing `RoomShell` interior contents (floor rug + walls are provided by `Building`; furniture comes from `PlacedItems`). Full decorate-mode editing inside the world is deferred — the house **displays** placed furniture now; editing still happens on `/home`. (This keeps Phase 1 scoped; the spec's "decorate inside the house" is a later-phase upgrade once `/world` becomes the hub.)

- [ ] **Step 1: Implement the house**

```tsx
// src/world/areas/House.tsx
import Building from '../Building'
import PlacedItems from '../../home/world/PlacedItems'
import { areaById } from '../worldLayout'

export default function House() {
  const a = areaById('house')!
  return (
    <Building id={a.id} cx={a.worldPos[0]} cz={a.worldPos[1]} wall="#cfe3e8" roof="#c0573c">
      {/* show the player's placed furniture inside their house */}
      <group position={[0, 0, 0]}><PlacedItems /></group>
    </Building>
  )
}
```

Note: `PlacedItems` reads `placedItems` from the store and renders furniture at tile-world coordinates centered on the room origin; inside the house group it lands on the house floor. If furniture appears off-center, wrap with a position offset (tune visually).

- [ ] **Step 2: Render it in `WorldScreen`** (`import House`; add `<House />`). The avatar already spawns at `[0,0,4]` (just outside the door on the +z side).

- [ ] **Step 3: Verify (vision-in-the-loop)** — spawn outside the house; walking through the doorway fades the front walls/roof and reveals any placed furniture; exiting restores them. Confirm furniture alignment; tune the interior offset if needed.

- [ ] **Step 4: Commit**

```bash
git add src/world/areas/House.tsx src/world/WorldScreen.tsx
git commit -m "feat(world): Your House building showing placed furniture"
```

---

## Task 12: World studio (dev gallery for tuning)

**Files:**
- Create: `src/world/WorldStudio.tsx`
- Modify: `src/world/WorldScreen.tsx`

- [ ] **Step 1: Implement a studio gate**

```tsx
// src/world/WorldStudio.tsx
import { OrbitControls } from '@react-three/drei'
import Lights from '../home/world/Lights'
import WordProblemWoods from './areas/WordProblemWoods'
import FractionFalls from './areas/FractionFalls'
import WritingWorkshop from './areas/WritingWorkshop'

/** Free-orbit gallery of the themed areas for visual iteration (no avatar/cam follow). */
export default function WorldStudio() {
  return (
    <>
      <OrbitControls makeDefault target={[0, 1, -8]} />
      <Lights />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[60, 60]} /><meshStandardMaterial color="#9ccb6b" /></mesh>
      <WordProblemWoods />
      <FractionFalls />
      <WritingWorkshop />
    </>
  )
}
```

- [ ] **Step 2: Gate it in `WorldScreen`**

```tsx
import { useSearchParams } from 'react-router-dom'
import WorldStudio from './WorldStudio'
// inside WorldScreen:
const [params] = useSearchParams()
const studio = params.get('studio') === '1'
// in the Canvas: { studio ? <WorldStudio /> : (<><WorldGround/>...<WorldAvatar/></>) }
// render <WorldHud /> only when !studio
```

- [ ] **Step 3: Verify** — `/world?studio=1` shows all areas with free orbit; useful for tuning. `npm run build` passes.

- [ ] **Step 4: Commit**

```bash
git add src/world/WorldStudio.tsx src/world/WorldScreen.tsx
git commit -m "feat(world): dev studio gallery for area tuning"
```

---

## Task 13: Integration pass + final review

**Files:** none (verification) — small tuning edits allowed.

- [ ] **Step 1: Full automated verification**

Run: `npm run test` → all pass (including the new `worldLayout` and `collision` suites).
Run: `npm run build` → success.

- [ ] **Step 2: End-to-end manual walkthrough (vision-in-the-loop)**

Start dev server. Seed a test save (player + a few placed furniture). From `/map`, open 🌍 World (beta). Verify: spawn by the house; W/A/S/D walk with follow-cam; walk into trees/falls/walls → blocked, slides along edges; enter the house and the workshop → front walls + roof fade, interior shows, restore on exit; approach each NPC → prompt appears; press E → lands on the correct `/zone/:id`; Back ← returns to the map. Screenshot each and tune positions/colors/opacity.

- [ ] **Step 3: Restore + clean up**

Restore the player's real save (read-modify-write, preserving coins + education/trend data) and stop the dev server, per the project's established workflow.

- [ ] **Step 4: Final commit (any tuning)**

```bash
git add -A
git commit -m "chore(world): Phase-1 integration tuning"
```

- [ ] **Step 5: Finish the branch**

Use superpowers:finishing-a-development-branch to merge Phase 1 to `master` (`--no-ff`, matching the repo's feature-merge pattern).

---

## Self-Review

**Spec coverage:**
- Parallel `/world` route, map/home intact, beta link → Task 5. ✓
- Data-driven areas → Task 1. ✓
- Follow-camera → Task 5 (`WorldCameraRig`). ✓
- Movement reuse via shared hook + injected collider → Tasks 2-3, 5. ✓
- NPC proximity gateway → `/zone/:id` → Tasks 4, 6-8, 10. ✓
- Phase-1 four places (House, Woods, Falls, Workshop) → Tasks 7-8, 10-11. ✓
- Building wall/roof transparency when inside, doorway, footprint detection → Tasks 2, 9-11. ✓
- House reuses room/furniture → Task 11 (decorate-editing inside deferred, noted explicitly). ✓
- No new persisted save fields (transient store) → Task 4. ✓
- Studio for tuning → Task 12. ✓
- Tests: layout integrity, collision, footprint, front-walls → Tasks 1-2. ✓

**Scope note:** The spec's "decorate inside the house" is intentionally reduced to "display placed furniture" for Phase 1 (full in-world decorate editing waits until `/world` becomes the hub) — called out in Task 11 so it isn't a silent gap.

**Type consistency:** `Collider`, `WorldArea`, `areaById`, `worldColliders` (Task 1) are used unchanged in Tasks 2/5/7-11. `collidesAt`/`insideFootprint`/`slideMove`/`frontFacingWalls` (Task 2) are consumed with matching signatures in `useWanderWalk` (Task 3), `WorldAvatar` (Tasks 5/9), and `Building` (Task 9). `useWorldUi` fields (`insideBuildingId`, `activeNpc`, setters) match across Tasks 4/6/9. `useWanderWalk({group,collide,bound,paused})` matches its callers in Tasks 3 and 5.
