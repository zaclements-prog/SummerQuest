import type { CapacitorConfig } from '@capacitor/cli'

// The Fire OS (Amazon Appstore) wrapper around the store build: `npm run build:store`
// writes dist/, `npx cap sync android` copies it into android/. The app is served from
// the APK by Capacitor's local server (https://localhost), never from the network.
const config: CapacitorConfig = {
  appId: 'com.summerquest.app',
  appName: 'SummerQuest',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    // Release builds never expose the WebView to chrome://inspect.
    webContentsDebuggingEnabled: false,
  },
}

export default config
