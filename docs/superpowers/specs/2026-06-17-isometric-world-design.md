# Isometric Explorable World — Design Spec

**Date:** 2026-06-17
**Status:** Approved (design); ready for implementation planning
**Topic:** Expand the game into a fully-explorable isometric world that encompasses the subject areas, with NPC gateways, themed areas, and enterable buildings whose front-facing walls turn transparent inside.

---

## Goal

Build a walkable, isometric 3D world (reusing the existing Home rendering + creature avatar) where each area of study is a themed place — some open-air with an NPC "gateway," some enterable buildings. The world is the eventual replacement for the 2D world map, but is built **in parallel** for now so the existing `/map` and `/home` keep working until a later phase promotes the world to the main hub.

## Approach

**Approach A — single R3F world scene, isometric follow-cam, data-driven areas, in-place building wall/roof transparency.** One `<Canvas>` renders the whole world; areas are themed React components positioned from a data file; the avatar reuses the Home walk/animation system with a world-collision predicate; buildings fade their camera-facing walls + roof when the avatar is inside (no scene swap). Chosen over interior scene-swaps (doesn't match "front walls transparent," more state) and 2.5D billboards (doesn't deliver real isometric assets).

## Decisions (from brainstorming)

1. **World's role:** Becomes the main hub *eventually*. For now it is a **new, parallel route** (`/world`) reachable via a discreet beta link; **`/map` and `/home` stay fully intact**. A later phase swaps `/world` in as the hub.
2. **Scope:** **Phased.** The plan covers the full vision, but Phase 1 ships a walkable world + the player's house + a small set of flagship areas.
3. **Gating:** **Free roam.** All areas walkable and playable from the start; no progress gating in Phase 1.
4. **Buildings:** **A few natural fits.** The player's house plus thematic buildings (Writing Workshop now; Library/Reading Reef and a Schoolhouse/Tutor hub in later phases). Open-air areas (Woods, Falls, Mesa, …) stay outdoors with NPC gateways.

## Tech stack

Vite 8, React 19, TypeScript, React-Three-Fiber v9 + drei v10 + three v0.184, Zustand (persist), Tailwind v4, Vitest (jsdom). Procedural low-poly models authored as R3F components (groups of primitive meshes with flat `meshStandardMaterial`), matching the existing creature/furniture/accessory style. Vision-in-the-loop iteration via dev studio routes + Chrome DevTools screenshots.

---

## Architecture & routing

- New route **`/world`** rendering a `WorldScreen` (gated by `RequireAvatar`, like `/home`). Self-contained; does not modify `/map` or `/home`.
- **Beta entry point:** a discreet "🌍 World (beta)" link added to the WorldMap (and/or Home HUD) so it can be reached for development. No existing navigation is removed.
- One `<Canvas shadows>` with an isometric camera. Scene tree:
  `WorldLights → WorldGround → Areas (themed components) → Buildings → NPCs → WorldAvatar`.
- **Data-driven world layout** — new `src/world/worldLayout.ts`:
  ```ts
  type AreaKind = 'open' | 'building'
  interface WorldArea {
    id: string                 // e.g. 'word-problem-woods'
    zoneId: string             // maps to curriculum zone id (must exist)
    label: string              // 'Word Problem Woods'
    worldPos: [number, number] // x,z center in world units
    kind: AreaKind
    theme: string              // 'woods' | 'falls' | 'workshop' | 'house' | ...
    npc?: { offset: [number, number]; emoji: string }
    colliders: Collider[]      // authored obstacle volumes (see Traversal)
    door?: { pos: [number, number]; width: number } // for buildings
  }
  ```
  Adding an area later = one data entry + one themed component. World layout is **authored/static** (not player-arranged).

## Traversal: camera, movement, collision

- **Isometric follow-camera:** a fixed iso angle (matching Home's look), the camera target lerps toward the avatar each frame to keep it roughly centered; optional scroll-zoom within clamped distance. Implemented as a small `WorldCameraRig` using the R3F camera (not drei OrbitControls by default).
- **Movement reuse:** extract the Home avatar's WASD + idle-wander + **axis-separated collision** into a shared movement core, `useAvatarMovement({ collide })`, where `collide(x, z) => boolean` is injected. Home passes a tile-grid predicate (unchanged behavior); the world passes a **collider-volume** predicate.
- **Collider volumes:** `type Collider = { kind: 'box'; cx; cz; w; d } | { kind: 'circle'; cx; cz; r }`. Authored per area/building (building walls, tree clusters, water edges). A world `collidesAt(x, z)` tests the avatar point (plus the existing small radius) against all colliders **except** the open doorway of the building the avatar is entering/inside.
- **WorldAvatar** = reused creature model (`creatureBuilder(activeCreature)`) + `CreatureAccessories` + walk animation (`walkState`) + `useAvatarMovement(worldCollide)`. The camera rig follows its position. The Home's decorate-mode gating and tap-to-emote are **not** part of WorldAvatar (world is always "play").
- **World bounds:** a perimeter collider keeps the avatar inside the world.

## NPC gateways

- Each open area (and later, building entrances) has an **NPC**: a simple procedural low-poly character with an idle bob and a floating subject emoji/sign above it.
- **Interaction = proximity + confirm.** When the avatar is within an NPC's interaction radius, a HUD prompt appears ("Press **E** / tap to enter **<label>**"). Confirming (E key, or tapping the prompt/NPC) triggers the gateway.
- **Gateway action (Phase 1):** navigate to the existing **`/zone/:zoneId`** stage screen (reuses ZoneDetail → GameRunner → return). Returning lands back on the world (or the map for now). An **in-world overlay panel** (stay in 3D, launch stages from a floating card) is explicitly deferred to a later phase.

## Themed areas — Phase 1 (4 places)

Phase 1 exercises every mechanic:

1. **🏠 Your House** — `kind: building`, the spawn point. Interior **reuses the existing `RoomShell` + `TileGrid` + `PlacedItems` + decorate HUD**, so decorating happens inside the house. Front walls + roof go transparent when inside (see Buildings).
2. **🌲 Word Problem Woods** — `kind: open`. Dense procedural low-poly trees (varied heights/greens), a clearing with the NPC and a wooden signpost. Tree clusters are colliders.
3. **💧 Fraction Falls** — `kind: open`. A layered low-poly waterfall (stacked translucent blue planes/boxes with a gentle vertical scroll), a splash pool, rocks; NPC on the bank. Water + rocks are colliders.
4. **✍️ Writing Workshop** — `kind: building`. A small workshop building with a doorway; entering fades the front walls + roof; a simple interior (desk/quill props). Proves the building-enter + transparency mechanic on a non-house building.

Each area is its own focused component under `src/world/areas/` with procedural assets matching the existing low-poly aesthetic. A dev **`?studio=world`**-style gallery (mirroring the creature/furniture/accessory studios) renders areas in isolation for vision tuning.

## Buildings & transparency

- A building renders **walls** (with a **doorway gap** that has no collider) + a **roof**, plus its interior contents.
- **"Inside" detection:** the avatar's world position lies within the building's footprint rectangle (+ small margin). Sets transient `insideBuildingId`.
- **Transparency:** with the fixed iso camera angle, the two **camera-facing walls and the roof** fade to (near-)transparent when `insideBuildingId === this building`, and restore on exit. Implemented by toggling those meshes' material `opacity`/`transparent`/`depthWrite` (same technique used by `PlacementPreview`), or by conditionally hiding them. Because the camera angle is fixed, "which walls face the camera" is constant; if free-orbit is added later, recompute per-frame from camera direction.
- **Enter/exit** is purely positional — walk through the doorway. No modal, no route change.

## State & persistence

- **No new persisted save fields in Phase 1.** World layout is static data; avatar **world position is transient** (spawn at the house each visit); `insideBuildingId` and the active-NPC prompt are transient UI state (a small `useWorldUi` Zustand store, not persisted). This guarantees **zero risk to existing saves**. (Persisting last world position is a later option.)

## Phasing

- **Phase 1 (this plan's first implementation):** `/world` route + beta link; `WorldLights`/`WorldGround`/`WorldCameraRig`; shared `useAvatarMovement` + collider system; `WorldAvatar`; the 4 places above; NPC proximity → `/zone/:id` gateway; building wall/roof transparency; house reuses decorate; world studio gallery; unit tests.
- **Later phases:** remaining 8 areas (Mesa, Plateau, Marsh, Grove, Reef, Data/Graphs, Division, Science, Tower Defense); central hub buildings (Library = Reading Reef, Schoolhouse/Tutor); surface Daily/Focus/badges in-world; in-world stage overlay; persist world position; **promote `/world` to replace `/map`** and fold `/home` into the house.

## Testing

- **Unit (Vitest):**
  - World-layout integrity: every `WorldArea.zoneId` resolves to a real curriculum zone; ids unique; buildings have a `door`.
  - Collision: `collidesAt` blocks movement into a wall/obstacle and **passes through the doorway**; perimeter keeps the avatar in bounds.
  - Inside-footprint detection returns true only within the footprint (+margin).
  - "Front-facing walls" selection returns the expected walls for the fixed camera angle.
- **Vision-in-the-loop:** dev world studio + Chrome DevTools screenshots to tune each themed area, the follow-cam framing, NPC placement/prompt, and the transparency, mirroring the accessory/furniture workflow. Restore the player's save and stop the dev server when done.

## Risks / mitigations

- **Scene cost:** many areas in one scene → keep geometry low-poly; Phase 1 is only 4 places; later phases can add distance-based detail toggling if needed.
- **Movement-core extraction regressions:** extracting Home movement into a shared hook must not change Home behavior → cover with the existing Home collision test plus a shared-hook test; verify Home still works after extraction.
- **Camera/transparency feel:** subjective → tune via screenshots before sign-off.

## Out of scope (Phase 1)

Gating/locks, in-world stage overlay, persisting world position, replacing `/map`, the remaining 8 areas, multiplayer, pathfinding/navmesh.
