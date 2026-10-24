/* eslint-disable react-refresh/only-export-components -- pet-rig context + its group components, not an HMR boundary */
import { createContext, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { PetStage } from '../../lib/pets/types'
import { markAdvancing, useWalkState } from './walkState'
import { UPRIGHT, gaitFor, newPetPose, stepPose, tempoFor } from './gaits'
import type { GaitProfile, PetPose, PetRig, StageTempo } from './gaits'

/**
 * Pet mode for the creature models. `Staged` wraps a model shown as a pet in
 * `PetRoot`, which provides a `PetCtx` and advances its pose once per frame
 * (before the limbs read it). The limb parts (`Leg`, `Arm`, `Wag`, `Wing`,
 * `Tentacle`, `Nub`) and the `PetBody` / `PetHead` groups read it: with no
 * context (the avatar) they render exactly as they always have.
 */
export interface PetCtx {
  gait: GaitProfile
  tempo: StageTempo
  rig: PetRig
  pose: PetPose
  /** inside `PetHead`: parts here are already level (no counter-tip) */
  inHead: boolean
}

const PetContext = createContext<PetCtx | null>(null)

/** The pet rig the parts are in, or null for the avatar. */
export function usePet(): PetCtx | null {
  return useContext(PetContext)
}

/** The tilt (rad) a part riding on the body has right now (to stand a limb back up straight). */
export function bodyTilt(ctx: PetCtx): number {
  return ctx.inHead ? 0 : ctx.rig.pitch + ctx.pose.pitch
}

/** Scene options for a pet. */
export interface PetOptions {
  /** lineups and celebrations: idles, but never lying down */
  calm?: boolean
  /** a fixed seed (studio renders); default random per pet */
  seed?: number
  /** limbs snap to the walk instead of easing in (studio renders) */
  instant?: boolean
  /** start as if it had already been standing still this long (studio renders of idles) */
  stillFor?: number
}

/** Options for pets on show (the Pets page lineup, a celebration): calm idles. */
export const CALM_PET: PetOptions = { calm: true }

/**
 * Drives one pet: steps its pose from its walk state (priority −1: before the
 * limbs' own frame callbacks, still inside R3F's normal render loop) and
 * applies the root motion — the stride bob, hops, squash, roll and sinking
 * down to lie. The rig's `shift` stands the re-posed model on its feet.
 */
export function PetRoot({
  id,
  stage,
  rig,
  options,
  children,
}: {
  id: string
  stage: PetStage
  rig?: PetRig
  options?: PetOptions
  children: ReactNode
}) {
  const walk = useWalkState()
  const root = useRef<Group>(null)
  const [randomSeed] = useState(() => Math.random())
  const seed = options?.seed ?? randomSeed
  const calm = options?.calm ?? false
  const instant = options?.instant ?? false
  const stillFor = options?.stillFor ?? 0
  const ctx = useMemo<PetCtx>(() => {
    const pose = newPetPose(seed)
    pose.stillFor = stillFor
    return { gait: gaitFor(id), tempo: tempoFor(stage), rig: rig ?? UPRIGHT, pose, inHead: false }
  }, [id, stage, rig, seed, stillFor])
  useFrame((_, dt) => {
    const p = stepPose(ctx.pose, ctx.gait, ctx.tempo, walk.t, walk.moving, Math.min(dt, 0.1), calm, instant)
    // hoppers only cover ground in the air: the walker reads this (see `petWanderSpeed`)
    markAdvancing(walk, p.advancing)
    const g = root.current
    if (!g) return
    const lie = ctx.rig.lie ?? 0
    g.position.y = p.y - lie * p.lie
    g.scale.set(1 / Math.sqrt(p.squash), p.squash, 1 / Math.sqrt(p.squash))
    g.rotation.z = p.roll
  }, -1)
  const shift = ctx.rig.shift
  return (
    <PetContext.Provider value={ctx}>
      <group ref={root}>
        <group position={shift ? [shift[0], shift[1], shift[2]] : undefined}>{children}</group>
      </group>
    </PetContext.Provider>
  )
}

/**
 * The model's body (torso, arms, tail, wings and the head): in pet mode it
 * tips forward about the rig's pivot so the arms become front legs. For the
 * avatar it is just its children.
 */
export function PetBody({ children }: { children: ReactNode }) {
  const ctx = usePet()
  const g = useRef<Group>(null)
  useFrame(() => {
    if (!ctx || !g.current) return
    g.current.rotation.x = ctx.rig.pitch + ctx.pose.pitch
  })
  if (!ctx) return <>{children}</>
  const p = ctx.rig.pivot
  return (
    <group ref={g} position={[p[0], p[1], p[2]]} rotation={[ctx.rig.pitch, 0, 0]}>
      <group position={[-p[0], -p[1], -p[2]]}>{children}</group>
    </group>
  )
}

/**
 * The head (and everything on it): in pet mode it turns back up about the
 * neck so the face looks ahead, and nods, sniffs and looks around. For the
 * avatar it is just its children.
 */
export function PetHead({ children }: { children: ReactNode }) {
  const ctx = usePet()
  const level = useRef<Group>(null)
  const look = useRef<Group>(null)
  const inner = useMemo<PetCtx | null>(() => (ctx ? { ...ctx, inHead: true } : null), [ctx])
  useFrame(() => {
    if (!ctx || !level.current || !look.current) return
    level.current.rotation.x = -(ctx.rig.pitch + ctx.pose.pitch)
    look.current.rotation.x = (ctx.rig.headPitch ?? 0) + ctx.pose.nod
    look.current.rotation.y = ctx.pose.yaw
  })
  if (!ctx || !inner) return <>{children}</>
  const r = ctx.rig
  const n = r.neck
  const lift = r.headLift ?? 0
  const fwd = r.headFwd ?? 0
  const c = Math.cos(r.pitch)
  const s = Math.sin(r.pitch)
  // The neck point rides the tipped body; the lift / forward nudge are in the
  // level (world) frame, so they are turned back by the tip here.
  return (
    <group position={[n[0], n[1] + lift * c + fwd * s, n[2] - lift * s + fwd * c]}>
      <group ref={level} rotation={[-r.pitch, 0, 0]}>
        <group ref={look} rotation={[r.headPitch ?? 0, 0, 0, 'YXZ']}>
          <group position={[-n[0], -n[1], -n[2]]}>
            <PetContext.Provider value={inner}>{children}</PetContext.Provider>
          </group>
        </group>
      </group>
    </group>
  )
}
