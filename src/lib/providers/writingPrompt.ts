/**
 * Writing Workshop prompts (static, offline).
 *
 * Grade bands (see lib/gradeTiers): a child draws from SHARED_PROMPTS plus their
 * grade's shelf in WRITING_PROMPTS_BY_GRADE. Handoff A1/A4: adding a grade list
 * must not change the public API — the provider picks the profile's grade pool
 * when present and falls back to the shared list with no profile (grade 4, like
 * the rest of the app). Grade standard per shelf is named in a comment above it.
 */
import type { Problem, ProblemProvider } from '../problem'
import { makeLlmCachedProvider } from '../llm-cache'
import { useProgress } from '../../store/progress'
import { DEFAULT_GRADE, isGradeLevel, type GradeLevel } from '../gradeTiers'
import { randInt, shuffle } from '../random'

interface Config {
  kind: 'sentence' | 'paragraph' | 'story'
  source?: 'static' | 'llm'
  /** Grade tier; when omitted the provider reads the profile (default 4). */
  grade?: GradeLevel
}

const STATIC_PROMPTS: Record<Config['kind'], string[]> = {
  sentence: [
    'Describe what your favorite snack tastes like — use words that paint a picture.',
    'Imagine you just discovered a tiny door under a tree in your backyard. Write what you find inside.',
    'You woke up one morning and your pet could talk. What is the first thing it says?',
    'Pretend you can fly for one day. Where do you go first?',
    'Describe the weirdest sandwich you can imagine — what is on it?',
    'Write a sentence that uses three colors and one sound.',
    "Pretend the moon is made of cheese. What kind of cheese is it and how do you know?",
    'A friendly robot just moved in next door. Write a sentence describing what it looks like.',
    'You found a crayon that draws real things. What is the first thing you draw?',
    'If you could invent a brand-new holiday, what would you call it and how would people celebrate?',
    'A puppy and a kitten just became best friends. Write a sentence about the silly game they play together.',
    'You blow a bubble and a tiny cloud floats out instead. Write a sentence about what the cloud does next.',
  ],
  paragraph: [
    "Imagine you woke up and found a tiny dragon sleeping on your pillow. Write a paragraph about what you do next.",
    'A new planet was discovered and it is only for kids. Describe what makes it special.',
    'You are an inventor. Write a paragraph about a brand-new invention that helps kids with homework.',
    'Tell about a time you felt really proud. What happened? Why did it feel good?',
    'Your bike just turned into a flying bike. Describe your first trip on it.',
    "Imagine you swapped lives with a friendly squirrel for one day. What does the day feel like?",
    'You build a treehouse that can travel through time. Write a paragraph about the first place it takes you.',
    'A gentle giant moves into your town and wants to make friends. Write a paragraph about how you help everyone get along.',
    'You find a backpack that gives you any snack you wish for. Write a paragraph about the picnic you pack for your friends.',
    'Describe your favorite place in the whole world. What do you see, hear, and smell when you are there?',
    'A magic paintbrush lets you paint a doorway to anywhere. Write a paragraph about the place you visit first.',
    'You teach a clever parrot to help out around the house. Write a paragraph about the funny ways it tries to help.',
  ],
  story: [
    'Write a short story about a kid who finds a glowing stone in the backyard. What happens when they pick it up?',
    'A library book starts whispering to you when you open it. Write a story about what it says and where it leads you.',
    'You and a friendly alien explore a city no human has seen. What happens during your visit?',
    "A storm rolls in and brings a tiny lost cloud right into your kitchen. Write a story about it.",
    'You shrink to the size of an ant for one afternoon. Write a story about your big adventure across the lawn.',
    'A talking turtle asks you to help it deliver a mystery package across the meadow. Write a story about your journey there and back.',
    'You wake up to find your whole town has turned into a giant board game. Write a story about how you and your friends play your way home.',
    'A baby star falls out of the sky and lands in your garden. Write a story about how you help it get back up to space.',
    'You build a time machine out of a cardboard box, and it actually works. Write a story about the day in history you visit.',
    'A friendly sea creature invites you to a party at the bottom of the ocean. Write a story about everything you see along the way.',
    'You find a map that leads to the world’s biggest pillow fort. Write a story about the adventure of finding it with your friends.',
    'On the first morning of a brand-new made-up holiday, everyone in town wakes up able to talk to animals. Write a story about what happens that day.',
  ],
}

export function makeWritingPromptProvider(cfg: Config): ProblemProvider {
  const staticProvider = makeStaticWritingPromptProvider(cfg)
  if (cfg.source !== 'llm') return staticProvider

  const playerName = useProgress.getState().player?.name ?? ''
  return makeLlmCachedProvider({
    staticProvider,
    topic: `writing-${cfg.kind}`,
    template: 'writingPrompt',
    variables: { kind: cfg.kind, playerName },
    initialBatch: 4,
    refillThreshold: 1,
    refillBatch: 4,
  })
}

export type WritingKind = Config['kind']

/**
 * Grade shelves. Empty keys are not allowed: a grade key appears in the same
 * commit that fills its kinds to the ≥30-per-kind gate (writingPrompts.test.ts).
 * Authored by handoff steps A2 (2nd grade), A3 (3rd), A4 (4th).
 */
export const WRITING_PROMPTS_BY_GRADE: Partial<Record<GradeLevel, Record<WritingKind, string[]>>> = {
  // 2nd grade (handoff A2). Standards: CCSS W.2.1–W.2.3 — short opinion,
  // informative, and narrative writing on familiar topics. Concrete tasks,
  // everyday words, one idea per sentence; these join the shared list for G2.
  2: {
    // W.2.1 — one-sentence opinions and details about everyday life.
    sentence: [
      'Write a sentence about your favorite game to play at recess. Tell why it is fun.',
      'What do you like to do at home on a rainy day? Write a sentence about it.',
      'Write a sentence about a sound you heard this morning. What do you think made that sound?',
      'If you could choose any animal as a pet, which would you pick? Write one sentence about why.',
      'Write a sentence about the yummiest fruit you have ever eaten. What did it taste like?',
      'What season do you like best? Write a sentence about why you like it.',
      'Write a sentence about something kind a friend did for you. How did it make you feel?',
      'What is the best game to play at a birthday party? Write a sentence about why it is fun.',
      'Write a sentence about your favorite book. Tell why you like it so much.',
      'If your class could take a field trip anywhere, where would you want to go? Write a sentence about it.',
      'You have a whole sidewalk and a box of bright chalk. Write a sentence about the picture you would draw.',
      'What is the best thing about a sunny morning? Write a sentence about it.',
      'Write a sentence about your favorite animal at the zoo. Tell one thing it does that makes you smile.',
      'Write a sentence about the coziest spot in your home. Why do you like to sit there?',
      'If you could grow any vegetable in a garden, which would you plant? Write one sentence about it.',
      'Write a sentence about a song that makes you want to dance. When do you like to listen to it?',
      'What would you do outside if it snowed after school? Write a sentence about it.',
      'Write a sentence about a story you would share with a friend. Tell why it is good.',
      'If you could build anything out of cardboard boxes, what would you make? Write one sentence about it.',
      'Write a sentence about a grown-up who helps you every day. What do you like about them?',
      'What smells wonderful to you, like fresh cookies or rain on warm pavement? Write a sentence about your favorite smell.',
      'Write a sentence about your favorite holiday. Tell what your family does that day.',
      'Write a sentence about a farm you have visited or would love to visit. What do you see there?',
      'What is your favorite thing to do at the beach? Write a sentence about it.',
      'Write a sentence about something you like to look for in the night sky. What did you find?',
      'If you could have one magic power for an afternoon, what would you choose? Write a sentence about what you would do.',
      'Write a sentence about your best friend. What do the two of you like to do together?',
      'Write a sentence about your favorite breakfast food. What makes it so good?',
    ],
    // W.2.2 — short informative paragraphs naming who, what, and where.
    paragraph: [
      'Write a paragraph about the best picnic you can imagine. Say who you bring, what you eat, and where you sit.',
      'Write a paragraph about a place where you love to read. What makes it cozy?',
      'Write a paragraph about a job you do to help at home. How does your help make things better for your family?',
      'Imagine you build a treehouse. Write a paragraph about what is inside it and who you invite up the ladder.',
      'Invent a brand-new flavor of ice cream. Write a paragraph about what is mixed into it and what you would name it.',
      'Write a paragraph about your classroom. Tell what you see when you walk through the door in the morning.',
      'Write a paragraph about the library. What kinds of books would you fill a whole shelf with, and why?',
      'Imagine you are caring for a new puppy for a weekend. Write a paragraph about the three things you would do first.',
      'You start a garden with one small pot. Write a paragraph about what you plant, what you do each day, and what grows.',
      'You open a lemonade stand on a hot day. Write a paragraph about who comes by, what you serve, and how the day goes.',
      'Write a paragraph about the coolest place you have ever visited. Tell what you saw there and what you remember best.',
      'Write a paragraph about a walk in nature. Tell about the animals, plants, and sounds you might meet along the path.',
      'Write a paragraph about making pancakes with a grown-up. What do you mix, what do you flip, and how do they taste?',
      'Keep a weather journal for one imaginary week. Write a paragraph about what the sky did each day that week.',
      'Write a paragraph about your favorite season. Tell what the weather feels like and what games people play then.',
      'Imagine your town builds a brand-new playground. Write a paragraph about what you hope it has and why.',
      'Write a paragraph about a time you learned something new. Tell what was tricky and how you got better.',
      'Write a paragraph about your family dinner. Who is at the table, what is served, and what do you talk about?',
      'You find a seashell on the beach that whispers when you hold it to your ear. Write a paragraph about the story it tells.',
      'Write a paragraph about a pet you know or dream of having. Describe what it looks like and how it says hello.',
      'Imagine a day when the power goes out at home. Write a paragraph about the fun things your family does by candlelight.',
      'Write a paragraph about your favorite day of the school week. What classes or games make it the best?',
      'If animals could talk at the zoo, what do you think they would say about their day? Write a paragraph about it.',
      'You plan a camping trip in your backyard. Write a paragraph about what you pack, where you set up the tent, and what you see by the fire.',
      'Imagine you could teach your class for one day. Write a paragraph about what you would teach and how everyone would practice it.',
      'Write a paragraph about feeding birds in winter. What do you put out, and which birds come to visit?',
      'You plan a surprise party for a friend. Write a paragraph about the decorations, the cake, and what everyone shouts when your friend walks in.',
      'Write a paragraph about the best bike ride you know. Tell what you pass on the way and what makes the ride fun.',
    ],
    // W.2.3 — brief narratives with a beginning, middle, and ending hint.
    story: [
      'Write a story about a red balloon that floats away and tries to find its owner. Who does it meet along the way?',
      'Write a story about the day your class says hello to a new student. What do you do together on the first day?',
      'Write a story about a puppy who tries swimming at the lake for the first time. How does the day end?',
    ],
  },
}

/** The pool a grade draws for one kind: the shared list plus that grade's shelf. Exported for tests. */
export function poolForKind(kind: WritingKind, grade: GradeLevel): string[] {
  return [...STATIC_PROMPTS[kind], ...(WRITING_PROMPTS_BY_GRADE[grade]?.[kind] ?? [])]
}

export { STATIC_PROMPTS }

/**
 * The pool a child actually draws: the shared list plus their grade's shelf.
 * Grade comes from the config, else the profile, else the app-wide default (4).
 */
function poolFor(cfg: Config): string[] {
  const raw = cfg.grade ?? useProgress.getState().player?.grade
  const grade = isGradeLevel(raw) ? raw : DEFAULT_GRADE
  return poolForKind(cfg.kind, grade)
}

function makeStaticWritingPromptProvider(cfg: Config): ProblemProvider {
  let serial = 0
  const pool = poolFor(cfg)
  let queue = shuffle(pool)
  return {
    topic: `writing-${cfg.kind}`,
    next(): Problem {
      if (queue.length === 0) queue = shuffle(pool)
      const prompt = queue.shift()!
      return {
        id: `write-${cfg.kind}-${serial++}`,
        prompt,
        // answer/options are unused by WritingPad — placeholder values to satisfy type
        options: ['open'],
        answer: 'open',
        topic: `writing-${cfg.kind}`,
        difficulty: cfg.kind === 'sentence' ? 1 : cfg.kind === 'paragraph' ? 2 : 3,
        skill: { id: 'write-craft', label: 'writing' },
      }
    },
  }
}

// silence unused
void randInt
