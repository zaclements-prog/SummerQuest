import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, ShaderMaterial } from 'three'
import type { Group } from 'three'
import { Cloud } from '../../toon/props'

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

/**
 * Sky, fog and light for the toon world. No post-processing: the toon ramp,
 * outlines and a warm key light carry the look (and keep it fast on laptops).
 */
export default function WorldEnvironment() {
  return (
    <>
      <SkyDome />
      <fog attach="fog" args={[SKY.fog, 70, 170]} />
      <hemisphereLight args={['#dff2ff', '#a6d68c', 1.0]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[24, 34, 16]}
        intensity={1.5}
        color="#fff3dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
        shadow-camera-near={1}
        shadow-camera-far={110}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <Clouds />
    </>
  )
}
