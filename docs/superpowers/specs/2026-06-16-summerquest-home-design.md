# SummerQuest "Home" — 3D Isometric Decoration + Avatar World

**Date:** 2026-06-16
**Status:** Approved design, pending implementation plan

## Context

SummerQuest rewards learning with **coins** (`store/progress.ts`: `coins`, `spendCoins`,
`addCoins`). Today the only coin sink is emoji avatar cosmetics (`lib/cosmetics.ts` +
`ShopScreen.tsx`). The game wants a stronger, more aspirational reason to keep playing.

This feature adds a **3D "Home"** — a cozy, low-poly, tilted-isometric (2.5D) room the player
decorates and lives in. Coins earned by learning buy **furniture/decorations** (placed on a tile
grid) and new **avatar-creatures the player "becomes"** (the active creature lives in the room).
The intended outcome: a natural, wholesome retention loop — *learn → earn coins → decorate your
space and unlock cooler forms to be → want to learn more.* No timers, no decay, no guilt.

Visual north star: the low-poly "isometric bedroom" diorama from
<https://brettkromkamp.com/posts/engaging-web-experiences/> (warm flat colors, soft shadows,
cutaway room, Three.js + Blender-ecosystem aesthetic). Tile-grid + raycast picking follow the
tile-based approach from that author's Three.js series.

## Goals

1. A lazy-loaded 3D Home at `/home` built with **React-Three-Fiber** (R3F), that does not weigh
   down the rest of the (2D) app.
2. **Tile-grid placement**: buy decorations, place/move/remove them on an N×N floor grid with
   90° rotation and collision/bounds checking; layout persists.
3. **Avatar-creatures as the coin sink**: reuse the existing 12-animal avatar roster as
   procedural low-poly forms; the starter is free, the rest are purchasable forms you "become."
   The active creature lives in the room and is the thing you interact with.
4. **Procedural low-poly art** (no downloaded assets) so the single-file *offline* build still works.
5. Wholesome interaction: idle/wander, greet-on-entry, Play-mode emotes. No care meters.

## Non-Goals

- No imported `.glb`/binary assets (keeps offline single-file build intact).
- No multiplayer, no real-money anything, no creature needs/decay/Tamagotchi mechanics.
- No physics engine. Motion is simple procedural tweening.
- The 2D avatar-creation flow and existing emoji cosmetics stay as they are (Home *augments*,
  doesn't replace, identity).

## Key existing code to reuse / integrate

- `store/progress.ts` — `coins`, `spendCoins`, `addCoins`, persist middleware
  (`summerquest-progress-v1`), `resetPlayer`, `player` (avatar emoji/color/name).
- `lib/cosmetics.ts` + `screens/ShopScreen.tsx` — the data-driven catalog + buy/equip UI pattern
  to mirror for the Home catalog.
- `screens/AvatarCreate.tsx` — the canonical 12-animal roster (fox, tiger, lion, bear, panda,
  frog, owl, dragon, unicorn, octopus, dino, wyvern). This list becomes the creature roster.
- `screens/WorldMap.tsx` — nav button row (add a "🏠 Home" link, mirroring the coach buttons).
- `App.tsx` — `<Routes>` + `RequireAvatar` wrapper (add the lazy `/home` route).
- `lib/sound.ts` — Web Audio SFX (`sfx`) for greet/emote/place sounds (no asset bundle).
- `lib/dailyGoal.ts` / session-complete hook (`timeSessionJustCompleted`) — for the gentle
  "spend your coins at Home" nudge.

## Architecture

### Rendering boundary (lazy R3F)

- New deps: `three`, `@react-three/fiber`, `@react-three/drei`.
- `screens/HomeScreen.tsx` is **code-split** via `React.lazy(() => import('./HomeScreen'))` in
  `App.tsx`, wrapped in `<Suspense fallback={...}>`. Three.js loads only when entering `/home`,
  so the World Map / games keep their current bundle weight.
- `HomeScreen` renders an R3F `<Canvas>` (the 3D world) plus a 2D DOM HUD overlay (existing
  Tailwind kid theme). The two communicate only through the Zustand store and a small amount of
  local React state (current mode, item being placed) — clean, testable boundary.

### Component tree

```
HomeScreen (route, lazy)
├─ <Canvas> frameloop="demand"            three world
│  ├─ CameraRig        low-FOV (~30–35°) perspective, pitched ~35° down; 90° yaw snaps + clamped zoom + gentle pan (to roam the 20×20 room)
│  ├─ Lights           hemisphere/ambient + key directional; soft contact shadow under items
│  ├─ RoomShell        procedural floor plane + 2 cutaway walls + baseboards (flat colors)
│  ├─ TileGrid         single floor plane raycast → tile index; one moving hover highlight; placement ghost in Decorate mode
│  ├─ PlacedItems      maps placedItems[] → <ProceduralItem spec/>; instance repeats
│  └─ AvatarCreature   active creature: idle bob, wander, greet-on-mount, emote on tap
└─ HUD (DOM over canvas)
   ├─ Coins + “← Back to map”
   ├─ Mode toggle: 🛠️ Decorate ⇄ 🎮 Play
   ├─ Catalog drawer (tabs: Furniture / Decor / Creatures) — buy → inventory → place
   └─ “Become” picker (owned creatures → setActive)
```

### Procedural model system (`src/lib/home/`)

- `models/` — one builder per item/creature. A builder is a small function returning an R3F
  element tree (groups of `boxGeometry`/`cylinderGeometry`/`sphereGeometry`/etc. with
  `meshStandardMaterial` flat colors). Keep each builder in its own focused file.
- `catalog.ts` — `HomeItem { id, name, category: 'furniture'|'decor', price, footprint: {w,d},
  modelId }[]`, mirroring `cosmetics.ts`. Plus the creature roster
  `CREATURES { id, emoji, name, price }[]` — one entry per existing avatar animal, using a stable
  slug `id` (e.g. `'fox'`, `'dragon'`) paired with its `emoji` (the same emoji `AvatarCreate`
  uses). The **starter** creature is whichever roster entry's `emoji` matches the player's chosen
  `player.emoji` (price effectively 0 — owned for free); all others have coin prices.
- `grid.ts` — **pure** helpers: tile↔world coordinate conversion (fixed **`GRID_SIZE = 20`**,
  i.e. a 20×20 floor — roomy enough for distinct activity zones), and
  `canPlace(occupied, footprint, gx, gz, rot)` → boolean (bounds + overlap, accounting for
  rotation swapping the footprint's w/d). These are the unit-tested core of placement.
- `registry.ts` — `modelId → builder` and `creatureId → creatureBuilder` lookup, with a visible
  fallback box for an unknown id (never crash).

### Store additions (`store/progress.ts`, persisted)

| State | Type | Notes |
|---|---|---|
| `ownedCreatures` | `string[]` | seeded with the starter creature id (resolved from `player.emoji`); lazily seeded on first Home load for existing saves |
| `activeCreature` | `string` | the form you've "become"; may also drive the 2D header avatar |
| `ownedHomeItems` | `Record<string, number>` | itemId → count owned but possibly unplaced |
| `placedItems` | `PlacedItem[]` | `{ uid, itemId, gx, gz, rot }` — the room layout |

Actions (reuse `coins`/`spendCoins`): `buyHomeItem(id, price)`, `placeItem(itemId, gx, gz, rot)`,
`moveItem(uid, gx, gz, rot)`, `removeItem(uid)` (returns to inventory count), `buyCreature(id,
price)`, `becomeCreature(id)`. `resetPlayer` clears all of the above (re-seeding the starter).
Cap `placedItems` defensively (e.g. grid area). Migration: new fields default safely for existing
saved games (no version bump needed — absent fields initialize empty/seeded on first load).

### Data flow

```
learning (existing) ──addCoins──▶ store.coins
HUD buy ──buyHomeItem/buyCreature──▶ spendCoins + ownedHomeItems/ownedCreatures
Decorate: pick tile (raycast) ─ canPlace? ─ placeItem/moveItem ──▶ placedItems ─▶ PlacedItems renders
Play: tap creature ─▶ emote (local anim + sfx)
becomeCreature ──▶ activeCreature ─▶ AvatarCreature swaps form (+ optional 2D header sync)
all persisted to localStorage via the existing zustand persist
```

### Interaction & incentive (wholesome)

- Active creature idle-bobs and slowly wanders the free tiles; **greets on entry** (hop + a
  Web-Audio chirp via `sfx`).
- **Play** mode: tapping the creature triggers an emote (jump / spin / heart particles + sfx).
  Decoration "interactions" (a lamp toggles, a ball bounces) are cosmetic only.
- A gentle one-line nudge ("Spend your coins at Home →") surfaces after a completed study session
  by reading the existing `timeSessionJustCompleted` signal. Never punitive.

### Performance & offline

- Procedural geometry → nothing to fetch; inlines fine in the `build:single` offline build (the
  single-file grows by the three/r3f bundle — acceptable; the **lazy route keeps it out of every
  other screen**).
- `frameloop="demand"` (R3F renders only on change) while the room is idle; switch to continuous
  only while the creature animates or in Play mode. Respects the app's existing care about paused
  rAF in background tabs.
- Instance repeated items; modest shadow map. The 20×20 floor is one plane (tile picking is
  math on the ray hit, not 400 meshes), so the larger room adds no per-tile cost.

## 3D model authoring workflow (vision-in-the-loop) — REQUIRED

Procedural low-poly models must be **built and refined by looking at them**, not by guessing at
numbers. For each creature form and each furniture piece, the implementer MUST:

1. Build/adjust the procedural builder.
2. Render it in the running app (or a tiny isolated R3F preview route) and **screenshot it via the
   Chrome DevTools MCP** (`take_screenshot` / `take_snapshot`).
3. **Visually inspect the screenshot** against the cozy low-poly north star and the matching
   avatar emoji (does the dragon read as a dragon? proportions, color, silhouette?).
4. Iterate steps 1–3 until it reads clearly at the Home camera distance.

This mirrors the established dragon-walk screenshot-iteration loop. The plan's model tasks each end
with a screenshot-and-eyeball check, not just "it compiles." Capture before/after frames when
refining.

## Testing

- **Unit (vitest):**
  - `grid.ts`: tile↔world round-trip; `canPlace` bounds + overlap + rotation footprint.
  - store actions: buy (coin math, ownership/counts), place/move/remove (layout integrity, return
    to inventory), buyCreature/becomeCreature (ownership, active switch), reset clears all.
  - `catalog.ts` integrity: unique ids, prices > 0, valid footprints, every catalog `modelId`
    resolves in the registry, every creature id has a builder.
- **In-browser (Chrome DevTools MCP):** the vision loop above doubles as visual verification —
  camera look, place/move/remove an item, buy + become a creature, entry greeting, Play emote,
  offline build sanity.
- 3D rendering itself isn't unit-tested; all decision logic lives in the pure helpers that ARE
  tested.

## Build phasing (each phase independently playable)

1. **Scaffold** — add deps; lazy `/home` route + `RequireAvatar`; `<Canvas>` with the perspective
   iso camera rig + lights; procedural `RoomShell` + `TileGrid`; "🏠 Home" nav button. *Result: an
   empty cozy room you can look at.*
2. **Creature** — `grid.ts`; creature builders for the avatar roster (vision-iterated); render the
   active creature with idle/wander/greet; store `ownedCreatures`/`activeCreature` + a "Become"
   picker over owned forms.
3. **Decorate** — Home item catalog + furniture builders (vision-iterated); buy → inventory →
   place on grid with ghost preview, 90° rotate, `canPlace` collision/bounds; move/remove; persist
   layout; the Catalog drawer + Decorate/Play mode toggle.
4. **Shop & polish** — buy new creature forms; Play-mode emotes/particles/SFX; entry greeting;
   post-session "spend at Home" nudge; camera rotate/zoom polish; optional 2D-header avatar sync.

## Open follow-ups (out of scope for v1)

- Optional `.glb` "hero" models if procedural ever feels limiting.
- Room expansion / multiple rooms; wallpaper & flooring as purchasables.
- Daily "creature of the day" or learning-streak-gated unlocks.
