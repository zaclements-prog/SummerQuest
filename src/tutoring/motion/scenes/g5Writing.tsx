 
import { ease, progress } from '../anim'
import { Arrow, Burst, Chip, Glow, Paper, Pop, Title } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { Line, Panel, Swipe, TickMark } from './_g5kit'

/*
 * Grade-5 Writing Workshop: each scene builds the piece of writing the
 * narration describes (the opinion sandwich, linking-word bridges, a page of
 * paragraphs, a line of dialogue, a story's pacing). The pad's checklist items
 * are what light up.
 */

/** g5Writing/opinion — the sandwich builds layer by layer: opinion, reason + evidence, reason + evidence, conclusion. */
const opinion: Scene = ({ t, cue }: SceneProps) => {
  const layers = [
    { at: cue('Start with your opinion'), text: 'Opinion: Schools should have gardens.', color: '#e9b56c' },
    { at: cue('give a reason'), text: 'Reason: gardens teach science', color: '#7fd36b' },
    { at: cue('evidence'), text: 'Evidence: students measured bean plants', color: '#f2766b' },
    { at: cue('another reason'), text: 'Reason + evidence: more vegetables eaten', color: '#ffcf4d' },
    { at: cue('Finish by saying'), text: 'Conclusion: let’s plant one!', color: '#e9b56c' },
  ]
  return (
    <>
      <Paper />
      <Pop t={t} at={cue('built like a sandwich') - 0.3} x={480} y={56}>
        <Title x={480} y={56} size={42} color={M.coral} stroke={M.white}>
          The opinion sandwich
        </Title>
      </Pop>
      {layers.map((l, i) => {
        const k = ease.outBack(progress(t, l.at, 0.5))
        if (k <= 0) return null
        const y = 110 + i * 82
        return (
          <g key={i} transform={`translate(0 ${(1 - k) * -40})`} opacity={Math.min(1, k * 2)}>
            <rect x={150} y={y} width={660} height={68} rx={i === 0 || i === 4 ? 34 : 14} fill={l.color} stroke={M.ink} strokeWidth={4} />
            <Title x={480} y={y + 35} size={26}>
              {l.text}
            </Title>
          </g>
        )
      })}
      <Burst t={t} at={cue('new words') + 0.2} x={820} y={470} r={60} />
    </>
  )
}

/** g5Writing/linking — two idea islands; a bridge plank per linking word drops in as it is named. */
const linking: Scene = ({ t, cue }: SceneProps) => {
  const words = [
    { at: cue('because'), w: 'because', job: 'a reason', c: '#cfeaff' },
    { at: cue('for example'), w: 'for example', job: 'evidence', c: '#ffe0dc' },
    { at: cue('also'), w: 'also · in addition', job: 'add more', c: '#d9f2c9' },
    { at: cue('however'), w: 'however', job: 'turn', c: '#e3d7fb' },
    { at: cue('therefore'), w: 'therefore', job: 'a result', c: '#fff0b8' },
  ]
  return (
    <>
      <Paper />
      <Panel t={t} at={0.2} x={30} y={160} w={170} h={220} fill="#d9f2c9">
        <Title x={115} y={270} size={30}>
          Idea
        </Title>
      </Panel>
      <Panel t={t} at={0.4} x={760} y={160} w={170} h={220} fill="#d9f2c9">
        <Title x={845} y={270} size={30}>
          Idea
        </Title>
      </Panel>
      <Line t={t} at={cue('bridges between ideas')} x={480} y={70} text="Linking words are bridges" size={40} anchor="middle" color={M.seaDeep} />
      {words.map((w, i) => (
        <Panel key={w.w} t={t} at={w.at} x={230} y={130 + i * 72} w={500} h={60} fill={w.c}>
          <Title x={420} y={161} size={26}>
            {w.w}
          </Title>
          <Title x={640} y={161} size={20} color={M.inkSoft}>
            {w.job}
          </Title>
        </Panel>
      ))}
    </>
  )
}

/** g5Writing/paragraphs — a page: the topic sentence, indented paragraph blocks, the conclusion. */
const paragraphs: Scene = ({ t, cue }: SceneProps) => {
  const topic = cue('topic sentence')
  const group = cue('Group facts')
  const fresh = cue('new paragraph')
  const end = cue('conclusion')
  const bar = (x: number, y: number, w: number, at: number, c: string) => {
    const k = ease.outCubic(progress(t, at, 0.4))
    return k > 0 ? <rect x={x} y={y} width={w * k} height={16} rx={8} fill={c} /> : null
  }
  return (
    <>
      <Paper />
      <Panel t={t} at={0.1} x={250} y={30} w={460} h={480} fill={M.white}>
        {bar(290, 70, 380, topic, M.coral)}
        {[0, 1, 2].map((i) => bar(i === 0 ? 320 : 290, 130 + i * 30, i === 2 ? 240 : 360, group + i * 0.2, '#7cc4f2'))}
        {[0, 1, 2].map((i) => bar(i === 0 ? 320 : 290, 250 + i * 30, i === 2 ? 200 : 360, fresh + i * 0.2, M.mint))}
        {bar(290, 400, 380, end, M.lilac)}
      </Panel>
      <Line t={t} at={topic} x={740} y={78} text="Topic sentence" size={26} color={M.coral} />
      <Line t={t} at={group} x={740} y={160} text="Paragraph 1: facts" size={26} color="#2a86b8" />
      <Line t={t} at={fresh} x={740} y={280} text="New idea, new paragraph" size={24} color="#2a9b75" />
      <Line t={t} at={end} x={740} y={408} text="Conclusion" size={26} color="#8559cf" />
      <Arrow t={t} at={fresh + 0.3} from={[230, 210]} to={[300, 252]} bend={0.3} color={M.ink} width={4} />
    </>
  )
}

/** g5Writing/dialogue — a line of dialogue builds: the words, the quotation marks, the comma inside, the speaker. */
const dialogue: Scene = ({ t, cue }: SceneProps) => {
  const marks = cue('quotation marks')
  const comma = cue('comma or end mark')
  const tag = cue('speaker tag')
  const pop = (at: number) => ease.outBack(progress(t, at, 0.4))
  const y = 250
  return (
    <>
      <Paper />
      <Line t={t} at={0.2} x={480} y={80} text="Dialogue: who says what" size={40} anchor="middle" color={M.seaDeep} />
      <Panel t={t} at={0.4} x={90} y={170} w={780} h={160} fill="#fff8e1">
        <Title x={430} y={y} size={52}>
          Wait for me
        </Title>
        {pop(marks) > 0 && (
          <g opacity={Math.min(1, pop(marks))}>
            <Title x={245} y={y} size={64} color={M.coral}>
              “
            </Title>
            <Title x={628} y={y} size={64} color={M.coral}>
              ”
            </Title>
          </g>
        )}
        {pop(comma) > 0 && (
          <Title x={604} y={y + 4} size={64} color="#3f6fd1">
            ,
          </Title>
        )}
        {pop(tag) > 0 && (
          <g opacity={Math.min(1, pop(tag))}>
            <Title x={740} y={y} size={46} color={M.inkSoft}>
              said Mia.
            </Title>
          </g>
        )}
      </Panel>
      <Glow t={t} at={comma} x={612} y={y} r={60} color={M.gold} breathe={false} />
      <Line t={t} at={comma + 0.3} x={480} y={380} text="The comma goes INSIDE the quotation marks." size={28} anchor="middle" color="#3f6fd1" />
      <Chip t={t} at={cue('new character speaks')} x={480} y={460} text="New speaker? New paragraph!" color={M.gold} size={24} />
      <TickMark t={t} at={tag + 0.5} x={860} y={200} />
    </>
  )
}

/** g5Writing/pacing — a story timeline: the big moment stretched wide and slow, the dull parts squeezed with transitions. */
const pacing: Scene = ({ t, cue }: SceneProps) => {
  const slow = cue('Slow down')
  const speed = cue('Speed up')
  const stretch = ease.inOutCubic(progress(t, slow + 0.3, 1))
  const squeeze = ease.inOutCubic(progress(t, speed + 0.2, 0.8))
  const bigW = 220 + 200 * stretch
  const dullW = 200 - 110 * squeeze
  const x0 = 60
  return (
    <>
      <Paper />
      <Line t={t} at={0.2} x={480} y={70} text="Pacing" size={44} anchor="middle" color={M.coral} />
      <rect x={x0} y={200} width={dullW} height={90} rx={16} fill="#cfeaff" stroke={M.ink} strokeWidth={4} />
      <rect x={x0 + dullW + 20} y={180} width={bigW} height={130} rx={16} fill="#ffe0dc" stroke={M.ink} strokeWidth={4} />
      <rect x={x0 + dullW + bigW + 40} y={200} width={dullW} height={90} rx={16} fill="#cfeaff" stroke={M.ink} strokeWidth={4} />
      <Title x={x0 + dullW + 20 + bigW / 2} y={230} size={28}>
        The big moment
      </Title>
      <Line t={t} at={cue('sees, hears and feels')} x={x0 + dullW + 20 + bigW / 2} y={275} text="see · hear · feel" size={22} anchor="middle" color={M.coral} />
      <Chip t={t} at={cue('later that day')} x={240} y={380} text="Later that day," color="#cfeaff" size={22} />
      <Chip t={t} at={cue('meanwhile')} x={480} y={380} text="Meanwhile," color="#cfeaff" size={22} />
      <Chip t={t} at={cue('after that')} x={710} y={380} text="After that," color="#cfeaff" size={22} />
      <Pop t={t} at={cue('real ending')} x={480} y={470}>
        <rect x={330} y={440} width={300} height={60} rx={30} fill={M.gold} stroke={M.ink} strokeWidth={4} />
        <Title x={480} y={471} size={28}>
          The End
        </Title>
      </Pop>
      <Swipe t={t} at={slow + 0.2} x={x0 + dullW + 30} y={320} w={bigW - 20} h={10} color={M.coral} />
    </>
  )
}

export const g5WritingScenes: Record<string, Scene> = { opinion, linking, paragraphs, dialogue, pacing }
