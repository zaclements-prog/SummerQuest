/* eslint-disable react-refresh/only-export-components -- scene parts plus their canvas-label helpers; not an HMR boundary */
import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { CanvasTexture, DoubleSide, LinearMipmapLinearFilter, MeshBasicMaterial, SRGBColorSpace, TorusGeometry } from 'three'
import type { Group, Mesh } from 'three'
import StaticBatch from '../toon/StaticBatch'
import { TBlob, TBox, TCapsule, TCone, TCyl, TSphere } from '../toon/shapes'
import { TOON } from '../toon/palette'
import { toonMaterial } from '../toon/materials'
import { registerSharedGpuCache } from '../platform/gl/release'
import { dotCells, fractionBar, type Rational } from '../lib/numbers'
import type { Gate, GatePair, Side } from '../lib/gates'
import { GATE_W, LANE_X, TRACK_HALF } from './CritterParade.layout'

// ── canvas labels ───────────────────────────────────────────────────────────

const FONT = "'Fredoka', 'Comic Sans MS', system-ui, sans-serif"

/** Re-draw every live label once the display font has loaded (the first draw may use a fallback). */
const redrawers = new Set<() => void>()
let fontWait: Promise<unknown> | null = null
function whenFontReady(fn: () => void) {
  redrawers.add(fn)
  if (!fontWait && typeof document !== 'undefined' && document.fonts?.load) {
    fontWait = Promise.all([document.fonts.load(`700 80px Fredoka`), document.fonts.load(`600 40px Fredoka`)])
      .catch(() => null)
      .then(() => {
        for (const r of redrawers) r()
      })
  }
  return () => {
    redrawers.delete(fn)
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function outlinedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill = '#ffffff') {
  ctx.font = `700 ${size}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = size * 0.16
  ctx.strokeStyle = '#3a2c38'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = fill
  ctx.fillText(text, x, y)
}

/** Dots in ten-frame rows (K–1 gates, scaffold pictures). */
function drawDots(ctx: CanvasRenderingContext2D, n: number, cx: number, cy: number, r: number, fill: string, crossed = false) {
  const cells = dotCells(n)
  const rows = Math.max(1, Math.ceil(n / 5))
  const cols = Math.min(5, n)
  const step = r * 2.5
  const x0 = cx - ((cols - 1) * step) / 2
  const y0 = cy - ((rows - 1) * step) / 2
  for (const [c, row] of cells) {
    const x = x0 + c * step
    const y = y0 + row * step
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.lineWidth = r * 0.35
    ctx.strokeStyle = '#3a2c38'
    ctx.stroke()
    if (crossed) {
      ctx.beginPath()
      ctx.moveTo(x - r, y - r)
      ctx.lineTo(x + r, y + r)
      ctx.stroke()
    }
  }
}

function drawBar(ctx: CanvasRenderingContext2D, r: Rational, cx: number, cy: number, w: number, h: number) {
  const { parts, filled, wholes } = fractionBar(r)
  const bars = wholes + (filled > 0 ? 1 : 0)
  const bw = Math.min(w / Math.max(1, bars) - 8, w)
  for (let b = 0; b < bars; b++) {
    const x = cx - (bars * (bw + 8)) / 2 + b * (bw + 8) + 4
    const full = b < wholes
    for (let p = 0; p < parts; p++) {
      ctx.fillStyle = full || p < filled ? '#ffd95e' : 'rgba(255,255,255,.85)'
      ctx.fillRect(x + (p * bw) / parts, cy - h / 2, bw / parts, h)
    }
    ctx.lineWidth = 4
    ctx.strokeStyle = '#3a2c38'
    for (let p = 0; p <= parts; p++) {
      ctx.beginPath()
      ctx.moveTo(x + (p * bw) / parts, cy - h / 2)
      ctx.lineTo(x + (p * bw) / parts, cy + h / 2)
      ctx.stroke()
    }
    ctx.strokeRect(x, cy - h / 2, bw, h)
  }
}

/** A small picture under the gate's sign that shows what the operation does (scaffold mode). */
function drawHelper(ctx: CanvasRenderingContext2D, gate: Gate, cx: number, cy: number, w: number) {
  const op = gate.op
  if (op.kind === 'add' && op.k <= 20) return drawDots(ctx, op.k, cx, cy, op.k > 10 ? 9 : 12, '#ffe58a')
  if (op.kind === 'sub' && op.k <= 20) return drawDots(ctx, op.k, cx, cy, op.k > 10 ? 9 : 12, '#ffb09a', true)
  if (op.kind === 'mul' || op.kind === 'div') {
    // k groups (×) or a split into k (÷)
    const k = op.k
    const gw = Math.min(56, (w - 20) / k)
    for (let i = 0; i < k; i++) {
      const x = cx - (k * gw) / 2 + i * gw + gw / 2
      ctx.beginPath()
      if (op.kind === 'mul') ctx.arc(x, cy, gw * 0.38, 0, Math.PI * 2)
      else ctx.rect(x - gw * 0.4, cy - 16, gw * 0.8, 32)
      ctx.fillStyle = op.kind === 'mul' ? '#ffe58a' : i === 0 ? '#ffe58a' : 'rgba(255,255,255,.55)'
      ctx.fill()
      ctx.lineWidth = 4
      ctx.strokeStyle = '#3a2c38'
      ctx.stroke()
    }
    return
  }
  if (op.kind === 'scale' || op.kind === 'join') drawBar(ctx, op.r, cx, cy, w * 0.8, 30)
}

export interface LabelSpec {
  gate: Gate | null
  color: string
  /** K–1: operands as dots, numeral small. */
  listen: boolean
  /** Scaffold: add the picture of the operation. */
  helper: boolean
}

/** Draw one gate's sign (512 × 288). */
export function drawGateLabel(canvas: HTMLCanvasElement, spec: LabelSpec) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height
  ctx.clearRect(0, 0, W, H)
  roundRect(ctx, 8, 8, W - 16, H - 16, 40)
  ctx.fillStyle = spec.color
  ctx.fill()
  ctx.lineWidth = 14
  ctx.strokeStyle = '#3a2c38'
  ctx.stroke()
  // a soft highlight band
  roundRect(ctx, 26, 22, W - 52, H * 0.3, 26)
  ctx.fillStyle = 'rgba(255,255,255,.18)'
  ctx.fill()
  const g = spec.gate
  if (!g) {
    outlinedText(ctx, '?', W / 2, H / 2, 150)
    return
  }
  const op = g.op
  if (spec.listen && (op.kind === 'add' || op.kind === 'sub') && op.k <= 10) {
    outlinedText(ctx, op.kind === 'add' ? '+' : '−', 78, H / 2 - 18, 120)
    drawDots(ctx, op.k, W / 2 + 40, H / 2 - 18, op.k > 5 ? 22 : 27, op.kind === 'add' ? '#ffe58a' : '#ffb09a', op.kind === 'sub')
    outlinedText(ctx, g.label, W / 2 + 40, H - 46, 54)
    return
  }
  const hasSub = !!g.sub
  const helper = spec.helper
  const mainSize = g.label.length > 4 ? 118 : 150
  const mainY = helper ? H * 0.38 : hasSub ? H * 0.42 : H / 2 + 6
  outlinedText(ctx, g.label, W / 2, mainY, mainSize)
  if (hasSub && !helper) outlinedText(ctx, g.sub!, W / 2, H - 50, 40)
  if (helper) drawHelper(ctx, g, W / 2, H - 58, W - 60)
}

const textures = new Set<CanvasTexture>()

/** Draw into a canvas texture and flag it for upload. */
function repaint(tex: CanvasTexture, draw: (c: HTMLCanvasElement) => void) {
  draw(tex.image as HTMLCanvasElement)
  tex.needsUpdate = true
}
registerSharedGpuCache(() => textures)

/** A canvas texture drawn by `draw` (redrawn when `key` changes and when the font arrives). */
export function useCanvasTexture(key: string, draw: (c: HTMLCanvasElement) => void, w = 512, h = 288): CanvasTexture {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 4
    t.minFilter = LinearMipmapLinearFilter
    textures.add(t)
    return t
  }, [w, h])
  const drawRef = useRef(draw)
  useEffect(() => {
    drawRef.current = draw
  })
  useEffect(() => {
    const redraw = () => repaint(tex, drawRef.current)
    redraw()
    return whenFontReady(redraw)
  }, [key, tex])
  useEffect(
    () => () => {
      textures.delete(tex)
      tex.dispose()
    },
    [tex],
  )
  return tex
}

// ── gates ───────────────────────────────────────────────────────────────────

const postWhite = '#fffaf0'

function Arch({ x, color }: { x: number; color: string }) {
  const h = 3.7
  return (
    <group position={[x, 0, 0]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[(s * GATE_W) / 2, 0, 0]}>
          <TCyl radiusTop={0.17} radiusBottom={0.22} height={h} position={[0, h / 2, 0]} color={postWhite} segments={10} />
          {[0.6, 1.5, 2.4].map((y) => (
            <TCyl key={y} radiusTop={0.225} radiusBottom={0.235} height={0.28} position={[0, y, 0]} color={color} segments={10} castShadow={false} />
          ))}
          <TSphere position={[0, h + 0.12, 0]} scale={0.3} color={color} segments={12} />
          <TCyl radiusTop={0.32} radiusBottom={0.38} height={0.18} position={[0, 0.09, 0]} color={TOON.stoneDark} segments={10} castShadow={false} />
        </group>
      ))}
      {/* the sign's backing board */}
      <TBox size={[GATE_W + 0.25, 2.15, 0.16]} position={[0, h - 0.62, -0.1]} color={color} radius={0.12} />
    </group>
  )
}

const curtainMats = new Map<string, MeshBasicMaterial>()
function curtainMat(color: string): MeshBasicMaterial {
  let m = curtainMats.get(color)
  if (!m) {
    m = new MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false, side: DoubleSide })
    curtainMats.set(color, m)
  }
  return m
}
registerSharedGpuCache(() => curtainMats.values())

function GateSign({ gate, color, listen, helper, x, onTap, picked }: { gate: Gate | null; color: string; listen: boolean; helper: boolean; x: number; onTap?: () => void; picked: boolean }) {
  const key = `${gate ? `${gate.label}|${gate.sub ?? ''}|${gate.op.kind}` : '?'}|${color}|${listen}|${helper}`
  const tex = useCanvasTexture(key, (c) => drawGateLabel(c, { gate, color, listen, helper }))
  const mat = useMemo(() => new MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }), [tex])
  useEffect(() => () => mat.dispose(), [mat])
  const tap = onTap
    ? (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        onTap()
      }
    : undefined
  return (
    <group position={[x, 0, 0]}>
      <mesh material={mat} position={[0, 3.08, 0]} renderOrder={2}>
        <planeGeometry args={[GATE_W + 0.05, (GATE_W + 0.05) * (288 / 512)]} />
      </mesh>
      {/* the glowing curtain you walk through (and a big tap target for K–1) */}
      <mesh material={curtainMat(color)} position={[0, 1.08, 0]} onPointerDown={tap} renderOrder={3}>
        <planeGeometry args={[GATE_W - 0.3, 2.1]} />
      </mesh>
      {picked && <PickedGlow />}
    </group>
  )
}

/** A soft pulse on the gate a K–1 child tapped. */
function PickedGlow() {
  const ref = useRef<Mesh>(null)
  const mat = useMemo(() => new MeshBasicMaterial({ color: '#fff6b0', transparent: true, opacity: 0.45, depthWrite: false, side: DoubleSide }), [])
  useEffect(() => () => mat.dispose(), [mat])
  return (
    <mesh ref={ref} material={mat} position={[0, 1.08, 0.02]} renderOrder={4}>
      <planeGeometry args={[GATE_W - 0.2, 2.2]} />
    </mesh>
  )
}

/**
 * A pair of gates across the track at `z`: two arches with big signs and
 * see-through curtains. `pair` null shows "?" signs (the next pair isn't made
 * until the parade's count is known).
 */
export function GatePair3D({
  pair,
  z,
  colors,
  listen,
  helper,
  picked,
  onTap,
}: {
  pair: GatePair | null
  z: number
  colors: [string, string]
  listen: boolean
  helper: boolean
  picked: Side | null
  onTap?: (side: Side) => void
}) {
  return (
    <group position={[0, 0, z]}>
      <StaticBatch>
        <Arch x={-LANE_X} color={colors[0]} />
        <Arch x={LANE_X} color={colors[1]} />
        {/* a little divider fence between the lanes */}
        <TBox size={[0.24, 1.0, 1.4]} position={[0, 0.5, 0]} color={postWhite} radius={0.08} />
      </StaticBatch>
      <GateSign gate={pair?.left ?? null} color={colors[0]} listen={listen} helper={helper} x={-LANE_X} onTap={onTap ? () => onTap('left') : undefined} picked={picked === 'left'} />
      <GateSign gate={pair?.right ?? null} color={colors[1]} listen={listen} helper={helper} x={LANE_X} onTap={onTap ? () => onTap('right') : undefined} picked={picked === 'right'} />
    </group>
  )
}

// ── counting cage ───────────────────────────────────────────────────────────

/** "3 friends join!": a little wooden pen across the middle of the track; its front swings open. */
export function Cage3D({ z, amount, open, listen }: { z: number; amount: number; open: boolean; listen: boolean }) {
  const door = useRef<Group>(null)
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  }, [open])
  const tex = useCanvasTexture(`cage|${amount}|${listen}`, (c) => {
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
    roundRect(ctx, 8, 8, c.width - 16, c.height - 16, 40)
    ctx.fillStyle = '#ffd95e'
    ctx.fill()
    ctx.lineWidth = 14
    ctx.strokeStyle = '#3a2c38'
    ctx.stroke()
    if (listen && amount <= 10) {
      outlinedText(ctx, '+', 80, c.height / 2 - 20, 110)
      drawDots(ctx, amount, c.width / 2 + 40, c.height / 2 - 20, 26, '#ffffff')
      outlinedText(ctx, `${amount} join!`, c.width / 2 + 30, c.height - 48, 46, '#ffffff')
    } else {
      outlinedText(ctx, `+${amount}`, c.width / 2, c.height / 2 - 18, 130)
      outlinedText(ctx, 'friends join!', c.width / 2, c.height - 50, 44)
    }
  })
  const signMat = useMemo(() => new MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }), [tex])
  useEffect(() => () => signMat.dispose(), [signMat])
  const w = 3.2
  const d = 2.2
  return (
    <group position={[0, 0, z]}>
      <StaticBatch>
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => <TCyl key={`${sx}${sz}`} radiusTop={0.1} radiusBottom={0.12} height={1.1} position={[(sx * w) / 2, 0.55, (sz * d) / 2]} color={TOON.wood} segments={8} />),
        )}
        {[0.35, 0.8].map((y) => (
          <group key={y}>
            <TBox size={[0.1, 0.12, d]} position={[-w / 2, y, 0]} color={TOON.woodLight} radius={0.03} />
            <TBox size={[0.1, 0.12, d]} position={[w / 2, y, 0]} color={TOON.woodLight} radius={0.03} />
            <TBox size={[w, 0.12, 0.1]} position={[0, y, -d / 2]} color={TOON.woodLight} radius={0.03} />
          </group>
        ))}
        <TCyl radiusTop={0.08} radiusBottom={0.08} height={2.4} position={[0, 1.2, -d / 2 - 0.05]} color={TOON.woodDark} segments={6} />
      </StaticBatch>
      {/* the front rails: a door that swings down */}
      <group ref={door} position={[0, 0.05, d / 2]}>
        <CageDoor openRef={openRef} w={w} />
      </group>
      <mesh material={signMat} position={[0, 2.45, -d / 2 - 0.12]} renderOrder={2}>
        <planeGeometry args={[2.3, 2.3 * (288 / 512)]} />
      </mesh>
    </group>
  )
}

function CageDoor({ openRef, w }: { openRef: RefObject<boolean>; w: number }) {
  const g = useRef<Group>(null)
  const a = useRef(0)
  useFrame((_, raw) => {
    const want = openRef.current ? 1 : 0
    a.current += (want - a.current) * Math.min(1, Math.min(raw, 0.05) * 6)
    g.current?.rotation.set(a.current * 1.5, 0, 0)
  })
  return (
    <group ref={g}>
      {[0.3, 0.75].map((y) => (
        <TBox key={y} size={[w, 0.12, 0.1]} position={[0, y, 0]} color={TOON.woodLight} radius={0.03} />
      ))}
    </group>
  )
}


// ── the Grumble Gang (baked like the critters) ──────────────────────────────

const FUZZ = '#9a86d6'
const FUZZ_DARK = '#7c67bd'
const FUZZ_HAPPY = '#b8a2f0'

const mouthCache = new Map<string, TorusGeometry>()
function mouthGeo(): TorusGeometry {
  let g = mouthCache.get('m')
  if (!g) {
    g = new TorusGeometry(1, 0.22, 6, 12, Math.PI)
    mouthCache.set('m', g)
  }
  return g
}
registerSharedGpuCache(() => mouthCache.values())

/**
 * A Grumble: a round fuzzball with big eyes, cross eyebrows and a frown. Cheered
 * up (`happy`), the brows lift, the frown flips into a grin and the cheeks blush.
 * Faces +z. About 0.7 tall. Static: the crowd driver makes it wobble.
 */
export function GrumpModel({ happy }: { happy: boolean }) {
  const body = happy ? FUZZ_HAPPY : FUZZ
  return (
    <group>
      {/* feet */}
      {[-1, 1].map((s) => (
        <TSphere key={s} position={[s * 0.12, 0.05, 0.06]} scale={[0.09, 0.06, 0.11]} color={FUZZ_DARK} segments={10} outline />
      ))}
      {/* fuzzy body: a faceted ball with tufts */}
      <TBlob position={[0, 0.36, 0]} scale={[0.33, 0.31, 0.3]} color={body} detail={1} outline />
      {[
        [-0.12, 0.66, 0.02, 0.09],
        [0.02, 0.69, -0.03, 0.1],
        [0.14, 0.64, 0.02, 0.08],
      ].map(([x, y, z, r]) => (
        <TBlob key={x} position={[x, y, z]} scale={r} color={FUZZ_DARK} detail={0} />
      ))}
      {/* little arms */}
      {[-1, 1].map((s) => (
        <TCapsule key={s} radius={0.05} length={0.1} position={[s * 0.33, 0.3, 0.03]} rotation={[0, 0, s * (happy ? -2.2 : 0.5)]} color={body} segments={8} />
      ))}
      {/* eyes */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.11, 0.42, 0.26]}>
          <TSphere scale={[0.085, 0.1, 0.05]} color="#ffffff" segments={12} castShadow={false} />
          <TSphere position={[s * -0.01, happy ? 0.0 : -0.02, 0.035]} scale={[0.045, 0.052, 0.03]} color={TOON.eye} segments={10} castShadow={false} />
          <TSphere position={[0.012, happy ? 0.024 : 0.004, 0.06]} scale={0.014} color="#ffffff" emissive="#ffffff" emissiveIntensity={1} segments={6} castShadow={false} />
          {/* eyebrow: angry slant, or lifted */}
          <TBox size={[0.13, 0.035, 0.04]} position={[0, happy ? 0.14 : 0.105, 0.03]} rotation={[0, 0, happy ? s * 0.25 : s * -0.5]} color={TOON.eye} radius={0.015} castShadow={false} />
        </group>
      ))}
      {/* mouth: frown or grin */}
      <mesh geometry={mouthGeo()} material={toonMaterial(TOON.eye)} position={[0, happy ? 0.29 : 0.25, 0.29]} rotation={[happy ? -0.2 : 0.2, 0, happy ? Math.PI : 0]} scale={[happy ? 0.075 : 0.06, happy ? 0.06 : 0.04, 0.03]} />
      {happy &&
        [-1, 1].map((s) => (
          <TSphere key={s} position={[s * 0.21, 0.31, 0.22]} rotation={[0, s * 0.6, 0]} scale={[0.05, 0.03, 0.02]} color={TOON.blush} emissive={TOON.blush} emissiveIntensity={0.3} segments={8} castShadow={false} />
        ))}
    </group>
  )
}

// ── the tug-of-war field ────────────────────────────────────────────────────

/** The tug-of-war field: a sandy ring, the white centre line and flag poles on the far side (the camera watches from the near side). */
export function FinaleProps({ z }: { z: number }) {
  const flags = ['#f2766b', '#ffd95e', '#3d9df2', '#22b07d', '#a27cf0']
  return (
    <group position={[0, 0, z]}>
      <StaticBatch>
        <TCyl radiusTop={TRACK_HALF + 0.4} radiusBottom={TRACK_HALF + 0.4} height={0.05} position={[0, 0.045, 0]} color="#f7e4b8" segments={28} castShadow={false} receiveShadow />
        <TBox size={[TRACK_HALF * 2 - 0.6, 0.04, 0.26]} position={[0, 0.08, 0]} color="#ffffff" radius={0.01} castShadow={false} />
        {[-4.2, 0, 4.2].map((dz, i) => (
          <group key={dz} position={[-(TRACK_HALF + 0.8), 0, dz]}>
            <TCyl radiusTop={0.1} radiusBottom={0.13} height={3.6} position={[0, 1.8, 0]} color={postWhite} segments={8} />
            <TSphere position={[0, 3.68, 0]} scale={0.2} color={flags[(i + 1) % flags.length]} segments={10} />
            <TCone radius={0.45} height={0.85} position={[0.34, 3.2, 0]} rotation={[0, 0, -Math.PI * 0.5]} color={flags[(i + 2) % flags.length]} segments={3} />
          </group>
        ))}
      </StaticBatch>
    </group>
  )
}

/** The rope (a long capsule) with a red ribbon at its middle; the scene moves it. */
export function Rope({ ropeRef, ribbonRef, length }: { ropeRef: RefObject<Group | null>; ribbonRef: RefObject<Group | null>; length: number }) {
  return (
    <group ref={ropeRef}>
      <TCapsule radius={0.07} length={length} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.55, 0]} color="#d9a066" segments={8} />
      <group ref={ribbonRef} position={[0, 0.55, 0]}>
        <TBox size={[0.08, 0.5, 0.3]} position={[0, -0.25, 0]} color="#f2394d" radius={0.03} />
        <TSphere position={[0, 0.05, 0]} scale={0.12} color="#f2394d" segments={10} />
      </group>
    </group>
  )
}

/** The Grumble Gang's banner: their number, big, over their leader's head. */
export function GangSign({ count, happy }: { count: number; happy: boolean }) {
  const tex = useCanvasTexture(`gang|${count}|${happy}`, (c) => {
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
    roundRect(ctx, 8, 8, c.width - 16, c.height - 16, 40)
    ctx.fillStyle = happy ? '#b8a2f0' : '#7c67bd'
    ctx.fill()
    ctx.lineWidth = 14
    ctx.strokeStyle = '#3a2c38'
    ctx.stroke()
    outlinedText(ctx, String(count), c.width / 2, c.height / 2 - 14, 150)
    outlinedText(ctx, happy ? 'happy now!' : 'Grumble Gang', c.width / 2, c.height - 46, 42)
  })
  const mat = useMemo(() => new MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }), [tex])
  useEffect(() => () => mat.dispose(), [mat])
  return (
    <mesh material={mat} position={[0, 2.55, 0]} renderOrder={2}>
      <planeGeometry args={[1.9, 1.9 * (288 / 512)]} />
    </mesh>
  )
}
