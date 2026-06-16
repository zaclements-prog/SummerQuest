# SummerQuest "Accessories" — 3D creature cosmetics

**Date:** 2026-06-16
**Status:** Approved design, pending implementation plan

## Context

The Home feature lets a player "become" one of 12 procedural low-poly avatar-creatures that live
in a 3D room. The game still ships an older **2D emoji-cosmetic** shop (`lib/cosmetics.ts` +
`ShopScreen`) whose items render as an emoji sticker next to the avatar in the header — a leftover
from before the 3D world.

This feature replaces that with **3D accessories** the player buys with coins and equips on their
creature: hats, glasses, wings, and clothes. They appear on whichever creature you've become and
move with it. The intended outcome: a richer, more aspirational cosmetic coin-sink that fits the 3D
Home, and the retirement of the now-redundant 2D emoji shop.

## Decisions (from brainstorming)

- **Replace** the 2D emoji cosmetics entirely (remove the header sticker, the `/shop` screen, and
  the `cosmetics` store fields). No badge or other system depends on cosmetics (verified).
- **Global** equip: the equipped set applies to whichever creature is active.
- **~16 accessories** across **4 slots** (`head`, `face`, `back`, `body`); wear one per slot at once.
- **Clothes** are small, readable pieces (bowtie, scarf, cape, simple hero outfit) — not per-creature
  tailored garments.
- **Anchor approach: a central anchor map** keyed by creature id (the cleanest of the three options).

## Goals

1. Buy + equip 3D accessories that sit correctly on all 12 creatures and animate with them.
2. ~16 procedural accessory models across head/face/back/body.
3. Buy & equip inside the Home (a "Style" tab) so the creature wears them live.
4. Cleanly retire the 2D emoji cosmetic system.

## Non-Goals

- No per-creature outfits (equip is global).
- No imported assets (procedural only — keeps the offline single-file build working).
- No new currency; reuse `coins`/`spendCoins`.
- No wall/room interaction — accessories attach to the creature only.

## Key existing code to reuse / integrate

- `src/home/world/AvatarCreature.tsx` — renders the active creature in an `inner` group that
  bobs/waddles/walks; accessories mount inside it.
- `src/home/models/creatures/*.tsx` — the 12 builders (their head/body positions inform anchors).
- `src/home/models/parts.tsx` — exports `Wing` (flapping). Wing accessories reuse this.
- `src/home/models/registry.tsx` — `_coverage` + builder-map pattern to mirror for accessories.
- `src/lib/home/catalog.ts` + the Catalog drawer tabs — the data + buy/equip UI pattern to mirror.
- `src/store/progress.ts` — `coins`, `spendCoins`, persist, `resetPlayer`.

## Architecture

### Slots & anchors

- **Slots:** `head` (hats), `face` (glasses), `back` (wings/capes), `body` (bowtie/scarf/outfit).
- **`src/home/models/anchors.ts`** — single source of truth:
  ```ts
  export type Slot = 'head' | 'face' | 'back' | 'body'
  export interface AnchorSet {
    head: [number, number, number]
    face: [number, number, number]
    back: [number, number, number]
    body: [number, number, number]
    scale: number // sizes accessories to the creature (small fox vs big dragon)
  }
  export const CREATURE_ANCHORS: Record<string, AnchorSet> // one per creature id
  export function anchorsFor(creatureId: string | null): AnchorSet // safe fallback
  ```
  Each anchor is a local position on the creature (the `inner` group's space). Vision-tuned per
  creature — including the special ones (frog/owl/octopus get a head anchor on their dome/top, a
  face anchor on the front). A safe default `AnchorSet` is returned for an unknown id.

### Accessory models + registry

- **`src/home/models/accessories/*.tsx`** — one procedural builder per accessory, authored so its
  natural origin is the attach point (a hat's brim at y≈0 so it sits ON the head anchor; glasses
  centered at the eyes; wings rooted at the shoulder; body items centered at the torso). Flat
  low-poly, ≈4–10 meshes each.
- **`src/home/models/accessoryRegistry.ts`** — `accessoryBuilder(modelId)` → builder (fallback to a
  tiny marker), plus `_coverage` for tests. (Kept separate from the furniture/creature registry to
  stay focused.)
- Wing accessories (`back` slot) flap by composing the existing `Wing` part.

### Renderer

- **`src/home/world/CreatureAccessories.tsx`** — reads `equippedAccessories` (per slot) and the
  active creature's `AnchorSet`; for each non-null slot, renders the accessory's builder at the
  slot anchor, scaled by `anchors.scale`. Mounted **inside** `AvatarCreature`'s `inner` group so
  accessories inherit the bob/waddle/walk and the WASD motion.
- `AvatarCreature` change is minimal: add `<CreatureAccessories />` inside `<group ref={inner}>`.

### Store (replace cosmetics)

`src/store/progress.ts`:
- **Remove:** `ownedCosmetics`, `equippedCosmetic`, `buyCosmetic`, `equipCosmetic` (state, actions,
  initial values, and their lines in `resetPlayer`).
- **Add:** `ownedAccessories: string[]`, `equippedAccessories: Record<Slot, string | null>`
  (initialized `{ head: null, face: null, back: null, body: null }`), and actions:
  - `buyAccessory(id, price) => boolean` (mirror `buyHomeItem`; no double-charge if owned).
  - `equipAccessory(id)` — looks up the accessory's slot, sets that slot to `id`, or clears it if
    `id` is already equipped (toggle).
  - `unequipSlot(slot)` — sets the slot to null.
  - `resetPlayer` clears `ownedAccessories` and resets `equippedAccessories` to all-null.

### Catalog

- **`src/lib/home/accessories.ts`** — `ACCESSORIES: Accessory[]` where
  `Accessory = { id, name, slot: Slot, price, modelId }`, plus `accessoryById(id)`. Starter set
  (~16): hats (cap, top hat, party hat, crown), face (sunglasses, round glasses, eye mask), back
  (angel wings, bat wings, cape), body (bowtie, scarf, hero outfit), and a few extras to reach ~16.

### HUD — the "Style" tab

- Add a **"Style"** tab to `src/home/hud/CatalogDrawer.tsx` (alongside Furniture/Decor/Creatures).
  It lists `ACCESSORIES` grouped by slot; each card shows the name; **Buy** (`buyAccessory`) when
  unowned, **Equip/Equipped** toggle (`equipAccessory`) when owned. Reflects `ownedAccessories` /
  `equippedAccessories`. The creature in the room updates live.

### Retire the 2D cosmetics

- Delete `src/lib/cosmetics.ts` and `src/screens/ShopScreen.tsx`.
- `src/App.tsx`: remove the `ShopScreen` import and the `/shop` route.
- `src/screens/WorldMap.tsx`: remove the "🛍️ Shop" nav link.
- `src/components/AppShell.tsx`: remove the equipped-cosmetic emoji shown next to the avatar (and
  its `cosmeticById` import).
- Confirm no remaining references (`grep -r cosmetic src`). Tests/badges don't depend on it.

## Data flow

```
learning ──addCoins──▶ coins
Style tab buy ──buyAccessory──▶ spendCoins + ownedAccessories
Style tab equip ──equipAccessory──▶ equippedAccessories[slot]
active creature + equippedAccessories ──▶ CreatureAccessories renders builders at anchorsFor(creature)
  (mounted in AvatarCreature.inner → moves with bob/waddle/walk)
all persisted via the existing zustand persist
```

## 3D authoring workflow (vision-in-the-loop) — REQUIRED

Anchors and accessory models must be tuned by **looking at them**, and crucially **on more than one
creature**. For each accessory: build it, equip it, and screenshot it on a **small** creature (fox),
a **big** one (dragon), and a **weird** one (octopus or owl) via the Chrome DevTools MCP; adjust the
model and the per-creature anchors until it sits right on all of them. The dev model studio can be
extended with an `?studio=accessories` view (each accessory shown on a sample creature) to review
the set at once. Iterate until clean.

## Testing

- **Unit (vitest):**
  - store: `buyAccessory` (coins, ownership, no double-charge), `equipAccessory` (slot set, toggle
    off, replace within slot), `unequipSlot`, `resetPlayer` clears.
  - `accessories.ts` integrity: unique ids, prices > 0, valid `slot`, every `modelId` resolves in
    the accessory registry.
  - `anchors.ts` integrity: every creature id in `CREATURES` has an `AnchorSet` with all four
    anchors and a positive `scale`; `anchorsFor(unknown)` returns the fallback.
  - removal: a guard test or a grep step confirming no `cosmetic` references remain.
- **In-browser (Chrome DevTools MCP):** the vision loop above; plus buy → equip → see it on the
  creature → walk around (accessory moves with it) → swap creature (accessory follows) → reload
  (persists). Offline single-file build still succeeds.

## Build phasing (each phase independently testable)

1. **Data layer + retire 2D cosmetics** — store fields/actions, `accessories.ts`,
   `accessoryRegistry.ts` (with fallback), and remove cosmetics.ts/ShopScreen/route/nav/header. Unit
   tests green; app builds with no cosmetic refs.
2. **Anchors + renderer + first accessories** — `anchors.ts` for all 12 creatures; `CreatureAccessories`
   mounted in `AvatarCreature`; author a hat + sunglasses + wings as the first models; vision-tune
   anchors across fox/dragon/octopus.
3. **Remaining accessory models** — author the rest to ~16; register; vision-review the set.
4. **Style tab** — buy/equip/unequip UI in the catalog drawer; live updates on the creature.
5. **Polish & verify** — wing flap, final anchor tuning, full test/lint/build + offline build.

## Out of scope (future)
- Per-creature outfits; accessory "sets"/bundles; seasonal/limited cosmetics.
- Reflecting accessories on the 2D header avatar (the 2D cosmetic surface is being retired).
