# Toon World Rebuild — Design Spec

**Date:** 2026-10-05 · **Replaces:** the "Cozy Voxel Isle" look (2026-06-18) · **Scope:** the 3D World (`/world`), the Home room (`/home`), all 12 creatures and 16 accessories.

## Decisions (from the owner)
- **Art style:** soft toon low-poly — smooth, rounded, low-poly shapes; flat pastel colors with soft cel shading (3–4 light bands); gentle dark outlines on characters, buildings and big props. Think *A Short Hike* / *Animal Crossing*: cozy, readable, bright.
- **Models:** built in code (procedural R3F components). No `.glb`/texture downloads — the offline single-file build must keep working.
- **Scope:** World + Home room + creatures + accessories share one toon toolkit so the avatar matches its world.
- **Layout:** redesigned island (below). Gameplay mechanics are kept.

## What stays (mechanics)
`useWanderWalk` (flat walk plane at y=0, dt clamp, sub-steps), `collision.ts`, NPC proximity → `useWorldUi.activeNpc` → `WorldHud`/`WorldPanel` (in-world stage panel, hubs), `hubContent.ts`, building inside-detection + camera-facing wall/roof fade, return-to-World + return spot, `useStarterCreature`, `CreatureAccessories` slot/anchor system (`anchors.ts`), Home placement/grid/occupancy logic and HUD. The walkable ground stays **flat at y = 0** (height lives in cliffs, mountains, rocks — all non-walkable).

## What goes
The voxel toolkit (`src/world/voxel/*`), `Decor.tsx`, `WorldGround.tsx`, the old `WorldEnvironment.tsx` post-processing stack (N8AO/bloom/SMAA — too heavy for family laptops, and toon doesn't need AO), every `areas/*.tsx`, the voxel NPC characters, and the voxel/rounded-box look of creatures, accessories, furniture and the room. `@react-three/postprocessing` / `postprocessing` are removed.

---

## Toon toolkit — `src/toon/` (shared by World and Home)

| File | Exports |
|---|---|
| `palette.ts` | `TOON` — named pastel colors: grass, grassLight, grassDark, meadow, path, pathEdge, sand, sandWet, water, waterDeep, foam, rock, rockLight, rockDark, cliff, cliffDark, dirt, wood, woodDark, bark, leaf, leafLight, leafDark, pine, blossom, roofRed, roofBlue, roofTeal, roofPlum, wallCream, wallWarm, brick, snow, flowerRed/Yellow/Pink/Purple/White, gold, lantern, glow, outline, skin tones. Use these first; small raw accent hexes are fine. |
| `materials.ts` | `toonGradient()` (cached 4-band `DataTexture`, nearest filter), `toonMaterial(color, opts?)` (cached `MeshToonMaterial` per color/opacity/emissive — **reuse, never `new` per render**), `OUTLINE` defaults. |
| `shapes.tsx` | Mesh primitives that all take `{ position?, rotation?, scale?, color, outline?, castShadow?, receiveShadow?, opacity?, emissive? }`: `TBox` (rounded box), `TBlob` (low-poly icosphere — foliage, clouds, bodies), `TSphere`, `TCyl` (cylinder/frustum, `radiusTop`, `radiusBottom`, `height`, `segments`), `TCone`, `TCapsule`, `TTorus`. `outline` adds a drei `<Outlines>` inverted hull (thin, warm-dark). Outline characters, buildings and big landmarks; **don't** outline tiny props or instanced scatter. |
| `props.tsx` | Reusable toon props: `Tree` (`round`/`pine`/`blossom`/`fruit`/`palm`), `Bush`, `Rock`, `Boulder`, `FlowerPatch`, `GrassTuft`, `Mushroom`, `Fence`, `Lamp` (warm glow), `Signpost`, `Bench`, `Crate`, `Barrel`, `Log`, `Stump`, `Cloud`. All deterministic from a `seed`. |
| `Scatter.tsx` | `ScatterTrees` / `ScatterBlobs` — instanced toon scatter for many copies (one draw call per part). |

Rules: low segment counts (6–12 radial), pastel colors, **one cached material per color**, shadows only on meaningful casters (trees, buildings, characters), no per-frame allocation, no `setState` in `useFrame`.

## Environment
`WorldEnvironment`: gradient sky dome (warm horizon → soft blue zenith) + a few drifting toon clouds, sky-matched `fog`, hemisphere fill + warm directional key with soft PCF shadows (one 2048 map covering the island), gentle ambient. **No post-processing.** Ocean: a large toon water plane around the island with soft animated foam rings at the shore.

## The island (redesign)
A rounded, organic island with a soft beveled grass rim and a chunky cliff skirt (dirt → rock bands) over a pastel ocean. Coast radius ≈ 36–38 (lobed); walkable area is a circle of **radius 31.5** (a `bounds` collider). World units: 1 = 1 Home tile.

### Districts and coordinates (x right, z toward the camera; camera sits at +x,+z looking toward −x,−z)

**Town (center).** Plaza (paved disc r = 6) at **(0, 2)** with a **fountain** at (0, 2.5) (collider r = 1.6).
| Place | Center | Size | Door (+z wall) | NPC |
|---|---|---|---|---|
| House (player's room inside) | (0, −10) | 10 | (0, −5) | — |
| Schoolhouse (hub) | (−12, −6) | 6 | (−12, −3) | (−12, −1.8) |
| Library (hub) | (12, −6) | 6 | (12, −3) | (12, −1.8) |

Spawn: **(0, −3.5)** (just outside the House door). Return spot overrides it.

**River.** Rises at Fraction Falls' pool and runs east along the north of town to the Data Delta and out to the east coast. Centerline: (−21, −15) → (−13, −18) → (−5, −19) → (5, −19) → (13, −18) → (21, −15) → (30.5, −15), then pours over the east cliff. Width 3, recessed water with sandy banks. Not walkable (circle colliders along it) **except** two flat plank bridges at **x = −7** and **x = 7** (railings are colliders).

**Subject areas** (each: a landmark + an NPC on a small round stage on its town-facing side, signpost, lamp; keep-out radius ≈ 5.5 for scatter):
| Zone id | District | Center | NPC |
|---|---|---|---|
| fraction-falls | Math West | (−24, −12) | (−20, −9) |
| division-dunes | Math West | (−26, 0) | (−21.5, 0) |
| multiplication-mesa | Math West | (−22, 12) | (−18, 9.5) |
| tower-battlefront | South | (−12, 22) | (−10, 18) |
| word-problem-woods | Story South | (2, 25) | (1, 20.5) |
| writing-workshop *(building, size 6)* | Story South | (15, 20) | door (15, 23) → NPC (15, 24.2) |
| reading-reef *(beach)* | Story East | (25, 8) | (21, 6) |
| measurement-marsh | Science East | (26, −4) | (21.5, −3) |
| data-delta *(at the river mouth)* | Science East | (22, −11) | (19, −8.5) |
| geometry-grove *(north bank)* | North | (13, −26) | (12, −22.5) |
| science-summit *(mountain, north edge)* | North | (0, −28) | (0, −23.5) |
| place-value-plateau *(north bank)* | North | (−13, −26) | (−12, −22.5) |

**Paths.** Flat toon paths (sandy, soft edge) from the plaza to every NPC; the three north areas are reached over the bridges. Paths and the river are data in `worldLayout.ts` (`WORLD_PATHS`, `RIVER`) so ground, scatter and colliders agree.

**Scatter.** Deterministic instanced trees/bushes/rocks/flowers fill the land outside keep-outs (areas, town, paths, river banks, bridges), denser groves toward the coast, a few meadow flower fields, clouds overhead.

## Buildings
`Building` keeps its API (`id, cx, cz, size, doorWidth, wall, roof`) and fade contract (camera-facing +x/+z walls and roof fade when inside) but is rebuilt as a toon cottage: rounded wall slabs with a beveled foundation, warm window glow, a door frame, a smooth pitched roof (two sloped slabs + ridge cap, soft eaves overhang) and a chimney; all outlined.

## NPCs
`Npc` keeps proximity/prompt behavior and gains a `children` slot for the character (each area authors its own character next to its landmark). Base: a round stone stage + a bobbing glowing "!" marker. Characters: rounded toon animals/people, outlined, ~1 unit tall.

## Home
Room shell (soft walls with baseboard + window, wood floor planks, rug-friendly), lights tuned for toon, tile grid unchanged. All 28 furniture models, 12 creatures (keep ids, rough size ≈ 1 unit tall, same anchor *meaning*: head top, face front at eye level, back/shoulders, front of torso) and 16 accessories rebuilt with the toon kit. `CREATURE_ANCHORS` are re-measured to the new models (tests require a full set per creature).

## Verification
- Unit: layout integrity (zone ids, doors, unique ids), every NPC reachable on foot from spawn (grid search vs all colliders), river blocks except at bridges, nothing placed outside the walk bounds, anchors complete.
- Visual: `/world?studio=<areaId>` renders one area (orbit camera) and `/world?studio=all` a top-down overview; `/home?studio=creatures|furniture|accessories` galleries. Screenshot-driven iteration (headless Chromium with `--use-gl=angle --use-angle=swiftshader`).
- Perf: no post-processing; instancing for scatter; cached materials; shadows from the key light only.
