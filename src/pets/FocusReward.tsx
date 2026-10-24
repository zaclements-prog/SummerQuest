import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Celebration } from '../components/ui'
import { useListenSay } from '../components/listen/useListenSay'
import { useProgress } from '../store/progress'
import { isCalmRoute } from '../lib/pets/moments'
import { usePetUi } from '../lib/pets/usePetUi'
import { FOCUS_BADGE_ID, FOCUS_REWARD_COINS } from '../lib/pets/schoolPet'
import { focusRewardText } from '../lib/pets/copy'
import { sfx } from '../lib/sound'

/** Wait this long on a calm screen before celebrating (ms): sooner than a pet moment, so the reward comes first. */
const SETTLE_MS = 500

/** Another dialog is up (a zone or badge celebration, the grown-ups' check): wait for it. */
function otherDialogOpen(): boolean {
  return document.querySelector('[aria-modal="true"]:not([data-pet-calm])') !== null
}

/**
 * The "finished everything" reward, mounted once in the app shell: the child
 * cleared every skill on This Week's Focus by practice (lib/pets/schoolPet),
 * the store already paid the coins (at most once a week), and this shows the
 * app's celebration card for it at the next calm moment (the same calm screens
 * as pet moments), with the Focus Finisher badge. Closing it marks it shown
 * and the badge seen (so the map's badge card doesn't repeat it). A raven that
 * grew from the same practice celebrates right after, as a pet moment.
 */
export default function FocusReward() {
  const { pathname } = useLocation()
  const player = useProgress((s) => s.player)
  const pending = useProgress((s) => s.schoolPet.rewardPending)
  const lessonOpen = usePetUi((s) => s.lessonCompleteOpen)
  const calm = !!player && isCalmRoute(pathname, lessonOpen)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open || !calm || !pending) return
    let timer = 0
    const tryOpen = () => {
      if (otherDialogOpen()) {
        timer = window.setTimeout(tryOpen, 600)
        return
      }
      setOpen(true)
      sfx.fanfare()
    }
    timer = window.setTimeout(tryOpen, SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [open, calm, pending])

  const visible = open && calm && pending
  // K–1: said out loud
  useListenSay(visible, { line: 'k-nav/focusAllDone' })

  const close = () => {
    const s = useProgress.getState()
    s.markFocusRewardCelebrated()
    s.markBadgesSeen([FOCUS_BADGE_ID])
    setOpen(false)
  }
  const text = focusRewardText()
  return (
    <Celebration open={visible} onClose={close} title={text.title} coins={FOCUS_REWARD_COINS}>
      {text.line}
    </Celebration>
  )
}
