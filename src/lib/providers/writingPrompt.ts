import type { Problem, ProblemProvider } from '../problem'
import { makeLlmCachedProvider } from '../llm-cache'
import { useProgress } from '../../store/progress'
import { randInt, shuffle } from '../random'

interface Config {
  kind: 'sentence' | 'paragraph' | 'story'
  source?: 'static' | 'llm'
}

const STATIC_PROMPTS: Record<Config['kind'], string[]> = {
  sentence: [
    'Describe what your favorite snack tastes like — use words that paint a picture.',
    'Imagine you just discovered a tiny door at the bottom of your backyard. Write what you find inside.',
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
    'Describe your most favorite place in the whole world. What do you see, hear, and smell when you are there?',
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
    'On the first morning of a brand-new made-up holiday, everyone in town wakes up able to talk to animals. Write a story about how the day unfolds.',
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

function makeStaticWritingPromptProvider(cfg: Config): ProblemProvider {
  let serial = 0
  const pool = STATIC_PROMPTS[cfg.kind]
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
