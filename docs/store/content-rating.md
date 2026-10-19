# Amazon content rating questionnaire: answers for SummerQuest

These are the answers for the **Content rating** section of **Target Your App** in the Developer
Console. Amazon sets the app's maturity rating from them, and may change it. Amazon rejects
apps whose content doesn't match what the questionnaire says, so the answers below are
deliberately honest about the game's mild cartoon conflict.

> Amazon's documentation lists these subject categories: Violence, Cartoon Violence, Drugs,
> Nudity, Sex, Intolerance, Profanity and Academic. It also asks yes/no questions about ads,
> purchases, accounts, location, user content and similar features. TODO(owner): match each
> answer below to the live form (labels and answer levels such as None / Mild / Strong may be
> worded differently).

## About the app

SummerQuest is a summer learning game for **elementary-school** children. Today's content
covers grades 2–4 (about ages 7–9). Kids walk a cartoon island and play short math, reading, writing and science
games. There are also narrated lessons with animated pictures. Everything is cartoon-styled,
bright and friendly.

## Subject matter

| Category | Answer | What's in the app |
|---|---|---|
| **Cartoon / fantasy violence** | **Mild, infrequent.** Entered as **None** by the owner (2026-10-18); the console only offers None / Moderate / Strong. | See "Cartoon conflict" below. If Amazon's review questions it, "Moderate" is the honest fallback. |
| Realistic violence | None | No realistic people, weapons or injuries. |
| Blood and gore | None | |
| Fear / horror | None | The "bosses" are friendly cartoon characters shown as big emoji: a goat, an owl, a frog king, a pufferfish, a cactus cyclops, a dragon and a sand worm. |
| Drugs, alcohol, tobacco | None | |
| Nudity | None | |
| Sexual content | None | |
| Profanity or crude humor | None | All text is fixed and written for children. |
| Intolerance / discrimination | None | |
| Gambling (real or simulated) | None | No chance-based rewards. Shop prices are fixed, and coins can't be bought. |
| **Academic / educational** | **Yes** | Math (multiplication, division, fractions, place value, geometry, measurement, graphs, word problems), reading comprehension, writing and science. |

### Cartoon conflict, described honestly

- **Boss Battles.** At the end of a zone, the child answers questions against a cartoon "boss"
  shown as a big emoji character, such as Cliff Goat, Professor Hoot or Frog King.
  - A right answer lands a "⚡✨ Hit!": the boss shakes, flashes and its health bar goes down.
  - A wrong answer costs the player a heart.
  - Losing every heart ends the round with "💀 You fainted…". Nobody is shown hurt, and the
    child can simply try again.
  - Stage buttons for these rounds say "⚔️ Battle".
- **Crystal Golems** (Division Dunes). Crystal golems march toward a camel pen, and the child
  throws a number crystal at each one.
  - The right divisor **shatters** the golem in a burst of sparkles. It turns into little camels
    that run into their stalls.
  - A wrong crystal bounces off.
  - A golem that reaches the pen "stomps": the child loses their streak and the golem is pushed
    back. The game never ends on a fail.
  - A "Giant Golem" is cracked in two steps.

  The golems are crystal, not living creatures, and no one is hurt.
- **Tower Battlefront** (tower defense). The child builds towers "to stop the invading
  **goons**": round cartoon space-invader icons (👾) that walk along a path.
  - Towers fire small dots at them. A goon's health bar runs down until it disappears.
  - A counter shows "Enemies defeated".
  - Each tower costs a correct multiplication answer.

There is no blood, no realistic weapon, no death animation and no injury shown anywhere.

## Features

| Question | Answer |
|---|---|
| Advertisements | **No** (current version). Update this answer if ads are ever added. |
| In-app purchasing | **No.** Coins are earned by playing and spent in the game (hats, home decorations); pets hatch and grow from learning. They can't be bought with real money. |
| Account creation / login | **No** |
| User-generated content shared with others | **No.** Kids type a name and practice writing, but nothing is posted, shared or sent anywhere. |
| User-to-user communication (chat, messaging) | **No** |
| Location detection or sharing | **No** |
| Web browsing / external links | **No.** No browser, no links out of the app, no store links. |
| Collects or shares personal information | **No.** Everything stays on the tablet (see `privacy-policy.md`). |
| Social media integration | **No** |
| Parental gate | **Yes.** The Parent area, progress reset and grade change sit behind a grown-up check (a 2-digit × 2-digit product, typed in, with a lockout). |

## Audience

- **Target age:** elementary school; today's content is grades 2–4 (about 7–9). TODO(owner): choose
  the console's age band(s) matching the current content, and widen them as grades are added.
- **Directed at children under 13:** **Yes.** Amazon's Child-Directed App Policy applies:
  - no interest-based (behavioral) advertising; any ads added later must follow Amazon's
    child-directed ad rules (none today);
  - only child-suitable SDKs (there are none at all);
  - COPPA compliance (nothing is collected);
  - a parental gate in front of grown-up areas.
- **Expected rating:** "All Ages", or "Guidance Suggested" if Amazon weighs the cartoon
  battles more heavily. TODO(owner): accept the rating Amazon assigns. If it comes back higher
  than expected, check the cartoon-conflict answers above rather than softening them.
