import type { Lesson } from '../types'

// Every step reads the same short passage. The motion scenes
// (src/tutoring/motion/scenes/reading.tsx) draw it on a storybook page and cue
// highlights from these narration lines; the passage visual is the fallback, and
// its `question` line matches what each step teaches.
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
      narration: 'Good readers look for the main idea: what the whole passage is mostly about. Read each sentence and ask, who or what is it about? Frogs. Frogs. Frogs! So this passage is mostly about frogs.',
      body: 'Main idea = what the passage is mostly about.',
      visual: { kind: 'passage', ...FROG, question: 'What is this passage mostly about?' },
    },
    {
      id: 'supports',
      narration: 'Think of the main idea as a tabletop. The details are the legs that hold it up. Frogs live near ponds. Frogs eat insects. Frogs can jump far. Each detail tells us more about frogs.',
      body: 'Main idea = the tabletop. Details = the legs that hold it up.',
      visual: { kind: 'passage', ...FROG, question: 'Which sentences are details about frogs?' },
      // The wrong options are exactly the details: tests main idea vs. detail.
      check: { question: 'What is the frog passage mostly about?', options: ['Frogs', 'Ponds', 'Insects', 'Jumping'], answer: 'Frogs', explain: 'Ponds, insects, and jumping are details. Every sentence is about frogs, so frogs are the main idea.' },
    },
    {
      id: 'detail',
      narration: 'For a detail question, go back into the text and find the exact words. Don’t guess from memory! What do frogs eat? Find the clue word, eat, in the passage. There it is: they eat insects.',
      body: 'Detail question? Go back and find the exact words.',
      visual: { kind: 'passage', ...FROG, question: 'Find the sentence that tells what frogs eat.' },
      check: { question: 'Go back to the text. Where do frogs live?', options: ['Near ponds', 'In trees', 'In the desert', 'Under the sea'], answer: 'Near ponds', explain: 'The text says: “They live near ponds.” The clue word is live.' },
    },
    {
      id: 'infer',
      narration: 'Sometimes the answer is not written down, so you use clues. The text says frogs can jump very far. What do you know about jumping far? It takes strong legs! Clues plus what you know make an inference.',
      body: 'Clue + what I know = inference.',
      visual: { kind: 'passage', ...FROG, question: 'What can you figure out about a frog’s legs?' },
      check: { question: 'Mia’s dog wags its tail and runs to the door when she gets home. How does the dog feel?', options: ['Happy', 'Sad', 'Sleepy', 'Scared'], answer: 'Happy', explain: 'Clues: a wagging tail, running to Mia. You know dogs do that when they are glad, so the dog is happy!' },
    },
  ],
}
