import { useMemo } from 'react'

/**
 * Party hat — anchor-safe premium rebuild. Authored with its cone BASE resting
 * at y=0 (head anchor = top of head), centered on x/z, growing straight up in +y.
 * Footprint and height are unchanged from the original (base radius ~0.12, total
 * height to the pom tip ~0.4) so it still seats perfectly on the head and scales
 * with the creature. No group offset/rotation is applied — same as before.
 *
 * Upgrade: one smooth tall cone with a glossy candy finish, bright spiral stripe
 * bands that hug the cone, scattered confetti dots, a soft rolled brim at the
 * base, and a fluffy multi-sphere pom-pom on the tip.
 */
export function Partyhat() {
  const body = '#5ec3a0' // mint candy cone
  const stripe = '#ffd34d' // bright golden stripe
  const brim = '#ff8da3' // soft pink rolled brim
  const dotColors = ['#ff7a5c', '#7db8ff', '#ffe066', '#ff9ed8']
  const pomColor = '#ff6f61'
  const pomHi = '#ffb3aa'

  const HEIGHT = 0.4
  const BASE_R = 0.12
  const APEX_Y = HEIGHT // cone apex height (base at y=0)

  // radius of the cone surface at a given height y (linear taper)
  const rAt = (y: number) => BASE_R * (1 - y / HEIGHT)

  // Spiral stripe bands: thin tori laid flat, sized to hug the cone at their y.
  const stripes = useMemo(() => {
    const ys = [0.05, 0.13, 0.21, 0.29]
    return ys.map((y) => ({ y, r: rAt(y) }))
  }, [])

  // Confetti dots scattered around the cone between the stripes.
  const dots = useMemo(() => {
    const out: { pos: [number, number, number]; color: string; s: number }[] = []
    const rows = [0.09, 0.17, 0.25]
    rows.forEach((y, ri) => {
      const r = rAt(y) + 0.005
      const count = 5 - ri
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + ri * 0.7
        out.push({
          pos: [Math.cos(a) * r, y, Math.sin(a) * r],
          color: dotColors[(i + ri) % dotColors.length],
          s: 0.018 - ri * 0.002,
        })
      }
    })
    return out
  }, [])

  // Fluffy pom-pom: a cluster of small spheres around the tip.
  const pomFluff = useMemo(() => {
    const out: [number, number, number][] = []
    const R = 0.03
    for (let i = 0; i < 11; i++) {
      const t = (i / 11) * Math.PI * 2
      const u = i % 2 === 0 ? 0.5 : -0.4
      out.push([Math.cos(t) * R, u * R + R * 0.2, Math.sin(t) * R])
    }
    return out
  }, [])

  return (
    <group>
      {/* main cone — smooth, glossy candy finish */}
      <mesh castShadow position={[0, HEIGHT / 2, 0]}>
        <coneGeometry args={[BASE_R, HEIGHT, 40, 1, false]} />
        <meshStandardMaterial color={body} roughness={0.34} metalness={0.05} />
      </mesh>

      {/* soft rolled brim hugging the base */}
      <mesh castShadow position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[BASE_R + 0.006, 0.018, 16, 40]} />
        <meshStandardMaterial color={brim} roughness={0.4} metalness={0.04} />
      </mesh>

      {/* bright spiral stripe bands */}
      {stripes.map((s, i) => (
        <mesh key={`stripe${i}`} position={[0, s.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[s.r + 0.004, 0.011, 12, 36]} />
          <meshStandardMaterial color={stripe} roughness={0.3} metalness={0.12} />
        </mesh>
      ))}

      {/* confetti dots */}
      {dots.map((d, i) => (
        <mesh key={`dot${i}`} position={d.pos}>
          <sphereGeometry args={[d.s, 12, 12]} />
          <meshStandardMaterial color={d.color} roughness={0.32} metalness={0.08} />
        </mesh>
      ))}

      {/* fluffy pom-pom on the tip */}
      <group position={[0, APEX_Y + 0.015, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.032, 16, 16]} />
          <meshStandardMaterial color={pomColor} roughness={0.85} />
        </mesh>
        {pomFluff.map((p, i) => (
          <mesh key={`fluff${i}`} position={p} castShadow>
            <sphereGeometry args={[0.016, 10, 10]} />
            <meshStandardMaterial color={i % 3 === 0 ? pomHi : pomColor} roughness={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
