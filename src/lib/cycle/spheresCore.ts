/**
 * Pure logic for Cloud Keeper's grade-5 tier, Earth's spheres (5-ESS2-1). No
 * three.js, no DOM. The 2–4 water cycle (cycleCore) is untouched: this mode is
 * chosen only by a stage whose params say `mode: 'spheres'`.
 *
 * The kid carries a traveler, a bit of matter, between four stations, one per
 * sphere. Each leg, Professor Pebble describes what happens to it next ("A
 * maple leaf takes Puff in to make sugar"); the right station is the sphere the
 * traveler moves INTO. Three travelers, one journey each:
 *
 *   Drip   💧 water    ocean → air → living things → air → …
 *   Puff   💨 carbon dioxide   air ⇄ plants and animals, the ocean, rock
 *   Grit   🪨 a grain of minerals   rock → air, water, living things → rock
 */

export const SPHERES = ['geosphere', 'hydrosphere', 'atmosphere', 'biosphere'] as const
export type Sphere = (typeof SPHERES)[number]
export const isSphere = (v: unknown): v is Sphere => typeof v === 'string' && (SPHERES as readonly string[]).includes(v)

export const TRAVELERS = ['water', 'carbon', 'mineral'] as const
export type Traveler = (typeof TRAVELERS)[number]

export const TRAVELER_NAME: Record<Traveler, string> = { water: 'Drip', carbon: 'Puff', mineral: 'Grit' }
export const TRAVELER_ICON: Record<Traveler, string> = { water: '💧', carbon: '💨', mineral: '🪨' }
/** What each traveler is, for the pill ("Drip, a drop of water"). */
export const TRAVELER_WHAT: Record<Traveler, string> = { water: 'a drop of water', carbon: 'a bit of carbon dioxide', mineral: 'a grain of minerals' }
/** Where each journey starts. */
export const TRAVELER_START: Record<Traveler, Sphere> = { water: 'hydrosphere', carbon: 'atmosphere', mineral: 'geosphere' }

export const SPHERE_ICON: Record<Sphere, string> = { geosphere: '⛰️', hydrosphere: '🌊', atmosphere: '☁️', biosphere: '🌳' }
/** The sphere in plain words: what it is made of. */
export const SPHERE_PLAIN: Record<Sphere, string> = {
  geosphere: 'rock and soil',
  hydrosphere: 'water and ice',
  atmosphere: 'the air',
  biosphere: 'living things',
}

/** Wrong-station nudge, a few words: what that station is (so the kid can re-map). */
export const SPHERE_IS: Record<Sphere, string> = {
  geosphere: 'That’s rock and soil!',
  hydrosphere: 'That’s water and ice!',
  atmosphere: 'That’s the air!',
  biosphere: 'That’s living things!',
}

export interface SpheresRouteResult {
  ok: boolean
  /** Where the traveler is after this step (unchanged when wrong). */
  at: Sphere
  /** A few words when wrong, null when right. */
  hint: string | null
}

/** The traveler (now in `at`) is walked onto `station`; the event sends it to `to`. */
export function spheresStep(at: Sphere, to: Sphere, station: Sphere): SpheresRouteResult {
  const ok = station === to
  return { ok, at: ok ? to : at, hint: ok ? null : station === at ? 'It’s already there!' : SPHERE_IS[station] }
}

export interface SpheresSegment {
  traveler: Traveler
  legs: number
  /** Glowing hint to the right station (the first journey only). */
  guide: boolean
}

/**
 * The run: one journey per traveler, water first (guided). `rounds` is the
 * stage's `params.rounds`: 5 → 4 + 3 + 3 legs; more rounds, longer journeys.
 */
export function spheresRunPlan(rounds: number): SpheresSegment[] {
  const extra = Math.min(3, Math.max(0, Math.floor(rounds) - 5))
  return [
    { traveler: 'water', legs: 4, guide: true },
    { traveler: 'carbon', legs: 3 + Math.min(extra, 1), guide: false },
    { traveler: 'mineral', legs: 3 + Math.max(0, extra - 1), guide: false },
  ]
}

export const spheresLegCount = (plan: SpheresSegment[]) => plan.reduce((s, g) => s + g.legs, 0)

/** Which run a Cloud Keeper stage plays: the 2–4 water cycle unless its params ask for the spheres. */
export function cloudKeeperMode(params: Record<string, unknown> | undefined): 'cycle' | 'spheres' {
  return params?.mode === 'spheres' ? 'spheres' : 'cycle'
}
