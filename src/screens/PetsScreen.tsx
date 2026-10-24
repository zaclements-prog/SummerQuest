import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import GLCanvas from '../platform/gl/GLCanvas'
import { canvasQuality, useLowGraphics } from '../world/graphicsQuality'
import PetLineup, { LINEUP_SLOT_SHARE } from '../pets/PetLineup'
import { EggIcon } from '../pets/EggIcon'
import { useProgress } from '../store/progress'
import { useAllPetStatuses } from '../lib/pets/usePets'
import { isPetId, petEmoji, petName } from '../lib/pets/catalog'
import { zoneLessonFor } from '../tutoring/lessons'
import { nextStepText, stageLabel, zoneTitle } from '../lib/pets/copy'
import { growthRank, isSchoolStatus, kidStarsFor } from '../lib/pets/growth'
import type { AnyPetStatus, PetGrowth } from '../lib/pets/growth'
import { focusRows } from '../world/hubContent'
import { PET_STAGES } from '../lib/pets/types'
import { Button, ProgressBar } from '../components/ui'
import { sfx } from '../lib/sound'
import { getZone, zoneTitle as bandZoneTitle } from '../curriculum'
import { isZoneSleeping, listenGrade, zoneNameVoice } from '../lib/listenNav'
import { guide, type GuideStep } from '../guide/store'
import type { GradeLevel } from '../lib/gradeTiers'
import { useListenIntro } from '../components/listen/useListenIntro'
import { ListenIconButton } from '../components/listen/ListenIconButton'
import { SayAgainButton } from '../guide/SayAgainButton'

/** The selected pet when the link doesn't name one: your buddy, else the most grown, else the first. */
function defaultPet(list: AnyPetStatus[], buddy: string | null): string {
  if (buddy && list.some((s) => s.pet.creatureId === buddy)) return buddy
  let best = list[0]
  for (const s of list) if (growthRank(s.stage) > growthRank(best.stage)) best = s
  return best.pet.creatureId
}

/**
 * Progress toward the next stage, as [have, need] (null: nothing to count, like
 * an egg): the zone's stars, or the raven's Daily Challenges + cleared skills.
 */
function stageProgress(s: AnyPetStatus): [number, number] | null {
  if (!s.next || s.next.stage === 'baby') return null
  if (isSchoolStatus(s)) return [Math.min(s.points, s.goal), s.goal]
  return [s.stars, s.next.stage === 'adult' ? s.total : kidStarsFor(s.total)]
}

const chip = 'kid-text inline-flex items-center gap-1 text-sm leading-none rounded-full border-2 border-line px-2.5 py-1.5'

const EMOJI_SIZE: Record<PetGrowth, string> = { egg: 'text-2xl', baby: 'text-2xl', kid: 'text-3xl', adult: 'text-4xl' }

/**
 * The Pets page: the twelve zone pets and the Schoolhouse raven. Pick one to see it in 3D as baby, kid
 * and grown-up (the stages it hasn't reached are silhouettes), what it needs
 * next, and buttons to make it your World buddy, become it (grown-ups), or go
 * learn in its zone. `?pet=<id>` picks the pet to show.
 */
/** "Let's go!" then the place's name ("Counting Mesa!"), the hand on nothing (the page is about to change). */
function goSteps(zoneId: string, grade: GradeLevel | null | undefined): GuideStep[] {
  const name = zoneNameVoice(zoneId, grade)
  return [{ voice: { line: 'k-nav/letsGo' }, dim: false }, ...(name ? [{ voice: name, dim: false }] : [])]
}

export default function PetsScreen() {
  const statuses = useAllPetStatuses()
  const [params, setParams] = useSearchParams()
  const buddy = useProgress((s) => s.buddyPet)
  const active = useProgress((s) => s.activeCreature)
  const owned = useProgress((s) => s.ownedCreatures)
  const grade = useProgress((s) => s.player?.grade)
  const setBuddyPet = useProgress((s) => s.setBuddyPet)
  const becomeCreature = useProgress((s) => s.becomeCreature)
  const navigate = useNavigate()
  const zones = useProgress((s) => s.zones)
  const attempts = useProgress((s) => s.attempts)
  const sessions = useProgress((s) => s.sessions)
  const location = useLocation()
  const gfx = canvasQuality(useLowGraphics())

  const asked = params.get('pet')
  const selectedId = isPetId(asked) ? asked : defaultPet(statuses, buddy)
  const sel = statuses.find((s) => s.pet.creatureId === selectedId) ?? statuses[0]
  const id = sel.pet.creatureId
  const name = petName(id)
  const hatched = statuses.filter((s) => s.stage !== 'egg').length
  const isBuddy = buddy === id
  const isAdult = sel.stage === 'adult'
  const isYou = active === id
  const progress = stageProgress(sel)
  // the Schoolhouse raven grows from This Week's Focus and the Daily Challenge, not a zone
  const school = isSchoolStatus(sel) ? sel : null
  const zonePet = isSchoolStatus(sel) ? null : sel
  // the egg's lesson in the child's band (K–1: its K–1 lesson; a zone without one has none)
  const lessonId = zonePet ? (zoneLessonFor(zonePet.pet.zoneId, grade)?.id ?? null) : null
  // K–1: pictures for the way back and the pet's place; the voice says what this page is
  const listen = listenGrade(grade)
  const explain = useListenIntro('pets', { voice: { line: 'k-nav/petsHelp' } }, listen)
  const petZone = zonePet ? getZone(zonePet.pet.zoneId) : undefined
  // the raven: the trickiest skill on This Week's Focus to practice (K–1 get a picture for it)
  const practiceHref = school ? (focusRows({ zones, attempts, sessions, grade }, 1)[0]?.practiceHref ?? null) : null
  const zoneOpen = !!petZone && !isZoneSleeping(petZone, grade)

  const select = (petId: string) => {
    sfx.click()
    setParams({ pet: petId }, { replace: true })
  }
  // K–1: the pet card's picture buttons say where they go first ("Let's go! Counting Mesa!", "Let's learn something new!")
  // (it goes even if something else starts talking over it; not once this page has gone)
  const here = useRef(true)
  useEffect(() => {
    here.current = true
    return () => {
      here.current = false
    }
  }, [])
  const sayThenGo = (steps: GuideStep[], path: string) => {
    void guide.sequence(steps, { repeatable: false }).then(() => {
      if (here.current) navigate(path)
    })
  }
  // Back to wherever you came from (the World, Home, the map…); a fresh start goes to the World.
  const back = () => {
    sfx.click()
    if (location.key !== 'default') navigate(-1)
    else navigate('/world')
  }

  return (
    <div className="flex-1 flex flex-col px-3 sm:px-5 pt-3 pb-5 short:pt-2 short:pb-3">
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-3 short:gap-2">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {listen ? (
            <>
              <ListenIconButton icon="←" label="Back" onClick={back} tone="sun" />
              <SayAgainButton onPress={explain} label="What do I do here?" />
            </>
          ) : (
          <button
            type="button"
            onClick={back}
            className="kid-text text-ink-900 text-lg inline-flex items-center gap-2 pl-2 pr-4 min-h-12 rounded-full bg-paper border-[3px] border-line shadow-ledge hover:bg-cream-100 active:translate-y-[3px] active:shadow-ledge-sm outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
          >
            <span className="grid place-items-center w-8 h-8 rounded-full bg-quest-300 border-2 border-line text-base leading-none" aria-hidden="true">
              ←
            </span>
            Back
          </button>
          )}
          <h1 className="kid-text font-bold text-3xl sm:text-4xl short:text-3xl text-sky leading-none">My Pets</h1>
          <span className={`${chip} bg-paper ml-auto`}>
            🐣 {hatched} of {statuses.length} hatched
          </span>
        </div>
        {!listen && <p className="kid-text text-lg short:hidden text-ink-700 -mt-1">Learn on the island to hatch your eggs and help your pets grow up!</p>}

        <div className="grid gap-3 short:gap-2 landscape:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] items-start">
          {/* ── The selected pet ───────────────────────────────────────────── */}
          <section aria-label={`${name}, your pet`} className="bg-paper rounded-toon border-[3px] border-line shadow-card p-3 short:p-2.5 flex flex-col gap-2">
            <div className="mx-auto w-[min(100%,27rem)] short:w-[min(100%,23rem)] roomy:w-[min(100%,40rem)] [@media(max-height:25rem)]:w-[min(100%,17rem)]">
              <div
                className="relative aspect-[2/1] w-full rounded-[1.25rem] overflow-hidden border-2 border-line/20"
                style={{ background: 'radial-gradient(120% 95% at 50% 100%, #fff3dc 0%, #fde9d6 34%, #d9effa 72%, #c5e7f8 100%)' }}
              >
                <GLCanvas flat dpr={gfx.dpr} camera={{ fov: 30, position: [0, 1, 5] }} style={{ position: 'absolute', inset: 0 }}>
                  <PetLineup creatureId={id} stage={sel.stage} egg={sel.pet.egg} />
                </GLCanvas>
                {/* name plates on the floor, one in front of each stage */}
                {PET_STAGES.map((s, i) => {
                  const egg = i === 0 && sel.stage === 'egg'
                  const reached = !egg && growthRank(s) <= growthRank(sel.stage)
                  return (
                    <span
                      key={s}
                      className={`${chip} absolute bottom-1.5 -translate-x-1/2 py-1 whitespace-nowrap pointer-events-none ${reached ? 'bg-paper/95' : egg ? 'bg-cream-100/95' : 'bg-ink-700/80 text-white border-line/60'}`}
                      style={{ left: `${50 + (i - 1) * LINEUP_SLOT_SHARE * 50}%` }}
                      aria-hidden="true"
                    >
                      {egg ? '🥚 Egg' : reached ? stageLabel(s) : `🔒 ${stageLabel(s)}`}
                    </span>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="kid-text text-2xl short:text-xl leading-tight text-ink-900">
                <span aria-hidden="true">{petEmoji(id)}</span> {name}
              </h2>
              <span className={`${chip} bg-island-200`}>{sel.stage === 'egg' ? '🥚 ' : ''}{stageLabel(sel.stage)}</span>
              {isBuddy && <span className={`${chip} bg-quest-300`}>⭐ Your buddy</span>}
              {isYou && <span className={`${chip} bg-ocean-200`}>That&apos;s you!</span>}
            </div>
            {!listen && <p className="kid-text text-lg short:text-base leading-snug text-ink-800">{nextStepText(sel)}</p>}
            {progress && (
              <ProgressBar
                value={progress[0]}
                max={progress[1]}
                tone={sel.next?.stage === 'adult' ? 'correct' : 'quest'}
                label={
                  zonePet
                    ? `⭐ Stars in ${listen && petZone ? bandZoneTitle(petZone, grade) : zoneTitle(zonePet.pet.zoneId)}`
                    : '🌟 Daily Challenges + 🎯 cleared skills'
                }
              />
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {sel.stage === 'egg' ? null : isBuddy ? (
                <Button variant="ghost" onClick={() => setBuddyPet(null)}>
                  🏠 Stay home
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => {
                    setBuddyPet(id)
                    sfx.correct()
                  }}
                >
                  ⭐ Make buddy
                </Button>
              )}
              {isAdult &&
                (isYou ? (
                  <Button variant="secondary" disabled>
                    ✓ You&apos;re the {name}!
                  </Button>
                ) : (
                  <Button
                    variant="success"
                    disabled={!owned.includes(id)}
                    onClick={() => {
                      becomeCreature(id)
                      sfx.victory()
                    }}
                  >
                    {petEmoji(id)} Become {name}
                  </Button>
                ))}
              {school ? (
                // the raven: its Schoolhouse practice (K–1: pictures, said first)
                listen ? (
                  <>
                    <ListenIconButton icon="🌟" label="Daily Challenge" onClick={() => sayThenGo([{ voice: { line: 'k-nav/letsGo' }, dim: false }], '/daily')} tone="sun" />
                    {practiceHref && (
                      <ListenIconButton icon="🎯" label="Practice a tricky one" onClick={() => sayThenGo([{ voice: { line: 'k-nav/focusPractice' }, dim: false }], practiceHref)} tone="ocean" />
                    )}
                  </>
                ) : (
                  <>
                    <Button variant={sel.stage === 'egg' ? 'primary' : 'secondary'} to="/focus">
                      🎯 This Week&apos;s Focus
                    </Button>
                    <Button variant="secondary" to="/daily">
                      🌟 Daily Challenge
                    </Button>
                  </>
                )
              ) : listen ? (
                // K–1: the pet's place as a picture (only once it's awake), and its lesson
                <>
                  {zoneOpen && petZone && (
                    <ListenIconButton icon={petZone.emoji} label={`Go to ${bandZoneTitle(petZone, grade)}`} onClick={() => sayThenGo(goSteps(petZone.id, grade), `/zone/${petZone.id}`)} tone="sun" />
                  )}
                  {sel.stage === 'egg' && lessonId && (
                    <ListenIconButton icon="📚" label="Lesson" onClick={() => sayThenGo([{ voice: { line: 'k-nav/lessonTime' }, dim: false }], `/tutor/${lessonId}`)} tone="ocean" />
                  )}
                </>
              ) : (
                <>
                  {zonePet && (
                    <Button variant={sel.stage === 'egg' ? 'primary' : 'secondary'} to={`/zone/${zonePet.pet.zoneId}`}>
                      🗺️ Go to {zoneTitle(zonePet.pet.zoneId)}
                    </Button>
                  )}
                  {sel.stage === 'egg' && lessonId && (
                    <Button variant="secondary" to={`/tutor/${lessonId}`}>
                      📚 Lesson
                    </Button>
                  )}
                </>
              )}
            </div>
            {isBuddy && <p className="kid-text text-base text-ink-700 short:hidden">{name} follows you around the World!</p>}
          </section>

          {/* ── All thirteen: the zone pets, then the Schoolhouse raven ──────── */}
          <section aria-label="All your pets" className="grid grid-cols-3 min-[420px]:grid-cols-4 gap-2">
            {statuses.map((s) => {
              const pid = s.pet.creatureId
              const selected = pid === id
              return (
                <button
                  key={pid}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${petName(pid)}: ${stageLabel(s.stage)}${buddy === pid ? ', your buddy' : ''}`}
                  onClick={() => select(pid)}
                  className={[
                    'relative flex flex-col items-center justify-center gap-0.5 min-h-[5.6rem] short:min-h-[4.9rem] px-1 py-1.5 rounded-[1.1rem] border-[3px] border-line kid-text text-center',
                    'transition-[translate,box-shadow,background-color] duration-100 outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70',
                    selected ? 'bg-quest-200 shadow-ledge -translate-y-0.5' : 'bg-paper shadow-ledge-sm hover:bg-cream-100 active:translate-y-0.5',
                  ].join(' ')}
                >
                  <span className="grid place-items-center h-10 short:h-9">
                    {s.stage === 'egg' ? (
                      <EggIcon shell={s.pet.egg.shell} spot={s.pet.egg.spot} />
                    ) : (
                      <span className={`${EMOJI_SIZE[s.stage]} leading-none`} aria-hidden="true">
                        {petEmoji(pid)}
                      </span>
                    )}
                  </span>
                  <span className="text-sm leading-tight text-ink-900">{petName(pid)}</span>
                  <span className={`text-sm leading-tight ${s.stage === 'egg' ? 'text-ink-600' : 'text-island-800'}`}>{stageLabel(s.stage)}</span>
                  {buddy === pid && (
                    <span className="absolute -top-2 -right-1.5 grid place-items-center w-7 h-7 rounded-full bg-quest-300 border-2 border-line text-sm" aria-hidden="true">
                      ⭐
                    </span>
                  )}
                </button>
              )
            })}
          </section>
        </div>
      </div>
    </div>
  )
}
