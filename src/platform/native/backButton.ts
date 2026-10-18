/** Screens where Back leaves the app instead of going back a screen. */
export const ROOT_PATHS = ['/', '/world', '/avatar']

/** What the hardware Back button does on `pathname`. */
export function backAction(pathname: string, canGoBack: boolean): 'exit' | 'back' | 'hub' {
  if (ROOT_PATHS.includes(pathname)) return 'exit'
  return canGoBack ? 'back' : 'hub'
}

/** Lessons play narration with no touches for minutes: keep the screen on there. */
export function keepsAwake(pathname: string): boolean {
  return pathname.startsWith('/tutor/')
}
