> Research brief written for the 2026-10-19 planning round (see `docs/superpowers/specs/2026-10-19-trending-games-plan.md`).
> The research environment could search the web but not open pages, so figures and quotes come from search-result summaries of the cited pages. Revenue and download numbers are third-party estimates: read them as orders of magnitude.

# SummerQuest: Viral Game Patterns With the Math Inside

*Research brief for the game designer and product owner. October 2026.*

**Method note.** This brief draws on web searches run in October 2026. Direct page fetches were blocked in this environment, so figures come from search-indexed summaries of the cited pages. Revenue and download numbers are third-party estimates (AppMagic, Sensor Tower and similar). Treat them as orders of magnitude. Numbers in brackets refer to the sources list at the end.

## Summary

- **The owner's crowd-runner idea is the best fit in the market for K–5 math.** The gate decision ("+5 or ×2?") already is an arithmetic comparison, and the growing crowd is the answer. This *intrinsic integration* beat a quiz-gated version of the same game on learning, with about 7× more voluntary play [56].
- **The classroom hits are mostly extrinsic.** Blooket, Gimkit, Prodigy and Kahoot charge a quiz answer to unlock game power. Kids love them, but the math works as a toll booth and speed scoring invites guessing. SummerQuest's current Tower Battlefront `MathGate` follows this model.
- **What to build first:**
  1. **Critter Parade**, a crowd runner.
  2. **Gobble Garden**, a Hole.io-style comparison game.
  3. **Puddle Patrol**, the existing tower defense reworked in the style of Zombie Division.

  All three reuse the existing `_runkit`, `ToonInstances` and tower-defense code.
- **Design rule for every gate:** the best choice depends on the current state, the result appears only after you commit, a wrong pick is visibly worse but never catastrophic, and K–1 has no clock.

---

## 1. The landscape, 2024–2026

The median mobile session runs about 5–6 minutes, at about 4 sessions a day [40]. Each pattern below fits one or more 60–180-second rounds into that window.

**Crowd runners and gate games** (Count Masters, Mob Control, Join Clash)
- **Loop:** swipe through paired gates (+10 or ×2) and avoid obstacles, then clash with an enemy crowd or a boss castle. Mob Control fires a stream of units through multiplier gates at a base instead [2].
- **Session:** 20–60 s levels.
- **Why it works:** a big number visibly goes up ("a sense of growth" [4]). Every choice is legible and pays off at once, and the finale is a tally comparison.
- **Scale:** Mob Control grossed close to $100M in 2023 [1][2]. Count Masters has 588K ratings at 4.5★ [3].
- **The 4X "pick the right gate" ads:** Last War: Survival's ads show a growing squad, but the game is a 4X base builder [5]. It passed $2B by February 2025 [6], then ran ads claiming the "fake" games had been made real [7]. The gate decision alone sells.

**Horde survivors and roguelite choice** (Survivor.io, Vampire Survivors-likes, Archero, Capybara Go)
- **Loop:** one thumb moves you and attacks fire automatically. Each level-up offers **one of three** skills [8][9].
- **Session:** Survivor.io rounds run up to 15 minutes [8]. Capybara Go is nearly an auto-battler, with its depth in the meta [12].
- **Why it works:** a power fantasy plus build-crafting. The draft is a meaningful, low-stakes choice, which Archero dresses up as slot reels [9].
- **Scale:** Survivor.io ≈ $476M lifetime [10], and Capybara Go passed $100M in about two months [11]. These skew to teens and adults.

**Merge games** (Travel Town, Gossip Harbor, Merge Mansion)
- **Loop:** tap a generator, merge two matching items into the next tier, fill orders, renovate. Energy limits play and is the main thing players buy [14].
- **Why it works:** collection, tidying up, a visible ladder of tiers.
- **Scale:** Gossip Harbor passed $100M in 2025 revenue by May, overtaking Travel Town and Merge Mansion [13].
- **Age fit:** skews to adults. The merge verb is a natural fit for place value.

**Idle and arcade tycoons** (Pizza Ready)
- **Loop:** walk around carrying stacks of goods, serve the counter and the drive-through, reinvest in upgrades. Earnings continue offline [15][16].
- **Session:** 2–10 minutes.
- **Why it works:** towering stacks and constant small upgrades. Players complain about the ads [16].
- **Learning fit:** orders, money and rates map onto grade 2–5 standards.

**Puzzle** (Block Blast, Royal Match, screw/sort/jam puzzles, Hole.io)
- **Loop:** levels of 1–3 minutes with clear win states. Screw puzzles hide pieces behind others, so only the top layer is reachable [19]. Hole.io: steer a hole that swallows anything smaller than itself [24].
- **Scale:** Block Blast had about 368M downloads in 2025 [17]. Royal Match made over $1.4B in IAP, in a puzzle genre worth over $10B [18]. Screwdom held about 45% of screw puzzles [20], sort puzzles led in H1 2026 [21], and Hole.io has about 337M installs [24].
- **Why it works:** completion, spatial reasoning, low pressure.
- **The dark side:** Royal Match tunes levels so you fail by 1–2 moves, which sells extra moves [22][23]. Screw puzzles limit the holders so that a full tray triggers pay-to-continue [20].

**Tower defense** (Bloons TD 6, Kingdom Rush, Wittle Defender, Plants vs Brainrots)
- **Loop:** place and upgrade towers, then watch the waves resolve.
  - Habby's Wittle Defender (rated 4+, 2025) adds a roguelite card draft [25].
  - Roblox's viral Plants vs Brainrots turns defeated enemies into income on pedestals [26].
- **Session:** 3–15 minutes.
- **Why it works:** you plan, then watch the plan pay off.

**Roblox viral hits** (Grow a Garden, Steal a Brainrot)
- **Grow a Garden:** buy seeds, plant, crops grow offline, sell. Random "mutations" multiply prices [28], and sessions run "2 minutes or 2 hours" [29]. Peak of about 22M concurrent users, and about 35% of players are under 13 [27].
- **Steal a Brainrot:** buy absurd characters that earn cash per second, then defend your base or steal from others [31]. Peak of about 25M concurrent users [30].
- **How they spike:** weekend FOMO events [27] pushed Roblox to 47M concurrent users [32]. 35% of age-checked Roblox users are under 13 [33][34].

**Party and brawler** (Stumble Guys, Squad Busters)
- **Stumble Guys:** a slapstick knockout obstacle course, rated 9+ [35], with about 50M monthly players in 2024 [36].
- **Squad Busters:** a crowd builder (buy squad members, grab gems in 3-minute matches) [37]. It shuts down in December 2026 [38], and critics called the loop shallow [39]. Crowd games need varied goals, not just a bigger blob.

**What's most popular with ages 5–11.** Age-split rankings are paywalled. The 2025 Common Sense Census found 5–8-year-olds game 64 minutes a day, up from 40, mostly on phones and tablets [41][42]. The evidence points to:
- Roblox simulators, tycoons and collectathons;
- party games;
- highly legible hypercasual games (runners, Hole.io, Block Blast).

Survivors, merge and 4X games skew older.

---

## 2. Education precedents

**Quiz-gated classroom games.**
- **Blooket:** each correct answer buys an advantage [43].
  - **Gold Quest:** pick 1 of 3 chests: gold, a multiplier, or a swap or steal from the leader.
  - **Tower Defense:** answers earn currency for towers.
  - **Factory:** answers add or upgrade producers.
  - **Crypto Hack:** answers mine "crypto" used to hack peers.
- **Gimkit:** answers feed a compounding economy of multipliers, streak bonuses and insurance [44].
- **Prodigy:** an RPG where every attack is a question.
- **Kahoot:** speed-weighted multiple choice.

**What works:** a real game around the questions (variance, catch-up mechanics, short rounds), an economy that makes every answer count, and classroom social energy.

**What doesn't:**
- **The math is a toll, not the play.** Kids rush the questions to get back to the game.
- **Speed scoring rewards fast guessing.** Teachers ask Kahoot to remove it [50], though one undergraduate study found wrong answers were actually slower [51].
- **Chance and stealing** read as gambling-adjacent.
- **Prodigy's paywall:** advocates filed an FTC complaint in 2021 over member-only items, pressure to upgrade and unsupported efficacy claims [45][46]. Its Johns Hopkins evidence is correlational [47][48].
- **Mixed evidence for Kahoot:** a review of 93 studies was mostly positive, but some studies found no effect and some found more anxiety [49].

**Math-gate runners already in the stores.**
- Math Run: Panda Chase: K–5 questions at checkpoints [52].
- Clash of Crowd: "add, multiply, count your squad" [53].
- Digit Run 3D: you run *as* a number through operator gates [54].
- Crowd Bash, in development [55].

Most are ad-supported clones in which the gate is a visual guess. **No child-directed, ad-free, grade-tiered crowd runner turned up.**

**Research.**
- **Malone:** fun comes from challenge, fantasy and curiosity. *Endogenous* fantasy, tied to the skill, beats unrelated rewards [61].
- **Zombie Division** [56][57]: you defeat skeletons by picking the attack that divides the number on each chest, so the division is the combat. With 58 children over 2 hours, the intrinsic version beat the quiz version on learning, and 16 children given free choice played it 7× longer. A pre-registered follow-up (n = 210) replicated the learning gain without a motivation difference, pointing to *attention*: you look at the math because you act on it [58].
- **"Chocolate-covered broccoli"** is the designers' name for games that stop the play to deliver a lesson [59][60].
- **Number lines:** about an hour of a *linear* number board game improved preschoolers' estimation, counting and comparison, while circular boards did not [62].
- **Fractions:** under 15 minutes of a number-line game *with feedback* improved grade 4–5 fraction magnitude. The group without feedback did not improve [63].
- **Brain Points:** among 15,000 children, rewarding effort, strategy and incremental progress raised persistence. Random points did nothing [64].
- **Timed tests:** whether they *cause* math anxiety is contested [65][66]. They do stress some children.

**Takeaways.** Put the math in the verb the player already wants to do. Give immediate feedback that explains. Reward strategy, not speed. Never make paying, luck or a timer the gate.

---

## 3. Ten concepts

Grade bands are **K–1**, **2–3** and **4–5**. In K–1 every number is spoken, and gates show dots or ten-frames, which builds on subitizing (recognizing small quantities at a glance) [67]. `GradeLevel` currently allows 2–4, so K, 1 and 5 need new tier rows.

### A. Critter Parade (nonviolent crowd runner, the owner's idea)
- **Hook:** lead a growing parade of rescued critters. At the end, out-pull the Grumble Gang in a tug-of-war or push a giant beach ball uphill. Alternative skins: a marching band, a snowball fight, a sports team.
- **Loop (60–90 s):** 5–6 gate pairs and some counting cages, then the finale, where critters pair off with Grumps (who hug and join you): 37 vs 25 leaves 12.
- **Where the learning is:** picking a gate means evaluating both expressions against your **current** count. Passing critters tick the count up (counting on), and the finale is comparison and subtraction.
- **Gates by grade:**
  - **K–1:** dots vs dots ("+2 or +5?"), make-10 gates, counts up to 20.
  - **2–3:** "×3 or +12?" with a count of 5 (15 vs 17, so +12 wins). Gates that depend on your count defeat "× always wins".
  - **4–5:** "×0.5 or +3?", "½ of the crowd joins" vs "+10", ×1.5, and decimal or fraction gates.
- **Wrong answer:** you still get the smaller gain, and a translucent "ghost parade" shows what the other gate would have given. The crowd never drops below its start, and a lost finale becomes a hint and a rematch.
- **Feasibility (high):** one `InstancedMesh` per species with a vertex-shader waddle, not skinned meshes (skinned crowds drop frames at around 20 avatars [85]). Draw about 150 bodies on a Fire 7 and show the true count as a big number.
- **Risks:** looks like the ad clones. Kids may pick by side or color (randomize both). Doubling can push counts into the thousands (cap it).

### B. Bubble the Grumps (nonviolent horde defense, like Mob Control)
- **Hook:** fuzzy Grumps march on the picnic. Aim a bubble-wand stream through multiplier gates, and each bubbled Grump floats off giggling.
- **Loop (90–150 s):** 3 waves, then a Big Grumpus with a number on its belly. Bubbles are **limited**, so spraying everywhere fails.
- **Where the learning is:** multiplication as groups ("each bubble through ×4 becomes 4"). The boss number is a product to build (48 = 6 shots through ×8).
- **By grade:**
  - **K–1:** +1 and +2 gates; Grumps show 1–5 dots.
  - **2–3:** ×2, ×5 and ×10 gates.
  - **4–5:** exact targets, ×0.5 vs ×1.5, and "¾ grow giant".
- **Wrong answer:** extra bubbles bounce off. Unbubbled Grumps sit on the blanket and pout, and you keep partial stars.
- **Feasibility:** high (instanced spheres).
- **Risks:** aiming takes motor skill (K–1 gets auto-aim).

### C. Lantern Friends (horde survivor with a three-card draft)
- **Hook:** carry a lantern through a twilight wood. Your glow cheers up the swarming Gloomies, and they follow you.
- **Loop (2–3 min):** move with one thumb, collect number gems, draft 1 of 3 cards at each level-up. A boss Gloom arrives at 2:30.
- **Where the learning is:** **in the steering.** The level-up bar needs gems that *sum to a target*: make 10 in K–1, a 100 in grades 2–3, and fractions adding to 1 in grades 4–5. Cards are expressions applied to your stats ("glow ×2 or +5?", with glow at 4).
- **Wrong answer:** overshooting spills the extra into the next bar. Gloomies only slow you down.
- **Feasibility:** medium (about 150 instanced blobs).
- **Risks:** too much dodging for K–1. The survivor theme skews older.

### D. Gobble Garden (Hole.io-style comparison)
- **Hook:** a hungry garden cloud swallows anything **smaller than its own number** and grows by what it eats.
- **Loop:** 90 s, or until the park is tidy.
- **Where the learning is:** every steering decision is a comparison (standards 1.NBT.3 and 4.NF.A.2).
- **By grade:**
  - **K–1:** dot objects.
  - **2–3:** expressions ("3 + 4", "5 × 2").
  - **4–5:** you are 0.7, so can you eat ⅝?
- **Wrong answer:** a soft bonk ("too big, burp!") and the object's value flashes.
- **Feasibility:** very high (no physics engine).
- **Risks:** bumping into everything. A short wobble makes guessing slower than thinking.

### E. Puddle Patrol (the existing tower defense, reworked in the style of Zombie Division)
- **Hook:** numbered Mud Puddings waddle toward the pond. Each sprinkler tower washes only the Puddings that match its rule.
- **Loop:** 2–3 minutes of placing towers and watching waves.
- **Where the learning is:** choosing *where each tower goes*. Placement replaces today's modal quiz.
- **By grade:**
  - **K–1:** a three-dot tower washes groups of 3.
  - **2–3:** even and odd, then multiples of 2, 5 and 10.
  - **4–5:** factors, multiples and primes (4.OA.B.4), and towers that wash fractions equivalent to ½.
- **Wrong answer:** the splash bounces off and the Pudding shows its factors. Leaks splash harmlessly into the pond.
- **Feasibility:** high (the engine exists).
- **Risks:** too many rules at once. Introduce one tower type per level.

### F. Make-Ten Jam (sort and screw puzzle)
- **Hook:** pour stacked number candies between jars until every jar hits its target. Only the top layer is reachable.
- **Loop:** 60–120 s per level.
- **Where the learning is:** composing and decomposing numbers.
- **Targets by grade:** 10 (K–1), 100 (2–3), and 1 whole from fractions or decimals (4–5).
- **Wrong answer:** the jar wobbles ("too much!") and Undo is free. Stars reward fewer pours, and there is no fail state.
- **Feasibility:** very high.
- **Risks:** solving by trial and error. Never sell extra slots.

### G. Array Garden (Block Blast–style)
- **Hook:** fit rectangular flower beds into a grid. Full rows bloom and clear.
- **Loop:** 2–3 minutes per garden.
- **Where the learning is:** orders ask for an area ("a 24-square bed"), and you pick 4×6 or 3×8.
- **By grade:**
  - **K–1:** match shapes and count squares.
  - **2–3:** arrays and area (3.MD.C.7).
  - **4–5:** perimeter, and "shade ¾ of the row".
- **Wrong answer:** the piece slides back and grid lines appear.
- **Feasibility:** very high.
- **Risks:** feeling like a worksheet. Drop Block Blast's sudden death.

### H. Snack Shack Tycoon (Pizza Ready–style)
- **Hook:** run a beach snack shack: carry tall stacks, serve a critter queue, upgrade.
- **Loop:** a 2–3 minute shift, then upgrades.
- **Where the learning is:** the order *is* the problem.
  - **K–1:** "4 lemonades".
  - **2–3:** "3 trays of 5", and making change.
  - **4–5:** "$1.25 × 3", "⅜ pepperoni".
  - **Upgrades:** budgeting.
- **Wrong answer:** "I asked for 12, can I have 2 more?" You fix it, and nothing fails.
- **Feasibility:** medium.
- **Risks:** idle-game pressure. Add no offline earnings or "come back" nudges.

### I. Merge Sprouts (place value and fractions)
- **Hook:** merge **ten** seedlings into a bush and ten bushes into a tree, then fill orders such as "347" (3 trees, 4 bushes, 7 sprouts).
- **Loop:** 2–3 minutes per order board.
- **Where the learning is:** regrouping *is* merging. Make 10 (K–1), place value to 1,000 (2–3), ¼ + ¼ → ½ and tenths → ones (4–5).
- **Wrong answer:** a gentle count ("8 here, find 2 more").
- **Feasibility:** very high.
- **Risks:** merge games usually pace with energy, which is a dark pattern. Pace with orders instead.

### J. Number Bridge Stumble (Stumble Guys–style)
- **Hook:** an offline race against goofy bots across wobbly **number-line bridges**.
- **Loop:** 3 rounds of 60–90 s.
- **Where the learning is:** jump to the platform for 7, ¾ or 0.35. The linear number line is the format with evidence behind it [62][63]. Ranges: 1–10 (K–1), 0–1,000 (2–3), fractions and decimals (4–5).
- **Wrong answer:** a soft bounce back while the right platform glows. The bots stumble too.
- **Feasibility:** medium.
- **Risks:** platforming skill can swamp the math. Give K–1 assisted jumps.

---

## 4. Guardrails

**Dark patterns to avoid.** 4 in 5 apps used by 3–5-year-olds had manipulative design, such as "come back tomorrow for a dragon" lures [68], and early-childhood games use gambling-like rewards [69]. Regulators are moving: the UK children's code bans nudges [70], the FTC took $245M from Epic for dark patterns plus $275M under COPPA [71][72], and since June 2026 PEGI rates paid random items at 16+ [73].

For SummerQuest:
- **No FOMO.** No expiring events, countdowns, or "your crops will wilt." Seasonal content unlocks and stays.
- **No randomness on rewards.** No chests, eggs or reel animations. Show all three draft cards plainly, and earn rare items through mastery.
- **No streak guilt.** Make the existing streaks *non-losing*: count days played and never reset.
- **No fake "almost won."** No "So close!" screens and no fail-by-one tuning [22]. Results stay honest and suggest a strategy.
- **Honest marketing.** Store media must show real gameplay. The ASA banned Playrix ads showing content only 0.03% of players reached [74].
- **Natural stopping points.** End each round with "great place to stop," never auto-start the next one, and keep the 2×15-minute daily goal.

**Amazon Appstore and COPPA.**
- The Appstore closed on other Android devices in August 2025, but Fire continues [79].
- An under-13 audience triggers Amazon's COPPA policy: child-suitable SDKs only, no Amazon ads, family-friendly content [75][76].
- The 2025 COPPA amendments (compliance by 22 April 2026) add separate consent for targeted ads, retention limits and biometric data [77].
- An offline app that collects nothing stays clear. Concretely:
  - add **no** analytics, crash or ads SDKs (the "internal operations" exception is narrow [78]);
  - keep names and progress on the device;
  - never record voice;
  - publish a "we collect nothing" statement.
- Parents allow-list apps through Amazon Kids [86], so the Parent Dashboard and an honest description sell the app.
- Keep the owner's no-weapons rule: wands, bubbles and sprinklers.

**Pacing so the math isn't skipped or brute-forced.**
- **State-dependent gates.** The best gate depends on the current count. Include ties (×2 vs +4 at a count of 4) and traps built from misconceptions:
  - ⅓ vs ¼ (a bigger denominator means a smaller piece);
  - 0.25 vs 0.5 (a longer decimal is not bigger);
  - ×½ means halve, not subtract a half.
- **Commit, then reveal.** Never preview the result. Randomize which side and color each gate gets.
- **Scarcity:** limited bubbles, pours and bumps, so spraying everything loses to thinking.
- **Scaffold, don't punish.** If 2-choice accuracy sits near chance (≤ 55% over 10 gates), slow the world down and add dot support. Score "smart picks", Brain Points style [64], never speed.
- **Time by age:**
  - **K–1:** no clock; the world pauses while the prompt is spoken.
  - **2–3:** at least 5 s between gates, plus 3 "slow-mo" taps per run.
  - **4–5:** an optional speed mode only after mastery [65][66].
- **Explain every answer.** The ghost replay *is* the feedback, which was the active ingredient in [63].

**Fire tablet budget.**
- **Hardware:** the Fire 7 (2022) has a quad Cortex-A53, 2 GB RAM and a 1024×600 screen [81][82]. The Fire HD 8 (2024) has six Cortex-A55, 3–4 GB and a Mali-G52 MC2 [80].
- **Budget:** under about 100 draw calls, one instanced mesh per species [83][84], shader animation with no skinned crowds [85], pixel ratio 1, blob shadows, and about 150 visible units. The existing `deviceClass` and Auto graphics quality set the cap.

---

## Sources

1. Voodoo (company), Wikipedia: https://en.wikipedia.org/wiki/Voodoo_(company)
2. Udonis, Mob Control: https://www.blog.udonis.co/mobile-marketing/mobile-games/mob-control
3. Count Masters, App Store: https://apps.apple.com/app/id1568245971
4. Hyper-casual CPI video analysis: https://videohighlight.com/v/XrLW9eYBdh8
5. Notebookcheck on Last War ads: https://www.notebookcheck.com/Jemand-hat-tatsaechlich-eines-dieser-Fake-Werbespiele-gemacht-und-es-ist-ueberraschend-gut.1188721.0.html
6. PocketGamer.biz, Last War $2bn: https://www.pocketgamer.biz/last-war-survival-surpasses-2bn-after-record-player-spending-in-early-2025
7. FoxData, Last War: https://foxdata.com/en/blogs/how-last-war-survival-raked-in-16-billion-in-a-mere-18-months/
8. Naavik, Survivor.io: https://naavik.co/deep-dives/survivorio-archeros-footsteps/
9. GameRefinery, Archero: https://www.gamerefinery.com/archero-excels-in-engagement-by-creating-an-anticipation-for-rewards/
10. MobileGamer.biz, Habby $2bn: https://mobilegamer.biz/data-digest-savvys-moonton-swoop-liftoff-kills-ipo-habby-hits-2bn-fallout-shelter-more/
11. PocketGamer.biz, Capybara Go: https://www.pocketgamer.biz/habbys-capybara-go-surpasses-100m-in-gross-player-spending
12. MobileGamer.biz, GDC 2025: https://mobilegamer.biz/gdc-2025-what-we-can-learn-from-royal-kingdom-capybara-go-hexa-sort-match-mastersand-duolingo/
13. Naavik, Gossip Harbor: https://naavik.co/digest/gossip-harbors-meteoric-rise-in-merge/
14. Udonis, merge market: https://www.blog.udonis.co/mobile-marketing/mobile-games/merge-games-market
15. Pizza Ready, App Store: https://apps.apple.com/app/pizza-ready/id6450917563
16. Marlvel, Pizza Ready: https://marlvel.ai/intel-report/games/pizza-ready
17. PocketGamer.biz, most downloaded 2025: https://www.pocketgamer.biz/the-most-downloaded-mobile-games-of-2025
18. Naavik, match-3 and merge leaders: https://naavik.co/digest/what-leading-match-3-and-merge-games-do-differently/
19. Deconstructor of Fun, Screw Puzzle Gold Rush: https://www.deconstructoroffun.com/blog/the-screw-puzzle-gold-rush
20. Naavik, niche puzzle subgenres: https://naavik.co/digest/how-niche-subgenres-are-reshaping-the-mobile-puzzle-market/
21. Gamigion, sort/block/screw: https://www.gamigion.com/new-puzzle-order-the-rise-of-sort-block-and-screw/
22. FoxData, Royal Match: https://foxdata.com/en/blogs/games-redefined-match3-with-flawless-execution-and-smart-ua/
23. This Week in LiveOps, "almost wins": https://thisweekinliveops.substack.com/p/how-royal-match-uses-almost-wins
24. MixRank, Hole.io: https://mixrank.com/playstore/apps/io.voodoo.holeio
25. Wittle Defender, App Store: https://apps.apple.com/in/app/wittle-defender/id6502815032
26. Sportskeeda, Plants vs Brainrots: https://www.sportskeeda.com/roblox-news/plants-vs-brainrots-a-beginner-s-guide
27. Grow a Garden, Wikipedia: https://en.wikipedia.org/wiki/Grow_a_Garden
28. Sportskeeda, why Grow a Garden is popular: https://www.sportskeeda.com/roblox-news/why-grow-garden-popular
29. RoLearn, Grow a Garden CCU analysis: https://rolearn.dev/insights/grow-a-garden-ccu-record-analysis
30. PocketGamer.biz, Steal a Brainrot 25M CCU: https://www.pocketgamer.biz/robloxs-steal-a-brainrot-becomes-first-game-to-surpass-25m-concurrent-players
31. Deltia's Gaming, how to play Steal a Brainrot: https://deltiasgaming.com/?p=259152
32. Tubefilter, Roblox 47M record: https://www.tubefilter.com/?p=188004
33. Roblox Q4 2025 shareholder letter: https://s27.q4cdn.com/984876518/files/doc_financials/2025/q4/Q4-2025-Shareholder-Letter.pdf
34. Statista, Roblox DAU: https://www.statista.com/statistics/1190309/daily-active-users-worldwide-roblox
35. Stumble Guys, App Store: https://apps.apple.com/us/app/stumble-guys/id1541153375
36. NYX Game Awards, Stumble Guys: https://nyxgameawards.com/winner-info.php?id=3305
37. Pocket Tactics, Squad Busters review: https://www.pockettactics.com/squad-busters/review
38. MobileGamer.biz, Squad Busters shutdown: https://mobilegamer.biz/supercell-confirms-squad-busters-will-shut-down-on-december-14/
39. Deconstructor of Fun, Squad Busters: https://www.deconstructoroffun.com/blog/2024/9/30/4-x-reasons-why-squad-busters-suffers-while-brawl-stars-soars
40. GameDev Reports, GameAnalytics 2025 benchmarks: https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks
41. Common Sense Census 2025 (0–8): https://www.commonsensemedia.org/research/the-2025-common-sense-census-media-use-by-kids-zero-to-eight
42. Kidscreen on the Census: https://kidscreen.com/?p=220203
43. Blooket game modes (wiki mirror): https://shapes.inc/fandom/blooket/game-modes
44. Gimkit vs Kahoot: https://nibble-app.com/blog/gimkit-vs-kahoot
45. Fairplay, Prodigy FTC complaint: https://fairplayforkids.org/wp-content/uploads/2021/02/Prodigy_Complaint_Feb21.pdf
46. Education Week, Prodigy complaint: https://www.edweek.org/technology/popular-interactive-math-game-prodigy-is-target-of-complaint-to-federal-trade-commission/2021/02
47. University of Waterloo, Prodigy and the JHU study: https://uwaterloo.ca/news/gamifying-math-build-skill-and-confidence
48. ClinicalTrials.gov, Prodigy RCT: https://clinicaltrials.gov/study/NCT03706144
49. Wang & Tahir (2020), Kahoot review: https://research.gold.ac.uk/id/eprint/39435
50. Kahoot community, speed points: https://support.kahoot.com/hc/en-us/community/posts/38794659972755-Add-option-to-remove-points-awarded-scaling-with-answer-speed
51. Liang (2024), Frontiers in Education: https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1412954/pdf
52. Math Run: Panda Chase: https://apps.apple.com/us/app/id743475337
53. Clash of Crowd 3D Runner: https://apps.apple.com/vc/app/clash-of-crowd-3d-runner/id6689495317
54. Digit Run 3D: https://apps.apple.com/qa/app/digit-run-3d/id1581773681
55. Crowd Bash: https://tehnomasterstudio.itch.io/crowd-bash
56. Habgood & Ainsworth (2011), JLS: https://shura.shu.ac.uk/3556/ (doi: https://doi.org/10.1080/10508406.2010.508029)
57. Habgood (2015), Zombie Division case study: http://shura.shu.ac.uk/10652/3/Habgood_ZombieDivision_ECGBL2015.pdf
58. Pre-registered intrinsic-integration follow-up: https://eprints.whiterose.ac.uk/189921/1/LearningByDoingCuttingAndIacovides090822.pdf
59. Marketplace, chocolate-covered broccoli: https://www.marketplace.org/2015/03/12/how-make-educational-game-kids-want-play
60. Breuer (2012), "Broccoli-coated chocolate?": https://cris.uni-muenster.de/portal/en/publication/21501395
61. Malone, "What makes things fun to learn": https://ntnu.no/wiki/download/attachments/112986425/What_makes_things_fun_to_learn.pdf?api=v2
62. Siegler (2009), linear board games: https://www.cmu.edu/dietrich/psychology/cs/research-teaching/docs/SieglerBoardGamesCDPerp2009.pdf
63. Fazio, Kennedy & Siegler (2016), fraction number-line game: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5074569/
64. O'Rourke et al. (2014), Brain Points: https://grail.cs.washington.edu/wp-content/uploads/2015/08/orourke2014bpa.pdf
65. Stanford, Boaler on timed tests: https://ed.stanford.edu/news/boaler-timed-tests-and-development-math-anxiety
66. Hechinger Report, math drills: https://hechingerreport.org/proof-points-do-math-drills-help-children-learn/
67. Hechinger Report, subitizing: https://hechingerreport.org/proof-points-subitizing/
68. Michigan Medicine, Radesky study: https://www.michiganmedicine.org/health-lab/design-tricks-commonly-used-monetize-young-childrens-app-use
69. ECGBL, dark patterns in early-childhood games: https://papers.academic-conferences.org/index.php/ecgbl/article/view/1656
70. ICO Children's Code, Standard 13: https://ico.org.uk/for-organisations/guide-to-data-protection/ico-codes-of-practice/age-appropriate-design-a-code-of-practice-for-online-services/13-nudge-techniques
71. VGC, Epic $245M order: https://videogameschronicle.com/news/epic-ordered-to-pay-245m-to-consumers-over-unwanted-fornite-purchases
72. Loeb & Loeb, Epic $520M (COPPA): https://www.loeb.com/en/insights/publications/2023/01/fortnite-video-game-maker-settles-ftc-privacy-deception-claims-for-record-$520-million
73. Osborne Clarke, PEGI loot boxes 16+: https://www.osborneclarke.com/insights/games-loot-boxes-get-16-plus-age-rating-europe-under-pegi-overhaul
74. ASA ruling, Playrix: https://asa.org.uk/rulings/plr-worldwide-sales-ltd-g20-1061644-plr-worldwide-sales-ltd.html
75. Amazon, child-directed apps policy: https://developer.amazon.com/docs/policy-center/privacy-children.html
76. Amazon Appstore content policy: https://developer.amazon.com/docs/policy-center/understanding-content-policy.html
77. Davis Wright Tremaine, COPPA amendments: https://www.dwt.com/blogs/privacy--security-law-blog/2025/05/coppa-rule-ftc-amended-childrens-privacy
78. Covington, COPPA internal-operations guidance: https://www.insideprivacy.com/united-states/federal-trade-commission/ftc-attorneys-offer-guidance-on-new-coppa-rule/
79. Android Authority, Amazon Appstore leaves Android: https://www.androidauthority.com/amazon-shuts-down-android-app-store-3528170
80. Amazon, Fire HD specs: https://developer.amazon.com/docs/fire-tablets/ft-device-specifications-firehd-models.html
81. Amazon, Fire 7 specs: https://developer.amazon.com/docs/device-specs/ft-device-specifications-fire-models.html
82. Liliputing, Fire 7 (2022): https://liliputing.com/2022/06/amazons-12th-gen-fire-tablet-arrives-this-week-with-a-speed-boost-more-ram-and-usb-c.html
83. three.js forum, draw calls: https://discourse.threejs.org/t/rendering-thousands-of-objects-results-in-low-fps-but-also-low-gpu-usage/40142/3
84. three.js forum, one-draw-call crowd: https://discourse.threejs.org/t/one-draw-call-massive-crowd-performance-engineering-in-three-js/89928
85. DEV, instanced skinned crowds: https://dev.to/sagacheng/using-instancedskinnedmesh-in-threejs-enabling-the-rendering-of-hundreds-of-3d-characters-on-screen-simultaneously-15gm
86. Amazon, Fire tablet FAQ (Amazon Kids): https://developer.amazon.com/docs/fire-tablets/ft-faq.html
