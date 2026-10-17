import { memo, useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Color, InstancedMesh, Matrix4, Object3D, Quaternion, Euler, Mesh, MeshBasicMaterial, RingGeometry } from 'three'
import { geo } from '../../toon/geometry'
import { toonMaterial } from '../../toon/materials'
import { useGraphics } from '../../world/graphicsQuality'
import { burstBus, ringBus, shakeBus, textBus, type FloatTextEvent } from './juice'

const MAX = 320

function newSim() {
  return {
    p: new Float32Array(MAX * 3),
    v: new Float32Array(MAX * 3),
    life: new Float32Array(MAX),
    max: new Float32Array(MAX),
    size: new Float32Array(MAX),
    g: new Float32Array(MAX),
    next: 0,
    alive: 0,
  }
}

/** Instanced particle bursts (one draw call for all of them). */
function Bursts() {
  const mesh = useRef<InstancedMesh>(null)
  // Mutable simulation state lives in refs (touched only in effects / frames).
  const simRef = useRef(newSim())
  const tmpRef = useRef({ o: new Object3D(), c: new Color(), zero: new Matrix4().makeScale(0, 0, 0) })
  const [colors] = useState(() => new Float32Array(MAX * 3).fill(1))

  useEffect(() => {
    const sim = simRef.current
    const tmp = tmpRef.current
    const m = mesh.current
    if (m) {
      // hide every slot until it is used (and upload it: until the first
      // burst the frame loop never runs, so identity matrices would show)
      for (let i = 0; i < MAX; i++) m.setMatrixAt(i, tmp.zero)
      m.instanceMatrix.needsUpdate = true
    }
    return burstBus.on((e) => {
      const m2 = mesh.current
      if (!m2) return
      // Fast graphics: half the sparks (the pool itself is capped at MAX)
      const n = Math.max(1, Math.round((e.count ?? 18) * (useGraphics.getState().low ? 0.5 : 1)))
      const palette = Array.isArray(e.color) ? e.color : [e.color ?? '#ffcf4d']
      for (let k = 0; k < n; k++) {
        const i = sim.next
        sim.next = (sim.next + 1) % MAX
        const a = Math.random() * Math.PI * 2
        const el = Math.random() * 0.9 + 0.1
        const sp = (e.speed ?? 3) * (0.5 + Math.random() * 0.7)
        sim.p.set(e.pos, i * 3)
        sim.v[i * 3] = Math.cos(a) * el * sp
        sim.v[i * 3 + 1] = (e.up ?? 3) * (0.5 + Math.random() * 0.8)
        sim.v[i * 3 + 2] = Math.sin(a) * el * sp
        sim.max[i] = (e.life ?? 0.9) * (0.7 + Math.random() * 0.5)
        sim.life[i] = sim.max[i]
        sim.size[i] = (e.size ?? 0.1) * (0.7 + Math.random() * 0.6)
        sim.g[i] = e.gravity ?? 8
        m2.setColorAt(i, tmp.c.set(palette[Math.floor(Math.random() * palette.length)]))
      }
      if (m2.instanceColor) m2.instanceColor.needsUpdate = true
      sim.alive = MAX
    })
  }, [])

  useFrame((_, rawDt) => {
    const sim = simRef.current
    const tmp = tmpRef.current
    const m = mesh.current
    if (!m || sim.alive === 0) return
    const dt = Math.min(rawDt, 0.05)
    let alive = 0
    for (let i = 0; i < MAX; i++) {
      if (sim.life[i] <= 0) continue
      sim.life[i] -= dt
      if (sim.life[i] <= 0) {
        m.setMatrixAt(i, tmp.zero)
        continue
      }
      alive++
      const j = i * 3
      sim.v[j + 1] -= sim.g[i] * dt
      sim.p[j] += sim.v[j] * dt
      sim.p[j + 1] = Math.max(0.02, sim.p[j + 1] + sim.v[j + 1] * dt)
      sim.p[j + 2] += sim.v[j + 2] * dt
      const k = sim.life[i] / sim.max[i]
      const s = sim.size[i] * (k < 0.3 ? k / 0.3 : 1)
      tmp.o.position.set(sim.p[j], sim.p[j + 1], sim.p[j + 2])
      tmp.o.scale.setScalar(s)
      tmp.o.updateMatrix()
      m.setMatrixAt(i, tmp.o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    sim.alive = alive
  })

  return (
    <instancedMesh ref={mesh} args={[geo.blob(0), toonMaterial('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.08 }), MAX]} frustumCulled={false}>
      <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
    </instancedMesh>
  )
}

const FLOAT_CSS = `
@keyframes sq-float { 0% { transform: translate(-50%, 0) scale(0.4); opacity: 0 } 15% { transform: translate(-50%, -14px) scale(1.15); opacity: 1 }
  30% { transform: translate(-50%, -22px) scale(1) } 100% { transform: translate(-50%, -70px) scale(1); opacity: 0 } }
.sq-float { position: absolute; left: 0; top: 0; white-space: nowrap; pointer-events: none; font-family: 'Fredoka', system-ui, sans-serif;
  font-weight: 700; color: #fff; -webkit-text-stroke: 1.5px #3a2c38; paint-order: stroke fill; text-shadow: 0 3px 0 rgba(58,44,56,.35);
  animation: sq-float 1.15s cubic-bezier(.2,.8,.3,1) forwards; }
`
const SIZES = { sm: 20, md: 30, lg: 44 }

/** Floating "+3!" style labels that pop and drift up. */
function FloatTexts() {
  const [items, setItems] = useState<(FloatTextEvent & { id: number })[]>([])
  const id = useRef(0)
  useEffect(
    () =>
      textBus.on((e) => {
        const key = ++id.current
        setItems((xs) => [...xs.slice(-11), { ...e, id: key }])
        setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== key)), 1200)
      }),
    [],
  )
  return (
    <>
      {items.map((it) => (
        <Html key={it.id} position={it.pos} zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
          <div className="sq-float" style={{ color: it.color ?? '#ffffff', fontSize: SIZES[it.size ?? 'md'] }}>
            {it.text}
          </div>
        </Html>
      ))}
      <Html style={{ display: 'none' }}>
        <style>{FLOAT_CSS}</style>
      </Html>
    </>
  )
}

/**
 * Camera shake as small rotational offsets on top of whatever the camera rig
 * did this frame (trauma² falloff). Mount it AFTER the camera rig so it runs
 * later in the frame. If nothing else touched the camera since our last
 * offset, we restore the clean orientation first (no drift).
 */
function ShakeCamera() {
  const camera = useThree((s) => s.camera)
  const stRef = useRef({ trauma: 0, base: new Quaternion(), shaken: new Quaternion(), active: false, e: new Euler(), q: new Quaternion() })
  useEffect(
    () =>
      shakeBus.on((a) => {
        stRef.current.trauma = Math.min(1, stRef.current.trauma + a)
      }),
    [],
  )
  useFrame(({ clock }, dt) => {
    const st = stRef.current
    if (st.active && camera.quaternion.equals(st.shaken)) camera.quaternion.copy(st.base)
    st.active = false
    if (st.trauma <= 0.001) return
    st.trauma = Math.max(0, st.trauma - dt * 1.7)
    const s = st.trauma * st.trauma
    const t = clock.elapsedTime
    st.base.copy(camera.quaternion)
    st.e.set(Math.sin(t * 41) * 0.035 * s, Math.sin(t * 37 + 1.3) * 0.035 * s, Math.sin(t * 29 + 2.1) * 0.05 * s)
    camera.quaternion.multiply(st.q.setFromEuler(st.e))
    st.shaken.copy(camera.quaternion)
    st.active = true
  })
  return null
}

const RINGS = 10
const ringGeo = (() => {
  const g = new RingGeometry(0.84, 1, 48)
  g.rotateX(-Math.PI / 2)
  return g
})()

// one material per pool slot (each fades on its own); made once, never per frame
const ringMats = Array.from({ length: RINGS }, () => new MeshBasicMaterial({ color: '#fff6cf', transparent: true, opacity: 0, depthWrite: false }))

/** Ground shockwaves: a small pool of flat rings that expand and fade. */
function Rings() {
  const refs = useRef<(Mesh | null)[]>([])
  const st = useRef({ t: new Float32Array(RINGS).fill(-1), life: new Float32Array(RINGS), r: new Float32Array(RINGS), next: 0 })
  useEffect(
    () =>
      ringBus.on((e) => {
        const s = st.current
        const i = s.next
        s.next = (s.next + 1) % RINGS
        s.t[i] = 0
        s.life[i] = e.life ?? 0.55
        s.r[i] = e.radius ?? 2.2
        ringMats[i].color.set(e.color ?? '#fff6cf')
        const m = refs.current[i]
        if (m) m.position.set(e.pos[0], e.pos[1] + 0.03, e.pos[2])
      }),
    [],
  )
  useFrame((_, rawDt) => {
    const s = st.current
    const dt = Math.min(rawDt, 0.05)
    for (let i = 0; i < RINGS; i++) {
      const m = refs.current[i]
      if (!m) continue
      if (s.t[i] < 0) {
        m.visible = false
        continue
      }
      s.t[i] += dt
      const k = s.t[i] / s.life[i]
      if (k >= 1) {
        s.t[i] = -1
        m.visible = false
        continue
      }
      const e = 1 - (1 - k) * (1 - k)
      m.visible = true
      m.scale.setScalar(0.2 + e * s.r[i])
      ringMats[i].opacity = (1 - k) * 0.85
    }
  })
  return (
    <>
      {ringMats.map((mat, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          geometry={ringGeo}
          material={mat}
          visible={false}
          renderOrder={2}
        />
      ))}
    </>
  )
}

/**
 * Mount once inside the game's <Canvas>, after the camera rig. Memoized and
 * prop-less: the game's own re-renders never touch it (everything arrives
 * through the juice buses), so its instance buffers are never rebuilt.
 */
function JuiceLayerImpl() {
  return (
    <>
      <Bursts />
      <Rings />
      <FloatTexts />
      <ShakeCamera />
    </>
  )
}
const JuiceLayer = memo(JuiceLayerImpl)
export default JuiceLayer
