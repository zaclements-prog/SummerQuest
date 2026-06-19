import { Suspense } from 'react'
import { GradientTexture, Float } from '@react-three/drei'
import { EffectComposer, N8AO, Bloom, SMAA, Vignette } from '@react-three/postprocessing'
import { BlendFunction, KernelSize } from 'postprocessing'
import { BackSide } from 'three'
import { VoxCloud } from './voxel/props'

/* ───────────────────────────── TUNABLES ─────────────────────────────────────
 * Every key mood lever lives here so the visual controller can dial the whole
 * world from one spot. Conservative defaults — meant to be tuned UP.
 * ───────────────────────────────────────────────────────────────────────────*/

// Sky gradient dome (BackSide sphere). Warm pale horizon → cool blue zenith.
const SKY = {
  radius: 120,
  // stops/colors are paired (0 = bottom/horizon, 1 = top/zenith)
  stops: [0, 0.45, 1] as number[],
  colors: ['#fdeecb', '#bfe3f2', '#7fb4e6'] as string[],
}

// Fog — matched to the horizon color so the island edge melts into the sky.
const FOG = {
  color: '#cfe6ee',
  near: 46,
  far: 165,
}

// Key (golden-hour) directional light.
const KEY_LIGHT = {
  position: [10, 16, 8] as [number, number, number],
  color: '#ffe2b0',
  intensity: 1.25,
  shadowMapSize: 1024,
  shadowExtent: 24, // ± world units the shadow camera covers
  shadowBias: -0.0004,
}

// Cool sky fill (hemisphere) + low ambient.
const FILL = {
  skyColor: '#cfe2ff',
  groundColor: '#5a6b8c',
  hemiIntensity: 0.55,
  ambientColor: '#ffffff',
  ambientIntensity: 0.18,
}

// Soft shadows via VSM blur (PCSS/SoftShadows isn't compatible with three 0.184).
const SHADOW_RADIUS = 4
const SHADOW_BLUR_SAMPLES = 8

// Ambient occlusion — the single most important voxel-depth lever.
const AO = {
  aoRadius: 1.1, // voxel-scale; small so only crevices darken
  distanceFalloff: 1.0,
  intensity: 1.95,
  quality: 'low' as const,
  halfRes: true, // render AO at half resolution — big perf win, minor quality loss
  color: '#2a2438',
}

// Bloom — gentle glow on lanterns/windows/highlights.
const BLOOM = {
  intensity: 0.4,
  luminanceThreshold: 0.9,
  luminanceSmoothing: 0.3,
  mipmapBlur: true,
}

// Vignette — subtle darkening at the frame edges.
const VIGNETTE = {
  offset: 0.32,
  darkness: 0.55,
}

// Floating clouds drifting over the isle.
const CLOUDS: { position: [number, number, number]; scale: number; seed: number }[] = [
  { position: [-18, 28, -22], scale: 0.85, seed: 11 },
  { position: [22, 32, -14], scale: 0.7, seed: 23 },
  { position: [8, 34, 24], scale: 0.95, seed: 37 },
  { position: [-24, 26, 16], scale: 0.65, seed: 51 },
  { position: [14, 30, 18], scale: 0.6, seed: 67 },
]

/**
 * Owns the whole World mood inside the Canvas: gradient sky dome, sky-matched
 * fog, golden-hour key + cool fill lighting, soft shadows, a conservative
 * post-processing stack (AO / Bloom / SMAA / Vignette), and a few drifting
 * voxel clouds. WorldScreen mounts this in place of the old <Lights/> + bare
 * <color> background.
 */
export default function WorldEnvironment() {
  return (
    <>
      {/* Sky-matched fog softens the island/sky edge and adds depth. */}
      <fog attach="fog" args={[FOG.color, FOG.near, FOG.far]} />

      {/* Gradient sky dome (large BackSide sphere). */}
      <mesh scale={[1, 1, 1]} renderOrder={-1}>
        <sphereGeometry args={[SKY.radius, 32, 16]} />
        <meshBasicMaterial side={BackSide} fog={false} toneMapped={false} depthWrite={false}>
          <GradientTexture attach="map" stops={SKY.stops} colors={SKY.colors} size={1024} />
        </meshBasicMaterial>
      </mesh>

      {/* Lighting (soft shadows come from VSM + shadow-radius on the key light) */}
      <hemisphereLight args={[FILL.skyColor, FILL.groundColor, FILL.hemiIntensity]} />
      <ambientLight color={FILL.ambientColor} intensity={FILL.ambientIntensity} />
      <directionalLight
        position={KEY_LIGHT.position}
        color={KEY_LIGHT.color}
        intensity={KEY_LIGHT.intensity}
        castShadow
        shadow-mapSize={[KEY_LIGHT.shadowMapSize, KEY_LIGHT.shadowMapSize]}
        shadow-bias={KEY_LIGHT.shadowBias}
        shadow-camera-left={-KEY_LIGHT.shadowExtent}
        shadow-camera-right={KEY_LIGHT.shadowExtent}
        shadow-camera-top={KEY_LIGHT.shadowExtent}
        shadow-camera-bottom={-KEY_LIGHT.shadowExtent}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-radius={SHADOW_RADIUS}
        shadow-blurSamples={SHADOW_BLUR_SAMPLES}
      />

      {/* Drifting voxel clouds */}
      {CLOUDS.map((c, i) => (
        <Float key={i} speed={1} rotationIntensity={0} floatIntensity={0.6} floatingRange={[-0.4, 0.4]}>
          <VoxCloud position={c.position} scale={c.scale} seed={c.seed} />
        </Float>
      ))}

      {/* Post-processing. Suspense guards the async N8AO/SMAA asset init. */}
      <Suspense fallback={null}>
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO
            aoRadius={AO.aoRadius}
            distanceFalloff={AO.distanceFalloff}
            intensity={AO.intensity}
            quality={AO.quality}
            halfRes={AO.halfRes}
            color={AO.color}
          />
          <Bloom
            intensity={BLOOM.intensity}
            luminanceThreshold={BLOOM.luminanceThreshold}
            luminanceSmoothing={BLOOM.luminanceSmoothing}
            mipmapBlur={BLOOM.mipmapBlur}
            kernelSize={KernelSize.LARGE}
          />
          <Vignette
            offset={VIGNETTE.offset}
            darkness={VIGNETTE.darkness}
            blendFunction={BlendFunction.NORMAL}
          />
          <SMAA />
        </EffectComposer>
      </Suspense>
    </>
  )
}
