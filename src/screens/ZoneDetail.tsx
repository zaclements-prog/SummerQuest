import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getZone } from '../curriculum'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'

const KIND_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  concept: { label: 'Learn', color: 'bg-ocean-500', icon: '💡' },
  practice: { label: 'Practice', color: 'bg-quest-500 text-quest-900', icon: '⚡' },
  mastery: { label: 'Boss', color: 'bg-monster-500', icon: '👹' },
}

export default function ZoneDetail() {
  const { zoneId = '' } = useParams()
  const navigate = useNavigate()
  const zone = getZone(zoneId)
  const zoneProgress = useProgress((s) => s.zones[zoneId])

  if (!zone) {
    return (
      <div className="flex-1 flex items-center justify-center text-white">
        <div>
          <p className="kid-text text-2xl">Zone not found.</p>
          <Link to="/map" className="underline">
            Back to map
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center p-6">
      <div className="max-w-3xl w-full">
        <button
          onClick={() => {
            sfx.click()
            navigate('/map')
          }}
          className="text-white/80 hover:text-white kid-text mb-3"
        >
          ← Back to map
        </button>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-quest-400 p-6 text-quest-900">
            <div className="flex items-center gap-4">
              <div className="text-7xl">{zone.emoji}</div>
              <div>
                <h2 className="kid-text text-4xl">{zone.title}</h2>
                <p className="kid-text text-xl opacity-80">{zone.subtitle}</p>
              </div>
            </div>
            <p className="mt-4 text-quest-900/90 leading-relaxed">
              {zone.description}
            </p>
            <p className="mt-2 kid-text text-sm">
              About {zone.estimatedMinutes} min total
            </p>
          </div>

          <div className="p-6 space-y-4">
            {zone.stages.map((stage, idx) => {
              const meta = KIND_LABEL[stage.kind]
              const record = zoneProgress?.stages[stage.id]
              const prevStage = idx > 0 ? zone.stages[idx - 1] : null
              const prevDone =
                !prevStage ||
                (zoneProgress?.stages[prevStage.id]?.stars ?? 0) > 0
              const locked = !prevDone

              return (
                <motion.div
                  key={stage.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`border-4 rounded-2xl p-4 flex items-center gap-4 ${
                    locked
                      ? 'border-gray-200 opacity-60'
                      : record?.stars
                        ? 'border-correct-500'
                        : 'border-quest-300'
                  }`}
                >
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl text-white ${meta.color}`}
                  >
                    {meta.icon}
                  </div>
                  <div className="flex-1">
                    <div className="kid-text text-sm uppercase tracking-wide text-gray-500">
                      Step {idx + 1} · {meta.label}
                    </div>
                    <div className="kid-text text-2xl text-ocean-900">
                      {stage.title}
                    </div>
                    <div className="text-gray-600 text-sm">{stage.description}</div>
                    {record && (
                      <div className="mt-1 text-sm text-correct-600 kid-text">
                        Best: {record.bestScore} · ⭐ {record.stars}/
                        {stage.starsToEarn} · {record.attempts} tries
                      </div>
                    )}
                  </div>
                  <button
                    disabled={locked}
                    onClick={() => {
                      sfx.enter()
                      navigate(`/play/${zone.id}/${stage.id}`)
                    }}
                    className={`btn-quest text-white ${
                      locked
                        ? 'bg-gray-300 cursor-not-allowed'
                        : record?.stars
                          ? 'bg-correct-500'
                          : 'bg-ocean-500'
                    }`}
                    style={{
                      borderColor: locked
                        ? '#9ca3af'
                        : record?.stars
                          ? '#16a34a'
                          : '#1d4ed8',
                    }}
                  >
                    {locked ? '🔒' : record?.stars ? 'Replay' : 'Play'}
                  </button>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
