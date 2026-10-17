import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BackSide, Color, DirectionalLight, Fog, HemisphereLight, ShaderMaterial } from 'three'
import type { Group } from 'three'
import { Cloud } from '../../toon/props'
import { toonMaterial } from '../../toon/materials'
import { useLowGraphics } from '../../world/graphicsQuality'

/** The World's sky (src/world/terrain/WorldEnvironment.tsx), so a game reads as the same island. */
const CALM = { zenith: '#74c0ef', horizon: '#e4f4fa', fog: '#d4edf7', hemiSky: '#dff2ff', key: '#fff3dc' }
const STORM = { zenith: '#5d6b86', horizon: '#aab4c4', fog: '#9aa6b8', hemiSky: '#b9c4d6', key: '#c9d3e6' }

const _a = new Color()
const _b = new Color()

/**
 * Sky dome + fog + light + drifting clouds + a ground that runs to the horizon,
 * so a mini-game sits in a full toon place instead of a disc in a void.
 * `storm` (0..1) eases the whole sky toward a gray rainstorm and back.
 */
export function Backdrop({ ground, storm = 0, shadowSpan = 13 }: { ground: string; storm?: number; shadowSpan?: number }) {
  const sky = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new Color(CALM.zenith) }, bottom: { value: new Color(CALM.horizon) } },
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
  const scene = useThree((s) => s.scene)
  const hemi = useRef<HemisphereLight>(null)
  const key = useRef<DirectionalLight>(null)
  const low = useLowGraphics() // Fast graphics: no sun shadows
  const clouds = useRef<Group>(null)
  const mix = useRef(storm)
  useFrame((_, dt) => {
    mix.current += (storm - mix.current) * Math.min(1, dt * 1.2)
    const k = mix.current
    sky.uniforms.top.value.copy(_a.set(CALM.zenith)).lerp(_b.set(STORM.zenith), k)
    sky.uniforms.bottom.value.copy(_a.set(CALM.horizon)).lerp(_b.set(STORM.horizon), k)
    if (scene.fog instanceof Fog) scene.fog.color.copy(_a.set(CALM.fog)).lerp(_b.set(STORM.fog), k)
    if (hemi.current) {
      hemi.current.color.copy(_a.set(CALM.hemiSky)).lerp(_b.set(STORM.hemiSky), k)
      hemi.current.intensity = 1.0 - 0.25 * k
    }
    if (key.current) {
      key.current.color.copy(_a.set(CALM.key)).lerp(_b.set(STORM.key), k)
      key.current.intensity = 1.45 - 0.6 * k
    }
    if (clouds.current) clouds.current.rotation.y += dt * (0.008 + 0.03 * k)
  })
  const groundMat = useMemo(() => toonMaterial(ground), [ground])
  return (
    <>
      <mesh material={sky} renderOrder={-1}>
        <sphereGeometry args={[300, 24, 16]} />
      </mesh>
      <fog attach="fog" args={[CALM.fog, 34, 95]} />
      <hemisphereLight ref={hemi} args={[CALM.hemiSky, '#a6d68c', 1.0]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        ref={key}
        position={[10, 16, 9]}
        intensity={1.45}
        color={CALM.key}
        castShadow={!low}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-shadowSpan}
        shadow-camera-right={shadowSpan}
        shadow-camera-top={shadowSpan}
        shadow-camera-bottom={-shadowSpan}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <mesh material={groundMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[120, 48]} />
      </mesh>
      <group ref={clouds}>
        <Cloud position={[-22, 12, -26]} scale={2.2} seed={1} />
        <Cloud position={[16, 14, -34]} scale={2.8} seed={2} />
        <Cloud position={[34, 11, -6]} scale={2.0} seed={3} />
        <Cloud position={[-36, 13, 4]} scale={2.4} seed={4} />
        <Cloud position={[4, 15, -48]} scale={3.0} seed={5} />
      </group>
    </>
  )
}
