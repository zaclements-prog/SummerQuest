import type { Lesson } from '../types'

// Motion scenes: src/tutoring/motion/scenes/writing.tsx (cue phrases come from
// these narration lines; keep them in sync when editing).
export const writingLesson: Lesson = {
  id: 'writing',
  zoneId: 'writing-workshop',
  skillIds: ['write-craft'],
  title: 'Writing',
  emoji: '✏️',
  intro: 'Writing a strong sentence starts with knowing what a sentence needs.',
  practiceStageId: 'write-paragraph',
  steps: [
    {
      id: 'parts',
      narration: 'A complete sentence has two parts. The naming part tells who or what the sentence is about. The action part tells what they do. And every sentence starts with a capital letter and ends with a punctuation mark.',
      body: 'Sentence = naming part + action part. Capital letter to start, punctuation to end.',
    },
    {
      id: 'example',
      narration: 'Here is an example. The dog ran fast. The naming part is the dog, because that is who the sentence is about, and the action part is ran fast, because that tells what the dog does.',
      body: '“The dog ran fast.” → naming part: the dog · action part: ran fast.',
      check: { question: 'In “The cat slept.”, which words are the naming part?', options: ['The cat', 'slept', 'cat slept', 'The'], answer: 'The cat', explain: '“The cat” tells who the sentence is about. “slept” is the action part.' },
    },
    {
      id: 'fragments',
      narration: 'If a part is missing, it is not a complete sentence. The big dog. What did it do? Ran fast. Who ran? Put the parts together: The big dog ran fast. Now it is complete!',
      body: 'Missing a part? Not a sentence yet. Naming part + action part = complete!',
      check: { question: 'Which one is a complete sentence?', options: ['The bird sang a song.', 'The big dog.', 'Ran fast.', 'Under the tree.'], answer: 'The bird sang a song.', explain: 'It has a naming part (The bird) and an action part (sang a song), a capital letter, and a period.' },
    },
    {
      id: 'endmarks',
      narration: 'Every sentence ends with an end mark. A period ends a telling sentence. A question mark ends an asking sentence. And an exclamation point shows a strong feeling, like wow!',
      body: '.  telling  ·  ?  asking  ·  !  strong feeling',
      check: { question: 'Which end mark goes after this sentence: Where is my hat', options: ['?', '.', '!', ','], answer: '?', explain: 'It asks something, so it ends with a question mark: Where is my hat?' },
    },
  ],
}
