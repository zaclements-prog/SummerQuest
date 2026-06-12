/**
 * Prompt template registry. Each provider that wants LLM content registers a
 * template here. Keeping prompts in one place makes them easy to tune.
 */

export interface BuiltPrompt {
  system: string
  user: string
  maxTokens?: number
}

export function buildPrompt(
  template: string,
  variables: Record<string, string | number>,
  count: number,
): BuiltPrompt {
  switch (template) {
    case 'wordProblem':
      return wordProblemPrompt(variables, count)
    case 'readingPassage':
      return readingPassagePrompt(variables, count)
    case 'sciencePassage':
      return sciencePassagePrompt(variables, count)
    case 'geometryConcept':
      return geometryConceptPrompt(variables, count)
    case 'dataGraph':
      return dataGraphPrompt(variables, count)
    case 'writingPrompt':
      return writingPromptPrompt(variables, count)
    default:
      throw new Error(`Unknown prompt template: ${template}`)
  }
}

const KID_SAFE_RULES = `You are creating content for an 8-9 year old child (entering 4th grade) in a learning game. Follow these rules strictly:
- Wholesome, age-appropriate, never scary, sad, or dark
- No violence, weapons, real-world conflicts, or anything frightening
- No religion, politics, or anything controversial
- Simple vocabulary suitable for a 3rd-4th grader
- Be warm and encouraging in tone`

function wordProblemPrompt(vars: Record<string, string | number>, count: number): BuiltPrompt {
  const topic = String(vars.topic ?? 'mixed')
  const playerName = String(vars.playerName ?? 'a student')
  const themeHint =
    topic === 'multiplication'
      ? 'Each problem must require multiplying two single-digit numbers (factors 2-10).'
      : topic === 'division'
        ? 'Each problem must require dividing a 2-digit number by a single-digit number with no remainder. The quotient should be a whole number 2-10.'
        : 'Mix of multiplication and division word problems. Single-digit factors / single-digit divisors with whole-number quotients.'

  const system = `${KID_SAFE_RULES}\n\nYou generate math word problems as JSON.`
  const user = `Generate ${count} math word problems for ${playerName}.

${themeHint}

Each problem must:
- Be 1-3 sentences, clearly written
- Have ONE correct numeric answer
- Include the answer plus exactly 3 plausible WRONG options (positive whole numbers near the right answer)
- Use varied real-world scenarios: animals, food, sports, school, hobbies, nature
- Be solvable from the text alone

Return ONLY valid JSON, no commentary, in this exact shape:
{
  "problems": [
    {
      "prompt": "Sam has 4 boxes of crayons with 6 crayons in each box. How many crayons in all?",
      "answer": 24,
      "options": [24, 18, 20, 30],
      "hint": "4 boxes × 6 crayons per box"
    }
  ]
}`
  return { system, user, maxTokens: 1800 }
}

function readingPassagePrompt(vars: Record<string, string | number>, count: number): BuiltPrompt {
  const level = Number(vars.level ?? 3)
  const playerName = String(vars.playerName ?? '')

  const system = `${KID_SAFE_RULES}\n\nYou generate reading comprehension passages and questions as JSON.`
  const user = `Generate ${count} reading comprehension exercises${playerName ? ` for ${playerName}` : ''}.

Each exercise needs:
- A short passage (3-5 sentences for grade 3, 4-6 sentences for grade 4) - level ${level}
- A title for the passage
- ONE comprehension question with 4 multiple-choice options and exactly one correct answer

Passage topics: fun facts about animals, space, ocean life, weather, plants, simple history, friendships, hobbies. Vary topics.

Question types should vary across exercises: detail (find in text), main idea, simple inference, vocabulary in context.

Return ONLY valid JSON in this exact shape (note that the "visual" field contains the passage):
{
  "problems": [
    {
      "prompt": "What did the otter use to crack open the clam?",
      "answer": "a small rock",
      "options": ["a small rock", "its teeth", "a stick", "a shell"],
      "visual": {
        "kind": "passage",
        "passageTitle": "The Clever Otter",
        "passageText": "Sea otters are some of the smartest animals in the ocean. One sunny morning, an otter named Pip floated on her back near the kelp. She had found a tasty clam, but its shell was hard to open. Pip pulled a small rock from her favorite pouch of skin under her arm and tapped the shell until it cracked. Then she enjoyed her meal in the warm sun.",
        "question": "What did the otter use to crack open the clam?"
      }
    }
  ]
}`
  return { system, user, maxTokens: 2500 }
}

function sciencePassagePrompt(vars: Record<string, string | number>, count: number): BuiltPrompt {
  const level = Number(vars.level ?? 3)
  const playerName = String(vars.playerName ?? '')

  const system = `${KID_SAFE_RULES}\n\nYou generate short science reading passages and questions as JSON for a 3rd-4th grade science game.`
  const user = `Generate ${count} science comprehension exercises${playerName ? ` for ${playerName}` : ''}.

Each exercise needs:
- A short, factual science passage (3-5 sentences for grade 3, 4-6 sentences for grade 4) - level ${level}
- A title for the passage
- ONE question with 4 multiple-choice options and exactly one correct answer

Science topics (vary across exercises, stay grade-appropriate and factually accurate): plants and how they grow, photosynthesis, animal life cycles, habitats and food chains, the water cycle, weather, states of matter (solid/liquid/gas), the human body, simple forces and motion, the solar system, rocks and soil. Keep all facts TRUE and simple.

Question types should vary: detail (find in text), main idea, simple inference, vocabulary in context.

Return ONLY valid JSON in this exact shape (note that the "visual" field contains the passage):
{
  "problems": [
    {
      "prompt": "What do bees carry from flower to flower?",
      "answer": "pollen",
      "options": ["pollen", "water", "sand", "leaves"],
      "visual": {
        "kind": "passage",
        "passageTitle": "Busy Bees",
        "passageText": "Bees do an important job for plants. As a bee sips sweet nectar from a flower, yellow dust called pollen sticks to its fuzzy body. When the bee flies to the next flower, some of that pollen rubs off. This helps the flowers make seeds so new plants can grow. Without bees, many plants would have a hard time making seeds.",
        "question": "What do bees carry from flower to flower?"
      }
    }
  ]
}`
  return { system, user, maxTokens: 2500 }
}

function geometryConceptPrompt(vars: Record<string, string | number>, count: number): BuiltPrompt {
  const level = Number(vars.level ?? 3)
  const focus =
    level >= 4
      ? 'lines and angles: right / acute / obtuse / straight angles, parallel vs perpendicular lines, classifying triangles (equilateral/isosceles/scalene), and degrees in a straight angle (180°) or full turn (360°)'
      : '2D shapes and their attributes: number of sides and vertices, naming polygons (triangle, quadrilateral, pentagon, hexagon, octagon), and identifying squares, rectangles, and circles'

  const system = `${KID_SAFE_RULES}\n\nYou generate geometry multiple-choice questions as JSON for a 3rd-4th grade math game.`
  const user = `Generate ${count} geometry questions - level ${level}.

Focus on ${focus}. Keep every fact mathematically TRUE and grade-appropriate.

Each question must:
- Be ONE clear question answerable without a picture (describe the shape/angle in words)
- Have exactly ONE correct answer plus 3 plausible wrong options
- Include a short, friendly hint

Return ONLY valid JSON in this exact shape:
{
  "problems": [
    {
      "prompt": "How many sides does a pentagon have?",
      "answer": "5",
      "options": ["5", "6", "4", "7"],
      "hint": "'Penta' means five."
    }
  ]
}`
  return { system, user, maxTokens: 1500 }
}

function dataGraphPrompt(vars: Record<string, string | number>, count: number): BuiltPrompt {
  const level = Number(vars.level ?? 3)
  const focus =
    level >= 4
      ? 'multi-step reads: adding two or more bars together, or finding the difference between bars (how many more / how many fewer). Use values up to about 40.'
      : 'direct reads: which bar is the most or fewest, or how many a single bar shows. Use small whole-number values (2-10).'

  const system = `${KID_SAFE_RULES}\n\nYou generate bar-graph data questions as JSON for a 3rd-4th grade math game.`
  const user = `Generate ${count} bar-graph questions - level ${level}.

Focus on ${focus}

Each question must:
- Include a small bar graph (3 or 4 bars) with a title, friendly category labels, and whole-number values
- Ask ONE question that is answered by READING the bars
- Have exactly ONE correct answer plus 3 plausible wrong options
- The answer MUST be arithmetically correct given the bar values you chose
- Include a short hint

Vary the topics (favorite things, pets, sports, weather, recycling, books, tickets, etc.).

Return ONLY valid JSON in this exact shape (the "visual" field holds the graph):
{
  "problems": [
    {
      "prompt": "How many more apples than bananas were sold?",
      "answer": "4",
      "options": ["4", "3", "12", "8"],
      "hint": "Apples (8) minus bananas (4).",
      "visual": {
        "kind": "barGraph",
        "title": "Fruit Sold",
        "unit": "pieces",
        "bars": [
          { "label": "Apple", "value": 8 },
          { "label": "Banana", "value": 4 },
          { "label": "Pear", "value": 6 }
        ]
      }
    }
  ]
}`
  return { system, user, maxTokens: 2200 }
}

function writingPromptPrompt(vars: Record<string, string | number>, count: number): BuiltPrompt {
  const kind = String(vars.kind ?? 'sentence')
  const playerName = String(vars.playerName ?? '')

  const lengths: Record<string, string> = {
    sentence: 'a single complete sentence',
    paragraph: 'a 3-5 sentence paragraph',
    story: 'a short story (5-8 sentences) with a clear beginning, middle, and end',
  }

  const system = `${KID_SAFE_RULES}\n\nYou create open-ended writing prompts for kids.`
  const user = `Generate ${count} writing prompts${playerName ? ` for ${playerName}` : ''}.

Each prompt invites the child to write ${lengths[kind] ?? lengths.sentence}. They should be:
- Fun and imaginative (talking animals, made-up places, time travel, magical objects, friendly aliens)
- Clear about what to write
- Encouraging — no "right answer" required

Return ONLY valid JSON in this shape (no "answer" or "options" — the LLM will grade the kid's response separately):
{
  "problems": [
    {
      "prompt": "Imagine you woke up and found a tiny dragon sleeping on your pillow. Write ${lengths[kind] ?? lengths.sentence} about what you do next.",
      "answer": "open",
      "options": ["open"]
    }
  ]
}

The "answer" and "options" fields should always be "open" / ["open"] — the writing pad ignores them.`
  return { system, user, maxTokens: 800 }
}

/**
 * Writing evaluation prompt — given the kid's response, return a structured rubric score.
 * This is a one-shot prompt, not a batch generator.
 */
export function buildWritingEvalPrompt(args: {
  promptText: string
  kidResponse: string
  kind: 'sentence' | 'paragraph' | 'story'
  playerName?: string
}): BuiltPrompt {
  const rubricForKind: Record<string, string> = {
    sentence:
      'Rubric: Is it a complete sentence? Does it answer the prompt? Are basic conventions (capital, punctuation) used? Is it on-topic?',
    paragraph:
      'Rubric: Does it have a clear topic, 2-4 supporting sentences, and end appropriately? Are sentences varied? Are conventions mostly right (capitalization, end punctuation)?',
    story:
      'Rubric: Does it have a beginning, middle, and end? Are there at least one character and a problem or event? Is it descriptive? Conventions OK for grade 3-4?',
  }

  const system = `You are a warm, encouraging 3rd-4th grade writing teacher grading a child's writing.

Be GENTLE. Celebrate genuine strengths first. Spelling mistakes from a 9-year-old are NORMAL — only mention them if they're severe enough to harm meaning. Focus on ideas and structure, not nitpicks.

You MUST output valid JSON only — no preamble, no markdown.`

  const user = `Writing kind: ${kind(args.kind)}
${rubricForKind[args.kind]}

PROMPT GIVEN TO STUDENT:
"${args.promptText}"

STUDENT'S RESPONSE:
"${args.kidResponse.trim()}"

Grade this response. Output ONLY this JSON shape:
{
  "score": 0-100,
  "stars": 0-3,
  "celebrations": ["specific thing they did well", "another specific thing"],
  "improvements": ["one gentle suggestion (only if score < 85)"],
  "summary": "2-sentence warm summary addressed to ${args.playerName ?? 'the student'} directly. Encouraging, age-appropriate."
}

Stars guide:
- 3 stars: complete, on-topic, age-appropriate quality
- 2 stars: clearly tried and mostly there
- 1 star: attempted but missing major elements
- 0 stars: blank, unrelated, or just a few words

If the response is fewer than ${args.kind === 'sentence' ? 3 : args.kind === 'paragraph' ? 12 : 25} words, lower the score significantly.`
  return { system, user, maxTokens: 500 }
}

function kind(k: 'sentence' | 'paragraph' | 'story'): string {
  return k === 'sentence' ? 'single sentence' : k === 'paragraph' ? 'paragraph' : 'short story'
}
