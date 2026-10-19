# Amazon Appstore listing: draft for SummerQuest

A draft of the **Appstore Details** step (text, category, images) for the Fire tablet
listing. Field limits are from Amazon's docs as of October 2026:

- display title up to 200 characters;
- short description up to about 1,200 characters;
- long description up to 4,000 characters, plain text;
- up to 10 feature bullets;
- keywords optional.

TODO(owner): check the limits against the live form.

Amazon's listing rules forbid prices, ALL CAPS, emoji and repeated words in the listing text.
The copy below follows them.

## App title

**Chosen (2026-10-18): SummerQuest – Summer Learning Island for Kids.** TODO(owner): a quick trademark/Appstore search on "SummerQuest" before submitting.

1. **SummerQuest: Math & Reading Adventure**
2. **SummerQuest – Summer Learning Island for Kids**
3. **SummerQuest: Learning Games for Grades 2–4**

## Short description

> SummerQuest keeps young minds sharp over the summer. Kids explore a bright cartoon island and
> play short math, reading, writing and science games made for children finishing 2nd, 3rd or
> 4th grade. Spoken lessons with moving pictures explain each new idea, then fun mini-games
> practice it: build towers with multiplication, crack crystal golems with division, read
> along at Reading Reef and write stories in the Writing Workshop. Kids earn coins to decorate
> their own island home. No ads, no in-app purchases, no accounts, and no internet needed:
> everything stays on the tablet.

(Fire devices show the first 200 characters most prominently. The opening sentence carries
the main idea.)

## Long description

> SummerQuest turns summer learning into an island adventure for kids aged 7 to 9.
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
> Pick 2nd, 3rd or 4th grade when you start. Practice adapts as your child plays, coming back
> to the facts they find tricky.
>
> Motivation that isn't for sale
> Kids earn stars, badges, streaks and coins by learning. Coins buy hats and home decorations
> for their island home, and every island has a pet egg that hatches and grows up as your
> child learns there. Coins can never be bought with real money.
>
> Made for families
> A daily learning goal of two 15-minute sessions keeps summer practice steady without
> endless screen time. The Parent area, behind a grown-ups check, shows progress by zone,
> accuracy and learning time, and lets you change the grade level or reset progress.
>
> Private by design
> There are no ads, no in-app purchases, no accounts and no tracking. SummerQuest never
> connects to the internet. Your child's name and progress are stored only on the tablet, and
> nothing is ever sent to us or anyone else. It works fully offline, on a plane, in the car or
> at the cabin.

## Product feature bullets

1. Math, reading, writing and science for kids finishing 2nd, 3rd or 4th grade (ages 7–9)
2. Twelve island zones to explore, each ending in a big challenge round
3. Narrated lessons with animated pictures explain each new idea before kids practice it
4. Hands-on mini-games: times-table grove, fraction forge, division golems, tower defense
5. Adaptive practice brings back the facts your child finds tricky
6. Writing practice with instant, friendly feedback on sentences, paragraphs and stories
7. Earn coins, stars and badges to decorate an island home, never with real money
8. Daily learning goal of two 15-minute sessions, plus a Parent area behind a grown-ups check
9. No ads, no in-app purchases, no accounts, no tracking, and nothing leaves the tablet
10. Works completely offline

## Keywords

Comma-separated, for search on Fire devices. Amazon's submission API wants single words, so
the list sticks to those:

> math, multiplication, division, fractions, reading, writing, spelling, science, learning,
> educational, kids, children, homework, summer, practice, school, grade2, grade3, grade4,
> times, tables, geometry, offline, adventure, island

TODO(owner): trim or extend after looking at the console's limit and at the search terms
parents actually use.

## Category, audience and price

- **Category:** Education. TODO(owner): pick the closest subcategory offered (for example,
  Kids or Learning). Add a secondary Kids category if the console allows one.
- **Target age:** 7–9 (designed for kids finishing 2nd–4th grade). The app is directed at
  children under 13, so Amazon's Child-Directed App Policy applies (see `content-rating.md`).
- **Content rating answers:** `content-rating.md`.
- **Privacy labels:** `amazon-privacy-labels.md`. **Privacy policy URL:** https://zaclements-prog.github.io/summerquest-site/privacy/
- **Price:** TODO(owner): free or paid upfront. There are no in-app purchases either way.
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
| Video | Optional | Only if you want one. |

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
