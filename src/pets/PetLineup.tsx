import { useLayoutEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group, PerspectiveCamera } from 'three'
import { creatureBuilder } from '../home/models/registry'
import { WalkStateContext, newWalkState } from '../home/models/walkState'
import { Egg } from '../home/models/egg'
import { growthRank } from '../lib/pets/growth'
import type { PetGrowth } from '../lib/pets/growth'
import { PET_STAGES } from '../lib/pets/types'
import Silhouette from './Silhouette'

/** Distance between the three stages, and the half-width the camera frames. */
const SLOT_X = 1.25
const HALF_W = SLOT_X * 1.6
/** Where each stage stands across the canvas, as a share of its half-width (for labels). */
export const LINEUP_SLOT_SHARE = SLOT_X / HALF_W
// Feet stand about a fifth of the way up, leaving the floor in front for the name plates.
const LOOK_Y = 0.6

/**
 * Frames the three stages by the canvas width, so each stands at a fixed share
 * of it (`LINEUP_SLOT_SHARE`: the page's name plates line up with them).
 */
function FitCamera() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  useLayoutEffect(() => {
    const aspect = width / Math.max(1, height)
    const t = Math.tan((camera.fov * Math.PI) / 360)
    const d = Math.max(HALF_W / (t * aspect), 1 / t)
    camera.position.set(0, LOOK_Y + d * 0.14, d)
    camera.lookAt(0, LOOK_Y, 0)
    camera.updateProjectionMatrix()
  }, [camera, width, height])
  return null
}

/** A reached stage turns gently from side to side, so you can see it. */
function Sway({ index, children }: { index: number; children: ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const t = clock.elapsedTime + index * 1.3
    g.rotation.y = Math.sin(t * 0.7) * 0.45
    g.position.y = Math.abs(Math.sin(t * 2.2)) * 0.03
  })
  return <group ref={ref}>{children}</group>
}

/** A soft round shadow on the ground under a model. */
function Puddle({ r }: { r: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} renderOrder={-1}>
      <circleGeometry args={[r, 24]} />
      <meshBasicMaterial color="#3a2c38" transparent opacity={0.16} depthWrite={false} />
    </mesh>
  )
}

/**
 * The Pets page's 3D view: one pet as baby, kid and grown-up side by side.
 * Stages it hasn't reached yet are dark silhouettes; an unhatched pet shows its
 * egg where the baby would stand.
 */
export default function PetLineup({
  creatureId,
  stage,
  egg,
}: {
  creatureId: string
  stage: PetGrowth
  egg: { shell: string; spot: string }
}) {
  const b = useMemo(() => ({ Builder: creatureBuilder(creatureId) }), [creatureId])
  // They stand still here (not marching in step with wherever the avatar last walked).
  const still = useMemo(() => newWalkState(), [])
  const reached = growthRank(stage)
  return (
    <WalkStateContext.Provider value={still}>
      <FitCamera />
      <hemisphereLight args={['#fff6e8', '#e6c9a4', 1.1]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 5]} intensity={1.5} color="#fff1da" />
      {PET_STAGES.map((s, i) => {
        const x = (i - 1) * SLOT_X
        if (i === 0 && stage === 'egg') {
          return (
            <group key={`egg-${creatureId}`} position={[x, 0, 0]}>
              <group scale={1.2}>
                <Egg shell={egg.shell} spot={egg.spot} idle />
              </group>
              <Puddle r={0.3} />
            </group>
          )
        }
        const shown = growthRank(s) <= reached
        return (
          <group key={`${creatureId}-${s}-${shown ? 'on' : 'off'}`} position={[x, 0, 0]}>
            {shown ? (
              <Sway index={i}>
                <b.Builder stage={s} />
              </Sway>
            ) : (
              <Silhouette>
                <b.Builder stage={s} />
              </Silhouette>
            )}
            <Puddle r={s === 'baby' ? 0.3 : 0.42} />
          </group>
        )
      })}
    </WalkStateContext.Provider>
  )
}
