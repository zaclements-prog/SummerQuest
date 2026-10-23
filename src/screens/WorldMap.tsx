import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { curriculum, zoneStages, zoneTitle, type Zone } from '../curriculum'
import { useProgress, zoneStars } from '../store/progress'
import { sfx } from '../lib/sound'
import { computeBadges, type BadgeStatus } from '../lib/badges'
import { todayStr } from '../lib/daily'
import { findNextTarget } from '../lib/continueTarget'
import DailyGoalCard from '../components/DailyGoalCard'
import { Button, Celebration, Medallion, TONES, toneOf, type Tone } from '../components/ui'
import IslandArt from '../components/map/IslandArt'
import { ZONE_SPOTS, toPct } from '../components/map/islandMap'
import { useWorldUi } from '../world/useWorldUi'
import { hatchedPets, petStages } from '../lib/pets/growth'
import { PETS } from '../lib/pets/catalog'
import type { GradeLevel } from '../lib/gradeTiers'
import { isZoneSleeping, listenGrade, SLEEPING_LINE, zoneNameVoice } from '../lib/listenNav'
import { guide } from '../guide/store'
import { SayAgainButton } from '../guide/SayAgainButton'
import { ListenIconButton } from '../components/listen/ListenIconButton'
import { SleepingBadge } from '../components/listen/ListenSleeping'
import '../components/listen/listen.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

const maxStarsOf = (zone: Zone, grade: GradeLevel | null | undefined) =>
  zoneStages(zone, grade).reduce((s, st) => s + st.starsToEarn, 0)

// Marker sizing in container units: the map box is a CSS size container whose
// width is 100 world units, so 1cqw === 1 world unit (see islandMap.ts).
const MEDAL = 'clamp(40px, 8.4cqw, 80px)'

export default function WorldMap() {
  const zones = useProgress((s) => s.zones)
  const stats = useProgress((s) => s.stats)
  const totalCoinsEarned = useProgress((s) => s.totalCoinsEarned)
  const seenBadges = useProgress((s) => s.seenBadges)
  const markBadgesSeen = useProgress((s) => s.markBadgesSeen)
  const dailyDone = useProgress((s) => s.dailyClaimedDate) === todayStr()
  const grade = useProgress((s) => s.player?.grade)

  const badges = useMemo(
    () => computeBadges({ zones, stats, totalCoinsEarned, grade }),
    [zones, stats, totalCoinsEarned, grade],
  )
  const earned = badges.filter((b) => b.earned)
  const lessonsDone = useProgress((s) => s.lessonsDone)
  const hatched = useMemo(() => hatchedPets(petStages(zones, lessonsDone, grade)).length, [zones, lessonsDone, grade])

  // Badges earned since the last time the map was opened (computed once, at mount).
  const [celebrating, setCelebrating] = useState<BadgeStatus[]>(() =>
    earned.filter((b) => !seenBadges.includes(b.id)),
  )
  useEffect(() => {
    if (celebrating.length > 0) {
      sfx.victory()
      markBadgesSeen(earned.map((b) => b.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Clear the "entered from world" flag so zones entered from the 2D map never bounce to /world.
  useEffect(() => { useWorldUi.getState().setEnteredFromWorld(false) }, [])

  // Next-stage deep-link (computed after hooks)
  const nextTarget = useMemo(() => findNextTarget(zones, grade), [zones, grade])
  const continueHref = nextTarget ? `/zone/${nextTarget.zoneId}` : null
  const nextZone = nextTarget ? curriculum.zones.find((z) => z.id === nextTarget.zoneId) : undefined

  // K–1 (voice-first): the open places stand out, sleeping ones doze; a tap says the name.
  const listen = listenGrade(grade)
  // (K–1: how many places are open decides how big their markers can be)
  const openListenZones = listen ? curriculum.zones.filter((z) => z.available && !isZoneSleeping(z, grade)).length : 0
  const nextZoneId = nextTarget?.zoneId ?? null
  const explainMap = () => void guide.show({ voice: { line: 'k-nav/mapHelp' }, target: nextZoneId ? `map-${nextZoneId}` : null, cue: 'bright' })
  const explainRef = useRef(explainMap)
  useEffect(() => {
    explainRef.current = explainMap
  })
  useEffect(() => {
    if (!listen) return
    // (after the badge celebration, if one is up)
    if (celebrating.length > 0) return
    const t = window.setTimeout(() => explainRef.current(), 400)
    return () => {
      window.clearTimeout(t)
      guide.clear({ forget: true })
    }
  }, [listen, celebrating.length])

  return (
    <div className="flex-1 flex flex-col px-4 pt-5 pb-8 sm:px-6">
      {/* One column on tablets (actions → map → daily goal); on wide screens the
          actions and goal sit in a side column and the map fills the right. */}
      <div className="w-full max-w-[90rem] mx-auto grid gap-5 lg:gap-x-6 lg:grid-cols-[21rem_minmax(0,1fr)] xl:grid-cols-[23rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] items-start">
        {listen ? (
          // K–1: pictures only — the World, 🔊, pets and home
          <div className="flex flex-wrap items-center gap-3 lg:col-start-1 lg:row-start-1" data-listen-map="">
            <ListenIconButton icon="🌍" label="Back to the World" to="/world" tone="sun" size="lg" />
            <SayAgainButton onPress={explainMap} label="What do I do here?" />
            <ListenIconButton icon="🐾" label="Pets" to="/pets" />
            <ListenIconButton icon="🏠" label="Home" to="/home" />
          </div>
        ) : (
        <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <div>
            <h1 className="kid-text font-bold text-4xl sm:text-5xl text-sky leading-none">
              Island Map
            </h1>
            <p className="kid-text text-lg text-ink-700 mt-1.5">
              Tap a place on the island to start a quest
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
            <Button variant="primary" size="lg" to="/world" className="w-full justify-center">
              <span aria-hidden="true">🌍</span> Back to the World
            </Button>
            {continueHref && (
              <Button variant="secondary" size="lg" to={continueHref} className="w-full justify-center">
                ▶ Continue your quest
              </Button>
            )}
          </div>

          <nav aria-label="More places" className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-4 gap-2.5">
            <NavTile to="/daily" icon="🌟" tone="quest" label={dailyDone ? 'Daily ✓' : 'Daily'} />
            <NavTile to="/tutor" icon="📚" tone="ocean" label="Tutor" />
            <NavTile to="/focus" icon="🎯" tone="island" label="This Week" />
            <NavTile to="/badges" icon="🏅" tone="monster" label={`Badges ${earned.length}/${badges.length}`} />
            <NavTile to="/progress" icon="📈" tone="correct" label="Progress" />
            <NavTile to="/home" icon="🏠" tone="wrong" label="Home" />
            <NavTile to="/pets" icon="🐾" tone="island" label={`Pets ${hatched}/${PETS.length}`} />
          </nav>
        </div>
        )}

        {/* ── The illustrated island ─────────────────────────────────────── */}
        <section
          className="min-w-0 flex justify-center lg:col-start-2 lg:row-start-1 lg:row-span-2"
          aria-label="Island map"
        >
          <div className="map-fit">
            <div className="relative rounded-[2rem] border-[3px] border-line bg-ocean-400 shadow-card overflow-hidden">
              <div className="relative w-full @container" style={{ aspectRatio: '100 / 90' }}>
                <IslandArt />
                {curriculum.zones.map((zone) =>
                  listen ? (
                    <ListenZoneMarker key={zone.id} zone={zone} isNext={zone.id === nextTarget?.zoneId} crowded={openListenZones > LISTEN_ROOMY_MAX} />
                  ) : (
                    <ZoneMarker key={zone.id} zone={zone} isNext={zone.id === nextTarget?.zoneId} layer="medal" />
                  ),
                )}
                {/* every name on top of every medal and star count, so no neighbour's ★ chip hides a name */}
                {!listen &&
                  curriculum.zones.map((zone) => (
                    <ZoneMarker key={`${zone.id}-label`} zone={zone} isNext={zone.id === nextTarget?.zoneId} layer="label" />
                  ))}
              </div>
            </div>

            {/* Small screens: the markers get too tiny to label, so list the places too. */}
            {!listen && (
            <ul className="sm:hidden mt-4 grid grid-cols-2 gap-2.5">
              {curriculum.zones.map((zone) => (
                <li key={zone.id}>
                  <ZoneListItem zone={zone} />
                </li>
              ))}
            </ul>
            )}
            {nextZone && (
              <p className="sr-only">Next up: {zoneTitle(nextZone, grade)}</p>
            )}
          </div>
        </section>

        {/* ── Today's goal ───────────────────────────────────────────────── */}
        {!listen && (
        <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-2">
          <DailyGoalCard />
          <p className="kid-text text-center lg:text-left text-ink-700 text-sm">
            {earned.length > 0
              ? `🏅 ${earned.length} badge${earned.length > 1 ? 's' : ''} earned — keep exploring!`
              : 'Explore every island to earn badges and level up!'}
          </p>
        </div>
        )}
      </div>

      {/* ── Badge celebration overlay ──────────────────────────────────── */}
      <Celebration
        open={celebrating.length > 0}
        onClose={() => setCelebrating([])}
        title={`New ${celebrating.length > 1 ? 'Badges' : 'Badge'}! 🏅`}
      >
        <div className="flex flex-wrap justify-center gap-3 my-2">
          {celebrating.map((b) => (
            <div key={b.id} className="flex flex-col items-center gap-1 w-24">
              <Medallion tone="quest" size="lg">
                {b.emoji}
              </Medallion>
              <div className="kid-text text-sm text-ink-700">{b.title}</div>
            </div>
          ))}
        </div>
      </Celebration>
    </div>
  )
}

// ── Quick-link tile ───────────────────────────────────────────────────────────

function NavTile({ to, icon, label, tone }: { to: string; icon: string; label: string; tone: Tone }) {
  return (
    <Link
      to={to}
      onClick={() => sfx.click()}
      className={[
        'group flex flex-col items-center justify-center gap-1 min-h-[5.25rem] px-1.5 py-2 rounded-[1.25rem]',
        'bg-paper border-[3px] border-line shadow-ledge text-center',
        'transition-[translate,box-shadow,background-color] duration-100 ease-out',
        'hover:-translate-y-0.5 hover:bg-cream-50 active:translate-y-[3px] active:shadow-ledge-sm',
        'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70',
      ].join(' ')}
    >
      <Medallion tone={tone} size="sm">
        {icon}
      </Medallion>
      <span className="kid-text text-sm leading-tight text-ink-900">{label}</span>
    </Link>
  )
}

// ── Map marker ────────────────────────────────────────────────────────────────

/**
 * A place on the map, drawn in two layers: `medal` (the medal, its ★ count and
 * the "Next!" flag; the link a screen reader hears) and `label` (the name, at
 * the same spot under an empty medal-sized gap). All names are drawn after all
 * medals, so a neighbour's star chip never covers a name.
 */
function ZoneMarker({ zone, isNext, layer }: { zone: Zone; isNext: boolean; layer: 'medal' | 'label' }) {
  const grade = useProgress((s) => s.player?.grade)
  const spot = ZONE_SPOTS[zone.id]
  if (!spot) return null
  const tone = TONES[toneOf(zone.themeColor)]
  const stars = zoneStars(zone.id, grade)
  const maxStars = maxStarsOf(zone, grade)
  const done = maxStars > 0 && stars >= maxStars
  const title = zoneTitle(zone, grade)

  const medal = (
    <span className="relative block" style={{ width: MEDAL, height: MEDAL }}>
      {/* soft ground shadow */}
      <span className="absolute left-[8%] right-[8%] -bottom-[10%] h-[24%] rounded-[50%] bg-line/25" aria-hidden="true" />
      <span
        className={[
          'absolute inset-0 rounded-full border-[3px] border-line grid place-items-center',
          'shadow-ledge transition-[translate,box-shadow] duration-100 ease-out',
          zone.available
            ? 'group-hover:-translate-y-1 group-hover:shadow-[0_6px_0_0_var(--color-line)] group-active:translate-y-[3px] group-active:shadow-ledge-sm group-focus-visible:ring-4 group-focus-visible:ring-paper'
            : 'grayscale-[0.7] opacity-80',
        ].join(' ')}
        style={{
          background: zone.available
            ? `radial-gradient(circle at 50% 42%, #fffaf0 0 54%, ${tone.hex} 55% 100%)`
            : '#e6dfcf',
        }}
      >
        <span className="absolute left-[20%] top-[10%] w-[30%] h-[14%] rounded-full bg-white/70 -rotate-12" aria-hidden="true" />
        <span className="relative leading-none" style={{ fontSize: 'clamp(20px, 4.3cqw, 42px)' }} aria-hidden="true">
          {zone.available ? zone.emoji : '🔒'}
        </span>
      </span>

      {/* star count */}
      {zone.available && maxStars > 0 && (
        <span
          className={[
            'absolute -top-[8%] -right-[34%] hidden sm:flex items-center gap-0.5 rounded-full border-2 border-line px-1.5',
            'kid-text leading-[1.35] tabular-nums shadow-ledge-sm',
            done ? 'bg-quest-400' : 'bg-paper',
          ].join(' ')}
          style={{ fontSize: 'clamp(10px, 1.35cqw, 14px)' }}
          aria-hidden="true"
        >
          <span className="text-quest-600">★</span>
          {stars}/{maxStars}
        </span>
      )}

      {/* "next" flag (top-left, mirroring the star count) */}
      {isNext && (
        <span className="absolute -top-[14%] -left-[42%] animate-bob" aria-hidden="true">
          <span
            className="block kid-text whitespace-nowrap rounded-full bg-wrong-400 border-2 border-line px-1.5 leading-[1.35] shadow-ledge-sm text-ink-900 -rotate-6"
            style={{ fontSize: 'clamp(10px, 1.35cqw, 14px)' }}
          >
            Next!
          </span>
        </span>
      )}
    </span>
  )

  const label = (
    <span
      className={[
        'hidden sm:block mt-[0.5cqw] whitespace-nowrap text-center kid-text leading-snug text-ink-900',
        'rounded-full border-2 border-line px-[0.7cqw] shadow-ledge-sm',
        zone.available ? (isNext ? 'bg-quest-200' : 'bg-paper') : 'bg-cream-200 text-ink-700',
      ].join(' ')}
      style={{ fontSize: 'clamp(11px, 1.75cqw, 16px)' }}
    >
      {title}
    </span>
  )

  const at = { ...toPct(spot), marginTop: `calc(${MEDAL} / -2)` }
  if (layer === 'label') {
    // (the medal's link is what's announced; the name is a mouse/finger target only)
    return (
      <div className="absolute -translate-x-1/2 flex flex-col items-center pointer-events-none" style={at} aria-hidden="true" data-map-label={zone.id}>
        <span className="block" style={{ width: MEDAL, height: MEDAL }} />
        {zone.available ? (
          <Link to={`/zone/${zone.id}`} onClick={() => sfx.enter()} tabIndex={-1} className="pointer-events-auto outline-none">
            {label}
          </Link>
        ) : (
          label
        )}
      </div>
    )
  }

  return (
    <div
      className="absolute -translate-x-1/2 flex flex-col items-center"
      style={at}
      data-map-medal={zone.id}
    >
      {zone.available ? (
        <Link
          to={`/zone/${zone.id}`}
          onClick={() => sfx.enter()}
          className="group flex flex-col items-center outline-none"
          aria-label={`${title}: ${stars} of ${maxStars} stars`}
        >
          {medal}
        </Link>
      ) : (
        <div
          className="flex flex-col items-center cursor-not-allowed"
          aria-disabled="true"
          aria-label={`${title}: locked`}
          role="img"
        >
          {medal}
        </div>
      )}
    </div>
  )
}

// ── K–1 map marker ────────────────────────────────────────────────────────────

/** K–1 marker sizes: an open place is big and glows; a sleeping one is small (its tap area stays 64px). */
const MEDAL_OPEN = 'clamp(64px, 12.5cqw, 112px)'
const MEDAL_SLEEP = 'clamp(40px, 6.6cqw, 60px)'
/**
 * Up to this many open places, they're drawn big. With more open (neighbours
 * on the island sit about 12% of the map apart), they take the 2nd–4th grade
 * marker size so they don't cover each other; the tap area stays 64px and the
 * names (for grown-ups) show only on a map wide enough for them.
 */
const LISTEN_ROOMY_MAX = 4
const MEDAL_OPEN_CROWDED = MEDAL

/**
 * A place on the K–1 map. Open (it has K–1 games): big, glowing, its K–1
 * name under it; a tap says the name ("Counting Mesa!") and goes there.
 * Sleeping: small, dimmed, dozing; a tap says "This place is still sleeping.
 * Come back soon!" and goes nowhere.
 */
function ListenZoneMarker({ zone, isNext, crowded = false }: { zone: Zone; isNext: boolean; crowded?: boolean }) {
  const navigate = useNavigate()
  const grade = useProgress((s) => s.player?.grade)
  const spot = ZONE_SPOTS[zone.id]
  const going = useRef(false)
  if (!spot) return null
  const sleeping = !zone.available || isZoneSleeping(zone, grade)
  const tone = TONES[toneOf(zone.themeColor)]
  const title = zoneTitle(zone, grade)
  const size = sleeping ? MEDAL_SLEEP : crowded ? MEDAL_OPEN_CROWDED : MEDAL_OPEN
  const stars = zoneStars(zone.id, grade)
  const maxStars = maxStarsOf(zone, grade)

  async function tap() {
    if (going.current) return
    if (sleeping) {
      sfx.tick()
      void guide.say(SLEEPING_LINE)
      return
    }
    sfx.enter()
    const name = zoneNameVoice(zone.id, grade)
    if (name && !(await guide.say(name))) return // another tap took over
    going.current = true
    navigate(`/zone/${zone.id}`)
  }

  return (
    <div className="absolute -translate-x-1/2 flex flex-col items-center" style={{ ...toPct(spot), marginTop: `calc(${size} / -2)` }}>
      <button
        type="button"
        onClick={() => void tap()}
        data-guide={`map-${zone.id}`}
        data-sleeping={sleeping ? '' : undefined}
        aria-label={sleeping ? `${title}: still sleeping, coming soon` : `${title}: ${stars} of ${maxStars} stars`}
        className="group relative grid place-items-center min-w-16 min-h-16 outline-none rounded-full focus-visible:ring-4 focus-visible:ring-paper"
      >
        <span className="relative block" style={{ width: size, height: size }}>
          {!sleeping && <span className={`absolute -inset-[12%] rounded-full border-[5px] border-quest-300 ${isNext ? 'sq-open-glow' : 'opacity-70'}`} aria-hidden="true" />}
          <span className="absolute left-[8%] right-[8%] -bottom-[10%] h-[24%] rounded-[50%] bg-line/25" aria-hidden="true" />
          <span
            className={[
              'absolute inset-0 rounded-full border-[3px] border-line grid place-items-center shadow-ledge',
              sleeping ? 'grayscale-[0.75] opacity-60' : 'transition-[translate] duration-100 group-active:translate-y-[3px]',
            ].join(' ')}
            style={{ background: sleeping ? '#e6dfcf' : `radial-gradient(circle at 50% 42%, #fffaf0 0 54%, ${tone.hex} 55% 100%)` }}
          >
            <span className="relative leading-none" style={{ fontSize: `calc(${size} * 0.52)` }} aria-hidden="true">
              {zone.emoji}
            </span>
          </span>
          {sleeping && <SleepingBadge className="absolute -top-[30%] -right-[45%] text-[clamp(14px,2.6cqw,24px)]" />}
        </span>
      </button>
      {!sleeping && (
        <span
          className={`${crowded ? 'hidden @[560px]:block' : ''} mt-[0.6cqw] whitespace-nowrap text-center kid-text leading-snug text-ink-900 rounded-full border-2 border-line px-[0.8cqw] shadow-ledge-sm ${isNext ? 'bg-quest-200' : 'bg-paper'}`}
          style={{ fontSize: crowded ? 'clamp(11px, 1.75cqw, 16px)' : 'clamp(12px, 2.1cqw, 19px)' }}
          aria-hidden="true"
        >
          {title}
        </span>
      )}
    </div>
  )
}

// ── Small-screen list row ─────────────────────────────────────────────────────

function ZoneListItem({ zone }: { zone: Zone }) {
  const grade = useProgress((s) => s.player?.grade)
  const stars = zoneStars(zone.id, grade)
  const maxStars = maxStarsOf(zone, grade)
  const inner = (
    <>
      <Medallion tone={zone.available ? toneOf(zone.themeColor) : 'cream'} size="sm">
        {zone.available ? zone.emoji : '🔒'}
      </Medallion>
      <span className="min-w-0">
        <span className="block kid-text text-sm leading-tight text-ink-900">{zone.title}</span>
        {zone.available && (
          <span className="block kid-text text-xs text-ink-700">
            ★ {stars}/{maxStars}
          </span>
        )}
      </span>
    </>
  )
  const cls =
    'flex items-center gap-2 p-2 min-h-[56px] rounded-2xl bg-paper border-2 border-line shadow-ledge-sm'
  return zone.available ? (
    <Link to={`/zone/${zone.id}`} onClick={() => sfx.enter()} className={cls} aria-label={`${zone.title}: ${stars} of ${maxStars} stars`}>
      {inner}
    </Link>
  ) : (
    <div className={`${cls} opacity-70`} aria-label={`${zone.title}: locked`}>
      {inner}
    </div>
  )
}
