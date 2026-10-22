/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { Arrow, Burst, Chip, Glow, Paper, Pop, Title } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { Line, Panel, Swipe, TickMark } from './_g5kit'

/*
 * Grade-5 Reading Reef: each scene builds the reading move the narration names,
 * with the passages' own examples (Rafi's bridge, the memory quilt, the storm
 * accounts). Sea colours for the reef; GOLD marks the answer being found.
 */

/**
 * g5Reading/theme — three story beats pop in as the narration tells them
 * (falls apart → rebuilds with triangles → it holds), an arrow under them for
 * the change, then the theme banner lands on "Mistakes can teach".
 */
const theme: Scene = ({ t, cue }: SceneProps) => {
  const beats = [
    { at: cue('falls apart'), text: 'The bridge falls', icon: '💥' },
    { at: cue('rebuilds'), text: 'He uses triangles', icon: '🔺' },
    { at: cue('it holds'), text: 'The bridge holds!', icon: '🏆' },
  ]
  const lesson = cue('Mistakes can teach')
  return (
    <>
      <Paper />
      <Pop t={t} at={cue('big lesson') - 0.4} x={480} y={64}>
        <Title x={480} y={64} size={46} color={M.seaDeep} stroke={M.white}>
          Theme = the big lesson
        </Title>
      </Pop>
      {beats.map((b, i) => (
        <Panel key={i} t={t} at={b.at} x={70 + i * 290} y={130} w={240} h={170} fill={i === 2 ? '#fff4cf' : M.white}>
          <text x={190 + i * 290} y={190} fontSize={54} textAnchor="middle" dominantBaseline="middle">
            {b.icon}
          </text>
          <Title x={190 + i * 290} y={258} size={24}>
            {b.text}
          </Title>
        </Panel>
      ))}
      <Arrow t={t} at={cue('main character changes')} from={[110, 330]} to={[850, 330]} bend={-0.08} color={M.coral} width={6} dur={0.9} />
      <Line t={t} at={cue('main character changes') + 0.3} x={480} y={362} text="How does the character change?" size={24} color={M.inkSoft} anchor="middle" />
      <Panel t={t} at={lesson} x={130} y={400} w={700} h={100} fill={M.gold}>
        <Title x={480} y={450} size={32}>
          Mistakes can teach us to do better.
        </Title>
      </Panel>
      <Burst t={t} at={cue('That is the theme')} x={830} y={410} r={70} />
    </>
  )
}

/**
 * g5Reading/figurative — three cards, one per figure of speech, each popping
 * in on its name with the example from the passages and what it really means.
 */
const figurative: Scene = ({ t, cue }: SceneProps) => {
  const cards = [
    { at: cue('A simile'), name: 'Simile', rule: 'like / as', ex: 'sagged like a', ex2: 'tired horse', color: '#cfeaff' },
    { at: cue('A metaphor'), name: 'Metaphor', rule: 'one thing IS another', ex: 'the quilt is a', ex2: 'map of her life', color: '#e3d7fb' },
    { at: cue('An idiom'), name: 'Idiom', rule: 'a hidden meaning', ex: 'spill the beans', ex2: '= tell a secret', color: '#ffe0dc' },
  ]
  return (
    <>
      <Paper />
      <Pop t={t} at={0.2} x={480} y={60}>
        <Title x={480} y={60} size={44} color={M.seaDeep} stroke={M.white}>
          Figurative language
        </Title>
      </Pop>
      {cards.map((c, i) => (
        <Panel key={c.name} t={t} at={c.at} x={50 + i * 300} y={120} w={260} h={330} fill={c.color}>
          <Title x={180 + i * 300} y={170} size={38}>
            {c.name}
          </Title>
          <Title x={180 + i * 300} y={220} size={22} color={M.inkSoft}>
            {c.rule}
          </Title>
          <rect x={70 + i * 300} y={260} width={220} height={120} rx={14} fill={M.white} stroke={M.ink} strokeWidth={2.5} />
          <Title x={180 + i * 300} y={300} size={23}>
            {c.ex}
          </Title>
          <Title x={180 + i * 300} y={338} size={23}>
            {c.ex2}
          </Title>
        </Panel>
      ))}
      <Glow t={t} at={cue('means to tell a secret')} x={780} y={320} r={150} color={M.gold} breathe={false} />
      <Chip t={t} at={cue('means to tell a secret') + 0.2} x={780} y={480} text="not about beans!" color={M.gold} size={22} />
    </>
  )
}

/** A little narrator: a head and shoulders. */
function Person({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={26} fill="#ffd9b8" stroke={M.ink} strokeWidth={4} />
      <path d={`M ${x - 40} ${y + 76} Q ${x - 40} ${y + 32} ${x} ${y + 32} Q ${x + 40} ${y + 32} ${x + 40} ${y + 76} Z`} fill={color} stroke={M.ink} strokeWidth={4} />
    </g>
  )
}

/**
 * g5Reading/narrator — two story pages. First person: the narrator stands IN
 * the page with "I, we" in a bubble. Third person: the narrator stands
 * outside, pointing in, with "he, she, they".
 */
const narrator: Scene = ({ t, cue }: SceneProps) => {
  const first = cue('first person')
  const third = cue('third person')
  return (
    <>
      <Paper />
      <Panel t={t} at={first - 0.6} x={60} y={120} w={380} h={300} fill="#fff8e1">
        <Person x={250} y={250} color={M.coral} />
        <rect x={290} y={150} width={130} height={60} rx={20} fill={M.white} stroke={M.ink} strokeWidth={3} />
        <Title x={355} y={181} size={28}>
          I, we
        </Title>
      </Panel>
      <Line t={t} at={first} x={250} y={455} text="First person" size={34} anchor="middle" color={M.coral} />
      <Line t={t} at={first + 0.4} x={250} y={495} text="a character tells it" size={22} anchor="middle" color={M.inkSoft} />
      <Panel t={t} at={third - 0.6} x={560} y={120} w={260} h={300} fill="#fff8e1">
        <circle cx={650} cy={250} r={18} fill="#cfeaff" stroke={M.ink} strokeWidth={3} />
        <circle cx={720} cy={300} r={18} fill="#e3d7fb" stroke={M.ink} strokeWidth={3} />
      </Panel>
      <Pop t={t} at={third} x={880} y={240}>
        <Person x={880} y={220} color={M.mint} />
        <rect x={810} y={120} width={140} height={56} rx={20} fill={M.white} stroke={M.ink} strokeWidth={3} />
        <Title x={880} y={149} size={22}>
          he, she, they
        </Title>
      </Pop>
      <Line t={t} at={third + 0.2} x={690} y={455} text="Third person" size={34} anchor="middle" color={M.seaDeep} />
      <Line t={t} at={third + 0.6} x={690} y={495} text="told from outside" size={22} anchor="middle" color={M.inkSoft} />
      <Glow t={t} at={cue('own thoughts')} x={250} y={280} r={140} color={M.gold} breathe={false} />
    </>
  )
}

/**
 * g5Reading/structure — four structure tiles, each popping in on its name
 * with its signal words underlined.
 */
const structure: Scene = ({ t, cue }: SceneProps) => {
  const tiles = [
    { at: cue('time order'), name: 'Time order', words: 'first · next · finally', color: '#cfeaff' },
    { at: cue('cause and effect'), name: 'Cause and effect', words: 'because · so', color: '#ffe0dc' },
    { at: cue('compare and contrast'), name: 'Compare and contrast', words: 'both · but · however', color: '#e3d7fb' },
    { at: cue('problem and solution'), name: 'Problem and solution', words: 'problem → fix', color: '#d9f2c9' },
  ]
  return (
    <>
      <Paper />
      <Pop t={t} at={0.2} x={480} y={58}>
        <Title x={480} y={58} size={42} color={M.seaDeep} stroke={M.white}>
          Text structure: look for signal words
        </Title>
      </Pop>
      {tiles.map((s, i) => {
        const x = i % 2 === 0 ? 70 : 500
        const y = i < 2 ? 120 : 320
        return (
          <Panel key={s.name} t={t} at={s.at} x={x} y={y} w={390} h={170} fill={s.color}>
            <Title x={x + 195} y={y + 55} size={32}>
              {s.name}
            </Title>
            <Swipe t={t} at={s.at + 0.4} x={x + 40} y={y + 115} w={310} h={44} />
            <Title x={x + 195} y={y + 116} size={26} color={M.inkSoft}>
              {s.words}
            </Title>
          </Panel>
        )
      })}
    </>
  )
}

/**
 * g5Reading/compare — two overlapping circles (a Venn diagram): the logbook
 * on the left, the news report on the right, "both" in the middle.
 */
const compare: Scene = ({ t, cue }: SceneProps) => {
  const side = cue('side by side')
  const both = cue('What do both')
  return (
    <>
      <Paper />
      <Pop t={t} at={cue('two texts') - 0.3} x={340} y={290}>
        <circle cx={340} cy={290} r={200} fill="#cfeaff" fillOpacity={0.75} stroke={M.ink} strokeWidth={4} />
      </Pop>
      <Pop t={t} at={side} x={620} y={290}>
        <circle cx={620} cy={290} r={200} fill="#ffe0dc" fillOpacity={0.75} stroke={M.ink} strokeWidth={4} />
      </Pop>
      <Line t={t} at={cue('logbook')} x={260} y={180} text="Logbook" size={32} anchor="middle" />
      <Line t={t} at={cue('shares feelings')} x={250} y={290} text="feelings" size={26} anchor="middle" color={M.seaDeep} />
      <Line t={t} at={cue('news report')} x={700} y={180} text="News report" size={32} anchor="middle" />
      <Line t={t} at={cue('facts and quotes')} x={705} y={290} text="facts, quotes" size={26} anchor="middle" color={M.coral} />
      <Line t={t} at={both} x={480} y={270} text="Both:" size={26} anchor="middle" />
      <Line t={t} at={both + 0.3} x={480} y={310} text="the storm" size={24} anchor="middle" color={M.inkSoft} />
      <TickMark t={t} at={cue('Same event')} x={480} y={360} />
      <Chip t={t} at={cue('two points of view')} x={480} y={515} text="Same event, two points of view" color={M.gold} size={24} />
    </>
  )
}

export const g5ReadingScenes: Record<string, Scene> = { theme, figurative, narrator, structure, compare }
