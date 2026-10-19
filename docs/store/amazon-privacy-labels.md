# Amazon Appstore privacy labels: answers for SummerQuest

These are the answers for the **User data privacy** section of the Developer Console (in
**Target Your App**). Amazon builds the app's privacy label from them. It shows on the app's
detail page on Fire tablets and on Amazon.com.

They apply to the **store build** only (`npm run build:store`). That build has no local-AI
feature and is checked so that it can't reach any server.

> The wording below follows Amazon's documentation as of October 2026. Field names in the
> console may differ a little. TODO(owner): compare each answer with the live form when you
> fill it in.

## The main question

**Does your app collect or transfer user data?** **No.**

Why: everything the app stores stays in the app's own storage on the tablet (see the list
below). Nothing is sent off the device, to us or to anyone else. The app makes no network
requests at all. The store build is checked for this on every build.

Because the answer is No, Amazon doesn't open the per-category questionnaire. The account and
data-deletion questions don't appear either.

## If the console asks category by category anyway

| Data category (Amazon) | Collected | Transferred to third parties | Notes |
|---|---|---|---|
| User info (name, email, address, phone, other IDs) | No | No | The child's first name or nickname is saved on the tablet only. It is never sent. |
| Financial info | No | No | No purchases and no payment details. |
| Location (precise or approximate) | No | No | Not requested or used. |
| Health & fitness | No | No | |
| Messages / emails / texts | No | No | No chat or messaging. |
| Photos, videos, audio | No | No | No camera or microphone. |
| Files and documents | No | No | |
| Contacts | No | No | |
| Calendar | No | No | |
| App activity (interactions, search, content the user made) | No | No | Progress and the per-question learning history stay on the tablet. Writing practice is scored on the tablet and isn't saved. |
| Web browsing | No | No | No browser and no links out. |
| App info and performance (crash logs, diagnostics) | No | No | Errors are logged to the device console only. There is no crash reporter. |
| Device or other IDs | No | No | No advertising ID, no device ID and no fingerprinting. |

**Purposes** (analytics, advertising, personalization, and so on): none, because nothing is
collected or transferred.

**Third-party libraries / SDKs that collect data:** none. The app contains no ad, analytics,
crash-reporting or social SDKs. Its only libraries are open-source code bundled into the app
(React, three.js and similar) that runs entirely on the device.

## Related answers

- **Privacy policy URL:** https://zaclements-prog.github.io/summerquest-site/privacy/ (live since 2026-10-18, built from
  `privacy-policy.md` by the `summerquest-site` repo). Amazon only requires the URL when you
  answer Yes above; provide it anyway, as expected for a child-directed app.
- **Does the app allow account creation?** No. There are no accounts, so there's no
  account-deletion URL.
- **Data deletion:** in the app (Parent area → Danger zone → Reset all progress, behind the
  grown-up check), or by uninstalling the app or clearing its data.
- **Data encrypted in transit:** not applicable, because no data is transmitted.
- **Child-directed / COPPA (Target Your App → audience):** yes, this app is directed at
  children under 13 (elementary school; today's content covers grades 2–4). See `content-rating.md`.

## Before you submit: keep these answers true

These depend on the native wrapper for Fire OS, not on the web build:

- ✅ No `INTERNET` permission: the Capacitor wrapper requests no permissions at all (checked
  on the debug and the signed release APK).
- ✅ `android:allowBackup="false"`: the child's name and progress are never copied to a cloud backup.
- ✅ No other permissions (location, camera, microphone, contacts, storage).
- ✅ No SDKs: only Capacitor core, `@capacitor/app` (Back button) and
  `@capacitor-community/keep-awake`. If an SDK is ever added, these answers and the privacy
  policy must change first.
- ✅ Text-to-speech: all 45 lesson steps have recorded narration, so the device voice fallback
  isn't used in practice (it would only speak lesson text).
- Run `npm run build:store` for every release. Its check fails the build if the bundle
  can reach the network.
