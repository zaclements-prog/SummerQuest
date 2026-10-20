import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect } from 'react'
import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import { useWorldUi } from './useWorldUi'
import type { ActiveNpc } from './useWorldUi'
import WorldPanel from './WorldPanel'
import GraphicsToggle from './GraphicsToggle'
import { sfx } from '../lib/sound'
import { useProgress } from '../store/progress'
import { listenGrade } from '../lib/listenNav'
import { guide, type GuideStep } from '../guide/store'
import { SayAgainButton } from '../guide/SayAgainButton'
import { ToonStar } from '../components/ui'
import { ListenIconButton } from '../components/listen/ListenIconButton'
import { SleepingBadge } from '../components/listen/ListenSleeping'
import { useListenIntro } from '../components/listen/useListenIntro'
import { npcGreeting, npcSleeping, npcTitle } from './listenWorld'

/** The Home room's decorate mode (the House in the World is that room). */
const DECORATE_PATH = '/home?mode=decorate'

/** K–1: the first visit's tour of the HUD (🔊 plays it again). */
const WORLD_TOUR: GuideStep[] = [
  { voice: { line: 'k-nav/worldHello' } },
  { voice: { line: 'k-nav/tourMap' }, target: 'hud-map', cue: 'map' },
  { voice: { line: 'k-nav/tourPets' }, target: 'hud-pets', cue: 'pets' },
  { voice: { line: 'k-nav/tourHome' }, target: 'hud-home', cue: 'home' },
  { voice: { line: 'k-nav/tourWalk' } },
]

export default function WorldHud({ posRef }: { posRef: RefObject<Vector3> }) {
  const activeNpc = useWorldUi((s) => s.activeNpc)
  const panel = useWorldUi((s) => s.panel)
  const inHouse = useWorldUi((s) => s.insideBuildingId === 'house')
  const navigate = useNavigate()
  // K–1 (voice-first): icon buttons, a 🔊 that explains, spoken gateways, sleeping places
  const grade = useProgress((s) => s.player?.grade)
  const listen = listenGrade(grade)

  /** K–1: what a gateway says as you walk up (and on 🔊 next to it). */
  const greet = useCallback(
    (npc: ActiveNpc) => {
      const voice = npcGreeting(npc, grade)
      if (npcSleeping(npc, grade)) void guide.show({ voice, target: 'world-visit', hand: false, dim: false })
      else void guide.show({ voice, target: 'world-visit', cue: 'star', dim: false })
    },
    [grade],
  )

  const open = useCallback(() => {
    const npc = useWorldUi.getState().activeNpc
    if (!npc || useWorldUi.getState().panel) return
    // K–1: a sleeping place says so instead of opening
    if (npcSleeping(npc, grade)) {
      sfx.tick()
      greet(npc)
      return
    }
    sfx.click()
    useWorldUi.getState().openPanel(npc)
  }, [grade, greet])

  const close = useCallback(() => useWorldUi.getState().closePanel(), [])

  /** Remember where the avatar stands so coming back to the World lands here. */
  const rememberSpot = useCallback(() => {
    const p = posRef.current
    useWorldUi.getState().setReturnSpot(p ? [p.x, p.z] : null)
  }, [posRef])

  // Leave the World for a stage / lesson; the avatar reappears where it stood.
  const launch = useCallback(
    (path: string) => {
      sfx.enter()
      rememberSpot()
      const ui = useWorldUi.getState()
      ui.setEnteredFromWorld(true)
      ui.closePanel()
      navigate(path)
    },
    [navigate, rememberSpot],
  )

  // Inside your House: decorate the room (Home's "Back" brings you back inside the door).
  const decorate = useCallback(() => {
    if (useWorldUi.getState().insideBuildingId !== 'house' || useWorldUi.getState().panel) return
    sfx.enter()
    rememberSpot()
    navigate(DECORATE_PATH)
  }, [navigate, rememberSpot])

  // K–1: walking up to a gateway says its welcome (or that it's still sleeping).
  const npcKey = activeNpc ? activeNpc.areaId : null
  useEffect(() => {
    if (!listen || !npcKey) return
    const npc = useWorldUi.getState().activeNpc
    if (npc && !useWorldUi.getState().panel) greet(npc)
  }, [listen, npcKey, greet])

  // K–1: the first visit tours the HUD (map, pets, home); 🔊 brings it back.
  const tour = useListenIntro('world', WORLD_TOUR, listen)

  /** 🔊 in the World: the panel's welcome, the gateway you stand at, or the tour. */
  const explain = useCallback(() => {
    const ui = useWorldUi.getState()
    if (ui.panel) void guide.replay()
    else if (ui.activeNpc) greet(ui.activeNpc)
    else tour()
  }, [greet, tour])

  // Keyboard: E talks to the NPC you're standing next to (or decorates, inside your House).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return
      if (useWorldUi.getState().activeNpc) open()
      else decorate()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, decorate])

  return (
    // The HUD layer is inset by the safe area (notch, rounded corners, home bar):
    // the World canvas runs edge to edge, every chip and panel here stays clear of it.
    <div className="absolute pointer-events-none top-[var(--safe-top,env(safe-area-inset-top,0px))] right-[var(--safe-right,env(safe-area-inset-right,0px))] bottom-[var(--safe-bottom,env(safe-area-inset-bottom,0px))] left-[var(--safe-left,env(safe-area-inset-left,0px))]">
      <div className="absolute top-2 left-2 right-2 flex items-start gap-2">
        {listen ? (
          // K–1: pictures only, finger-sized; 🔊 says what to do here
          <div className="flex flex-wrap items-center gap-2 short:gap-1.5 min-w-0" data-listen-hud="">
            <SayAgainButton onPress={explain} label="What do I do here?" className="pointer-events-auto" />
            <ListenIconButton icon="🗺️" label="Map" to="/map" guide="hud-map" onClick={rememberSpot} className="pointer-events-auto" />
            <ListenIconButton icon="🐾" label="Pets" to="/pets" guide="hud-pets" onClick={rememberSpot} className="pointer-events-auto" />
            <ListenIconButton icon="🏠" label="Home" to="/home" guide="hud-home" className="pointer-events-auto" />
          </div>
        ) : (
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Link
            to="/map"
            onClick={() => { sfx.click(); rememberSpot() }}
            // finger-sized on tablets and phones (48px), compact for a mouse
            className="pointer-events-auto kid-text inline-flex items-center bg-paper/95 hover:bg-cream-100 text-ink-900 px-3 py-1 pointer-coarse:min-h-12 pointer-coarse:px-4 pointer-coarse:text-base rounded-full text-sm border-2 border-line shadow-[0_3px_0_var(--color-line)] [text-shadow:none]"
          >
            🗺️ Map
          </Link>
          <Link
            to="/pets"
            onClick={() => { sfx.click(); rememberSpot() }}
            className="pointer-events-auto kid-text inline-flex items-center bg-paper/95 hover:bg-cream-100 text-ink-900 px-3 py-1 pointer-coarse:min-h-12 pointer-coarse:px-4 pointer-coarse:text-base rounded-full text-sm border-2 border-line shadow-[0_3px_0_var(--color-line)] [text-shadow:none]"
          >
            🐾 Pets
          </Link>
          <span className="kid-text bg-paper/85 text-ink-900 px-3 py-1 rounded-full text-xs pointer-coarse:text-sm pointer-coarse:py-1.5 border border-line/40 [text-shadow:none]">
            <span className="pointer-coarse:hidden">🌍 WASD / arrows or tap to walk</span>
            <span className="hidden pointer-coarse:inline">👆 Tap or hold to walk</span>
          </span>
        </div>
        )}
        <div className="ml-auto">
          <GraphicsToggle />
        </div>
      </div>
      {listen && activeNpc && !panel && <ListenVisit npc={activeNpc} title={npcTitle(activeNpc, grade)} sleeping={npcSleeping(activeNpc, grade)} onPress={open} />}
      {!listen && activeNpc && !panel && (
        <button
          onClick={open}
          className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 kid-text bg-quest-500 text-quest-900 px-5 py-2 rounded-full text-lg animate-pulse whitespace-nowrap border-[3px] border-line shadow-[0_4px_0_var(--color-line)] [text-shadow:none]"
        >
          <span className="pointer-coarse:hidden">Press E to visit {activeNpc.label} →</span>
          <span className="hidden pointer-coarse:inline">Tap to visit {activeNpc.label} →</span>
        </button>
      )}
      {inHouse && !activeNpc && !panel && (
        <button
          onClick={decorate}
          className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 kid-text bg-quest-500 hover:bg-quest-400 text-quest-900 px-7 py-3 rounded-full text-xl sm:text-2xl border-[3px] border-line shadow-[0_5px_0_var(--color-line)] whitespace-nowrap [text-shadow:none]"
        >
          🛠️ Decorate my room
          <span className="pointer-coarse:hidden text-sm opacity-70 ml-2">(E)</span>
        </button>
      )}
      {panel && <WorldPanel npc={panel} onLaunch={launch} onClose={close} />}
    </div>
  )
}

/**
 * K–1: the big button by a gateway. Open: a big star ("Tap a star to play!").
 * Sleeping: a dimmed 💤 that says "This place is still sleeping."
 */
function ListenVisit({ npc, title, sleeping, onPress }: { npc: ActiveNpc; title: string; sleeping: boolean; onPress: () => void }) {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1" key={npc.areaId}>
      <div className="relative">
        <button
          type="button"
          onClick={onPress}
          data-guide="world-visit"
          data-sleeping={sleeping ? '' : undefined}
          aria-label={sleeping ? `${title}: still sleeping, coming soon` : `Play at ${title}`}
          title={title}
          className={[
            'pointer-events-auto grid place-items-center rounded-full border-[3px] border-line leading-none [text-shadow:none]',
            'transition-[translate,box-shadow] duration-100 active:translate-y-[3px] active:shadow-ledge-sm',
            'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
            sleeping ? 'w-20 h-20 text-4xl bg-cream-200 shadow-ledge opacity-80 grayscale-[0.5]' : 'w-24 h-24 bg-ocean-200 hover:bg-ocean-100 shadow-[0_5px_0_var(--color-line)] animate-bob',
          ].join(' ')}
        >
          {sleeping ? <span aria-hidden="true">💤</span> : <ToonStar filled px={68} />}
        </button>
        {sleeping && <SleepingBadge className="absolute -top-5 -right-5 text-3xl" />}
      </div>
    </div>
  )
}
