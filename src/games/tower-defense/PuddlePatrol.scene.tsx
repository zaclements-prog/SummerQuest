/* eslint-disable react-refresh/only-export-components -- the scene and its small view bridge; not an HMR boundary */
import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { Camera, PerspectiveCamera } from 'three'
import type { RuleId } from '../../lib/puddle'
import StaticBatch from '../../toon/StaticBatch'
import { TOON } from '../../toon/palette'
import { GuideMarker } from '../../guide/GuideMarker'
import { GameSky } from '../_scene/GameSky'
import { GameCameraRig } from '../_scene/GameCameraRig'
import JuiceLayer from '../_juice/JuiceLayer'
import { juice } from '../_juice/juice'
import { advance, drainEvents, pondClean } from './engine'
import { Field, Flock, Pond, SlotPad, Sprays, Tower3D, NOZZLE_Y, type Leaving } from './PuddlePatrol.parts'
import type { PatrolEvent, PatrolState } from './types'

/**
 * Puddle Patrol's 3D scene. ONE frame loop runs the simulation forward
 * (fixed ticks: engine.ts), drains its events into juice (washes sparkle,
 * bounces splash, leaks plop into the pond) and hands them to the game for
 * its HUD and voice. Everything that moves reads the mutable state; React
 * only re-renders when a tower goes up or changes, or a slot is chosen.
 */

/** Where the camera looks (the middle of the play area) and the way it looks down (pitch ≈ 63°). */
export const CAM = { focus: [0.4, 0, 0.7] as [number, number, number], offset: [0, 19, 9.6] as [number, number, number], fov: 40 }

/** The play area to keep on screen: path, slots, pond and pit (x and z extents), and how tall the towers stand. */
const FIT = { w: 18.0, d: 14.6, h: 3.0 }

/** Screen space the HUD covers (px): the field is framed in what's left. */
export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * How far back the camera sits so the whole play area fits between the HUD
 * pieces, at this canvas size (pure: the scene's framing and its test).
 */
export function fitDistance(w: number, h: number, insets: Insets, fov = CAM.fov): number {
  const tan = Math.tan(((fov / 2) * Math.PI) / 180)
  const pitch = Math.atan2(CAM.offset[1], CAM.offset[2])
  const freeW = Math.max(120, w - insets.left - insets.right)
  const freeH = Math.max(120, h - insets.top - insets.bottom)
  const needH = FIT.d * Math.sin(pitch) + FIT.h * Math.cos(pitch)
  const byH = (needH / 2 / tan) * (h / freeH)
  const byW = (FIT.w / 2 / (tan * (w / h))) * (w / freeW)
  return Math.max(byH, byW) * 1.03
}

const _dir = new Vector3(...CAM.offset).normalize()

/**
 * Frames the field: the shared camera rig (GameCameraRig) at the distance
 * that fits, and the picture shifted (a view offset) so the field's middle
 * sits in the middle of the space the HUD leaves, on any screen shape.
 */
function Framing({ insets }: { insets: Insets }) {
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const d = fitDistance(size.width, size.height, insets)
  const offset = useMemo(() => [_dir.x * d, _dir.y * d, _dir.z * d] as [number, number, number], [d])
  const focusRef = useRef(new Vector3(...CAM.focus))
  useEffect(() => {
    const dx = (insets.left - insets.right) / 2
    const dy = (insets.top - insets.bottom) / 2
    camera.setViewOffset(size.width, size.height, -dx, -dy, size.width, size.height)
    camera.updateProjectionMatrix()
    return () => {
      camera.clearViewOffset()
    }
  }, [camera, size.width, size.height, insets.left, insets.right, insets.top, insets.bottom])
  return <GameCameraRig targetRef={focusRef} focus={CAM.focus} offset={offset} follow={0} lookY={0} />
}

/** For the DOM layer: the live camera and canvas (screen positions of slots and Puddings). */
export interface View {
  camera: Camera | null
  canvas: HTMLCanvasElement | null
}

const _v = new Vector3()

/** A world point on screen (px in the viewport), or null off screen. */
export function toScreen(view: View, x: number, y: number, z: number): { x: number; y: number } | null {
  const { camera, canvas } = view
  if (!camera || !canvas) return null
  _v.set(x, y, z).project(camera)
  if (_v.z > 1) return null
  const r = canvas.getBoundingClientRect()
  return { x: r.left + ((_v.x + 1) / 2) * r.width, y: r.top + ((1 - _v.y) / 2) * r.height }
}

function Bridge({ viewRef }: { viewRef: RefObject<View> }) {
  const camera = useThree((s) => s.camera)
  const canvas = useThree((s) => s.gl.domElement)
  useEffect(() => {
    viewRef.current.camera = camera
    viewRef.current.canvas = canvas
  }, [camera, canvas, viewRef])
  return null
}

export interface SceneHooks {
  onEvents: (events: PatrolEvent[]) => void
}

export function PatrolScene({
  state,
  hooksRef,
  viewRef,
  towers,
  selectedSlot,
  inviting,
  paused,
  reduced,
  low,
  young,
  guideSlot,
  speedRef,
  onSlotTap,
  onPuddingTap,
  insets,
}: {
  /** The simulation (mutated by the engine in place; read here every frame). */
  state: PatrolState
  hooksRef: RefObject<SceneHooks | null>
  viewRef: RefObject<View>
  /** The rule standing on each slot (null: empty). */
  towers: (RuleId | null)[]
  selectedSlot: number | null
  /** A card is waiting for a spot: the empty slots glow. */
  inviting: boolean
  paused: boolean
  reduced: boolean
  low: boolean
  /** K–1: bigger Puddings and a guide anchor on the slot to point at. */
  young: boolean
  guideSlot: number | null
  speedRef: RefObject<number>
  onSlotTap: (slot: number) => void
  onPuddingTap: (id: number) => void
  insets: Insets
}) {
  const layout = state.layout
  const leavingRef = useRef<Leaving[]>([])
  const kickRef = useRef(new Float32Array(layout.slots.length))
  const cleanRef = useRef(1)

  useFrame((_, rawDt) => {
    const st = state
    const dt = Math.min(rawDt, 0.1)
    if (!paused) advance(st, dt * (speedRef.current ?? 1))
    // the clean / splashed Puddings finish their little exits
    const leaving = leavingRef.current
    for (const l of leaving) l.t += dt
    if (leaving.length && leaving[0].t > 1.2) leavingRef.current = leaving.filter((l) => l.t < 1.2)
    const events = drainEvents(st)
    if (!events.length) return
    for (const e of events) {
      if (e.kind === 'spray') {
        kickRef.current[e.slot] = 1
      } else if (e.kind === 'wash') {
        leavingRef.current.push({ id: e.id, x: e.at.x, z: e.at.z, t: 0, kind: 'wash', value: e.value })
        juice.burst({ pos: [e.at.x, 0.9, e.at.z], color: ['#ffffff', '#bfeaff', '#7fd0ff', TOON.gold], count: reduced ? 8 : 20, speed: 2.6, up: 3, size: 0.09, life: 0.8 })
        if (!reduced && !low) juice.ring({ pos: [e.at.x, 0.12, e.at.z], color: '#bfeaff', radius: 1.4, life: 0.5 })
        juice.text({ pos: [e.at.x, 2.2, e.at.z], text: '✨', size: 'md', color: '#ffffff' })
      } else if (e.kind === 'bounce') {
        // the splash bounces off: droplets scatter, nothing washes
        juice.burst({ pos: [e.at.x, 1.0, e.at.z], color: ['#bfeaff', '#ffffff'], count: reduced ? 4 : 9, speed: 3.2, up: 2.2, size: 0.07, life: 0.5 })
      } else if (e.kind === 'leak') {
        leavingRef.current.push({ id: e.id, x: e.at.x, z: e.at.z, t: 0, kind: 'leak', value: e.value })
        juice.burst({ pos: [e.at.x, 0.3, e.at.z], color: ['#9a7a52', TOON.water, '#ffffff'], count: reduced ? 6 : 16, speed: 2, up: 3.5, size: 0.1, life: 0.8 })
        if (!reduced && !low) juice.ring({ pos: [e.at.x, 0.15, e.at.z], color: '#c9a77a', radius: 1.8, life: 0.7 })
      }
    }
    cleanRef.current = pondClean(st)
    hooksRef.current?.onEvents(events)
  })

  const slots = useMemo(() => layout.slots, [layout])

  return (
    <group>
      <Bridge viewRef={viewRef} />
      <GameSky ground={'#a6d68c'} shadowBox={14} fogNear={40} fogFar={130} />
      {/* the sea around the island */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
        <circleGeometry args={[90, 40]} />
        <meshToonMaterial color={TOON.waterDeep} />
      </mesh>
      <StaticBatch>
        <Field layout={layout} />
      </StaticBatch>
      <Pond at={layout.pond} cleanRef={cleanRef} />
      {slots.map((sl) => (
        <SlotPad key={sl.id} pos={sl.pos} selected={selectedSlot === sl.id} inviting={inviting && !towers[sl.id]} reduced={reduced} onTap={() => onSlotTap(sl.id)} />
      ))}
      {slots.map((sl) => {
        const r = towers[sl.id]
        return r ? <Tower3D key={`${sl.id}:${r}`} pos={sl.pos} ruleId={r} kickRef={kickRef} slot={sl.id} reduced={reduced} onTap={() => onSlotTap(sl.id)} /> : null
      })}
      <Flock state={state} leavingRef={leavingRef} reduced={reduced} onTap={onPuddingTap} scale={young ? 1.12 : 1} />
      <Sprays state={state} />
      {young && guideSlot !== null && slots[guideSlot] && (
        <GuideMarker position={[slots[guideSlot].pos.x, 0.25, slots[guideSlot].pos.z]} anchor="pp-slot" height={NOZZLE_Y + 1.2} radius={1.45} anchorSize={120} />
      )}
      <Framing insets={insets} />
      <JuiceLayer />
    </group>
  )
}

