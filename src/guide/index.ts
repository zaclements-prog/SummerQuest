/**
 * The Guide: one narrator plus a spotlight and a pointing hand for every screen
 * (K–5 plan §4). See ./store.ts for the API. The 3D marker lives in
 * ./GuideMarker (imported directly, to keep three.js out of 2D screens).
 */
export {
  guide,
  useGuide,
  useGuideSpeaking,
  useGuideCaption,
  registerGuideTarget,
  type Guide,
  type GuideStep,
  type GuideTarget,
  type GuideEvent,
  type GuideCue,
  type HandMode,
  type RunOptions,
} from './store'
export { default as GuideLayer } from './GuideLayer'
export { SayAgainButton } from './SayAgainButton'
export { useIdleReprompt, IDLE_REPROMPT_MS } from './useIdleReprompt'
