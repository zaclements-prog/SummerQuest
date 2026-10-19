import { BackSide, Color, ShaderMaterial, Vector2 } from 'three'
import type { BufferGeometry, ColorRepresentation, WebGLRenderer } from 'three'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { registerSharedGpuCache } from '../platform/gl/release'
import { OUTLINE } from './materials'

/**
 * The toon kit's line work: an inverted hull (the shape's back faces pushed out
 * a few pixels along its normals and painted the warm outline color) — the same
 * shader as drei's <Outlines>, but cheap to have hundreds of:
 *
 * - one shared material per color + thickness (drei makes one per outline);
 * - one creased-normal copy per source geometry (drei builds one per outline
 *   mesh, so a scene of identical boxes held hundreds of identical copies).
 *
 * `thickness` is in drawing-buffer pixels, exactly like drei's default mode.
 */

const vertexShader = /* glsl */ `
  #include <common>
  #include <clipping_planes_pars_vertex>
  uniform float thickness;
  uniform vec2 size;
  void main() {
    #include <begin_vertex>
    #include <project_vertex>
    #include <clipping_planes_vertex>
    vec4 tNormal = vec4(normal, 0.0);
    vec4 tPosition = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      tNormal = instanceMatrix * tNormal;
      tPosition = instanceMatrix * tPosition;
    #endif
    vec4 clipPosition = projectionMatrix * modelViewMatrix * tPosition;
    vec4 clipNormal = projectionMatrix * modelViewMatrix * tNormal;
    vec2 offset = normalize(clipNormal.xy) * thickness / size * clipPosition.w * 2.0;
    clipPosition.xy += offset;
    gl_Position = clipPosition;
  }`

const fragmentShader = /* glsl */ `
  uniform vec3 color;
  #include <clipping_planes_pars_fragment>
  void main() {
    #include <clipping_planes_fragment>
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`

/** Drawing-buffer size (device px), shared by every outline material; refreshed before each hull draw. */
const bufferSize = new Vector2(1, 1)
const refreshSize = (renderer: WebGLRenderer) => {
  renderer.getDrawingBufferSize(bufferSize)
}

const materials = new Map<string, ShaderMaterial>()

/** The shared hull material for a color + thickness (tagged `userData.toonOutline` for the batcher). */
export function outlineMaterial(color: ColorRepresentation = OUTLINE.color, thickness: number = OUTLINE.thickness): ShaderMaterial {
  const c = new Color(color)
  const key = `${c.getHexString()}|${thickness.toFixed(3)}`
  let m = materials.get(key)
  if (!m) {
    m = new ShaderMaterial({
      uniforms: { color: { value: c }, thickness: { value: thickness }, size: { value: bufferSize } },
      vertexShader,
      fragmentShader,
      side: BackSide,
    })
    m.userData.toonOutline = true
    m.onBeforeRender = refreshSize
    materials.set(key, m)
  }
  return m
}

const creasedCache = new WeakMap<BufferGeometry, BufferGeometry>()
const creasedAll = new Set<BufferGeometry>()

/** `g` with every normal smoothed across faces, so the pushed-out hull never splits at hard edges (cached). */
export function creased(g: BufferGeometry): BufferGeometry {
  let c = creasedCache.get(g)
  if (!c) {
    c = toCreasedNormals(g, Math.PI)
    creasedCache.set(g, c)
    creasedAll.add(c)
  }
  return c
}

registerSharedGpuCache(() => [...materials.values(), ...creasedAll])
