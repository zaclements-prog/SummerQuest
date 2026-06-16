import { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { useProgress } from '../../store/progress'
import { useHomeUi } from '../useHomeUi'
import { creatureBuilder } from '../models/registry'
import { walkState } from '../models/walkState'
import { tileToWorld, GRID_SIZE, TILE } from '../../lib/home/grid'
import { sfx } from '../../lib/sound'
import CreatureAccessories from './CreatureAccessories'

const EMOTE_MS = 700
const ROOM_LIMIT = (GRID_SIZE * TILE) / 2 - 0.6 // stay just inside the walls
const WALK_SPEED = 3

// reused each frame to avoid per-frame allocation (only one creature animates)
const _f = new Vector3()
const _r = new Vector3()
const _m = new Vector3()

function randomTarget(): Vector3 {
  const gx = Math.floor(Math.random() * GRID_SIZE)
  const gz = Math.floor(Math.random() * GRID_SIZE)
  const w = tileToWorld(gx, gz)
  return new Vector3(w.x, 0, w.z)
}

function Hearts() {
  const refs = useRef<(Group | null)[]>([])
  useFrame(() => {
    const t = (performance.now() % EMOTE_MS) / EMOTE_MS
    refs.current.forEach((g, i) => {
      if (!g) return
      g.position.set((i - 1) * 0.22, 1 + t * 0.9, 0)
      g.scale.setScalar(Math.max(0.001, (1 - t) * 0.16))
    })
  })
  return (
    <>
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(el) => { refs.current[i] = el }}>
          <mesh>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color="#ff5d8f" emissive="#ff5d8f" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
    </>
  )
}

export default function AvatarCreature() {
  const activeCreature = useProgress((s) => s.activeCreature)
  const mode = useHomeUi((s) => s.mode)
  const group = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const target = useRef<Vector3>(new Vector3(0, 0, 0))
  const emoteStart = useRef(0)
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const [emoting, setEmoting] = useState(false)
  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])

  useEffect(() => {
    if (activeCreature) sfx.victory()
  }, [activeCreature])

  // WASD keyboard control of the creature.
  useEffect(() => {
    const setKey = (e: KeyboardEvent, down: boolean) => {
      switch (e.key.toLowerCase()) {
        case 'w': keys.current.w = down; break
        case 'a': keys.current.a = down; break
        case 's': keys.current.s = down; break
        case 'd': keys.current.d = down; break
        default: return
      }
    }
    const onDown = (e: KeyboardEvent) => setKey(e, true)
    const onUp = (e: KeyboardEvent) => setKey(e, false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'play') return
    e.stopPropagation()
    emoteStart.current = performance.now()
    setEmoting(true)
    sfx.correct()
  }

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const now = performance.now()
    const emoteT = emoteStart.current ? (now - emoteStart.current) / EMOTE_MS : 1
    const isEmoting = emoteT < 1
    if (!isEmoting && emoting) setEmoting(false)

    let moving = false
    const k = keys.current
    const controlled = !isEmoting && (k.w || k.a || k.s || k.d)

    if (controlled) {
      // move relative to the camera, projected onto the floor
      state.camera.getWorldDirection(_f)
      _f.y = 0
      if (_f.lengthSq() < 1e-4) _f.set(0, 0, -1)
      _f.normalize()
      _r.set(-_f.z, 0, _f.x) // right = forward × up
      _m.set(0, 0, 0)
      if (k.w) _m.add(_f)
      if (k.s) _m.sub(_f)
      if (k.d) _m.add(_r)
      if (k.a) _m.sub(_r)
      if (_m.lengthSq() > 1e-4) {
        _m.normalize()
        g.position.addScaledVector(_m, WALK_SPEED * dt)
        g.position.x = Math.max(-ROOM_LIMIT, Math.min(ROOM_LIMIT, g.position.x))
        g.position.z = Math.max(-ROOM_LIMIT, Math.min(ROOM_LIMIT, g.position.z))
        g.rotation.y = Math.atan2(_m.x, _m.z)
        target.current.copy(g.position) // resume wandering from where you parked it
        moving = true
      }
    } else if (!isEmoting) {
      const pos = g.position
      if (pos.distanceTo(target.current) < 0.2) target.current = randomTarget()
      const dir = target.current.clone().sub(pos)
      if (dir.length() > 0.01) {
        dir.normalize()
        pos.addScaledVector(dir, Math.min(1.2 * dt, pos.distanceTo(target.current)))
        g.rotation.y = Math.atan2(dir.x, dir.z)
        moving = pos.distanceTo(target.current) > 0.05
      }
    }

    walkState.t += dt
    walkState.moving = moving
    if (inner.current) {
      const jump = isEmoting ? Math.sin(emoteT * Math.PI) * 0.5 : 0
      const stepBob = moving ? Math.abs(Math.sin(walkState.t * 9)) * 0.05 : 0
      inner.current.position.y = jump + stepBob + Math.sin(now / 300) * 0.04
      inner.current.rotation.y = isEmoting ? emoteT * Math.PI * 2 : 0
      inner.current.rotation.z = moving && !isEmoting ? Math.sin(walkState.t * 9) * 0.05 : 0
    }
  })

  if (!activeCreature) return null
  return (
    <group ref={group} position={[0, 0, 0]}>
      <group ref={inner} onPointerDown={onPointerDown}>
        <b.Builder />
        <CreatureAccessories />
      </group>
      {emoting && <Hearts />}
    </group>
  )
}
