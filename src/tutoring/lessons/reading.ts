import type { Lesson } from '../types'

// Both steps show the same passage. The passage visual prints its `question`
// line under the text, so each step's line matches what that step teaches (and,
// for `detail`, points at the sentence that answers the check).
const FROG = {
  passageTitle: 'The Frog',
  passageText: 'Frogs are amphibians. They live near ponds and eat insects. They can jump very far.',
}

export const readingLesson: Lesson = {
  id: 'reading',
  zoneId: 'reading-reef',
  skillIds: ['read-comprehend'],
  title: 'Reading',
  emoji: '📚',
  intro: 'Good readers understand what the words are telling them.',
  practiceStageId: 'read-4th',
  steps: [
    {
      id: 'mainidea',
      narration: 'Good readers look for the main idea, which is what the whole passage is mostly about. As you read about the frog, ask yourself what the writer wants you to learn.',
      body: 'Main idea = what the passage is mostly about.',
      visual: { kind: 'passage', ...FROG, question: 'What is this passage mostly about?' },
    },
    {
      id: 'detail',
      narration: 'For a detail question, you go back into the text and find the exact words that answer it. Do not guess from memory. Look for the sentence that talks about what frogs eat.',
      body: 'Detail question? Go back and find the exact words.',
      visual: { kind: 'passage', ...FROG, question: 'Find the sentence that tells what frogs eat.' },
      check: { question: 'What do frogs eat?', options: ['Insects', 'Grass', 'Fish', 'Leaves'], answer: 'Insects', explain: 'The passage says frogs eat insects.' },
    },
  ],
}
