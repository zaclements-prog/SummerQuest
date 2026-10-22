import type { Lesson } from '../types'

// Motion scenes: src/tutoring/motion/scenes/g5Writing.tsx (cue phrases come
// from these narration lines; keep them in sync when editing).

/**
 * 5th grade: Writing Workshop (W.5.1–3). An opinion with reasons and evidence,
 * linking words, informative paragraphs, dialogue punctuation, and pacing with
 * transitions: the same items as the pad's checklists. Practice: the zone's
 * first grade-5 stage.
 */
export const g5WritingLesson: Lesson = {
  id: 'g5Writing',
  band: 'g5',
  zoneId: 'writing-workshop',
  skillIds: ['g5-write-opinion', 'g5-write-informative', 'g5-write-narrative'],
  title: 'Writer’s Toolbox',
  emoji: '🧰',
  intro: 'Opinions with evidence, linking words, paragraphs, dialogue and transitions.',
  practiceStageId: 'g5-write-1',
  steps: [
    {
      id: 'opinion',
      narration:
        'A strong opinion piece is built like a sandwich. Start with your opinion. Then give a reason, and back it up with evidence: a fact or an example. Add another reason with its evidence. Finish by saying your opinion again in new words.',
      body: 'Opinion → reason + evidence → reason + evidence → conclusion.',
      check: {
        question: 'Opinion: “Schools should have gardens.” Which sentence is evidence?',
        options: ['Students at one school ate twice as many vegetables after planting carrots.', 'I really love gardens.', 'Gardens are the best.', 'Everyone should agree with me.'],
        answer: 'Students at one school ate twice as many vegetables after planting carrots.',
        explain: 'Evidence is a fact or an example that backs up a reason. The others are only feelings.',
      },
    },
    {
      id: 'linking',
      narration:
        'Linking words are bridges between ideas. Use because to give a reason. Use for example to show evidence. Use also and in addition to add more. Use however to turn to a different idea, and therefore to show a result.',
      body: 'because · for example · also · in addition · however · therefore',
      check: {
        question: 'Choose the best linking word: “Bikes are good exercise. ___, they do not pollute the air.”',
        options: ['In addition', 'However', 'For example', 'Because'],
        answer: 'In addition',
        explain: 'The second sentence adds another good thing about bikes, so “In addition” links them.',
      },
    },
    {
      id: 'paragraphs',
      narration:
        'Informative writing teaches a reader. Begin with a topic sentence that tells what you will explain. Group facts that belong together into a paragraph. Start a new paragraph for a new idea. End with a conclusion that wraps it all up.',
      body: 'Topic sentence → a paragraph for each group of facts → conclusion.',
      check: {
        question: 'Which is the best topic sentence for a report about bees?',
        options: ['Bees do three important jobs for plants and people.', 'I saw a bee yesterday.', 'Bees are yellow.', 'The end.'],
        answer: 'Bees do three important jobs for plants and people.',
        explain: 'It tells the reader what the whole report will explain: the jobs bees do.',
      },
    },
    {
      id: 'dialogue',
      narration:
        'Dialogue makes characters talk. Put the spoken words inside quotation marks. The comma or end mark goes inside the closing quotation mark, before the speaker tag. Start a new paragraph each time a new character speaks.',
      body: '“Wait for me,” said Mia.   “Look out!” yelled Max.',
      check: {
        question: 'Which sentence is punctuated correctly?',
        options: ['“Let’s go,” said Leo.', '“Let’s go” said Leo.', 'Let’s go, “said Leo.”', '“Let’s go”, said Leo.'],
        answer: '“Let’s go,” said Leo.',
        explain: 'The comma belongs inside the closing quotation mark, right after the spoken words.',
      },
    },
    {
      id: 'pacing',
      narration:
        'Good stories have pacing. Slow down at the exciting moment: describe what the character sees, hears and feels. Speed up the boring parts with transitions like later that day, meanwhile, and after that. Then give your story a real ending.',
      body: 'Slow down the big moment · speed up with transitions · end it well.',
      check: {
        question: 'Which transition best shows time passing?',
        options: ['Later that afternoon,', 'Because', 'For example,', 'In addition,'],
        answer: 'Later that afternoon,',
        explain: '“Later that afternoon” moves the story forward in time. The others link reasons or examples.',
      },
    },
  ],
}
