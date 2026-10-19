/**
 * Web platform shell, imported once from src/main.tsx: audio unlock for
 * iOS / autoplay rules, persistent storage for saves, and touch guards.
 * Every piece is a no-op where it doesn't apply.
 */
import { installAudioUnlock } from './audioUnlock'
import { persistStorageAfterFirstGesture } from './storage'
import { installTouchGuards } from './touchGuards'

installAudioUnlock()
persistStorageAfterFirstGesture()
installTouchGuards()
