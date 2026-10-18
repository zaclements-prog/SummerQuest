import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import { KeepAwake } from '@capacitor-community/keep-awake'
import { backAction, keepsAwake } from './backButton'

/**
 * The Fire OS (Capacitor) side of the shell, rendered inside the router. On the web
 * it renders nothing and does nothing.
 *  - Back button: go back a screen; from the World (or the first-run screens) leave the app.
 *  - Keep-awake while a lesson is open.
 */
export default function NativeShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pathRef = useRef(pathname)
  useEffect(() => {
    pathRef.current = pathname
  }, [pathname])
  const native = Capacitor.isNativePlatform()

  useEffect(() => {
    if (!native) return
    const handle = NativeApp.addListener('backButton', ({ canGoBack }) => {
      const action = backAction(pathRef.current, canGoBack)
      if (action === 'exit') void NativeApp.exitApp()
      else if (action === 'back') navigate(-1)
      else navigate('/world', { replace: true })
    })
    return () => {
      void handle.then((h) => h.remove())
    }
  }, [native, navigate])

  const awake = native && keepsAwake(pathname)
  useEffect(() => {
    if (!awake) return
    void KeepAwake.keepAwake().catch(() => {})
    return () => {
      void KeepAwake.allowSleep().catch(() => {})
    }
  }, [awake])

  return null
}
