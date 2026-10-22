import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'

/**
 * Writing Workshop, 5th grade (phase-3 contract: `g5-write-1..3`, W.5.1–3).
 * Like grades 2–4 it plays on the writing pad, a prompt at a time; a grade-5
 * prompt also carries a checklist the pad shows beside it and the offline
 * grader (lib/g5WritingGrader) checks: paragraphs, reasons with evidence,
 * linking words, a conclusion, dialogue in quotation marks, time transitions.
 *
 *   opinion      W.5.1  an opinion, reasons backed by facts and examples, a conclusion
 *   informative  W.5.2  a topic, facts grouped in paragraphs, linking words, a conclusion
 *   narrative    W.5.3  dialogue, description, pacing and transitions, an ending
 *
 * Its own kind, so the 2–4 `writingPrompt` shelves and their gates are untouched.
 */
export type G5WritingMode = 'opinion' | 'informative' | 'narrative'

export interface G5WritingConfig {
  mode: G5WritingMode
}

/** What the pad shows and the grader checks, by mode. */
export const G5_CHECKLISTS: Record<G5WritingMode, string[]> = {
  opinion: [
    'State your opinion in your first sentence.',
    'Give at least two reasons.',
    'Back up each reason with a fact or an example.',
    'Link ideas with words like because, for example, also and therefore.',
    'Write at least two paragraphs and end with a conclusion.',
  ],
  informative: [
    'Introduce your topic in the first sentence.',
    'Group related facts into paragraphs.',
    'Use facts, details or numbers.',
    'Link ideas with words like another, for example, also and because.',
    'Finish with a concluding sentence.',
  ],
  narrative: [
    'Introduce your characters and where they are.',
    'Use dialogue in quotation marks: “Look out!” yelled Max.',
    'Describe what characters see, hear and feel.',
    'Show time passing with transitions like later, meanwhile and after that.',
    'Write in paragraphs and give your story an ending.',
  ],
}

export const G5_WRITING_LABEL: Record<G5WritingMode, string> = { opinion: 'Opinion', informative: 'Informative', narrative: 'Narrative' }

export const G5_WRITING_SKILL: Record<G5WritingMode, { id: string; label: string }> = {
  opinion: { id: 'g5-write-opinion', label: 'opinion writing: reasons and evidence' },
  informative: { id: 'g5-write-informative', label: 'informative writing: facts and linking words' },
  narrative: { id: 'g5-write-narrative', label: 'narrative writing: dialogue and transitions' },
}

export const G5_WRITING_PROMPTS: Record<G5WritingMode, string[]> = {
  opinion: [
    'Should students have homework on weekends? Write an opinion piece with at least two reasons and evidence for each.',
    'Is it better to have a dog or a cat as a family pet? State your opinion and support it with reasons and examples.',
    'Should every school day start with twenty minutes of exercise? Write an opinion piece that convinces your principal.',
    'Should kids be allowed to choose the books they read in class? Give your opinion, two reasons and evidence for each.',
    'Is summer or winter the best season? Write an opinion piece with reasons, examples and a strong conclusion.',
    'Should your town build a new skate park or a new library? Choose one and convince the town council.',
    'Should students wear school uniforms? State your opinion and back it up with facts and examples.',
    'Is it more fun to read a book or to watch the movie made from it? Explain your opinion with reasons and examples.',
    'Should the school cafeteria serve only healthy snacks? Write an opinion piece with at least two reasons.',
    'Should fifth graders be allowed to have a phone? Give your opinion and support it with reasons and examples.',
    'Should zoos keep large animals like elephants? Write an opinion piece that uses reasons and evidence.',
    'Is it better to learn to play an instrument or a sport? State your opinion and support it with examples.',
    'Should recess be longer than it is now? Convince a teacher with reasons, facts and examples.',
    'Should your class take a field trip to a museum or to a farm? Choose one and give at least two reasons.',
    'Should video games count as a sport? Write an opinion piece with reasons and evidence for each reason.',
    'Should kids get an allowance for doing chores? State your opinion, give two reasons and end with a conclusion.',
    'Is it better to live in a city or in the countryside? Write an opinion piece with reasons and examples.',
    'Should students help plan the school lunch menu? Write an opinion piece that convinces your principal.',
    'Should every student learn a second language? Give your opinion and support it with facts and examples.',
    'Is it better to work on a project alone or with a group? Explain your opinion with reasons and examples.',
  ],
  informative: [
    'Explain how a caterpillar becomes a butterfly. Introduce the topic, group the stages in paragraphs and end with a conclusion.',
    'Explain how to take care of a pet you know well. Use facts, linking words and a concluding sentence.',
    'Explain why the moon seems to change shape during a month. Introduce your topic and use facts and linking words.',
    'Describe how people in your community get their drinking water. Group your facts into paragraphs.',
    'Explain how a seed grows into a plant. Use linking words like first, another and because.',
    'Explain the rules of a game or sport you know well so that a new player could join in.',
    'Inform a reader about an animal that lives in the ocean: where it lives, what it eats and how it stays safe.',
    'Explain how recycling works, from the bin at home to a new product. Group your facts into paragraphs.',
    'Explain why people need sleep. Introduce your topic, give facts and details, and end with a conclusion.',
    'Describe the water cycle for a younger student. Use linking words to connect each step.',
    'Explain how to plan a garden, from choosing a spot to picking the vegetables. Use paragraphs and a conclusion.',
    'Inform a reader about a holiday or tradition your family celebrates. Use facts, details and examples.',
    'Explain how the four seasons are different where you live. Group facts about each season together.',
    'Explain what makes a good friend. Introduce your topic, give examples and finish with a conclusion.',
    'Describe how a volcano erupts and how it can build new land. Use facts and linking words.',
    'Explain how bees help plants make fruit and seeds. Use facts and a concluding sentence.',
    'Inform a reader about an invention that changed the world. Explain what it does and why it matters.',
    'Explain how to stay safe during a thunderstorm. Group your tips into paragraphs.',
    'Describe how food travels from a farm to your table. Use linking words to connect each step.',
    'Explain why some animals hibernate in winter. Introduce your topic, give facts and end with a conclusion.',
  ],
  narrative: [
    'Write a story about two friends who find a strange key on the way home from school. Use dialogue and describe their feelings.',
    'Write a story about a kid who gets lost at a crowded fair. Use transitions to show time passing and give it an ending.',
    'Write a story about the day a robot joined your class. Use dialogue in quotation marks and vivid details.',
    'Write a story about a camping trip where the weather suddenly changes. Slow down the most exciting moment.',
    'Write a story about someone who has to be brave for the first time. Show their feelings through actions and dialogue.',
    'Write a story about a pet that goes missing and the search to find it. Use transitions like later and meanwhile.',
    'Write a story about a kid who discovers a secret room in an old library. Use dialogue and sensory details.',
    'Write a story about a big game, recital or contest where something goes wrong. Show how the character solves it.',
    'Write a story about a talking animal who asks you for help. Use dialogue and describe the setting.',
    'Write a story about a family road trip with a surprise stop. Use transitions to move the story along.',
    'Write a story about a kid who invents something that works a little too well. Use dialogue and a clear ending.',
    'Write a story about two characters who start as rivals and end as friends. Show how they change.',
    'Write a story that begins with the words “The power went out just as the storm began.” Use dialogue and details.',
    'Write a story about a time traveler who lands in your town one hundred years ago. Describe what they see and hear.',
    'Write a story about a new student on the first day of school. Show their thoughts and feelings with details.',
    'Write a story about a treasure map found inside an old book. Use dialogue and transitions.',
    'Write a story about a snow day that turns into an adventure. Slow down the best moment with details.',
    'Write a story about a friendly dragon who is afraid of the dark. Use dialogue and give it a satisfying ending.',
    'Write a story about building something with a grandparent. Use dialogue and describe how the characters feel.',
    'Write a story about a bike race with an unexpected finish. Use transitions and vivid verbs.',
  ],
}

/** A grade-5 writing prompt: the pad shows its checklist; the grader checks it. */
export interface G5WritingProblem extends Problem {
  g5Writing: { mode: G5WritingMode; checklist: string[] }
}

export function isG5WritingProblem(p: Problem | null | undefined): p is G5WritingProblem {
  return !!p && typeof (p as Partial<G5WritingProblem>).g5Writing === 'object'
}

export function makeG5WritingProvider(cfg: G5WritingConfig): ProblemProvider {
  const pool = G5_WRITING_PROMPTS[cfg.mode]
  let queue = shuffle(pool)
  let serial = 0
  return {
    topic: `g5-writing-${cfg.mode}`,
    next(): G5WritingProblem {
      if (queue.length === 0) queue = shuffle(pool)
      return {
        id: `g5write-${cfg.mode}-${serial++}`,
        prompt: queue.shift()!,
        // (the pad does not use options: placeholders, as for grades 2–4)
        options: ['open'],
        answer: 'open',
        topic: `g5-writing-${cfg.mode}`,
        difficulty: 5,
        skill: G5_WRITING_SKILL[cfg.mode],
        g5Writing: { mode: cfg.mode, checklist: G5_CHECKLISTS[cfg.mode] },
      }
    },
    reset() {
      queue = shuffle(pool)
    },
  }
}
