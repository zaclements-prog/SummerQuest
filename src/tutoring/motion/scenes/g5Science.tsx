/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress } from '../anim'
import { Arrow, Burst, Chip, Count, Glow, Paper, Pop, Title } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { Line } from './_g5kit'

/*
 * Grade-5 Science Summit: the salt-water scale, the food web's loop, Earth's
 * four spheres, the hundred cups of water, and the sun crossing the sky with
 * a flagpole's shadow swinging under it. Numbers land as they are said.
 */

const EMOJI = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"
const Emo = ({ x, y, size, children }: { x: number; y: number; size: number; children: string }) => (
  <text x={x} y={y} fontSize={size} fontFamily={EMOJI} textAnchor="middle" dominantBaseline="central">
    {children}
  </text>
)

/** g5Science/particles — salt pours into the water and fades to dots; the jar goes on the scale: 200 + 20 = 220 g. */
const particles: Scene = ({ t, cue }: SceneProps) => {
  const stir = cue('Stir 20 grams')
  const vanish = cue('seems to vanish')
  const scale = cue('Put it on a scale')
  const fall = progress(t, stir + 0.3, 1.2)
  const fade = ease.inOutCubic(progress(t, vanish, 1))
  const onScale = ease.inOutCubic(progress(t, scale, 0.8))
  const jx = lerp(300, 620, onScale)
  const jy = lerp(300, 250, onScale)
  return (
    <>
      <Paper />
      <Line t={t} at={cue('particles too small') - 0.3} x={480} y={56} text="Matter is made of tiny particles" size={38} anchor="middle" color={M.seaDeep} />
      <Pop t={t} at={stir - 0.3} x={140} y={300}>
        <rect x={80} y={250} width={120} height={110} rx={14} fill={M.white} stroke={M.ink} strokeWidth={4} />
        <Title x={140} y={292} size={26}>
          salt
        </Title>
        <Title x={140} y={330} size={26} color={M.coral}>
          20 g
        </Title>
      </Pop>
      {/* the salt falls in as grains, then breaks into particles too small to see */}
      {Array.from({ length: 12 }, (_, i) => {
        const k = Math.min(1, fall * 1.4 - i * 0.03)
        if (k <= 0) return null
        const x = jx - 40 + (i % 6) * 16
        const y = lerp(220, jy + 40 + (i % 3) * 18, k)
        return <rect key={i} x={x} y={y} width={9} height={9} fill={M.white} stroke={M.ink} strokeWidth={1.5} opacity={1 - fade * 0.85} />
      })}
      <g>
        <rect x={jx - 80} y={jy - 60} width={160} height={180} rx={18} fill="#cfeaff" fillOpacity={0.8} stroke={M.ink} strokeWidth={4} />
        <Title x={jx} y={jy + 140} size={22} color={M.inkSoft}>
          water 200 g
        </Title>
      </g>
      {/* the scale */}
      <Pop t={t} at={scale - 0.2} x={620} y={420}>
        <rect x={500} y={385} width={240} height={70} rx={14} fill={M.wood} stroke={M.ink} strokeWidth={4} />
        <rect x={560} y={400} width={120} height={40} rx={8} fill="#203040" />
      </Pop>
      <g transform="translate(620 421)">
        <Count t={t} at={cue('220 grams') - 0.4} dur={0.8} from={200} to={220} x={0} y={0} size={30} color="#7dff9b" stroke="#203040" />
      </g>
      <Line t={t} at={cue('220 grams') + 0.4} x={760} y={430} text="g" size={30} />
      <Chip t={t} at={cue('total weight stays the same')} x={300} y={500} text="200 g + 20 g = 220 g" color={M.gold} size={26} />
      <Burst t={t} at={cue('total weight stays the same') + 0.3} x={620} y={410} r={70} />
    </>
  )
}

/** g5Science/foodweb — sun → grass → rabbit → fox → mushroom → soil, and the loop back to the grass. */
const foodweb: Scene = ({ t, cue }: SceneProps) => {
  const nodes = [
    { at: cue('starts with the sun'), e: '☀️', label: 'sun', x: 90, y: 150 },
    { at: cue('Grass captures'), e: '🌱', label: 'producer', x: 260, y: 300 },
    { at: cue('A rabbit eats'), e: '🐇', label: 'consumer', x: 470, y: 300 },
    { at: cue('a fox eats'), e: '🦊', label: 'consumer', x: 680, y: 300 },
    { at: cue('decomposers'), e: '🍄', label: 'decomposer', x: 860, y: 300 },
  ]
  const cycle = cue('Matter cycles')
  return (
    <>
      <Paper />
      {nodes.map((n, i) => (
        <Pop key={i} t={t} at={n.at} x={n.x} y={n.y}>
          <circle cx={n.x} cy={n.y} r={62} fill={i === 0 ? '#fff0b8' : M.white} stroke={M.ink} strokeWidth={4} />
          <Emo x={n.x} y={n.y} size={62}>
            {n.e}
          </Emo>
          <Title x={n.x} y={n.y + 92} size={22} color={M.inkSoft}>
            {n.label}
          </Title>
        </Pop>
      ))}
      {nodes.slice(1).map((n, i) => (
        <Arrow key={i} t={t} at={n.at + 0.2} from={[nodes[i].x + (i === 0 ? 40 : 66), nodes[i].y + (i === 0 ? 40 : 0)]} to={[n.x - 66, n.y]} bend={i === 0 ? 0.2 : 0} color={i === 0 ? M.gold : M.ink} width={5} />
      ))}
      <Arrow t={t} at={cycle} from={[840, 380]} to={[290, 380]} bend={-0.35} color={M.leaf} width={6} dur={1} />
      <Line t={t} at={cycle + 0.4} x={560} y={505} text="Matter cycles back through the soil" size={26} anchor="middle" color="#3c9446" />
      <Line t={t} at={cue('Energy keeps coming')} x={300} y={90} text="Energy flows from the sun" size={26} color="#c98a00" />
      <Glow t={t} at={cue('Energy keeps coming')} x={90} y={150} r={90} color={M.gold} breathe={false} />
    </>
  )
}

/** g5Science/spheres — four circles, one per sphere, each popping in on its name; roots crack a rock between two of them. */
const spheres: Scene = ({ t, cue }: SceneProps) => {
  const S = [
    { at: cue('geosphere is'), name: 'Geosphere', what: 'rock and soil', e: '⛰️', c: '#f2d6a8', x: 150 },
    { at: cue('hydrosphere is'), name: 'Hydrosphere', what: 'water and ice', e: '🌊', c: '#cfeaff', x: 370 },
    { at: cue('atmosphere is'), name: 'Atmosphere', what: 'the air', e: '☁️', c: '#eef4ff', x: 590 },
    { at: cue('biosphere is'), name: 'Biosphere', what: 'living things', e: '🌳', c: '#d9f2c9', x: 810 },
  ]
  const roots = cue('tree roots crack')
  return (
    <>
      <Paper />
      <Line t={t} at={cue('four spheres') - 0.3} x={480} y={56} text="Earth’s four spheres" size={42} anchor="middle" color={M.seaDeep} />
      {S.map((s) => (
        <Pop key={s.name} t={t} at={s.at} x={s.x} y={230}>
          <circle cx={s.x} cy={230} r={95} fill={s.c} stroke={M.ink} strokeWidth={4} />
          <Emo x={s.x} y={210} size={70}>
            {s.e}
          </Emo>
          <Title x={s.x} y={358} size={28}>
            {s.name}
          </Title>
          <Title x={s.x} y={392} size={21} color={M.inkSoft}>
            {s.what}
          </Title>
        </Pop>
      ))}
      <Arrow t={t} at={roots} from={[790, 440]} to={[180, 440]} bend={-0.18} color={M.coral} width={6} dur={0.9} />
      <Chip t={t} at={roots + 0.6} x={480} y={500} text="Roots crack rock: biosphere changes geosphere" color={M.gold} size={22} />
    </>
  )
}

/** g5Science/water — 100 cups: 97 turn sea-blue, 2 icy white, 1 fresh blue, counted as named. */
const water: Scene = ({ t, cue }: SceneProps) => {
  const all = cue('100 cups')
  const salty = cue('97 cups')
  const fresh = cue('3 cups')
  const frozen = cue('frozen')
  return (
    <>
      <Paper />
      {Array.from({ length: 100 }, (_, i) => {
        const col = i % 20
        const row = Math.floor(i / 20)
        const appear = progress(t, all + i * 0.006, 0.2)
        if (appear <= 0) return null
        const fill = i < 97 ? (t >= salty + (i / 97) * 0.8 ? '#4aa6d6' : M.white) : i < 99 ? (t >= frozen ? '#f4fbff' : M.white) : t >= fresh ? '#7cc4f2' : M.white
        const glow = i >= 97 && t >= fresh
        return <rect key={i} x={110 + col * 37} y={90 + row * 52} width={28} height={40} rx={6} fill={fill} stroke={glow ? M.coral : M.ink} strokeWidth={glow ? 4 : 2.5} opacity={appear} />
      })}
      <Line t={t} at={salty + 0.6} x={110} y={380} text="97 cups: salty ocean water" size={28} color="#2a86b8" />
      <Line t={t} at={fresh + 0.3} x={110} y={425} text="3 cups: fresh water" size={28} color={M.coral} />
      <Line t={t} at={frozen + 0.2} x={110} y={470} text="(2 of them frozen in ice)" size={24} color={M.inkSoft} />
      <Glow t={t} at={cue('precious')} x={830} y={200} r={60} color={M.gold} breathe={false} />
    </>
  )
}

/** g5Science/sky — the sun climbs and sinks over a flagpole; its shadow swings from west, short at noon, to east. */
const sky: Scene = ({ t, cue }: SceneProps) => {
  const morning = cue('In the morning')
  const noon = cue('At noon')
  const evening = cue('In the evening')
  // 0 = morning (east, on the right), 0.5 = noon (high), 1 = evening (west, on the left)
  const a = t < noon ? 0.12 + 0.38 * ease.inOutCubic(progress(t, morning, noon - morning)) : 0.5 + 0.38 * ease.inOutCubic(progress(t, evening, 1.2))
  const ang = Math.PI * a
  const sx = 480 + Math.cos(ang) * 340
  const sy = 420 - Math.sin(ang) * 300
  const poleX = 480
  const base = 420
  const top = 300
  // the shadow points away from the sun: length ~ pole height / tan(elevation)
  const elev = Math.max(0.2, Math.sin(ang))
  const len = Math.min(330, (base - top) * (Math.cos(ang) === 0 ? 0 : 1) * (Math.abs(Math.cos(ang)) / elev) + 20)
  const dir = Math.cos(ang) >= 0 ? -1 : 1
  const show = t >= morning - 0.3
  return (
    <>
      <Paper />
      <rect x={0} y={base} width={960} height={120} fill="#bfe6a8" />
      <Title x={880} y={480} size={30} color={M.inkSoft}>
        East
      </Title>
      <Title x={80} y={480} size={30} color={M.inkSoft}>
        West
      </Title>
      <Line t={t} at={cue('The sun is a star')} x={40} y={60} text="The sun: a star, much closer than the rest" size={28} color="#c98a00" />
      <Glow t={t} at={cue('much closer')} x={sx} y={sy} r={80} color={M.gold} breathe={false} />
      {show && (
        <>
          <ellipse cx={poleX + (dir * len) / 2} cy={base + 6} rx={len / 2} ry={9} fill="#3d2b35" opacity={0.35} />
          <circle cx={sx} cy={sy} r={34} fill="#ffd75e" stroke={M.ink} strokeWidth={4} />
        </>
      )}
      <rect x={poleX - 5} y={top} width={10} height={base - top} fill={M.wood} stroke={M.ink} strokeWidth={2} />
      <path d={`M ${poleX + 5} ${top} L ${poleX + 70} ${top + 22} L ${poleX + 5} ${top + 44} Z`} fill={M.coral} stroke={M.ink} strokeWidth={3} />
      <Line t={t} at={cue('shadows point west') + 0.2} x={480} y={520} text="Morning: the shadow points west" size={24} anchor="middle" color={M.ink} />
      <Line t={t} at={noon + 0.4} x={480} y={110} text="Noon: shortest shadow" size={26} anchor="middle" color="#2a9b75" />
      <Line t={t} at={cue('Earth spins once')} x={40} y={100} text="Earth spins once a day" size={24} color={M.inkSoft} />
      <Burst t={t} at={evening + 1.3} x={sx} y={sy} r={60} />
    </>
  )
}

export const g5ScienceScenes: Record<string, Scene> = { particles, foodweb, spheres, water, sky }
