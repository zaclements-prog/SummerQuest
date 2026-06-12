import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { getLesson } from '../tutoring/lessons'
import VisualRenderer from '../components/VisualRenderer'
import { useNarration } from '../lib/narration'
import { sfx } from '../lib/sound'

export default function TutorScreen() {
  const { lessonId = '' } = useParams()
  const navigate = useNavigate()
  const lesson = getLesson(lessonId)
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | number | null>(null)

  if (!lesson) {
    return <div className="text-white p-6">Lesson not found. <Link to="/tutor" className="underline">Back</Link></div>
  }
  const step = lesson.steps[i]
  const last = i === lesson.steps.length - 1
  const { playing, play, stop } = useNarration(lesson.id, step.id, step.narration)

  const next = () => {
    stop(); setPicked(null)
    if (last) navigate(`/play/${lesson.zoneId}/${lesson.practiceStageId}`)
    else setI(i + 1)
  }

  return (
    <div className="flex-1 flex flex-col p-4 text-white">
      <div className="max-w-2xl w-full mx-auto">
        <Link to="/tutor" className="kid-text inline-block mb-2" onClick={stop}>← Lessons</Link>
        <div className="text-center mb-3">
          <div className="text-5xl">{lesson.emoji}</div>
          <h2 className="kid-text text-3xl">{lesson.title}</h2>
          <div className="text-white/70 text-sm">Step {i + 1} of {lesson.steps.length}</div>
        </div>

        <motion.div key={step.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <button onClick={() => (playing ? stop() : play())}
              className="text-3xl flex-shrink-0" aria-label="Play narration">
              {playing ? '⏸️' : '🔊'}
            </button>
            <p className="kid-text text-xl leading-relaxed">{step.narration}</p>
          </div>
          {step.visual && (
            <div className="flex justify-center my-4"><VisualRenderer visual={step.visual} size="lg" /></div>
          )}
          {step.body && <p className="text-white/90 text-center mt-2">{step.body}</p>}

          {step.check && (
            <div className="mt-4">
              <div className="kid-text text-lg mb-2">{step.check.question}</div>
              <div className="grid grid-cols-2 gap-2">
                {step.check.options.map((opt) => {
                  const isAnswer = opt === step.check!.answer
                  const chosen = picked === opt
                  const show = picked !== null
                  return (
                    <button key={String(opt)} disabled={show}
                      onClick={() => { setPicked(opt); opt === step.check!.answer ? sfx.correct() : sfx.wrong() }}
                      className={`kid-text text-2xl py-3 rounded-2xl border-4 ${
                        show && isAnswer ? 'bg-correct-500 border-correct-500'
                        : chosen ? 'bg-wrong-500 border-wrong-500'
                        : 'bg-white text-ocean-900 border-white'}`}>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {picked !== null && <p className="mt-2 text-white/90">{step.check.explain}</p>}
            </div>
          )}
        </motion.div>

        <div className="flex justify-between mt-4">
          <button className="kid-text px-4 py-2 rounded-full bg-white/20"
            disabled={i === 0} onClick={() => { stop(); setPicked(null); setI(Math.max(0, i - 1)) }}>← Back</button>
          <button className="btn-quest bg-correct-500 text-white" style={{ borderColor: '#16a34a' }}
            onClick={next} disabled={!!step.check && picked === null}>
            {last ? 'Now practice →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
