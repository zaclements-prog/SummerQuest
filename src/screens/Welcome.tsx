import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { sfx } from '../lib/sound'
import { Button } from '../components/ui'
import { useEntrance } from '../lib/motion'
import { TOON } from '../toon/palette'

// ── Decorative toon scene ─────────────────────────────────────────────────────
// A side view of the island in the World's palette: hazy sky, drifting outlined
// clouds, a rolling green island with the town's cottages, trees and the reef's
// lighthouse, and a pastel sea. Purely cosmetic (aria-hidden).

const L = TOON.outline

function Cloud({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  return (
    <g className="map-cloud" style={{ animation: `map-drift 7s ease-in-out ${delay}s infinite alternate` }}>
      <path
        d={`M${x - 46} ${y} q-6 -26 22 -26 q8 -26 38 -18 q20 -18 40 4 q28 -2 26 22 q14 0 12 18 Z`}
        fill={TOON.white}
        stroke={L}
        strokeWidth={3}
        strokeLinejoin="round"
        transform={`translate(${x * (1 - s)} ${y * (1 - s)}) scale(${s})`}
      />
    </g>
  )
}

function Tree({ x, y, r, c }: { x: number; y: number; r: number; c: string }) {
  return (
    <g stroke={L} strokeWidth={3} strokeLinejoin="round">
      <rect x={x - 4} y={y - 6} width={8} height={18} rx={3} fill={TOON.bark} />
      <circle cx={x} cy={y - r - 2} r={r} fill={c} />
      <circle cx={x - r * 0.35} cy={y - r * 1.35} r={r * 0.3} fill="#fff" opacity={0.35} stroke="none" />
    </g>
  )
}

function Pine({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <g stroke={L} strokeWidth={3} strokeLinejoin="round">
      <rect x={x - 3.5} y={y - 4} width={7} height={12} fill={TOON.bark} />
      <path d={`M${x} ${y - h} L${x + h * 0.38} ${y - h * 0.38} L${x - h * 0.38} ${y - h * 0.38} Z`} fill={TOON.pine} />
      <path d={`M${x} ${y - h * 0.7} L${x + h * 0.48} ${y} L${x - h * 0.48} ${y} Z`} fill={TOON.pine} />
    </g>
  )
}

function Cottage({ x, y, w, wall, roof }: { x: number; y: number; w: number; wall: string; roof: string }) {
  const h = w * 0.62
  return (
    <g stroke={L} strokeWidth={3} strokeLinejoin="round">
      <rect x={x - w / 2} y={y - h} width={w} height={h} rx={4} fill={wall} />
      <path d={`M${x - w / 2 - 10} ${y - h + 4} L${x - w * 0.18} ${y - h - w * 0.5} L${x + w * 0.18} ${y - h - w * 0.5} L${x + w / 2 + 10} ${y - h + 4} Z`} fill={roof} />
      <rect x={x + w * 0.2} y={y - h - w * 0.62} width={w * 0.12} height={w * 0.26} fill={TOON.brick} />
      <rect x={x - w * 0.1} y={y - h * 0.62} width={w * 0.2} height={h * 0.62} rx={4} fill={TOON.woodDark} />
      <rect x={x - w * 0.4} y={y - h * 0.72} width={w * 0.18} height={h * 0.3} rx={3} fill={TOON.windowGlow} />
      <rect x={x + w * 0.22} y={y - h * 0.72} width={w * 0.18} height={h * 0.3} rx={3} fill={TOON.windowGlow} />
    </g>
  )
}

function Lighthouse({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={L} strokeWidth={3} strokeLinejoin="round">
      <path d={`M${x - 16} ${y} L${x - 11} ${y - 78} L${x + 11} ${y - 78} L${x + 16} ${y} Z`} fill={TOON.white} />
      <path d={`M${x - 14.5} ${y - 24} L${x - 13} ${y - 48} L${x + 13} ${y - 48} L${x + 14.5} ${y - 24} Z`} fill={TOON.roofRed} />
      <rect x={x - 11} y={y - 96} width={22} height={18} fill={TOON.lantern} />
      <path d={`M${x - 15} ${y - 96} L${x} ${y - 114} L${x + 15} ${y - 96} Z`} fill={TOON.roofRed} />
    </g>
  )
}

function WelcomeScene() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice">
        <Cloud x={150} y={190} s={1.1} delay={0} />
        <Cloud x={1060} y={160} s={1} delay={2} />
        <Cloud x={1110} y={420} s={0.65} delay={4} />
        <Cloud x={110} y={470} s={0.6} delay={1} />

        <g transform="translate(0 80)">
        {/* sea */}
        <rect x={0} y={640} width={1200} height={240} fill={TOON.water} />
        <path d="M0 640 H1200" stroke={L} strokeWidth={3} />
        {[80, 260, 460, 700, 900, 1100].map((x, i) => (
          <path key={x} d={`M${x} ${700 + (i % 2) * 40} q12 -10 24 0 q12 -10 24 0`} stroke={TOON.foam} strokeWidth={4} fill="none" strokeLinecap="round" />
        ))}

        {/* back hills */}
        <path d="M-20 660 Q 160 520 360 600 Q 520 470 720 590 Q 900 500 1220 620 V 680 H -20 Z" fill={TOON.grassDark} stroke={L} strokeWidth={3} strokeLinejoin="round" />
        {/* the island */}
        <path d="M60 690 Q 120 600 300 610 Q 470 560 640 600 Q 820 560 980 610 Q 1110 620 1150 690 Z" fill={TOON.sand} stroke={L} strokeWidth={3} strokeLinejoin="round" />
        <path d="M110 668 Q 160 612 300 622 Q 470 576 640 614 Q 820 574 970 622 Q 1080 630 1110 668 Z" fill={TOON.grass} stroke={L} strokeWidth={3} strokeLinejoin="round" />

        <Pine x={180} y={640} h={70} />
        <Tree x={250} y={636} r={30} c={TOON.leaf} />
        <Tree x={330} y={624} r={24} c={TOON.blossom} />
        <Cottage x={460} y={610} w={74} wall={TOON.wallCream} roof={TOON.roofRed} />
        <Tree x={565} y={612} r={26} c={TOON.autumn} />
        <Cottage x={665} y={618} w={60} wall={TOON.wallBlue} roof={TOON.roofBlue} />
        <Tree x={760} y={612} r={30} c={TOON.leaf} />
        <Pine x={840} y={620} h={60} />
        <Lighthouse x={980} y={630} />
        <Tree x={1070} y={652} r={20} c={TOON.blossom} />

        {/* a boat */}
        <g stroke={L} strokeWidth={3} strokeLinejoin="round" className="map-boat" style={{ animation: 'map-bob 3.2s ease-in-out infinite' }}>
          <path d="M120 742 H200 L186 764 H134 Z" fill={TOON.wood} />
          <path d="M160 742 V690" fill="none" />
          <path d="M163 694 L196 736 H163 Z" fill={TOON.white} />
        </g>
        </g>
      </svg>
    </div>
  )
}

// ── Welcome screen ─────────────────────────────────────────────────────────────

export default function Welcome() {
  const { container, item } = useEntrance()

  return (
    <div className="relative flex-1 flex flex-col px-6 pt-[3vh] pb-[29vh] overflow-hidden">
      <WelcomeScene />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative my-auto mx-auto max-w-2xl w-full text-center flex flex-col items-center gap-3"
      >
        {/* the sun (decorative) */}
        <motion.div variants={item} className="relative grid place-items-center w-28 h-28 sm:w-32 sm:h-32" aria-hidden="true">
          <span className="absolute inset-[-35%] sunburst animate-spin-slow" />
          <span className="relative text-7xl sm:text-8xl animate-bob">🌞</span>
        </motion.div>

        <motion.h1 variants={item} className="text-display toon-title">
          SummerQuest
        </motion.h1>

        <motion.p
          variants={item}
          className="kid-text text-xl sm:text-2xl text-ink-900 max-w-md bg-paper/85 border-2 border-line/15 rounded-[1.25rem] px-5 py-2"
        >
          An island adventure to keep your brain sharp this summer
        </motion.p>

        <motion.div variants={item} className="mt-2">
          <Button
            variant="primary"
            size="lg"
            to="/avatar"
            onClick={() => sfx.enter()}
            className="!text-2xl sm:!text-3xl !px-10 !min-h-[68px]"
          >
            Start your quest →
          </Button>
        </motion.div>

        {/* low-emphasis grown-ups affordance */}
        <motion.div variants={item}>
          <Link
            to="/parent"
            onClick={() => sfx.click()}
            className="kid-text text-base text-ink-900 inline-flex items-center gap-1.5 px-4 min-h-[48px] rounded-full bg-paper/90 border-2 border-line shadow-ledge-sm hover:bg-cream-100 outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
          >
            <span aria-hidden="true">👋</span> Grown-ups start here
          </Link>
        </motion.div>

        <motion.p variants={item} className="kid-text text-base text-ink-800">
          For kids finishing 2nd, 3rd, or 4th grade
        </motion.p>
      </motion.div>
    </div>
  )
}
