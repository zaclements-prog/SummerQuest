# SummerQuest "Accessories" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2D emoji cosmetics with a 3D accessory system — buy hats/glasses/wings/clothes and equip them (one per slot) on your active creature, where they sit correctly via per-creature anchors and move with it.

**Architecture:** A central per-creature anchor map positions accessories on each of the 12 creatures. A `CreatureAccessories` renderer (mounted inside `AvatarCreature`'s animated group) draws each equipped accessory's procedural builder at its slot anchor. Store/catalog mirror the existing home-item patterns; the old 2D cosmetic shop is removed.

**Tech Stack:** Vite 8, React 19, TS, React-Three-Fiber + three, Zustand (persist), Vitest, Tailwind v4. Chrome DevTools MCP for vision iteration.

**Reference spec:** `docs/superpowers/specs/2026-06-16-summerquest-accessories-design.md`
**Branch:** `accessories-feature` (already checked out).

**Creature ids (12):** `fox, tiger, lion, bear, panda, frog, owl, dragonet, unicorn, octopus, trex, dragon`.

---

## File Structure

**New — pure logic / data (unit-tested)**
- `src/home/models/anchors.ts` — `Slot` type, `AnchorSet`, `CREATURE_ANCHORS`, `anchorsFor()`.
- `src/lib/home/accessories.ts` — `Accessory`, `ACCESSORIES[]`, `accessoryById()`.
- `src/home/models/accessoryRegistry.ts` — `accessoryBuilder(modelId)` + `_coverage`.

**New — 3D (vision-iterated)**
- `src/home/models/accessories/*.tsx` — ~16 procedural accessory builders.
- `src/home/world/CreatureAccessories.tsx` — renders equipped accessories at the active creature's anchors.

**Modified**
- `src/store/progress.ts` — remove cosmetic fields/actions; add accessory state + actions.
- `src/home/world/AvatarCreature.tsx` — mount `<CreatureAccessories />` inside the inner group.
- `src/home/hud/CatalogDrawer.tsx` — add a "Style" tab (buy/equip/unequip).
- `src/screens/HomeScreen.tsx` + `src/home/world/ModelStudio.tsx` — add an `?studio=accessories` review view.

**Deleted**
- `src/lib/cosmetics.ts`, `src/screens/ShopScreen.tsx`.
- Cosmetic references in `src/App.tsx` (route+import), `src/screens/WorldMap.tsx` (nav button), `src/components/AppShell.tsx` (header sticker).

---

## Task 1: Anchors (`anchors.ts`) — TDD

**Files:** Create `src/home/models/anchors.ts`; Test `src/home/models/__tests__/anchors.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { CREATURE_ANCHORS, anchorsFor } from '../anchors'
import { CREATURES } from '../../../lib/home/catalog'

describe('anchors', () => {
  it('every creature has a full anchor set with positive scale', () => {
    for (const c of CREATURES) {
      const a = CREATURE_ANCHORS[c.id]
      expect(a, `missing anchors for ${c.id}`).toBeTruthy()
      for (const slot of ['head', 'face', 'back', 'body'] as const) {
        expect(Array.isArray(a[slot])).toBe(true)
        expect(a[slot]).toHaveLength(3)
      }
      expect(a.scale).toBeGreaterThan(0)
    }
  })
  it('anchorsFor returns a fallback for an unknown creature', () => {
    const a = anchorsFor('nope')
    expect(a.scale).toBeGreaterThan(0)
    expect(a.head).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run → fail** — `npx vitest run src/home/models/__tests__/anchors.test.ts` (module missing).

- [ ] **Step 3: Implement `src/home/models/anchors.ts`**

```ts
export type Slot = 'head' | 'face' | 'back' | 'body'

export interface AnchorSet {
  head: [number, number, number] // top of head (hats)
  face: [number, number, number] // front of head at eye level (glasses)
  back: [number, number, number] // shoulders/back (wings, capes, backpack)
  body: [number, number, number] // front of torso/neck (bowtie, scarf, outfit)
  scale: number // sizes accessories to the creature
}

// Starting values derived from each creature's head/body geometry. These are the
// FIRST DRAFT — Task 5 vision-tunes them on fox/dragon/octopus and adjusts the rest.
export const CREATURE_ANCHORS: Record<string, AnchorSet> = {
  fox:      { head: [0, 0.86, 0.42], face: [0, 0.66, 0.64], back: [0, 0.52, -0.2], body: [0, 0.4, 0.34], scale: 1.0 },
  tiger:    { head: [0, 0.9, 0.44],  face: [0, 0.68, 0.66], back: [0, 0.52, -0.2], body: [0, 0.4, 0.36], scale: 1.05 },
  lion:     { head: [0, 0.92, 0.42], face: [0, 0.66, 0.64], back: [0, 0.52, -0.2], body: [0, 0.4, 0.34], scale: 1.05 },
  bear:     { head: [0, 0.96, 0.4],  face: [0, 0.72, 0.6],  back: [0, 0.56, -0.2], body: [0, 0.45, 0.34], scale: 1.1 },
  panda:    { head: [0, 1.02, 0.4],  face: [0, 0.78, 0.62], back: [0, 0.5, -0.2],  body: [0, 0.4, 0.36], scale: 1.1 },
  frog:     { head: [0, 0.72, 0.1],  face: [0, 0.5, 0.42],  back: [0, 0.4, -0.2],  body: [0, 0.32, 0.3], scale: 1.0 },
  owl:      { head: [0, 1.0, 0.0],   face: [0, 0.7, 0.36],  back: [0, 0.6, -0.2],  body: [0, 0.45, 0.26], scale: 1.0 },
  dragonet: { head: [0, 1.0, 0.4],   face: [0, 0.75, 0.6],  back: [0, 0.6, -0.25], body: [0, 0.45, 0.3], scale: 1.0 },
  unicorn:  { head: [0, 1.16, 0.46], face: [0, 0.9, 0.66],  back: [0, 0.6, -0.2],  body: [0, 0.45, 0.36], scale: 1.1 },
  octopus:  { head: [0, 0.72, 0.0],  face: [0, 0.46, 0.36], back: [0, 0.4, -0.2],  body: [0, 0.32, 0.3], scale: 1.0 },
  trex:     { head: [0, 1.0, 0.3],   face: [0, 0.82, 0.5],  back: [0, 0.56, -0.1], body: [0, 0.5, 0.3],  scale: 1.05 },
  dragon:   { head: [0, 1.16, 0.54], face: [0, 0.9, 0.74],  back: [0, 0.66, -0.25], body: [0, 0.5, 0.4],  scale: 1.15 },
}

const FALLBACK: AnchorSet = { head: [0, 0.95, 0.3], face: [0, 0.7, 0.55], back: [0, 0.55, -0.2], body: [0, 0.42, 0.32], scale: 1.0 }

export function anchorsFor(creatureId: string | null | undefined): AnchorSet {
  return (creatureId && CREATURE_ANCHORS[creatureId]) || FALLBACK
}
```

- [ ] **Step 4: Run → pass.** Then `npx vitest run` (whole suite green). `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/home/models/anchors.ts src/home/models/__tests__/anchors.test.ts
git commit -m "feat(accessories): per-creature anchor map"
```

---

## Task 2: Accessory catalog + registry — TDD

**Files:** Create `src/lib/home/accessories.ts`, `src/home/models/accessoryRegistry.ts`; Test `src/lib/home/__tests__/accessories.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { ACCESSORIES, accessoryById } from '../accessories'

const SLOTS = ['head', 'face', 'back', 'body']

describe('accessories catalog', () => {
  it('ids unique, prices positive, slots valid, ~16 items', () => {
    const ids = ACCESSORIES.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ACCESSORIES.length).toBeGreaterThanOrEqual(14)
    for (const a of ACCESSORIES) {
      expect(a.price).toBeGreaterThan(0)
      expect(SLOTS).toContain(a.slot)
      expect(a.modelId.length).toBeGreaterThan(0)
    }
  })
  it('covers all four slots', () => {
    for (const s of SLOTS) expect(ACCESSORIES.some((a) => a.slot === s)).toBe(true)
  })
  it('accessoryById resolves and returns undefined for unknown', () => {
    expect(accessoryById(ACCESSORIES[0].id)?.id).toBe(ACCESSORIES[0].id)
    expect(accessoryById('nope')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement `src/lib/home/accessories.ts`**

```ts
import type { Slot } from '../../home/models/anchors'

export interface Accessory {
  id: string
  name: string
  slot: Slot
  price: number
  modelId: string
}

export const ACCESSORIES: Accessory[] = [
  // head
  { id: 'cap',       name: 'Ball Cap',     slot: 'head', price: 80,  modelId: 'cap' },
  { id: 'beanie',    name: 'Beanie',       slot: 'head', price: 90,  modelId: 'beanie' },
  { id: 'partyhat',  name: 'Party Hat',    slot: 'head', price: 120, modelId: 'partyhat' },
  { id: 'tophat',    name: 'Top Hat',      slot: 'head', price: 200, modelId: 'tophat' },
  { id: 'crown',     name: 'Royal Crown',  slot: 'head', price: 400, modelId: 'crown' },
  // face
  { id: 'sunglasses',name: 'Sunglasses',   slot: 'face', price: 120, modelId: 'sunglasses' },
  { id: 'glasses',   name: 'Round Glasses',slot: 'face', price: 100, modelId: 'glasses' },
  { id: 'eyemask',   name: 'Hero Mask',    slot: 'face', price: 160, modelId: 'eyemask' },
  // back
  { id: 'angelwings',name: 'Angel Wings',  slot: 'back', price: 320, modelId: 'angelwings' },
  { id: 'batwings',  name: 'Bat Wings',    slot: 'back', price: 300, modelId: 'batwings' },
  { id: 'cape',      name: 'Hero Cape',    slot: 'back', price: 220, modelId: 'cape' },
  { id: 'backpack',  name: 'Backpack',     slot: 'back', price: 140, modelId: 'backpack' },
  // body
  { id: 'bowtie',    name: 'Bow Tie',      slot: 'body', price: 90,  modelId: 'bowtie' },
  { id: 'scarf',     name: 'Cozy Scarf',   slot: 'body', price: 110, modelId: 'scarf' },
  { id: 'herooutfit',name: 'Hero Suit',    slot: 'body', price: 260, modelId: 'herooutfit' },
  { id: 'lei',       name: 'Flower Lei',   slot: 'body', price: 100, modelId: 'lei' },
]

export function accessoryById(id: string | null | undefined): Accessory | undefined {
  return id ? ACCESSORIES.find((a) => a.id === id) : undefined
}
```

- [ ] **Step 4: Create `src/home/models/accessoryRegistry.ts`** (empty map now; builders register in Tasks 5–6)

```tsx
import type { ReactNode } from 'react'
import { ACCESSORIES } from '../../lib/home/accessories'

export type AccessoryBuilder = () => ReactNode

const ACCESSORY_BUILDERS: Record<string, AccessoryBuilder> = {}

function Fallback() {
  return (
    <mesh position={[0, 0.05, 0]}>
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshStandardMaterial color="#d946ef" />
    </mesh>
  )
}

export function accessoryBuilder(modelId: string): AccessoryBuilder {
  return ACCESSORY_BUILDERS[modelId] || Fallback
}

export const _coverage = { ACCESSORIES, ACCESSORY_BUILDERS }
```
(eslint may flag `react-refresh/only-export-components` on this mixed file — add the file-level
`/* eslint-disable react-refresh/only-export-components */` comment, as `registry.tsx` already does.)

- [ ] **Step 5: Run → pass** (`npx vitest run`), `npx tsc --noEmit` exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/home/accessories.ts src/home/models/accessoryRegistry.ts src/lib/home/__tests__/accessories.test.ts
git commit -m "feat(accessories): catalog (~16) + accessory registry"
```

---

## Task 3: Store — swap cosmetics for accessories — TDD

> ⚠️ **PAIRED WITH TASK 4 — execute them together as one unit.** Removing the cosmetic fields from
> the store (Task 3) makes `ShopScreen`/`AppShell` fail to compile until Task 4 deletes them, so the
> `tsc`/`build` gate only goes green at the end of Task 4. The store *unit tests* pass after Task 3.

**Files:** Modify `src/store/progress.ts`; Test `src/store/__tests__/accessories.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress } from '../progress'

beforeEach(() => {
  useProgress.getState().resetPlayer()
  useProgress.setState({ coins: 1000 })
})

describe('accessory store', () => {
  it('buyAccessory spends coins once; equip sets the slot from the catalog', () => {
    expect(useProgress.getState().buyAccessory('cap', 80)).toBe(true)
    expect(useProgress.getState().coins).toBe(920)
    expect(useProgress.getState().ownedAccessories).toContain('cap')
    expect(useProgress.getState().buyAccessory('cap', 80)).toBe(true) // already owned, no charge
    expect(useProgress.getState().coins).toBe(920)
    useProgress.getState().equipAccessory('cap')
    expect(useProgress.getState().equippedAccessories.head).toBe('cap')
  })
  it('equipping a same-slot item replaces; re-equipping toggles off', () => {
    useProgress.getState().buyAccessory('cap', 80)
    useProgress.getState().buyAccessory('tophat', 200)
    useProgress.getState().equipAccessory('cap')
    useProgress.getState().equipAccessory('tophat') // same 'head' slot → replaces
    expect(useProgress.getState().equippedAccessories.head).toBe('tophat')
    useProgress.getState().equipAccessory('tophat') // toggle off
    expect(useProgress.getState().equippedAccessories.head).toBeNull()
  })
  it('unequipSlot clears a slot; resetPlayer clears all', () => {
    useProgress.getState().buyAccessory('sunglasses', 120)
    useProgress.getState().equipAccessory('sunglasses')
    useProgress.getState().unequipSlot('face')
    expect(useProgress.getState().equippedAccessories.face).toBeNull()
    useProgress.getState().buyAccessory('cap', 80)
    useProgress.getState().resetPlayer()
    expect(useProgress.getState().ownedAccessories).toEqual([])
    expect(useProgress.getState().equippedAccessories).toEqual({ head: null, face: null, back: null, body: null })
  })
})
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement in `src/store/progress.ts`** (read it first)

1. **Remove the cosmetic system:** delete the `ownedCosmetics` and `equippedCosmetic` state fields,
   the `buyCosmetic` and `equipCosmetic` action signatures, their entries in the initial-state
   object, their two implementations, and their lines in the `resetPlayer` `set({...})` patch.
2. Add imports near the top:
   ```ts
   import type { Slot } from '../home/models/anchors'
   import { accessoryById } from '../lib/home/accessories'
   ```
3. Add to `ProgressState` (state + action signatures):
   ```ts
     ownedAccessories: string[]
     equippedAccessories: Record<Slot, string | null>
     buyAccessory: (id: string, price: number) => boolean
     equipAccessory: (id: string) => void
     unequipSlot: (slot: Slot) => void
   ```
4. In the initial-state object add:
   ```ts
     ownedAccessories: [],
     equippedAccessories: { head: null, face: null, back: null, body: null },
   ```
   and the same two in the `resetPlayer` patch.
5. Implement the actions (next to `buyHomeItem`):
   ```ts
         buyAccessory: (id, price) => {
           const { coins, ownedAccessories } = get()
           if (ownedAccessories.includes(id)) return true
           if (coins < price) return false
           set({ coins: coins - price, ownedAccessories: [...ownedAccessories, id] })
           return true
         },
         equipAccessory: (id) => {
           const acc = accessoryById(id)
           if (!acc || !get().ownedAccessories.includes(id)) return
           const eq = get().equippedAccessories
           set({ equippedAccessories: { ...eq, [acc.slot]: eq[acc.slot] === id ? null : id } })
         },
         unequipSlot: (slot) =>
           set({ equippedAccessories: { ...get().equippedAccessories, [slot]: null } }),
   ```

- [ ] **Step 4: Run → pass** (`npx vitest run src/store/__tests__/accessories.test.ts`, 3 tests). Then
  `npx vitest run` — NOTE: the existing `ShopScreen`/`AppShell` still reference the removed cosmetics,
  so `npx tsc --noEmit` / `npm run build` will FAIL until Task 4 removes them. The unit tests
  (which don't import those screens) pass. Proceed to Task 4 immediately.

- [ ] **Step 5: Commit**

```bash
git add src/store/progress.ts src/store/__tests__/accessories.test.ts
git commit -m "feat(accessories): store buy/equip/unequip (replaces cosmetics)"
```

---

## Task 4: Retire the 2D cosmetic UI

**Files:** Delete `src/lib/cosmetics.ts`, `src/screens/ShopScreen.tsx`; Modify `src/App.tsx`, `src/screens/WorldMap.tsx`, `src/components/AppShell.tsx`.

- [ ] **Step 1: Delete the files**

```bash
cd "C:/Users/zacle/Documents/summerquest"
git rm src/lib/cosmetics.ts src/screens/ShopScreen.tsx
```

- [ ] **Step 2: `src/App.tsx`** — remove `import ShopScreen from './screens/ShopScreen'` and the
  entire `<Route path="/shop" ... />` block.

- [ ] **Step 3: `src/screens/WorldMap.tsx`** — remove the `<Link to="/shop" ...>🛍️ Shop</Link>` nav
  button block.

- [ ] **Step 4: `src/components/AppShell.tsx`** — remove `import { cosmeticById } from '../lib/cosmetics'`,
  the `const cosmetic = cosmeticById(equippedCosmetic)` line, the `equippedCosmetic` destructured from
  the store, and the JSX that renders the cosmetic emoji next to the avatar (the
  `{cosmetic && (<span ...>{cosmetic.emoji}</span>)}` block). Leave the rest of the avatar span intact.

- [ ] **Step 5: Verify the removal is total**

Run: `grep -rniE "cosmetic" src` → expect **no matches**.
Run: `npm run build` → now passes (tsc clean + vite build). `npx vitest run` → all green.
Run: `npx eslint src/App.tsx src/screens/WorldMap.tsx src/components/AppShell.tsx` → clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(accessories): remove the 2D emoji cosmetic shop"
```

---

## Task 5: Renderer + first 3 accessories — pattern + VISION LOOP

**Files:** Create `src/home/world/CreatureAccessories.tsx`, `src/home/models/accessories/{cap,sunglasses,angelwings}.tsx`; Modify `src/home/models/accessoryRegistry.ts`, `src/home/world/AvatarCreature.tsx`.

- [ ] **Step 1: `CreatureAccessories.tsx`** — render each equipped accessory at its slot anchor.

```tsx
import { useProgress } from '../../store/progress'
import { anchorsFor } from '../models/anchors'
import type { Slot } from '../models/anchors'
import { accessoryById } from '../../lib/home/accessories'
import { accessoryBuilder } from '../models/accessoryRegistry'

const SLOTS: Slot[] = ['head', 'face', 'back', 'body']

export default function CreatureAccessories() {
  const activeCreature = useProgress((s) => s.activeCreature)
  const equipped = useProgress((s) => s.equippedAccessories)
  const anchors = anchorsFor(activeCreature)
  return (
    <group scale={anchors.scale}>
      {SLOTS.map((slot) => {
        const id = equipped[slot]
        const acc = accessoryById(id)
        if (!id || !acc) return null
        const build = accessoryBuilder(acc.modelId)
        const p = anchors[slot]
        return (
          <group key={slot} position={[p[0] / anchors.scale, p[1] / anchors.scale, p[2] / anchors.scale]}>
            {build()}
          </group>
        )
      })}
    </group>
  )
}
```
> NOTE: the outer group is `scale={anchors.scale}` so accessories size to the creature; the inner
> positions divide by scale so the anchor coordinates remain in the creature's un-scaled local space.

- [ ] **Step 2: First three accessory builders** (authored so the ORIGIN is the attach point):

`src/home/models/accessories/cap.tsx` — a ball cap: a dome (half-sphere or low cylinder) sitting at
the head anchor (its base at y≈0) + a brim sticking forward (+z). Bright color.
```tsx
export function Cap() {
  const blue = '#3b6fd4'
  return (
    <group>
      <mesh castShadow position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={blue} />
      </mesh>
      <mesh castShadow position={[0, 0.02, 0.16]}>
        <boxGeometry args={[0.22, 0.03, 0.14]} />
        <meshStandardMaterial color={blue} />
      </mesh>
    </group>
  )
}
```

`src/home/models/accessories/sunglasses.tsx` — two dark lenses + a bridge, centered at the eyes
(origin at eye center), facing +z.
```tsx
export function Sunglasses() {
  const dark = '#111111'
  return (
    <group>
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 0, 0.02]}>
          <boxGeometry args={[0.11, 0.08, 0.03]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.06, 0.02, 0.02]} />
        <meshStandardMaterial color={dark} />
      </mesh>
    </group>
  )
}
```

`src/home/models/accessories/angelwings.tsx` — two white wings rooted at the origin (shoulder),
extending up/out/back. Reuse the existing flapping `Wing` part from `../parts`.
```tsx
import { Wing } from '../parts'
export function Angelwings() {
  return (
    <group>
      <Wing x={0} y={0} z={0} side={1} color="#ffffff" w={0.34} d={0.3} flap={0.4} />
      <Wing x={0} y={0} z={0} side={-1} color="#ffffff" w={0.34} d={0.3} flap={0.4} />
    </group>
  )
}
```

- [ ] **Step 3: Register the three** in `accessoryRegistry.ts` `ACCESSORY_BUILDERS`:
  ```ts
  import { Cap } from './accessories/cap'
  import { Sunglasses } from './accessories/sunglasses'
  import { Angelwings } from './accessories/angelwings'
  const ACCESSORY_BUILDERS: Record<string, AccessoryBuilder> = { cap: Cap, sunglasses: Sunglasses, angelwings: Angelwings }
  ```

- [ ] **Step 4: Mount in `AvatarCreature.tsx`** — import `CreatureAccessories` and render it INSIDE
  the inner group, after `<b.Builder />`:
  ```tsx
  import CreatureAccessories from './CreatureAccessories'
  // ...
        <group ref={inner} onPointerDown={onPointerDown}>
          <b.Builder />
          <CreatureAccessories />
        </group>
  ```

- [ ] **Step 5: Build + test**: `npm run build` pass, `npx vitest run` green, `npx eslint src/home` clean.

- [ ] **Step 6: VISION LOOP (required — this is how anchors get tuned)**

`npm run dev`. Via Chrome DevTools MCP, equip cap + sunglasses + angelwings (set
`equippedAccessories` in localStorage, or use the dev console) and become, in turn, **fox**,
**dragon**, and **octopus**. Screenshot each. **Look:** does the cap sit ON the head (not floating/
sunk)? Are the glasses on the eyes? Are the wings on the back at a good height? Adjust the per-creature
values in `anchors.ts` (and the model sizes) and re-screenshot until all three read right. Apply the
same eyeball pass to the remaining creatures (tiger/lion/bear/panda/frog/owl/dragonet/unicorn/trex)
and nudge their anchors. Capture before/after frames.

- [ ] **Step 7: Commit**

```bash
git add src/home/world/CreatureAccessories.tsx src/home/models/accessories src/home/models/accessoryRegistry.ts src/home/world/AvatarCreature.tsx src/home/models/anchors.ts
git commit -m "feat(accessories): renderer + cap/sunglasses/wings; anchors vision-tuned"
```

---

## Task 6: Remaining accessory builders — VISION LOOP (batch)

**Files:** Create `src/home/models/accessories/{beanie,partyhat,tophat,crown,glasses,eyemask,batwings,cape,backpack,bowtie,scarf,herooutfit,lei}.tsx`; Modify `accessoryRegistry.ts` + the accessory coverage test.

Author each following Task 5's convention (origin = attach point; head items' base at y≈0; face items
centered at the eyes; back items rooted at the shoulder; body items centered at the torso). Targets:

- [ ] **beanie** (head) — a snug rounded cap (low dome/half-sphere) with a folded brim ring, warm color.
- [ ] **partyhat** (head) — a tall cone (bright stripes) with a little pom on top.
- [ ] **tophat** (head) — a black cylinder + a flat brim disc + a colored band.
- [ ] **crown** (head) — a gold ring with 5 pointed spikes (cones) + small gem dots.
- [ ] **glasses** (face) — two thin round lens rings (torus or thin cylinders) + a bridge; clear/dark frame.
- [ ] **eyemask** (face) — a superhero domino mask: a wide rounded band across the eyes with two eye holes, bright color.
- [ ] **batwings** (back) — two dark membranous wings (angular boxes/triangles) rooted at the shoulder; reuse `Wing` with a dark color and a more angular look.
- [ ] **cape** (back) — a flowing cloth panel hanging from the shoulders down the back (a slightly curved/tapered box), bright color + a collar.
- [ ] **backpack** (back) — a small box pack with two straps over the shoulders (+z), kid colors.
- [ ] **bowtie** (body) — two small triangles (cones) meeting at a center knot, red.
- [ ] **scarf** (body) — a wrapped neck band (a ring/torus around the neck) + two hanging tails at the front, striped.
- [ ] **herooutfit** (body) — a small chest emblem (a star/diamond on a colored chest patch) suggesting a hero suit.
- [ ] **lei** (body) — a ring of small colorful flower spheres around the neck.

Register all 13 in `ACCESSORY_BUILDERS`. Append to `src/lib/home/__tests__/accessories.test.ts`:
```ts
import { _coverage } from '../../../home/models/accessoryRegistry'
it('every accessory modelId has a registered builder', () => {
  for (const a of ACCESSORIES) expect(a.modelId in _coverage.ACCESSORY_BUILDERS).toBe(true)
})
```

- [ ] **Run** `npx vitest run` (green, incl. coverage), `npm run build` (pass), `npx eslint src/home/models` (clean).
- [ ] **VISION REVIEW:** equip each on the fox + dragon; screenshot; refine models/anchors as needed.
- [ ] **Commit**

```bash
git add src/home/models/accessories src/home/models/accessoryRegistry.ts src/lib/home/__tests__/accessories.test.ts
git commit -m "feat(accessories): remaining accessory builders (vision-iterated)"
```

---

## Task 7: "Style" tab in the catalog drawer

**Files:** Modify `src/home/hud/CatalogDrawer.tsx`.

- [ ] **Step 1: Add the tab + store hooks.** In `CatalogDrawer.tsx`:
  - Extend the tab union/list to include `'style'` (label "Style").
  - Add imports: `import { ACCESSORIES } from '../../lib/home/accessories'`.
  - Add store selectors: `const ownedAccessories = useProgress((s) => s.ownedAccessories)`,
    `const equippedAccessories = useProgress((s) => s.equippedAccessories)`,
    `const buyAccessory = useProgress((s) => s.buyAccessory)`,
    `const equipAccessory = useProgress((s) => s.equipAccessory)`.
  - Render the `style` tab branch: list `ACCESSORIES`; each card shows the name; if unowned → a
    `🪙 {price}` Buy button (`buyAccessory(a.id, a.price)` + `sfx.victory()` on success); if owned →
    an Equip/Equipped toggle (`equipAccessory(a.id)` + `sfx.click()`) highlighted when
    `equippedAccessories[a.slot] === a.id`. Mirror the existing Furniture/Creatures grid styling
    (rounded white cards, `kid-text`, quest/correct/ocean colors). Group or label by slot if easy.

```tsx
// inside the tab-content ternary, add a branch for tab === 'style':
{tab === 'style' ? (
  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
    {ACCESSORIES.map((a) => {
      const isOwned = ownedAccessories.includes(a.id)
      const isEquipped = equippedAccessories[a.slot] === a.id
      const canAfford = coins >= a.price
      return (
        <div key={a.id} className="bg-white text-ocean-900 rounded-2xl p-2 text-center">
          <div className="kid-text text-xs leading-tight my-1 min-h-[2em]">{a.name}</div>
          {isOwned ? (
            <button onClick={() => { sfx.click(); equipAccessory(a.id) }}
              className={`kid-text text-xs w-full px-2 py-1 rounded-full ${isEquipped ? 'bg-ocean-500 text-white' : 'bg-correct-500 text-white'}`}>
              {isEquipped ? 'Wearing ✓' : 'Wear'}
            </button>
          ) : (
            <button onClick={() => { if (buyAccessory(a.id, a.price)) sfx.victory() }} disabled={!canAfford}
              className={`kid-text text-xs w-full px-2 py-1 rounded-full ${canAfford ? 'bg-quest-500 text-quest-900' : 'bg-gray-200 text-gray-400'}`}>
              🪙 {a.price}
            </button>
          )}
        </div>
      )
    })}
  </div>
) : (
  /* ...existing furniture/decor/creatures branches... */
)}
```
(Integrate into the existing tab ternary structure; keep all current tabs working. Ensure the tab
button row includes Style.)

- [ ] **Step 2: Build + lint**: `npm run build` pass, `npx eslint src/home/hud/CatalogDrawer.tsx` clean, `npx vitest run` green.

- [ ] **Step 3: VISION + INTERACTION CHECK** — Decorate mode → Style tab → Buy a hat → Wear it → the
  creature wears it live → walk (it moves with the creature) → become a different creature (it follows).

- [ ] **Step 4: Commit**

```bash
git add src/home/hud/CatalogDrawer.tsx
git commit -m "feat(accessories): Style tab — buy & wear accessories live"
```

---

## Task 8: Dev studio view + full verification

**Files:** Modify `src/home/world/ModelStudio.tsx`, `src/screens/HomeScreen.tsx` (optional accessories studio); then verify.

- [ ] **Step 1 (optional but recommended): accessories studio.** Add an `?studio=accessories` mode that
  renders the fox wearing each accessory in a grid (or one creature cycling), to review the whole set
  at once. In `HomeScreen.tsx` accept `'accessories'` in the `isStudio` check; in `ModelStudio.tsx`
  handle `kind === 'accessories'` by laying out, per accessory, a small fixed creature (e.g. the fox
  builder) with that single accessory at the fox anchor. Keep it dev-only (gated by the query param).

- [ ] **Step 2: Suite + lint + build**

```bash
npm test          # all green incl. anchors/accessories/store tests
npm run lint      # fix any NEW lint errors in accessory files (pre-existing game-file warnings are out of scope)
npm run build     # tsc + vite pass
grep -rniE "cosmetic" src   # expect NO matches (the 2D system is fully gone)
```

- [ ] **Step 3: End-to-end (Chrome DevTools MCP)** — fresh avatar → Home → Style tab: buy + wear one
  accessory per slot (hat, glasses, wings, outfit) → all four sit right on the creature and move with it
  → become 2–3 different creatures and confirm each accessory still sits right (anchors) → reload →
  equipped set persists. Confirm the WorldMap no longer shows a Shop button and the header has no emoji
  sticker.

- [ ] **Step 4: Offline build** — `npm run build:single` succeeds (procedural accessories inline fine).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "test(accessories): dev studio + verified buy/wear/persist end-to-end"
```

---

## Notes & follow-ups (out of scope)
- Per-creature outfits; accessory bundles/sets; seasonal cosmetics.
- Finer wing variety; layered clothing.
