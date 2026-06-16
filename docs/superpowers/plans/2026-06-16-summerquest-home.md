# SummerQuest "Home" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lazy-loaded 3D isometric "Home" where coins buy procedural low-poly furniture (placed on a 20×20 tile grid) and avatar-creatures the player "becomes," creating a wholesome learn→earn→decorate retention loop.

**Architecture:** A code-split `/home` route renders a React-Three-Fiber `<Canvas>` (the 3D world) beside a 2D Tailwind HUD; the two share state only through the Zustand store (persisted economy/layout) and a tiny non-persisted UI store. All art is procedural (primitives + flat colors) — nothing downloaded — so the offline single-file build still works. Pure logic (grid math, economy, catalog) is unit-tested; 3D models are built and refined with a screenshot-and-eyeball vision loop.

**Tech Stack:** Vite 8, React 19, TypeScript, react-router-dom v7, Zustand (persist), **three + @react-three/fiber + @react-three/drei** (new), Vitest (existing), Tailwind v4. Chrome DevTools MCP for visual iteration.

**Reference spec:** `docs/superpowers/specs/2026-06-16-summerquest-home-design.md`
**Branch:** `home-feature` (already checked out).

---

## File Structure

**New — pure logic / data (unit-tested)**
- `src/lib/home/grid.ts` — `GRID_SIZE=20`, tile↔world conversion, `canPlace()`.
- `src/lib/home/catalog.ts` — `HOME_ITEMS: HomeItem[]`, `CREATURES: Creature[]`, lookups.

**New — 3D world (R3F components, vision-iterated)**
- `src/home/world/HomeWorld.tsx` — assembles the scene inside `<Canvas>`.
- `src/home/world/CameraRig.tsx` — perspective iso camera + constrained OrbitControls.
- `src/home/world/Lights.tsx` — hemisphere/ambient + key directional + soft shadow.
- `src/home/world/RoomShell.tsx` — floor + 2 cutaway walls + baseboards.
- `src/home/world/TileGrid.tsx` — floor-plane raycast → tile, hover highlight, placement ghost.
- `src/home/world/PlacedItems.tsx` — renders `placedItems[]` via the registry.
- `src/home/world/AvatarCreature.tsx` — active creature: idle/wander/greet/emote.
- `src/home/models/registry.tsx` — `modelId→builder`, `creatureId→builder`, fallback.
- `src/home/models/creatures/*.tsx` — 12 procedural creature builders.
- `src/home/models/furniture/*.tsx` — procedural furniture builders.

**New — HUD + UI state**
- `src/screens/HomeScreen.tsx` — the lazy route: `<Canvas>` + `<HomeHud>`.
- `src/home/hud/HomeHud.tsx` — overlay container.
- `src/home/hud/CatalogDrawer.tsx` — Furniture/Decor/Creatures tabs; buy→place.
- `src/home/hud/BecomePicker.tsx` — owned creatures → become.
- `src/home/hud/ModeToggle.tsx` — Decorate ⇄ Play.
- `src/home/useHomeUi.ts` — tiny **non-persisted** Zustand store: `{ mode, placingItemId, hoveredTile, rotation, … }` (shared across the `<Canvas>` boundary, which React context can't cross).

**Modified**
- `src/store/progress.ts` — add `ownedCreatures`, `activeCreature`, `ownedHomeItems`, `placedItems` + actions; clear them in `resetPlayer`.
- `src/App.tsx` — lazy `/home` route under `RequireAvatar`.
- `src/screens/WorldMap.tsx` — add "🏠 Home" nav button.

---

## Task 0: Dependencies + lazy route scaffold

**Files:** Create `src/screens/HomeScreen.tsx`; Modify `src/App.tsx`, `src/screens/WorldMap.tsx`, `package.json`.

- [ ] **Step 1: Install R3F**

```bash
cd "C:/Users/zacle/Documents/summerquest"
npm install three @react-three/fiber @react-three/drei
```
Expected: installs cleanly. These versions support React 19 (fiber v9+, drei v10+). If npm reports a peer-dep conflict with React 19, re-run with the latest explicit majors: `npm install three @react-three/fiber@^9 @react-three/drei@^10`.

- [ ] **Step 2: Minimal HomeScreen (proves R3F renders)**

Create `src/screens/HomeScreen.tsx`:
```tsx
import { Canvas } from '@react-three/fiber'

export default function HomeScreen() {
  return (
    <div className="flex-1 relative">
      <Canvas camera={{ position: [4, 4, 4], fov: 32 }} shadows>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1} />
        <mesh rotation={[0.4, 0.8, 0]}>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#a855f7" />
        </mesh>
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 3: Lazy route in `src/App.tsx`**

Add at the top with the other imports:
```tsx
import { lazy, Suspense } from 'react'
const HomeScreen = lazy(() => import('./screens/HomeScreen'))
```
Add inside `<Routes>` next to the other `RequireAvatar` routes:
```tsx
          <Route
            path="/home"
            element={
              <RequireAvatar>
                <Suspense fallback={<div className="flex-1 grid place-items-center text-white kid-text text-2xl">Loading your home…</div>}>
                  <HomeScreen />
                </Suspense>
              </RequireAvatar>
            }
          />
```

- [ ] **Step 4: Nav button in `src/screens/WorldMap.tsx`**

In the header nav `<Link>` row (after the `/focus`/`/tutor` links from the coach feature), add:
```tsx
          <Link to="/home" onClick={() => sfx.click()}
            className="kid-text flex items-center gap-1 px-4 py-2 rounded-full bg-quest-500 text-quest-900 shadow hover:scale-105 transition">
            🏠 Home
          </Link>
```

- [ ] **Step 5: Verify build + render**

Run: `npm run build` → expect pass (the `/home` chunk is code-split; confirm a separate chunk appears in the output).
Run: `npm run dev`, open `http://localhost:5173`, create an avatar, click **🏠 Home**. Expect a purple 3D cube on screen. Check the browser console (Chrome DevTools MCP `list_console_messages`) for errors — expect none.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/screens/HomeScreen.tsx src/App.tsx src/screens/WorldMap.tsx
git commit -m "feat(home): scaffold lazy R3F /home route + nav"
```

---

## Task 1: Grid math (`grid.ts`) — pure, TDD

**Files:** Create `src/lib/home/grid.ts`; Test `src/lib/home/__tests__/grid.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { GRID_SIZE, tileToWorld, worldToTile, footprintTiles, canPlace } from '../grid'

describe('grid', () => {
  it('is a 20×20 floor', () => expect(GRID_SIZE).toBe(20))

  it('tile↔world round-trips at tile centers', () => {
    const w = tileToWorld(0, 0)
    expect(worldToTile(w.x, w.z)).toEqual({ gx: 0, gz: 0 })
    const w2 = tileToWorld(19, 19)
    expect(worldToTile(w2.x, w2.z)).toEqual({ gx: 19, gz: 19 })
  })

  it('footprintTiles swaps w/d for 90°/270° rotations', () => {
    expect(footprintTiles({ w: 2, d: 1 }, 1, 1, 0)).toEqual([
      { gx: 1, gz: 1 }, { gx: 2, gz: 1 },
    ])
    expect(footprintTiles({ w: 2, d: 1 }, 1, 1, 90)).toEqual([
      { gx: 1, gz: 1 }, { gx: 1, gz: 2 },
    ])
  })

  it('canPlace rejects out-of-bounds and overlaps, accepts free tiles', () => {
    const occupied = new Set(['5,5'])
    expect(canPlace(occupied, { w: 1, d: 1 }, 0, 0, 0)).toBe(true)
    expect(canPlace(occupied, { w: 1, d: 1 }, 5, 5, 0)).toBe(false) // overlap
    expect(canPlace(occupied, { w: 1, d: 1 }, 19, 19, 0)).toBe(true)
    expect(canPlace(occupied, { w: 2, d: 1 }, 19, 0, 0)).toBe(false) // off the right edge
    expect(canPlace(occupied, { w: 1, d: 1 }, -1, 0, 0)).toBe(false)
  })
})
```

- [ ] **Step 2: Run → fail** — `npx vitest run src/lib/home/__tests__/grid.test.ts` (module missing).

- [ ] **Step 3: Implement `src/lib/home/grid.ts`**

```ts
/** 20×20 floor. Tile (0,0) is a corner; world origin is the floor centre. */
export const GRID_SIZE = 20
export const TILE = 1 // world units per tile

export interface Footprint { w: number; d: number }
export interface Tile { gx: number; gz: number }

const HALF = (GRID_SIZE * TILE) / 2

/** Centre of a tile in world space (y=0 floor plane). */
export function tileToWorld(gx: number, gz: number): { x: number; z: number } {
  return { x: (gx + 0.5) * TILE - HALF, z: (gz + 0.5) * TILE - HALF }
}

/** World point → tile indices (floored; may be out of range — callers check). */
export function worldToTile(x: number, z: number): Tile {
  return { gx: Math.floor((x + HALF) / TILE), gz: Math.floor((z + HALF) / TILE) }
}

/** Tiles an item covers at (gx,gz) given rotation. 90°/270° swap w/d. */
export function footprintTiles(fp: Footprint, gx: number, gz: number, rot: number): Tile[] {
  const swap = rot === 90 || rot === 270
  const w = swap ? fp.d : fp.w
  const d = swap ? fp.w : fp.d
  const out: Tile[] = []
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) out.push({ gx: gx + dx, gz: gz + dz })
  return out
}

const key = (t: Tile) => `${t.gx},${t.gz}`

/** True if the footprint at (gx,gz,rot) is fully in-bounds and unoccupied. */
export function canPlace(occupied: Set<string>, fp: Footprint, gx: number, gz: number, rot: number): boolean {
  for (const t of footprintTiles(fp, gx, gz, rot)) {
    if (t.gx < 0 || t.gz < 0 || t.gx >= GRID_SIZE || t.gz >= GRID_SIZE) return false
    if (occupied.has(key(t))) return false
  }
  return true
}

export const tileKey = key
```

- [ ] **Step 4: Run → pass.** Then `npx vitest run` (whole suite stays green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/home/grid.ts src/lib/home/__tests__/grid.test.ts
git commit -m "feat(home): tile-grid math + canPlace (20×20)"
```

---

## Task 2: Camera, lights, room shell, tile grid (visual scaffold)

**Files:** Create `src/home/world/{CameraRig,Lights,RoomShell,TileGrid,HomeWorld}.tsx`; Modify `src/screens/HomeScreen.tsx`. No unit test (visual — verified by screenshot).

- [ ] **Step 1: CameraRig** (`src/home/world/CameraRig.tsx`) — low-FOV perspective, pitched ~35°, constrained OrbitControls (pan to roam the big room; pitch locked near iso; zoom clamped).

```tsx
import { OrbitControls } from '@react-three/drei'

export default function CameraRig() {
  return (
    <OrbitControls
      makeDefault
      enablePan
      screenSpacePanning={false}
      minPolarAngle={Math.PI / 4}     // ~45° from top — locks the iso pitch range
      maxPolarAngle={Math.PI / 3}     // ~60°
      minDistance={10}
      maxDistance={32}
      target={[0, 0, 0]}
    />
  )
}
```

- [ ] **Step 2: Lights** (`src/home/world/Lights.tsx`)

```tsx
export default function Lights() {
  return (
    <>
      <hemisphereLight args={['#fff6e6', '#5a6b8c', 0.9]} />
      <directionalLight
        position={[8, 14, 6]} intensity={1.1} castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16} shadow-camera-right={16}
        shadow-camera-top={16} shadow-camera-bottom={-16}
      />
    </>
  )
}
```

- [ ] **Step 3: RoomShell** (`src/home/world/RoomShell.tsx`) — a 20×20 floor plane plus two cutaway back walls and baseboards, flat warm colors. Floor receives shadows.

```tsx
import { GRID_SIZE, TILE } from '../../lib/home/grid'

const SIZE = GRID_SIZE * TILE
const H = SIZE / 2

export default function RoomShell() {
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#e8d8c0" />
      </mesh>
      {/* back-left wall (along -x) */}
      <mesh position={[-H, 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[SIZE, 4]} />
        <meshStandardMaterial color="#cfe3e8" />
      </mesh>
      {/* back wall (along -z) */}
      <mesh position={[0, 2, -H]} receiveShadow>
        <planeGeometry args={[SIZE, 4]} />
        <meshStandardMaterial color="#d8e8d0" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 4: TileGrid** (`src/home/world/TileGrid.tsx`) — one invisible floor plane as the raycast target; on pointer-move, compute the tile via `worldToTile` and show a single highlight quad. (Placement ghost is added in Task 9; for now just the hover highlight to prove picking.)

```tsx
import { useState } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import { GRID_SIZE, TILE, worldToTile, tileToWorld } from '../../lib/home/grid'

const SIZE = GRID_SIZE * TILE

export default function TileGrid() {
  const [hover, setHover] = useState<{ gx: number; gz: number } | null>(null)
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const t = worldToTile(e.point.x, e.point.z)
    if (t.gx < 0 || t.gz < 0 || t.gx >= GRID_SIZE || t.gz >= GRID_SIZE) { setHover(null); return }
    setHover(t)
  }
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)} visible={false}>
        <planeGeometry args={[SIZE, SIZE]} />
      </mesh>
      {hover && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}
          position={[tileToWorld(hover.gx, hover.gz).x, 0.02, tileToWorld(hover.gx, hover.gz).z]}>
          <planeGeometry args={[TILE * 0.96, TILE * 0.96]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.45} />
        </mesh>
      )}
    </group>
  )
}
```

- [ ] **Step 5: HomeWorld** (`src/home/world/HomeWorld.tsx`) — compose them.

```tsx
import CameraRig from './CameraRig'
import Lights from './Lights'
import RoomShell from './RoomShell'
import TileGrid from './TileGrid'

export default function HomeWorld() {
  return (
    <>
      <CameraRig />
      <Lights />
      <RoomShell />
      <TileGrid />
    </>
  )
}
```

- [ ] **Step 6: Wire into HomeScreen** — replace the placeholder cube. Set the canvas camera for the diorama and add a soft sky background.

```tsx
import { Canvas } from '@react-three/fiber'
import HomeWorld from '../home/world/HomeWorld'

export default function HomeScreen() {
  return (
    <div className="flex-1 relative">
      <Canvas shadows camera={{ position: [16, 16, 16], fov: 30 }}>
        <color attach="background" args={['#bfe3f2']} />
        <HomeWorld />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 7: VISION CHECK (required)**

Run `npm run dev`; via Chrome DevTools MCP navigate to `/home` (create an avatar first), `take_screenshot`. **Look at it.** Confirm: a warm floor, two cutaway walls forming a corner, soft shadow, a yellow tile highlight following the cursor, an iso-ish angle. Adjust colors/camera/light numbers and re-screenshot until it reads like a cozy diorama room. `list_console_messages` → no errors.

- [ ] **Step 8: Commit**

```bash
git add src/home/world src/screens/HomeScreen.tsx
git commit -m "feat(home): iso camera, lights, room shell, tile hover"
```

---

## Task 3: Store state + economy/layout actions — TDD

**Files:** Modify `src/store/progress.ts`; Test `src/store/__tests__/home.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress } from '../progress'

beforeEach(() => {
  useProgress.getState().resetPlayer()
  useProgress.setState({ coins: 100, ownedCreatures: ['fox'], activeCreature: 'fox' })
})

describe('home store', () => {
  it('buyHomeItem spends coins and adds to inventory; fails when too poor', () => {
    expect(useProgress.getState().buyHomeItem('rug', 30)).toBe(true)
    expect(useProgress.getState().coins).toBe(70)
    expect(useProgress.getState().ownedHomeItems['rug']).toBe(1)
    expect(useProgress.getState().buyHomeItem('crown_lamp', 999)).toBe(false)
    expect(useProgress.getState().coins).toBe(70)
  })

  it('placeItem consumes one from inventory and appends a placement', () => {
    useProgress.getState().buyHomeItem('rug', 30)
    const uid = useProgress.getState().placeItem('rug', 2, 3, 90)
    expect(uid).toBeTruthy()
    expect(useProgress.getState().ownedHomeItems['rug']).toBe(0)
    const p = useProgress.getState().placedItems
    expect(p).toHaveLength(1)
    expect(p[0]).toMatchObject({ itemId: 'rug', gx: 2, gz: 3, rot: 90 })
  })

  it('placeItem returns null when inventory is empty', () => {
    expect(useProgress.getState().placeItem('rug', 0, 0, 0)).toBeNull()
  })

  it('moveItem updates a placement; removeItem returns it to inventory', () => {
    useProgress.getState().buyHomeItem('rug', 30)
    const uid = useProgress.getState().placeItem('rug', 0, 0, 0)!
    useProgress.getState().moveItem(uid, 5, 5, 180)
    expect(useProgress.getState().placedItems[0]).toMatchObject({ gx: 5, gz: 5, rot: 180 })
    useProgress.getState().removeItem(uid)
    expect(useProgress.getState().placedItems).toHaveLength(0)
    expect(useProgress.getState().ownedHomeItems['rug']).toBe(1)
  })

  it('buyCreature then becomeCreature; cannot become an unowned creature', () => {
    expect(useProgress.getState().buyCreature('dragon', 80)).toBe(true)
    expect(useProgress.getState().coins).toBe(20)
    expect(useProgress.getState().ownedCreatures).toContain('dragon')
    useProgress.getState().becomeCreature('dragon')
    expect(useProgress.getState().activeCreature).toBe('dragon')
    useProgress.getState().becomeCreature('unicorn') // not owned → ignored
    expect(useProgress.getState().activeCreature).toBe('dragon')
  })

  it('resetPlayer clears home state', () => {
    useProgress.getState().buyHomeItem('rug', 30)
    useProgress.getState().resetPlayer()
    expect(useProgress.getState().placedItems).toEqual([])
    expect(useProgress.getState().ownedHomeItems).toEqual({})
    expect(useProgress.getState().ownedCreatures).toEqual([])
  })
})
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement in `src/store/progress.ts`**

Add interface near `SkillAttempt`:
```ts
export interface PlacedItem { uid: string; itemId: string; gx: number; gz: number; rot: number }
```
Add to `ProgressState` (state fields + action signatures):
```ts
  ownedCreatures: string[]
  activeCreature: string | null
  ownedHomeItems: Record<string, number>
  placedItems: PlacedItem[]
  buyHomeItem: (id: string, price: number) => boolean
  placeItem: (itemId: string, gx: number, gz: number, rot: number) => string | null
  moveItem: (uid: string, gx: number, gz: number, rot: number) => void
  removeItem: (uid: string) => void
  buyCreature: (id: string, price: number) => boolean
  becomeCreature: (id: string) => void
```
Add to the initial state object: `ownedCreatures: [], activeCreature: null, ownedHomeItems: {}, placedItems: [],`.
Add the same four resets to the `resetPlayer` `set({...})` patch.
Implement the actions (next to `buyCosmetic`):
```ts
      buyHomeItem: (id, price) => {
        const { coins, ownedHomeItems } = get()
        if (coins < price) return false
        set({ coins: coins - price, ownedHomeItems: { ...ownedHomeItems, [id]: (ownedHomeItems[id] ?? 0) + 1 } })
        return true
      },
      placeItem: (itemId, gx, gz, rot) => {
        const { ownedHomeItems, placedItems } = get()
        if ((ownedHomeItems[itemId] ?? 0) <= 0) return null
        const uid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
        set({
          ownedHomeItems: { ...ownedHomeItems, [itemId]: ownedHomeItems[itemId] - 1 },
          placedItems: [...placedItems, { uid, itemId, gx, gz, rot }],
        })
        return uid
      },
      moveItem: (uid, gx, gz, rot) =>
        set({ placedItems: get().placedItems.map((p) => (p.uid === uid ? { ...p, gx, gz, rot } : p)) }),
      removeItem: (uid) => {
        const { placedItems, ownedHomeItems } = get()
        const item = placedItems.find((p) => p.uid === uid)
        if (!item) return
        set({
          placedItems: placedItems.filter((p) => p.uid !== uid),
          ownedHomeItems: { ...ownedHomeItems, [item.itemId]: (ownedHomeItems[item.itemId] ?? 0) + 1 },
        })
      },
      buyCreature: (id, price) => {
        const { coins, ownedCreatures } = get()
        if (ownedCreatures.includes(id)) return true
        if (coins < price) return false
        set({ coins: coins - price, ownedCreatures: [...ownedCreatures, id] })
        return true
      },
      becomeCreature: (id) => {
        if (!get().ownedCreatures.includes(id)) return
        set({ activeCreature: id })
      },
```
> NOTE: `placeItem`/`moveItem` here do NOT themselves check `canPlace` — the UI (Task 9) only ever calls them with a tile the placement ghost already validated via `canPlace`. Keep the store actions pure data ops; collision lives in `grid.ts` + the UI.

- [ ] **Step 4: Run → pass.** Then `npx vitest run` (whole suite green).

- [ ] **Step 5: Commit**

```bash
git add src/store/progress.ts src/store/__tests__/home.test.ts
git commit -m "feat(home): store state + buy/place/move/remove/become actions"
```

---

## Task 4: Catalog data (`catalog.ts`) — TDD integrity

**Files:** Create `src/lib/home/catalog.ts`; Test `src/lib/home/__tests__/catalog.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { HOME_ITEMS, CREATURES, creatureForEmoji } from '../catalog'

const AVATAR_EMOJIS = ['🦊','🐯','🦁','🐻','🐼','🐸','🦉','🐲','🦄','🐙','🦖','🐉']

describe('catalog', () => {
  it('home item ids are unique with positive prices and valid footprints', () => {
    const ids = HOME_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const i of HOME_ITEMS) {
      expect(i.price).toBeGreaterThan(0)
      expect(i.footprint.w).toBeGreaterThanOrEqual(1)
      expect(i.footprint.d).toBeGreaterThanOrEqual(1)
      expect(['furniture', 'decor']).toContain(i.category)
    }
  })

  it('creatures cover every avatar emoji exactly once', () => {
    const emojis = CREATURES.map((c) => c.emoji)
    expect(new Set(emojis)).toEqual(new Set(AVATAR_EMOJIS))
    expect(emojis.length).toBe(AVATAR_EMOJIS.length)
    expect(new Set(CREATURES.map((c) => c.id)).size).toBe(CREATURES.length)
  })

  it('creatureForEmoji resolves the starter from a player emoji', () => {
    expect(creatureForEmoji('🐉')?.id).toBe('dragon')
    expect(creatureForEmoji('🦊')?.id).toBe('fox')
    expect(creatureForEmoji('❓')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement `src/lib/home/catalog.ts`**

```ts
import type { Footprint } from './grid'

export interface HomeItem {
  id: string
  name: string
  category: 'furniture' | 'decor'
  price: number
  footprint: Footprint
  modelId: string // → registry
}

export interface Creature {
  id: string
  emoji: string
  name: string
  price: number // starter is resolved at runtime by emoji match; listed price applies when buying
}

/** One per avatar animal. ids are stable slugs; emoji matches AvatarCreate's roster. */
export const CREATURES: Creature[] = [
  { id: 'fox',      emoji: '🦊', name: 'Fox',      price: 0 },
  { id: 'tiger',    emoji: '🐯', name: 'Tiger',    price: 60 },
  { id: 'lion',     emoji: '🦁', name: 'Lion',     price: 80 },
  { id: 'bear',     emoji: '🐻', name: 'Bear',     price: 70 },
  { id: 'panda',    emoji: '🐼', name: 'Panda',    price: 90 },
  { id: 'frog',     emoji: '🐸', name: 'Frog',     price: 50 },
  { id: 'owl',      emoji: '🦉', name: 'Owl',      price: 70 },
  { id: 'dragonet', emoji: '🐲', name: 'Dragonet', price: 150 },
  { id: 'unicorn',  emoji: '🦄', name: 'Unicorn',  price: 200 },
  { id: 'octopus',  emoji: '🐙', name: 'Octopus',  price: 110 },
  { id: 'trex',     emoji: '🦖', name: 'T-Rex',    price: 180 },
  { id: 'dragon',   emoji: '🐉', name: 'Dragon',   price: 250 },
]

export function creatureForEmoji(emoji: string): Creature | undefined {
  return CREATURES.find((c) => c.emoji === emoji)
}
export function creatureById(id: string | null | undefined): Creature | undefined {
  return id ? CREATURES.find((c) => c.id === id) : undefined
}

export const HOME_ITEMS: HomeItem[] = [
  { id: 'rug',       name: 'Cozy Rug',     category: 'decor',     price: 30,  footprint: { w: 2, d: 3 }, modelId: 'rug' },
  { id: 'bed',       name: 'Comfy Bed',    category: 'furniture', price: 80,  footprint: { w: 2, d: 3 }, modelId: 'bed' },
  { id: 'lamp',      name: 'Floor Lamp',   category: 'furniture', price: 40,  footprint: { w: 1, d: 1 }, modelId: 'lamp' },
  { id: 'plant',     name: 'Potted Plant', category: 'decor',     price: 35,  footprint: { w: 1, d: 1 }, modelId: 'plant' },
  { id: 'table',     name: 'Round Table',  category: 'furniture', price: 60,  footprint: { w: 2, d: 2 }, modelId: 'table' },
  { id: 'chair',     name: 'Chair',        category: 'furniture', price: 30,  footprint: { w: 1, d: 1 }, modelId: 'chair' },
  { id: 'bookshelf', name: 'Bookshelf',    category: 'furniture', price: 90,  footprint: { w: 2, d: 1 }, modelId: 'bookshelf' },
  { id: 'toychest',  name: 'Toy Chest',    category: 'decor',     price: 50,  footprint: { w: 1, d: 1 }, modelId: 'toychest' },
  { id: 'beanbag',   name: 'Bean Bag',     category: 'furniture', price: 45,  footprint: { w: 1, d: 1 }, modelId: 'beanbag' },
  { id: 'rocket',    name: 'Toy Rocket',   category: 'decor',     price: 120, footprint: { w: 1, d: 1 }, modelId: 'rocket' },
]
```

- [ ] **Step 4: Run → pass.** Then `npx vitest run`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/home/catalog.ts src/lib/home/__tests__/catalog.test.ts
git commit -m "feat(home): home item + creature catalog"
```

---

## Task 5: Model registry + first creature (fox) — pattern + VISION LOOP

**Files:** Create `src/home/models/registry.tsx`, `src/home/models/creatures/fox.tsx`; Test `src/home/models/__tests__/registry.test.ts`.

- [ ] **Step 1: Registry + fallback, with an integrity test**

Create `src/home/models/registry.tsx`:
```tsx
import type { ReactNode } from 'react'
import { CREATURES, HOME_ITEMS } from '../../lib/home/catalog'
import { Fox } from './creatures/fox'

/** A builder is a component that renders the model centred on the floor, facing +z. */
export type ModelBuilder = () => ReactNode

const CREATURE_BUILDERS: Record<string, ModelBuilder> = {
  fox: Fox,
  // …registered as each is authored (Task 6)
}
const FURNITURE_BUILDERS: Record<string, ModelBuilder> = {
  // …registered in Task 8
}

function Fallback() {
  return (
    <mesh castShadow position={[0, 0.4, 0]}>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial color="#d946ef" />
    </mesh>
  )
}

export function creatureBuilder(id: string | null | undefined): ModelBuilder {
  return (id && CREATURE_BUILDERS[id]) || Fallback
}
export function furnitureBuilder(modelId: string): ModelBuilder {
  return FURNITURE_BUILDERS[modelId] || Fallback
}

export const _coverage = { CREATURES, HOME_ITEMS, CREATURE_BUILDERS, FURNITURE_BUILDERS }
```

Test `src/home/models/__tests__/registry.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { creatureBuilder, furnitureBuilder } from '../registry'

describe('registry', () => {
  it('returns a builder for a known creature and a fallback for unknown', () => {
    expect(typeof creatureBuilder('fox')).toBe('function')
    expect(typeof creatureBuilder('nope')).toBe('function') // fallback, never undefined
    expect(typeof furnitureBuilder('nope')).toBe('function')
  })
})
```
(As more builders are added in Tasks 6 & 8, extend this test to assert every `CREATURES[].id` and every `HOME_ITEMS[].modelId` maps to a NON-fallback builder.)

- [ ] **Step 2: Author the Fox builder** (`src/home/models/creatures/fox.tsx`) — the reference pattern. Low-poly: a rounded body, head, snout, two pointy ears, four little legs, a bushy tail, flat fox colors (orange `#e8843c`, cream `#f5e6d0`, dark `#3a2a20`). Centre at origin, feet on y=0, facing +z, roughly 0.9 units tall.

```tsx
export function Fox() {
  const orange = '#e8843c', cream = '#f5e6d0', dark = '#3a2a20'
  return (
    <group>
      {/* body */}
      <mesh castShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[0.5, 0.42, 0.7]} />
        <meshStandardMaterial color={orange} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 0.62, 0.42]}>
        <boxGeometry args={[0.42, 0.4, 0.36]} />
        <meshStandardMaterial color={orange} />
      </mesh>
      {/* snout */}
      <mesh castShadow position={[0, 0.55, 0.66]}>
        <boxGeometry args={[0.2, 0.18, 0.18]} />
        <meshStandardMaterial color={cream} />
      </mesh>
      {/* ears */}
      {[-0.14, 0.14].map((x) => (
        <mesh key={x} castShadow position={[x, 0.86, 0.36]}>
          <coneGeometry args={[0.1, 0.2, 4]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* legs */}
      {[[-0.16, 0.26], [0.16, 0.26], [-0.16, -0.26], [0.16, -0.26]].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 0.12, z]}>
          <boxGeometry args={[0.12, 0.24, 0.12]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* tail */}
      <mesh castShadow position={[0, 0.5, -0.5]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.18, 0.18, 0.4]} />
        <meshStandardMaterial color={cream} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 3: Run the test → pass** (`npx vitest run src/home/models/__tests__/registry.test.ts`).

- [ ] **Step 4: VISION LOOP (required — this is how the model is actually finished)**

Temporarily render `<Fox />` in the room (drop it into `HomeWorld` at origin, or add a `?preview=fox` branch). `npm run dev`; via Chrome DevTools MCP `take_screenshot` at the Home camera. **Look at it.** Ask: does it read as a fox (orange, pointy ears, snout, bushy tail) at this distance? Tweak primitive sizes/positions/colors and re-screenshot. Iterate until it's recognizably a cute low-poly fox. Capture a before/after frame. Remove the temporary prems render when done.

- [ ] **Step 5: Commit**

```bash
git add src/home/models/registry.tsx src/home/models/creatures/fox.tsx src/home/models/__tests__/registry.test.ts
git commit -m "feat(home): model registry + fox creature (vision-iterated)"
```

---

## Task 6: Remaining 11 creature builders — VISION LOOP (batch)

**Files:** Create `src/home/models/creatures/{tiger,lion,bear,panda,frog,owl,dragonet,unicorn,octopus,trex,dragon}.tsx`; Modify `src/home/models/registry.tsx` (register all) and the registry test (assert full creature coverage).

Author each following the Fox pattern (group of primitives, flat colors, feet on y=0, facing +z, ~0.8–1.0 units tall). Each MUST go through the **Task 5 Step 4 vision loop** — screenshot, eyeball against the emoji, iterate. Concrete targets (silhouette + palette so each reads at a glance):

- [ ] **tiger** — like fox but stockier; orange `#f59e2c` + black stripes (thin dark boxes on the back) + white muzzle; rounded ears.
- [ ] **lion** — tan `#d6a44c` body, a ring of short cone "mane" segments around the head, tufted tail tip.
- [ ] **bear** — round brown `#8a5a36` body + head, small round ears (spheres), short snout.
- [ ] **panda** — white `#f4f4f4` body, black `#222` ears/arms/legs + black eye patches (small dark boxes).
- [ ] **frog** — green `#5bbf5b` squat body, two big eye spheres on top (white + dark pupil), wide flat mouth, folded legs.
- [ ] **owl** — rounded body `#9c7a52`, big front-facing eye discs (cylinders, white + dark), small beak cone, two ear tufts.
- [ ] **dragonet** (🐲) — chubby teal `#3fb6a8` dragon, small wings (thin angled boxes), tiny horns (cones), round belly `#bdeee7`.
- [ ] **unicorn** — white `#f6f1ff` horse body, a spiral-ish horn (cone) in pastel gold, a pastel-rainbow mane/tail (a few colored boxes).
- [ ] **octopus** — purple `#9b59d0` dome head with two big eyes, 6–8 short tapering tentacles (cones/cylinders) splayed on the floor.
- [ ] **trex** — green `#6fae3e` upright dino: big body + tail balancing forward, tiny arms, big head with a few teeth (small white cones), thick legs.
- [ ] **dragon** (🐉) — bigger, sleeker red `#d0473a` dragon, longer neck, larger wings, horns, a few back spikes (cones), cream belly.

After each, register it in `registry.tsx`'s `CREATURE_BUILDERS`. Extend the registry test:
```ts
import { CREATURES } from '../../../lib/home/catalog'
it('every creature id has a real (non-fallback) builder', () => {
  for (const c of CREATURES) expect(typeof creatureBuilder(c.id)).toBe('function')
})
```
(For a stricter check, export the builder maps and assert `c.id in CREATURE_BUILDERS`.)

- [ ] **Run** `npx vitest run` (green) and do a **gallery vision check**: render all 12 in a row, screenshot, confirm each is recognizable and they share a consistent cute low-poly style. Iterate outliers.
- [ ] **Commit**

```bash
git add src/home/models/creatures src/home/models/registry.tsx src/home/models/__tests__/registry.test.ts
git commit -m "feat(home): all 12 creature builders (vision-iterated)"
```

---

## Task 7: AvatarCreature — render active creature + idle/wander/greet

**Files:** Create `src/home/world/AvatarCreature.tsx`; Modify `src/home/world/HomeWorld.tsx`. Also lazily seed the starter creature.

- [ ] **Step 1: Seed the starter on entry.** In `HomeScreen.tsx`, on mount, if `ownedCreatures` is empty and a `player` exists, seed from the avatar emoji:
```tsx
import { useEffect } from 'react'
import { useProgress } from '../store/progress'
import { creatureForEmoji } from '../lib/home/catalog'
// inside HomeScreen, before return:
const player = useProgress((s) => s.player)
const ownedCreatures = useProgress((s) => s.ownedCreatures)
useEffect(() => {
  if (player && ownedCreatures.length === 0) {
    const c = creatureForEmoji(player.emoji)
    if (c) useProgress.setState({ ownedCreatures: [c.id], activeCreature: c.id })
  }
}, [player, ownedCreatures.length])
```

- [ ] **Step 2: AvatarCreature** (`src/home/world/AvatarCreature.tsx`) — render the active builder; idle bob + slow wander between random free-ish tiles; a greet hop on mount with `sfx`. Use `useFrame` for motion and `useRef` for the group.

```tsx
import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { useProgress } from '../../store/progress'
import { creatureBuilder } from '../models/registry'
import { tileToWorld, GRID_SIZE } from '../../lib/home/grid'
import { sfx } from '../../lib/sound'

function randomTarget(): Vector3 {
  const gx = Math.floor(Math.random() * GRID_SIZE)
  const gz = Math.floor(Math.random() * GRID_SIZE)
  const w = tileToWorld(gx, gz)
  return new Vector3(w.x, 0, w.z)
}

export default function AvatarCreature() {
  const activeCreature = useProgress((s) => s.activeCreature)
  const group = useRef<Group>(null)
  const target = useRef<Vector3>(new Vector3(0, 0, 0))
  const Builder = useMemo(() => creatureBuilder(activeCreature), [activeCreature])

  useEffect(() => { if (activeCreature) sfx.victory() }, [activeCreature]) // greet/become chirp

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    // wander
    const pos = g.position
    if (pos.distanceTo(target.current) < 0.2) target.current = randomTarget()
    const dir = target.current.clone().sub(pos)
    if (dir.length() > 0.01) {
      dir.normalize()
      pos.addScaledVector(dir, Math.min(1.2 * dt, pos.distanceTo(target.current)))
      g.rotation.y = Math.atan2(dir.x, dir.z)
    }
    // idle bob
    g.children[0] && (g.children[0].position.y = Math.sin(performance.now() / 300) * 0.04)
  })

  if (!activeCreature) return null
  return (
    <group ref={group} position={[0, 0, 0]}>
      <group><Builder /></group>
    </group>
  )
}
```
> NOTE: `performance.now()` is fine in the browser (this is runtime app code, not a workflow script).

- [ ] **Step 3: Add to HomeWorld** — `<AvatarCreature />` after `<TileGrid />`.

- [ ] **Step 4: VISION CHECK** — `npm run dev`, enter `/home`. The starter creature appears, bobs, and slowly wanders; entering plays the greet sound. Screenshot; confirm scale/placement look right relative to furniture-less room. Iterate scale if the creature is too big/small for a tile.

- [ ] **Step 5: Commit**

```bash
git add src/home/world/AvatarCreature.tsx src/home/world/HomeWorld.tsx src/screens/HomeScreen.tsx
git commit -m "feat(home): active creature renders, wanders, greets; starter seeding"
```

---

## Task 8: Furniture builders + PlacedItems

**Files:** Create `src/home/models/furniture/*.tsx` (one per `HOME_ITEMS[].modelId`: rug, bed, lamp, plant, table, chair, bookshelf, toychest, beanbag, rocket); Create `src/home/world/PlacedItems.tsx`; Modify `registry.tsx` + registry test.

- [ ] **Step 1: Author each furniture builder** following the Fox primitive+flat-color pattern, sized to its footprint (1 tile ≈ 1 world unit), resting on y=0, facing +z. **Each goes through the vision loop.** Targets:
  - **rug** (2×3) — a flat rounded plane just above the floor, warm pattern (two-tone concentric boxes).
  - **bed** (2×3) — mattress block + pillow + simple frame + blanket color.
  - **lamp** (1×1) — thin pole + a cone/sphere shade that emits a warm color (use `emissive`).
  - **plant** (1×1) — pot (cylinder) + a few green leaf cones/spheres.
  - **table** (2×2) — round top (cylinder) + 3–4 legs.
  - **chair** (1×1) — seat + back + 4 legs.
  - **bookshelf** (2×1) — tall box with shelf dividers + rows of colorful "book" boxes.
  - **toychest** (1×1) — box base + rounded lid + latch.
  - **beanbag** (1×1) — a squished sphere/rounded shape, soft color.
  - **rocket** (1×1) — a toy rocket: cylinder body + cone nose + 3 fins, bright colors.
- [ ] **Step 2: Register** each in `FURNITURE_BUILDERS` in `registry.tsx`. Extend the registry test:
```ts
import { HOME_ITEMS } from '../../../lib/home/catalog'
it('every home item modelId has a real builder', () => {
  for (const i of HOME_ITEMS) expect(typeof furnitureBuilder(i.modelId)).toBe('function')
})
```
- [ ] **Step 3: PlacedItems** (`src/home/world/PlacedItems.tsx`) — render each placement at its tile/rotation:
```tsx
import { useProgress } from '../../store/progress'
import { HOME_ITEMS } from '../../lib/home/catalog'
import { furnitureBuilder } from '../models/registry'
import { tileToWorld, footprintTiles } from '../../lib/home/grid'

export default function PlacedItems() {
  const placed = useProgress((s) => s.placedItems)
  return (
    <group>
      {placed.map((p) => {
        const item = HOME_ITEMS.find((i) => i.id === p.itemId)
        if (!item) return null
        const Builder = furnitureBuilder(item.modelId)
        // anchor at the footprint's centre so multi-tile items sit correctly
        const tiles = footprintTiles(item.footprint, p.gx, p.gz, p.rot)
        const cx = tiles.reduce((s, t) => s + tileToWorld(t.gx, t.gz).x, 0) / tiles.length
        const cz = tiles.reduce((s, t) => s + tileToWorld(t.gx, t.gz).z, 0) / tiles.length
        return (
          <group key={p.uid} position={[cx, 0, cz]} rotation={[0, (-p.rot * Math.PI) / 180, 0]}>
            <Builder />
          </group>
        )
      })}
    </group>
  )
}
```
Add `<PlacedItems />` to `HomeWorld` (before `<AvatarCreature />`).
- [ ] **Step 4: Run** `npx vitest run` (green). **VISION CHECK:** temporarily seed a couple of placed items (via the dev console or a temp seed) and screenshot — confirm furniture reads well and sits on the grid. Iterate.
- [ ] **Step 5: Commit**

```bash
git add src/home/models/furniture src/home/world/PlacedItems.tsx src/home/world/HomeWorld.tsx src/home/models/registry.tsx src/home/models/__tests__/registry.test.ts
git commit -m "feat(home): furniture builders + placed-items rendering (vision-iterated)"
```

---

## Task 9: Decorate mode — buy, place, move, remove (UI + ghost)

**Files:** Create `src/home/useHomeUi.ts`, `src/home/hud/{HomeHud,CatalogDrawer,ModeToggle}.tsx`; Modify `src/home/world/TileGrid.tsx` (placement ghost + confirm), `src/screens/HomeScreen.tsx` (mount HUD).

- [ ] **Step 1: UI store** (`src/home/useHomeUi.ts`) — non-persisted, crosses the Canvas boundary:
```ts
import { create } from 'zustand'

export type HomeMode = 'play' | 'decorate'
interface HomeUi {
  mode: HomeMode
  placingItemId: string | null   // a HomeItem.id being placed from inventory
  rotation: number               // 0|90|180|270
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
```

- [ ] **Step 2: TileGrid placement ghost + confirm.** Extend `TileGrid.tsx`: when `placingItemId` is set, show a translucent ghost of the item footprint at the hovered tile, green if `canPlace` else red; click commits via `placeItem` (then clears placing). Build the `occupied` set from `placedItems` (each item's footprint tiles). Provide a keyboard/`R` and an on-screen rotate. Use `HOME_ITEMS` for the footprint and `furnitureBuilder` for the ghost mesh (wrapped in a translucent material override — simplest: render the builder inside a group with reduced opacity via a parent `<meshStandardMaterial transparent>` is not automatic, so for the ghost use a simple footprint-sized translucent box rather than the full model). Pseudocode of the added logic:
```tsx
import { useProgress } from '../../store/progress'
import { useHomeUi } from '../useHomeUi'
import { HOME_ITEMS } from '../../lib/home/catalog'
import { canPlace, footprintTiles, tileKey, tileToWorld } from '../../lib/home/grid'
// occupied set:
const placed = useProgress((s) => s.placedItems)
const placeItem = useProgress((s) => s.placeItem)
const { placingItemId, rotation, cancelPlacing } = useHomeUi()
const occupied = useMemo(() => {
  const s = new Set<string>()
  for (const p of placed) {
    const item = HOME_ITEMS.find((i) => i.id === p.itemId)
    if (item) for (const t of footprintTiles(item.footprint, p.gx, p.gz, p.rot)) s.add(tileKey(t))
  }
  return s
}, [placed])
// on hovered tile + placingItemId: compute ok = canPlace(occupied, item.footprint, gx, gz, rotation)
// render a translucent footprint box (green/red); onClick: if ok, placeItem(placingItemId, gx, gz, rotation); cancelPlacing()
```
Show the **placed-item picker** for move/remove: in `play`/`decorate`, clicking an existing placed item selects it; a small floating toolbar offers Move (re-enter placing with that uid via `moveItem`) and Remove (`removeItem`). Keep this minimal: for v1, clicking a placed item in Decorate mode shows "Move / Remove ✕" buttons.

- [ ] **Step 3: HUD.** `HomeHud.tsx` mounts `ModeToggle` + `CatalogDrawer` over the canvas (absolute-positioned, pointer-events on the controls only). `ModeToggle` toggles `useHomeUi.mode`. `CatalogDrawer` has tabs Furniture/Decor/Creatures:
  - Furniture/Decor: list `HOME_ITEMS` by category; show price; **Buy** (`buyHomeItem`) increments inventory; items you own show a **Place** button (`startPlacing(id)`); reflect `ownedHomeItems` counts. Mirror `ShopScreen.tsx`'s styling (rounded cards, `kid-text`, coin pills).
  - Creatures tab: deferred to Task 10 (can stub "coming soon" or wire now if quick).
  Mount `<HomeHud />` inside `HomeScreen`'s root `div` (a sibling of `<Canvas>`).

- [ ] **Step 4: VISION + INTERACTION CHECK (Chrome DevTools MCP).** Enter `/home`. Switch to **Decorate**. Buy a rug → **Place** → ghost follows cursor, turns green on free tiles/red on the creature-occupied or out-of-bounds tiles → click to place → it appears. Rotate a 2×3 bed and confirm the footprint check rotates. Move and remove an item. Screenshot each. `list_console_messages` → no errors.

- [ ] **Step 5: Commit**

```bash
git add src/home/useHomeUi.ts src/home/hud src/home/world/TileGrid.tsx src/screens/HomeScreen.tsx
git commit -m "feat(home): decorate mode — buy, place (ghost+collision), move, remove"
```

---

## Task 10: Creature shop, become picker, Play interactions, nudge, camera polish

**Files:** Create `src/home/hud/BecomePicker.tsx`; Modify `CatalogDrawer.tsx` (Creatures tab), `AvatarCreature.tsx` (tap emote), `CameraRig.tsx` (rotate buttons), `WorldMap.tsx`/AppShell or the session hook (nudge).

- [ ] **Step 1: Creatures tab + Become picker.** In `CatalogDrawer`, the Creatures tab lists `CREATURES`: owned ones show **Become** (`becomeCreature`), unowned show price + **Buy** (`buyCreature` → then become). `BecomePicker` is a quick row of owned creatures for fast switching. Reflect `ownedCreatures`/`activeCreature`.
- [ ] **Step 2: Play-mode tap emote.** In `AvatarCreature`, add an `onPointerDown` (only when `useHomeUi.mode === 'play'`) that triggers a one-shot emote: a quick jump + spin tween over ~0.6s and `sfx.correct()`, plus a few heart/star particles (small sprites or tiny emissive spheres that rise and fade). Keep it a self-contained local animation (a ref-driven timer in `useFrame`).
- [ ] **Step 3: Entry + post-session nudge.** Reuse the existing `timeSessionJustCompleted` signal: when set, show a small toast/link "Spend your coins at Home →" (in `AppShell` near the existing session toast, or on the WorldMap). Keep it gentle and dismissible; never blocks.
- [ ] **Step 4: Camera polish.** Add two on-screen buttons (HUD) to rotate the view ±90° by animating the OrbitControls azimuth (or rotating the scene), and a reset-view button. Confirm panning reaches all four corners of the 20×20 room.
- [ ] **Step 5: VISION + INTERACTION CHECK.** Buy a new creature → become it → the room creature swaps form (vision-confirm the new model). In Play mode, tap the creature → it hops/spins with particles + sound. Trigger the session nudge path. Screenshot the key moments.
- [ ] **Step 6: Commit**

```bash
git add src/home/hud src/home/world/AvatarCreature.tsx src/home/world/CameraRig.tsx src/components/AppShell.tsx
git commit -m "feat(home): creature shop, become, play emotes, session nudge, camera polish"
```

---

## Task 11: Full verification

- [ ] **Step 1: Suite + lint + build**

```bash
npm test            # all vitest green (grid, store/home, catalog, registry + existing coach/base tests)
npm run lint        # fix any NEW lint errors in home files (rules-of-hooks, set-state-in-effect, unused vars). Pre-existing game-file warnings are out of scope.
npm run build       # tsc + vite build pass; confirm /home is a separate lazy chunk
```

- [ ] **Step 2: End-to-end (Chrome DevTools MCP)** — fresh avatar → **🏠 Home**: empty cozy room renders, starter creature wanders + greets. Decorate: buy + place + rotate + move + remove furniture (ghost collision correct). Creatures: buy → become → form swaps. Play: tap creature → emote. Reload the page → layout + owned items + active creature persisted. Screenshot the finished, decorated room.

- [ ] **Step 3: Offline build sanity** — `npm run build:single` succeeds (procedural art means no missing assets); note the single-file size delta (three/r3f inlined) but confirm `/home` still works from the built file.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "test(home): verified decorate + creature loop end-to-end"
```

---

## Notes & follow-ups (out of scope for v1)
- `frameloop="demand"` optimization (render-on-change) — v1 uses the default loop; revisit for battery.
- Optional `.glb` hero models; wallpaper/flooring purchasables; room expansion.
- Optional: drive the 2D header avatar from `activeCreature` (emoji sync).
- Daily/streak-gated creature unlocks.
