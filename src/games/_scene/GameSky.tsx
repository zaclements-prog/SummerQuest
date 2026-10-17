import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, ShaderMaterial } from 'three'
import type { Group } from 'three'
import { Cloud } from '../../toon/props'

/**
 * Sky, haze and sunlight for a mini-game set — the World's look (gradient sky
 * dome, soft fog, warm key light + hemisphere fill, drifting clouds) sized for
 * a small play space, so a game reads as a place on the island instead of a
 * prop floating in a void. Mount once inside the Canvas.
 */
export function GameSky({
  zenith = '#74c0ef',
  horizon = '#e4f4fa',
  fog = '#d4edf7',
  fogNear = 34,
  fogFar = 120,
  ground = '#a6d68c',
  shadowBox = 13,
  sun = [14, 22, 9],
  castShadow = true,
}: {
  zenith?: string
  horizon?: string
  fog?: string
  fogNear?: number
  fogFar?: number
  /** Hemisphere bounce colour from below (grass green, sand gold…). */
  ground?: string
  /** Half-size of the shadow camera: just covers the play space. */
  shadowBox?: number
  sun?: [number, number, number]
  /** Off on the low graphics setting (the canvas then also drops `shadows`). */
  castShadow?: boolean
}) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new Color(zenith) }, bottom: { value: new Color(horizon) } },
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
    [zenith, horizon],
  )
  return (
    <>
      <mesh material={material} renderOrder={-1}>
        <sphereGeometry args={[180, 24, 16]} />
      </mesh>
      <fog attach="fog" args={[fog, fogNear, fogFar]} />
      <hemisphereLight args={['#dff2ff', ground, 0.95]} />
      <ambientLight intensity={0.28} />
      <directionalLight
        position={sun}
        intensity={1.45}
        color="#fff3dc"
        castShadow={castShadow}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-shadowBox}
        shadow-camera-right={shadowBox}
        shadow-camera-top={shadowBox}
        shadow-camera-bottom={-shadowBox}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <DriftingClouds />
    </>
  )
}

const CLOUDS: { pos: [number, number, number]; s: number; seed: number }[] = [
  { pos: [-30, 15, -34], s: 2.4, seed: 1 },
  { pos: [12, 17, -44], s: 3.0, seed: 2 },
  { pos: [-48, 13, 4], s: 2.2, seed: 4 },
  { pos: [36, 14, -18], s: 2.6, seed: 3 },
  { pos: [-6, 19, -62], s: 3.4, seed: 5 },
]

function DriftingClouds() {
  const ref = useRef<Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += Math.min(dt, 0.05) * 0.008
  })
  return (
    <group ref={ref}>
      {CLOUDS.map((c) => (
        <Cloud key={c.seed} position={c.pos} scale={c.s} seed={c.seed} />
      ))}
    </group>
  )
}
