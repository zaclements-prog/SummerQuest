import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, ShaderMaterial, Vector3 } from 'three'
import type { DirectionalLight, Group } from 'three'
import { Cloud } from '../../toon/props'
import { shadowMapSize, useLowGraphics } from '../graphicsQuality'
import { isTouchFirst } from '../../platform/gl/deviceClass'

/** Sky colors: a pale, hazy horizon (matching the fog) up to a soft blue zenith. */
const SKY = { zenith: '#74c0ef', horizon: '#e4f4fa', fog: '#d4edf7' }

/** Big inverted sphere with a vertical gradient (unaffected by fog/lights). */
function SkyDome() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new Color(SKY.zenith) },
          bottom: { value: new Color(SKY.horizon) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main() {
            vPos = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top;
          uniform vec3 bottom;
          varying vec3 vPos;
          void main() {
            float t = clamp(vPos.y * 1.6 + 0.15, 0.0, 1.0);
            gl_FragColor = vec4(mix(bottom, top, smoothstep(0.0, 1.0, t)), 1.0);
          }`,
      }),
    [],
  )
  return (
    <mesh material={material} renderOrder={-1}>
      <sphereGeometry args={[400, 24, 16]} />
    </mesh>
  )
}

const CLOUDS: { pos: [number, number, number]; s: number; seed: number }[] = [
  { pos: [-28, 13, -30], s: 2.2, seed: 1 },
  { pos: [18, 15, -38], s: 2.8, seed: 2 },
  { pos: [40, 12, 4], s: 2.0, seed: 3 },
  { pos: [-44, 14, 10], s: 2.6, seed: 4 },
  { pos: [6, 16, -60], s: 3.2, seed: 5 },
  { pos: [-10, 13, 34], s: 1.8, seed: 6 },
]

/** Clouds drift slowly around the island. */
function Clouds() {
  const ref = useRef<Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.006
  })
  return (
    <group ref={ref}>
      {CLOUDS.map((c) => (
        <Cloud key={c.seed} position={c.pos} scale={c.s} seed={c.seed} />
      ))}
    </group>
  )
}

/** Where the sun sits relative to what it lights (its shadow camera looks along −SUN). */
const SUN: [number, number, number] = [24, 34, 16]
/** Shadow box half-size: the whole island on computers; around the view on phones/tablets. */
const SHADOW_HALF = { island: 42, follow: 26 } as const

const _dir = new Vector3()
const _c = new Vector3()
const _f = new Vector3(-SUN[0], -SUN[1], -SUN[2]).normalize()
const _r = new Vector3().crossVectors(_f, new Vector3(0, 1, 0)).normalize()
const _u = new Vector3().crossVectors(_r, _f).normalize()

/**
 * The sun. On computers its shadow covers the whole island (2048² map). On
 * phones and tablets the map is half the size, so the shadow box instead
 * follows the patch of ground the camera is looking at (pushed a little beyond
 * it, where the view opens up): about the same texel density as the big box at
 * 2048, and the shadow pass skips everything outside the view. The box moves in
 * whole shadow texels so edges don't shimmer as the camera glides.
 */
function Sun({ low }: { low: boolean }) {
  const ref = useRef<DirectionalLight>(null)
  const follow = isTouchFirst()
  const half = follow ? SHADOW_HALF.follow : SHADOW_HALF.island
  const mapSize = shadowMapSize()
  useFrame(({ camera }) => {
    const light = ref.current
    if (!follow || low || !light) return
    camera.getWorldDirection(_dir)
    if (_dir.y > -0.05) return
    // ground point under the view centre, pushed 6 units further along the view
    _c.copy(camera.position).addScaledVector(_dir, -camera.position.y / _dir.y)
    const flat = Math.hypot(_dir.x, _dir.z) || 1
    _c.x += (_dir.x / flat) * 6
    _c.z += (_dir.z / flat) * 6
    _c.y = 0
    // snap to the shadow map's texel grid in the light's view plane
    const texel = (half * 2) / mapSize
    const a = _c.dot(_r)
    const b = _c.dot(_u)
    _c.addScaledVector(_r, Math.round(a / texel) * texel - a).addScaledVector(_u, Math.round(b / texel) * texel - b)
    light.target.position.copy(_c)
    light.target.updateMatrixWorld()
    light.position.set(_c.x + SUN[0], _c.y + SUN[1], _c.z + SUN[2])
  })
  return (
    <directionalLight
      ref={ref}
      position={SUN}
      intensity={1.5}
      color="#fff3dc"
      castShadow={!low}
      shadow-mapSize={[mapSize, mapSize]}
      shadow-camera-left={-half}
      shadow-camera-right={half}
      shadow-camera-top={half}
      shadow-camera-bottom={-half}
      shadow-camera-near={1}
      shadow-camera-far={110}
      shadow-bias={-0.0004}
      shadow-normalBias={0.04}
    />
  )
}

/**
 * Sky, fog and light for the toon world. No post-processing: the toon ramp,
 * outlines and a warm key light carry the look (and keep it fast on laptops).
 * On "Fast" graphics the sun casts no shadow (switching it also recompiles the
 * lit materials without shadow sampling; the Canvas turns its shadow map off).
 */
export default function WorldEnvironment() {
  const low = useLowGraphics()
  return (
    <>
      <SkyDome />
      <fog attach="fog" args={[SKY.fog, 70, 170]} />
      <hemisphereLight args={['#dff2ff', '#a6d68c', 1.0]} />
      <ambientLight intensity={0.25} />
      <Sun low={low} />
      <Clouds />
    </>
  )
}
