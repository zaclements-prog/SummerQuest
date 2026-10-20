import { useMemo } from 'react'
import type { RefObject } from 'react'
import { BackSide, Color, ShaderMaterial } from 'three'
import type { DirectionalLight, Group, Object3D } from 'three'
import StaticBatch from '../toon/StaticBatch'
import { Bush, Cloud, FlowerPatch, Rock, Tree } from '../toon/props'
import { TBox, TCone, TCyl, TSphere } from '../toon/shapes'
import { TOON } from '../toon/palette'
import { seededRng } from '../lib/random'
import { SEGMENT_LEN, THEME, TRACK_HALF } from './CritterParade.layout'

/**
 * The parade route: an island road between grass and beaches, with the sea
 * beyond. Built from recycled segments (each one `StaticBatch`ed into a few
 * draw calls) that the scene leapfrogs ahead of the parade.
 */

export type ThemeKey = keyof typeof THEME

/** Sky dome, fog and light. The sun (and its shadow box) follow the parade. */
export function ParadeSky({ low, sunRef, sunTarget, cloudsRef }: { low: boolean; sunRef: RefObject<DirectionalLight | null>; sunTarget: RefObject<Object3D | null>; cloudsRef: RefObject<Group | null> }) {
  const sky = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new Color('#6fbcef') }, bottom: { value: new Color('#e6f6fb') } },
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
            float t = clamp(vPos.y * 1.7 + 0.12, 0.0, 1.0);
            gl_FragColor = vec4(mix(bottom, top, smoothstep(0.0, 1.0, t)), 1.0);
          }`,
      }),
    [],
  )
  return (
    <>
      <group ref={cloudsRef}>
        <mesh material={sky} renderOrder={-1}>
          <sphereGeometry args={[200, 20, 12]} />
        </mesh>
        <StaticBatch>
          <Cloud position={[-26, 15, -60]} scale={2.6} seed={1} />
          <Cloud position={[18, 18, -82]} scale={3.2} seed={2} />
          <Cloud position={[40, 13, -40]} scale={2.2} seed={3} />
          <Cloud position={[-48, 16, -30]} scale={2.4} seed={4} />
        </StaticBatch>
      </group>
      <fog attach="fog" args={['#d6eef8', 38, 112]} />
      <hemisphereLight args={['#dff2ff', '#a6d68c', 0.95]} />
      <ambientLight intensity={0.3} />
      <object3D ref={sunTarget} />
      <directionalLight
        ref={sunRef}
        position={[8, 16, 8]}
        intensity={1.4}
        color="#fff3dc"
        castShadow={!low}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
      />
    </>
  )
}

/** The sea and the far shore: one big plane that rides along with the parade. */
export function Sea({ seaRef }: { seaRef: RefObject<Group | null> }) {
  return (
    <group ref={seaRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, -40]}>
        <planeGeometry args={[260, 260]} />
        <meshBasicMaterial color="#7fd0ee" />
      </mesh>
    </group>
  )
}

const FLAG_COLORS = ['#f2766b', '#ffd95e', '#3d9df2', '#22b07d', '#a27cf0', '#ff9d2e']

/** One stretch of road (local z from 0 back to −SEGMENT_LEN); `design` varies the scenery. */
export function TrackSegment({ design, theme }: { design: number; theme: ThemeKey }) {
  const th = THEME[theme]
  const deco = useMemo(() => {
    const r = seededRng(`seg-${design}`)
    const spots: { kind: 'palm' | 'tree' | 'bush' | 'rock' | 'flowers'; x: number; z: number; s: number; seed: number }[] = []
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const z = -(i + 0.2 + r() * 0.6) * (SEGMENT_LEN / 4)
        const near = TRACK_HALF + 1.6 + r() * 2.2
        const kinds = ['palm', 'bush', 'flowers', 'tree', 'rock'] as const
        const kind = kinds[Math.floor(r() * kinds.length)]
        spots.push({ kind, x: side * near, z, s: 0.8 + r() * 0.5, seed: Math.floor(r() * 1000) })
        if (r() < 0.6) spots.push({ kind: r() < 0.5 ? 'palm' : 'tree', x: side * (near + 4 + r() * 3), z: z - 2, s: 1 + r() * 0.5, seed: Math.floor(r() * 1000) })
      }
    }
    return spots
  }, [design])
  const L = SEGMENT_LEN
  return (
    <StaticBatch>
      {/* sand under everything, then grass, then the road */}
      <TBox size={[34, 0.3, L + 0.02]} position={[0, -0.27, -L / 2]} color={TOON.sand} radius={0.05} castShadow={false} receiveShadow />
      <TBox size={[22, 0.3, L + 0.02]} position={[0, -0.17, -L / 2]} color={th.ground} radius={0.05} castShadow={false} receiveShadow />
      <TBox size={[TRACK_HALF * 2 + 0.6, 0.3, L + 0.02]} position={[0, -0.14, -L / 2]} color={th.edge} radius={0.05} castShadow={false} receiveShadow />
      <TBox size={[TRACK_HALF * 2 - 0.2, 0.3, L + 0.02]} position={[0, -0.12, -L / 2]} color={th.path} radius={0.05} castShadow={false} receiveShadow />
      {/* dashes down the middle */}
      {[0, 1, 2].map((i) => (
        <TBox key={i} size={[0.22, 0.04, 2.4]} position={[0, 0.04, -(i + 0.5) * (L / 3)]} color="#fffaf0" radius={0.02} castShadow={false} />
      ))}
      {/* bunting over the road at the start of the segment */}
      {design % 2 === 0 && (
        <group position={[0, 0, -2]}>
          {[-1, 1].map((s) => (
            <TCyl key={s} radiusTop={0.1} radiusBottom={0.13} height={3.8} position={[s * (TRACK_HALF + 0.9), 1.9, 0]} color="#fffaf0" segments={8} />
          ))}
          {Array.from({ length: 8 }, (_, i) => {
            const x = -TRACK_HALF - 0.9 + ((TRACK_HALF + 0.9) * 2 * (i + 0.5)) / 8
            const sag = Math.sin(((i + 0.5) / 8) * Math.PI) * 0.5
            return <TCone key={i} radius={0.2} height={0.42} position={[x, 3.55 - sag, 0]} rotation={[Math.PI, 0, 0]} color={FLAG_COLORS[(i + design) % FLAG_COLORS.length]} segments={3} castShadow={false} />
          })}
        </group>
      )}
      {/* lamps with balloons on the other segments */}
      {design % 2 === 1 &&
        [-1, 1].map((s) => (
          <group key={s} position={[s * (TRACK_HALF + 0.9), 0, -L / 2]}>
            <TCyl radiusTop={0.08} radiusBottom={0.1} height={2.2} position={[0, 1.1, 0]} color={th.accent} segments={6} />
            <TSphere position={[0, 2.55, 0]} scale={[0.32, 0.38, 0.32]} color={FLAG_COLORS[(design + (s > 0 ? 2 : 0)) % FLAG_COLORS.length]} segments={10} />
          </group>
        ))}
      {deco.map((d, i) =>
        d.kind === 'palm' ? (
          <Tree key={i} variant="palm" position={[d.x, 0, d.z]} scale={d.s} seed={d.seed} />
        ) : d.kind === 'tree' ? (
          <Tree key={i} variant={design % 3 === 0 ? 'blossom' : 'round'} position={[d.x, 0, d.z]} scale={d.s} seed={d.seed} />
        ) : d.kind === 'bush' ? (
          <Bush key={i} position={[d.x, 0, d.z]} scale={d.s} seed={d.seed} />
        ) : d.kind === 'rock' ? (
          <Rock key={i} position={[d.x, 0, d.z]} scale={d.s} seed={d.seed} />
        ) : (
          <FlowerPatch key={i} position={[d.x, 0, d.z]} seed={d.seed} count={5} />
        ),
      )}
    </StaticBatch>
  )
}
