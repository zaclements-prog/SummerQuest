# Amazon Appstore listing: draft for SummerQuest

A draft of the **Appstore Details** step (text, category, images) for the Fire tablet
listing. Field limits are from Amazon's docs as of October 2026:

- display title up to 200 characters;
- short description up to about 1,200 characters;
- long description up to 4,000 characters, plain text;
- up to 10 feature bullets;
- keywords optional.

TODO(owner): check the limits against the live form.

## v2 update (versionCode 2, prepared 2026-10-23)

v2 offers **kindergarten through 5th grade** (v1: grades 2–4), with teacher-voice narration for
K–1 and every lesson, a first quest and today's quest, per-grade game tuning and missed-fact
practice in the 3D games. Paste these over the v1 text; everything not listed here stays as is.

- **APK:** Replace with `summerquest-2.0-release.apk` (versionCode 2). Use Replace, not Add.
- **Category:** Kids (Learning Subjects unchanged; add Alphabet and Reading if offered).
- **Target audience:** 0–12, unchanged. **Content rating:** unchanged (all None, Academic yes).
- **Significant changes (US parental-consent laws):** new grade levels are content, not new data
  collection, ads or purchases. Answer **None** unless the owner decides otherwise.

**Short description**

> SummerQuest keeps young minds sharp over the summer, from kindergarten to 5th grade. Kids explore
> a bright cartoon island and play short math, reading, writing and science games. Little ones
> learn by listening and tapping pictures, with a friendly teacher voice and no reading needed;
> older kids get spoken lessons with moving pictures, then mini-games that practice each idea.
> Kids earn coins to decorate their own island home. No accounts and no internet needed:
> everything stays on the tablet.

**Long description: replace "The right level for your child"**

> The right level for your child
> Pick your child's grade when you start, from kindergarten to 5th grade. Kindergarten and 1st
> grade are voice-first: every question is spoken and answered by tapping pictures, so no reading
> is needed. Practice adapts as your child plays, coming back to the facts they find tricky,
> even inside the mini-games.

**Long description: add after "Motivation from learning"**

> A quest every day
> New explorers start with a first quest, and each day SummerQuest suggests one quest to try
> next: a stage to finish, a zone close to its next star, or facts worth another go.

**Feature bullets: replace 1 and 5**

1. Math, reading, writing and science for kindergarten through 5th grade
5. Adaptive practice brings back the facts your child finds tricky, in quizzes and mini-games

**Keywords:** add `kindergarten, grade1, grade5, phonics, counting` (drop words if over the limit).

**Testing instructions (re-enter right before Submit; not autosaved)**

> SummerQuest works fully offline: no account, sign-in or internet needed.
> First launch: tap "Start your quest", type any name, pick a grade (Kindergarten through 5th) and tap "Begin adventure!" to reach the 3D island. A first-quest card then offers one thing to start with.
> Kindergarten and 1st grade are voice-first: questions are spoken and answered by tapping pictures.
> Tap the ground to walk. "Map" opens the island map. Narrated lessons are under Tutor (tap "Watch"). The hardware Back button goes back a screen and exits the app from the island.
> Grown-up areas (Parent area, reset progress, change grade) are behind a parental gate: it asks for the product of two numbers between 13 and 29 (for example 17 x 23 = 391). Type the answer. Three wrong answers lock it for 30 seconds.
> Some stages unlock after earning a star on the stage before.

**Screenshots:** keep the v1 set and add K–1 and 5th-grade screens (1280 × 800), up to 10 in all.

**Public site:** `summerquest-site` says "starting with grades 2 to 4"; update it to K–5 before
submitting (the privacy policy already covers the device voice).

Amazon's listing rules forbid prices, ALL CAPS, emoji and repeated words in the listing text.
The copy below follows them.

## Entered in the Developer Console (2026-10-18)

**Submitted 2026-10-19.** Console status SUBMITTED; Amazon's estimated date to Appstore is Oct 24 2026, 07:30 AM PDT.
The submission holds the Higgs-narration APK, the promo video and the Higgs credit in the long description.

- **Step 1:** APK `summerquest-1.0-release.apk` (versionCode 1), signed with the owner's key. **Amazon DRM: No**
  (free app; turn it on in the release that starts charging). On 2026-10-19 it was replaced with
  `summerquest-1.0-release-higgs.apk` (still versionCode 1; built from master with the Higgs Audio v2 lesson narration,
  45 clips). Use **Replace** on the existing file: adding a second file with the same version code is rejected.
- **Step 2:** devices are the 12 Fire tablets Amazon pre-selected (2018 onward). Two are tested:
  Fire HD 10 2023 and Fire HD 8 2022.
  - Countries: all.
  - Audience: restricted, 0-12.
  - Content rating: all None. **Cartoon violence: None**, the owner's call; the honest
    alternative was "Moderate" (see `content-rating.md`). Academic: Yes. All five "additional" questions: No.
  - Collects user data: No. Privacy policy URL set.
- **Step 3:** Free. The short and long descriptions, bullets and keywords below, as entered: plain hyphens (no en
  dashes), paragraphs on single lines. Icons and the 7 screenshots are dragged in by the owner.

## Testing instructions (entered in Step 4, 2026-10-19)

This field is **not autosaved**: it only persists when the app is submitted, so leaving the Review & submit
page empties it. Re-enter it right before clicking Submit App.

> SummerQuest works fully offline: no account, sign-in or internet needed.
> First launch: tap "Start your quest", type any name, pick a grade (2nd, 3rd or 4th) and tap "Begin adventure!" to reach the 3D island.
> Tap the ground to walk. "Map" opens the island map. Narrated lessons are under Tutor (tap "Watch"). The hardware Back button goes back a screen and exits the app from the island.
> Grown-up areas (Parent area, reset progress, change grade) are behind a parental gate: it asks for the product of two numbers between 13 and 29 (for example 17 x 23 = 391). Type the answer. Three wrong answers lock it for 30 seconds.
> Some stages unlock after earning a star on the stage before.

## Higgs Audio credit (lesson narration and promo voice)

The narration (and the promo video's voice) uses Higgs Audio v2. Its license
(docs/licensing/higgs-v2.md) recommends this sentence in the store description;
it is appended to the end of the long description:

> Built with Higgs Materials licensed from Boson AI USA, Inc., Copyright Boson AI USA, Inc., All Rights Reserved and Meta Llama 3 licensed under the Meta Llama 3 Community License, Copyright Meta Platforms, Inc., All Rights Reserved, based on Meta Llama 3.

## App title

**Chosen (2026-10-18): SummerQuest - Summer Learning Island for Kids** (a plain hyphen: the console's title field rejects the en dash).
Created in the Developer Console on 2026-10-18: SKU `summerquest`, category Education → Learning Subjects: Math, Problem Solving, Reading, Science, Writing; support contact zaclements@gmail.com and the summerquest-site URL. Amazon App ID `amzn1.devportal.mobileapp.2eb7a4e7193f4af781a6e21a073b8200`. TODO(owner): a quick trademark/Appstore search on "SummerQuest" before submitting.

1. **SummerQuest: Math & Reading Adventure**
2. **SummerQuest – Summer Learning Island for Kids**
3. **SummerQuest: Learning Games for Grades 2–4**

## Short description

> SummerQuest keeps young minds sharp over the summer. Kids explore a bright cartoon island and
> play short math, reading, writing and science games made for elementary school, starting with
> grades 2 to 4. Spoken lessons with moving pictures explain each new idea, then fun mini-games
> practice it: build towers with multiplication, crack crystal golems with division, read
> along at Reading Reef and write stories in the Writing Workshop. Kids earn coins to decorate
> their own island home. No accounts and no internet needed: everything stays on the tablet.

(Fire devices show the first 200 characters most prominently. The opening sentence carries
the main idea.)

## Long description

> SummerQuest turns summer learning into an island adventure for elementary-school kids.
>
> Your child creates an animal explorer and sets out across a cartoon island. Each part of the
> island is a subject:
>
> - Multiplication Mesa
> - Division Dunes
> - Fraction Falls
> - Place Value Plateau
> - Geometry Grove
> - Measurement Marsh
> - Data Delta
> - Word Problem Woods
> - Reading Reef
> - Writing Workshop
> - Science Summit
> - Tower Battlefront
>
> Learn it, then play it
> Short spoken lessons with animated pictures show how each idea works, from times tables and
> equivalent fractions to area, graphs and the life cycle of a plant. Then kids practice with
> quick quizzes and mini-games that make the math visible: grow a times-table grove, forge
> fractions, crack crystal golems with division, or build castle towers by answering
> multiplication questions.
>
> The right level for your child
> Pick your child's grade when you start (2nd, 3rd and 4th grade today). Practice adapts as your child plays, coming back
> to the facts they find tricky.
>
> Motivation from learning
> Kids earn stars, badges, streaks and coins by learning. Coins buy hats and home decorations
> for their island home, and every island has a pet egg that hatches and grows up as your
> child learns there.
>
> Made for families
> A daily learning goal of two 15-minute sessions keeps summer practice steady without
> endless screen time. The Parent area, behind a grown-ups check, shows progress by zone,
> accuracy and learning time, and lets you change the grade level or reset progress.
>
> Private by design
> There are no accounts and no tracking, and SummerQuest doesn't connect to the internet. Your
> child's name and progress are stored only on the tablet; nothing is sent to us or anyone
> else. It works fully offline, on a plane, in the car or
> at the cabin.

## Product feature bullets

1. Math, reading, writing and science for elementary-school kids, starting with grades 2-4
2. Twelve island zones to explore, each ending in a big challenge round
3. Narrated lessons with animated pictures explain each new idea before kids practice it
4. Hands-on mini-games: times-table grove, fraction forge, division golems, tower defense
5. Adaptive practice brings back the facts your child finds tricky
6. Writing practice with instant, friendly feedback on sentences, paragraphs and stories
7. Earn coins, stars and badges by learning to decorate an island home
8. Daily learning goal of two 15-minute sessions, plus a Parent area behind a grown-ups check
9. No accounts, no tracking, and nothing leaves the tablet
10. Works completely offline

## Keywords

Comma-separated, for search on Fire devices. Amazon's submission API wants single words, so
the list sticks to those:

> math, multiplication, division, fractions, reading, writing, science, learning,
> educational, kids, children, homework, summer, practice, school, grade2, grade3, grade4,
> times, tables, geometry, offline, adventure, island

TODO(owner): trim or extend after looking at the console's limit and at the search terms
parents actually use.

## Category, audience and price

- **Category:** **Kids**, from the next update (owner decision 2026-10-23). v1.0 went live on
  2026-10-23 under Education. The console offers one category, so set it to Kids when
  submitting versionCode 2. Keep the Learning Subjects (Math, Science and so on).
- **Target age:** elementary school. Today's content covers grades 2–4 (about ages 7–9): pick the
  console's age bands that match the content now, and widen them as grades are added. The app is directed at
  children under 13, so Amazon's Child-Directed App Policy applies (see `content-rating.md`).
- **Content rating answers:** `content-rating.md`.
- **Privacy labels:** `amazon-privacy-labels.md`. **Privacy policy URL:** https://zaclements-prog.github.io/summerquest-site/privacy/
- **Price:** **Free** (owner, 2026-10-18). (The current version has no in-app purchases; if
  some are added later, the listing, privacy policy and privacy labels must be updated with it.)
- **Devices:** Fire tablets. The APK's minSdk is 24 (Android 7, Fire OS 6 and later). Tested on
  Fire OS 8.3 (Fire HD 10 2023, Fire HD 8 2022, Amazon WebView 148). TODO(owner): in device
  targeting, prefer Fire OS 7 and 8 tablets; older Fire OS 6 devices may ship WebViews too old
  for the 3D scenes.
- **Developer contact shown on the listing:** zaclements@gmail.com; website https://zaclements-prog.github.io/summerquest-site/

## Images and media

Required by Amazon for a Fire tablet listing (TODO(owner): confirm in the console):

| Asset | Spec | Notes |
|---|---|---|
| **Large icon** | 512 × 512 px PNG, transparency allowed | The sun badge from the top bar on the cream background, enlarged. TODO(owner): final artwork. |
| **Small icon** | 114 × 114 px PNG, transparency allowed | The same artwork, simplified so it reads at small size. |
| **Screenshots** | 3–10 images, **1280 × 800** or **1920 × 1200** (landscape) | All the same size, real app screens, no device frames needed. |
| Promotional image | Optional, 1024 × 500 landscape | Only if you want one. |
| Video | Optional; 720-1080 px wide, 16:9 or 4:3, at least 1200 kbps | Uploaded 2026-10-19: the 38.6 s promo, 1080 × 608 at about 2.8 Mbps (`summerquest-promo-1080w.mp4`; source project `~/Projects/_video-runs/2026-Q4/summerquest-promo`). |

Suggested screenshots, in order (1920 × 1200, a fresh player with some progress):

1. The 3D World hub with the explorer, zone buildings and the coin/streak bar.
2. A narrated lesson mid-animation (for example, equivalent fractions) with the caption.
3. Crystal Golems: a crystal flying toward a golem, with the camel pen.
4. Times Grove or Fraction Forge mid-play.
5. A quiz stage with a picture question and big answer tiles.
6. The Writing Workshop with a story prompt and feedback stars.
7. The island Home decorated with coin-bought furniture, with a few pets toddling around.
8. The Parent area: progress by zone and learning time. (Take it after passing the grown-up
   check; don't show the check's answer.)

TODO(owner): take the screenshots from the store build on a Fire tablet, or in an emulator at
1920 × 1200, and keep the child's name in them generic (for example, "Sam").
