# World (beta) — "Cozy Voxel Isle" visual direction

**Date:** 2026-06-18 · **Branch:** `world-voxel` · **Route:** `/world` (the "World (beta)" mode)

Transform the explorable World from a flat low-poly sketch into a **truly beautiful, detailed isometric voxel world**. Visual layer only — every behavior is preserved.

## Vibe
Handcrafted, warm, cozy **voxel diorama** — Townscaper × Animal Crossing × a tilt-shift voxel render. **Premium voxel**, not raw Minecraft: lightly **beveled cubes**, **ambient-occluded** crevices, soft shadows, a cohesive slightly-desaturated-but-vibrant palette, and dense charming detail. Inviting and alive.

## Hard constraints (DO NOT break behavior)
- **Walkable top is FLAT at y=0.** `useWanderWalk` does not sample terrain height, so the avatar walks a flat plane. All height/voxel depth must live in the island **underside, coastline, and non-walkable background** — never raise the ground the avatar walks on.
- Preserve `worldLayout` area positions, all **colliders** (`collision.ts`), **NPC proximity triggers** (`Npc.tsx`), **building footprint detection + front-wall fade** (`Building.tsx`, `useWorldUi`), the **avatar** (shared creature via `WorldAvatar`), camera follow (`WorldCameraRig`), and the **HUD**.
- Camera is isometric and **follows the avatar around the whole island** → detail must read well from every position and angle. World bounds ≈ ±22; perimeter at ±23.
- `build` (tsc+vite) and `test` (vitest) stay green. Keep the single-file build working (no Node-only/runtime-incompatible imports).

## The land — a floating voxel island
- **Flat grass top at y=0** (walkable), but made of **subtly varied grass voxels** (2–3 green tones scattered), not one flat plane.
- **Thick underside:** dirt → rock strata descending below y=0, with an **irregular blocky/stepped coastline** and a real silhouette, floating over a soft sea/void. This depth (seen from the iso camera) is most of the beauty.
- **Paths:** inset dirt/stone voxel paths (flush with grass, y≈0) connecting the house to each area.
- **Water:** recessed below y=0 (pond/falls), with sandy/pebble voxel shores. Never blocks walking beyond existing colliders.

## Rendering & atmosphere (the biggest lever)
- **Post-processing** (`@react-three/postprocessing` 3.0.4, installed): **N8AO** ambient occlusion (essential for voxel depth), subtle **Bloom**, **SMAA**, gentle **Vignette**. ACES tone mapping, tuned exposure.
- **Sky:** soft gradient dome (warm pale horizon → blue zenith) + a few fluffy stylized **voxel/soft clouds**.
- **Fog:** subtle, sky-matched — depth + soft horizon (kills the hard plane edge).
- **Lighting:** warm golden-hour **key** directional with **soft, high-res shadows** (SoftShadows/PCSS); cool sky **fill** (hemisphere); gentle ambient. Objects feel grounded (AO + contact).

## Shared voxel toolkit (for coherence) — `src/world/voxel/`
- `palette.ts` — named voxel colors (grasses, dirt, stone, sand, bark/wood, foliage greens, water, flower accents, roof/cottage tones…).
- `Vox` — a lightly **beveled** cube primitive (+ an **instanced** scatter helper for grass/flowers/pebbles; instancing keeps perf sane).
- `props` — reusable voxel props: tree variants (round/pine/fruit), bush, shrub, fern, flower clusters, grass tufts, mushrooms, rocks/boulders, logs, fences, lantern/lamp-post, signpost, crates/barrels, lily pad, cattail, cloud.

## Per-area richness — locations are game GATEWAYS, not decoration
Each location is where the player walks up to an NPC to **launch a game/lesson**. So every one must be a **distinct, inviting destination** that (a) reads at a glance as its subject, (b) draws the eye and the feet toward the gateway NPC, and (c) feels like a designed *place* with a sense of arrival — a clearing, a plaza, a dock, a cottage threshold. Give each a **named signpost/banner**, a clear approach (path widening into the spot), warm focal lighting (a lantern/glow near the NPC), and a little "stage" the NPC stands on. The themed props serve this — they frame the gateway, they aren't just scattered.

1. **Word Problem Woods (NW):** a cozy forest **clearing** ringed by dense varied voxel trees; undergrowth (bushes, ferns, mushrooms, logs, flowers), boulders, firefly sparkles; a carved wooden **"Word Problem Woods" signpost** and a lantern by the woodland NPC at the clearing's heart, with the path opening into it.
2. **Fraction Falls (E):** a rocky voxel cliff with a **multi-tier waterfall + foam**, a pool with lily pads/cattails/ripples, wet mossy rocks, mist sparkles, and a little **wooden footbridge/dock** where the water-themed NPC waits — the bridge + a sign make it the obvious approach.
3. **Writing Workshop (S):** a cozy voxel **cottage** — pitched/gabled roof (NOT a flat slab), chimney with drifting smoke, warm-glowing windows, door, **hanging shop sign**, small garden, lanterns, a welcoming front path/threshold where the NPC greets you. Keep enterable + front-wall fade.
4. **Your House (center):** a proper voxel **home** — pitched roof, windows, door, chimney, flower boxes, fence, mailbox, a front path. Keep enterable, the `PlacedItems` interior, and front-wall fade.

Each gateway NPC should be a charming, **subject-themed** little voxel character (a woodland friend at the Woods, a water sprite at the Falls, a bookish/inky character at the Workshop) standing on a small base, with a restyled glowing marker/banner that clearly invites interaction.

## Characters
Restyle the cylinder NPCs into **charming little voxel characters** (themed per area); keep the bob animation + proximity trigger; restyle the floating marker into a glowing voxel sign/banner. Avatar stays as-is.

## Build order
1. **Foundation (one cohesive pass):** voxel toolkit (palette/Vox/props) → `WorldEnvironment` (sky+fog+lights+post-processing) → floating-island ground → wire into `WorldScreen` + Canvas tuning. Visually tuned before fan-out.
2. **Areas in parallel** (one file each) on the tuned foundation: Woods, Falls, Workshop, House, NPCs.
3. **Visual iteration**: density, palette cohesion, lighting/post-fx, composition — screenshot-driven.

## Out of scope
Gameplay/curriculum, the 2D screens, the Home/`/home` 3D scene (shared creature/accessories may be reused but not restyled here), backend.
