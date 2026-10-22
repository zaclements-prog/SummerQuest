/**
 * Science Summit, 5th grade (K–5 plan, phase-3 contract): level-5 passages and
 * quick items, written for SummerQuest.
 *
 *   matter    5-PS1-1 matter is made of particles too small to see
 *             5-PS1-2 the total weight is conserved when matter changes
 *             5-PS1-3 properties identify materials
 *             5-PS1-4 mixing two substances can make a new substance
 *   foodWebs  5-PS3-1 the energy in animals' food was once sunlight
 *             5-LS1-1 plants get the materials they need mostly from air and water
 *             5-LS2-1 matter moves among plants, animals, decomposers and the environment
 *   spheres   5-ESS2-1 the geosphere, hydrosphere, atmosphere and biosphere interact
 *             5-ESS2-2 how much of Earth's water is salt and fresh, and where it is
 *   sky       5-PS2-1 gravity pulls objects down, toward Earth's center
 *             5-ESS1-1 the sun is a star; it looks brighter because it is closer
 *             5-ESS1-2 shadows, day and night, and stars seen only in some seasons
 *
 * Passages follow the 2–4 bank's shape (the `passage` visual); the wrong
 * options are the classic misconceptions (dissolved salt weighs nothing, a
 * tree is built from soil, the sun circles the Earth). The number questions
 * about matter, food chains and shadows are generated in ../g5Science.
 */

export type G5ScienceStrand = 'matter' | 'foodWebs' | 'spheres' | 'sky'

export interface G5SciQuestion {
  question: string
  answer: string
  options: string[]
}

export interface G5SciPassage {
  title: string
  strand: G5ScienceStrand
  text: string
  questions: G5SciQuestion[]
}

const paras = (...ps: string[]) => ps.join('\n\n')

export const G5_SCIENCE_PASSAGES: G5SciPassage[] = [
  // ── matter (5-PS1) ───────────────────────────────────────────────────────
  {
    title: 'Too Small to See',
    strand: 'matter',
    text: paras(
      'Drop a spoonful of sugar into warm water and stir. In a minute, the sugar seems to vanish. But take a sip, and the water tastes sweet. The sugar is still there! It has broken apart into particles far too small to see.',
      'All matter is made of tiny particles. You cannot see the particles of air either, yet air is matter: it takes up space and has mass. When you pump air into a basketball, the ball gets firm because billions of air particles push on the inside. A pumped-up ball even weighs a tiny bit more than a flat one.',
    ),
    questions: [
      { question: 'How do you know the sugar is still in the water?', answer: 'The water tastes sweet.', options: ['The water turns white.', 'The water tastes sweet.', 'The spoon feels heavier.', 'The water gets colder.'] },
      { question: 'Which observation shows that air is matter?', answer: 'Pumping air into a ball makes it firm and heavier.', options: ['You cannot see air at all.', 'Pumping air into a ball makes it firm and heavier.', 'Air feels cool on your skin on a windy winter day.', 'Air disappears when it gets warm.'] },
      { question: 'Why does the sugar seem to disappear?', answer: 'It breaks into particles too small to see.', options: ['It turns into water.', 'It floats away as a gas.', 'It breaks into particles too small to see.', 'It sinks to the bottom and hides under the spoon.'] },
    ],
  },
  {
    title: 'Is the Weight Still There?',
    strand: 'matter',
    text: paras(
      'Scientists have tested a simple question many times: when you mix, melt or dissolve something, does its weight change? To find out, they weigh everything before and after, keeping it inside a closed container so nothing can sneak in or out.',
      'The answer is always the same. If 100 grams of ice melts in a sealed jar, there are 100 grams of water. If 20 grams of salt dissolves in 200 grams of water, the salt water weighs 220 grams. Even when vinegar and baking soda fizz and make a gas inside a sealed bag, the bag weighs the same afterward. The matter changes form, but the total amount stays the same. Scientists call this the conservation of matter.',
    ),
    questions: [
      { question: 'Why do scientists use a closed container in these tests?', answer: 'so no matter can get in or out', options: ['so the mixture stays warm enough', 'so no matter can get in or out', 'so the scale stays clean', 'so the gas can escape'] },
      { question: 'What does “conservation of matter” mean?', answer: 'The total amount of matter stays the same when it changes form.', options: ['Matter should be saved and never wasted.', 'Matter disappears when it dissolves.', 'The total amount of matter stays the same when it changes form.', 'Matter always gets a little heavier every time it melts.'] },
      { question: 'If the vinegar and baking soda were mixed in an open cup, why might the cup weigh less afterward?', answer: 'Some of the gas would escape into the air.', options: ['The vinegar would turn into nothing.', 'Some of the gas would escape into the air.', 'Open cups always weigh less.', 'The fizzing destroys some of the matter in the cup.'] },
    ],
  },
  {
    title: 'Clues in the Properties',
    strand: 'matter',
    text: paras(
      'Imagine you find three shiny, silver-colored samples in a science lab. How can you tell them apart? Scientists use properties, the traits that describe a material.',
      'First, they might test with a magnet. Iron is attracted to a magnet, but aluminum and silver are not. Next, they could check hardness by trying to scratch each sample. They might also test whether the material conducts electricity by placing it in a simple circuit with a bulb. Metals conduct electricity well, so the bulb lights up. Plastic and wood do not, so the bulb stays dark.',
      'Other properties include color, how well a material reflects light, and whether it dissolves in water. By testing several properties, scientists can identify an unknown material, even when two samples look exactly alike.',
    ),
    questions: [
      { question: 'A gray sample sticks to a magnet. Which material could it be?', answer: 'iron', options: ['aluminum', 'iron', 'plastic', 'wood'] },
      { question: 'A bulb lights up when a sample is placed in the circuit. What does this show?', answer: 'The sample conducts electricity.', options: ['The sample is magnetic.', 'The sample conducts electricity.', 'The sample dissolves easily in water.', 'The sample is very hard.'] },
      { question: 'Why do scientists test several properties instead of just one?', answer: 'Two different materials can share one property.', options: ['One test alone always gives the wrong answer.', 'Two different materials can share one property.', 'Magnets do not work on metals.', 'Properties change every day.'] },
    ],
  },
  {
    title: 'Something New',
    strand: 'matter',
    text: paras(
      'Sometimes mixing two substances makes a mixture, where each part keeps its own properties. If you stir sand into a bowl of dry beans, you can pick the beans back out. Nothing new has formed.',
      'Other times, mixing creates something brand new. When vinegar meets baking soda, the mixture bubbles and foams. Those bubbles are a gas, carbon dioxide, that was not there before. When milk is left out too long, it sours and forms lumps with a new smell. When an iron nail sits out in the rain, a reddish-brown crust called rust slowly forms.',
      'Clues that a new substance has formed include bubbles of gas, a change in color, a new smell, or heat or light being given off.',
    ),
    questions: [
      { question: 'Which of these is a mixture where each part keeps its properties?', answer: 'sand stirred into dry beans', options: ['vinegar poured on baking soda', 'an iron nail rusting in the rain', 'sand stirred into dry beans', 'milk turning sour'] },
      { question: 'Which clue shows a new substance formed when vinegar and baking soda were mixed?', answer: 'Bubbles of a gas appeared.', options: ['The vinegar was a liquid.', 'Bubbles of a gas appeared.', 'The baking soda was white.', 'The cup was made of glass.'] },
      { question: 'What is rust?', answer: 'a new substance that forms on iron left in the rain', options: ['a kind of paint for nails', 'dirt that washes off easily when the nail is scrubbed', 'a new substance that forms on iron left in the rain', 'a mixture of sand and beans'] },
    ],
  },
  // ── food webs (5-PS3-1, 5-LS1-1, 5-LS2-1) ────────────────────────────────
  {
    title: 'Energy From the Sun',
    strand: 'foodWebs',
    text: paras(
      'Almost every food web on Earth begins with sunlight. Plants, algae and some tiny living things are producers: they use the energy in sunlight to make their own food from water and carbon dioxide, a gas in the air.',
      'Here is a surprise: most of the material that makes up a tree’s wood does not come from the soil. It comes from carbon dioxide in the air and water pulled up by the roots. The soil gives plants important minerals, but only in small amounts.',
      'Animals cannot make their own food. When a rabbit eats clover, it gets energy that the clover first captured from the sun. When a fox eats the rabbit, that energy passes along again.',
    ),
    questions: [
      { question: 'Where does most of the material in a tree’s wood come from?', answer: 'carbon dioxide from the air, and water', options: ['minerals and nutrients from the soil', 'carbon dioxide from the air, and water', 'sunlight turned directly into wood', 'insects that land on the leaves'] },
      { question: 'Why are plants called producers?', answer: 'They make their own food using sunlight.', options: ['They produce new seeds every single year.', 'They make their own food using sunlight.', 'They eat other living things.', 'They break down dead animals.'] },
      { question: 'Where did the energy in the fox’s meal first come from?', answer: 'sunlight captured by the clover', options: ['the rabbit’s own body', 'sunlight captured by the clover', 'minerals in the soil', 'the fox’s own strong muscles'] },
    ],
  },
  {
    title: 'Who Eats Whom in the Meadow',
    strand: 'foodWebs',
    text: paras(
      'In a meadow food web, grasses and wildflowers are the producers. Grasshoppers and mice are consumers that eat plants. Snakes eat mice, and hawks eat both snakes and mice. Each arrow in a food web points from the living thing that is eaten to the living thing that eats it, showing the direction energy moves.',
      'Food webs show how living things depend on one another. If a disease killed most of the grasshoppers, the birds that eat grasshoppers would have less food. With fewer grasshoppers, though, more grass might grow, giving the mice more to eat. A change in one part of a food web can ripple through the whole community.',
    ),
    questions: [
      { question: 'In a food web, which way do the arrows point?', answer: 'from the eaten to the eater, the way energy moves', options: ['from the eater to the eaten', 'from the eaten to the eater, the way energy moves', 'from the biggest animal down to the smallest one', 'from the sun to the soil'] },
      { question: 'Which living thing in the meadow is a producer?', answer: 'wildflowers', options: ['mice', 'wildflowers', 'snakes', 'hawks'] },
      { question: 'If most of the grasshoppers died, what might happen to the grass?', answer: 'More grass might grow.', options: ['More grass might grow.', 'All the grass would die.', 'The grass would start eating mice.', 'Nothing would change.'] },
    ],
  },
  {
    title: 'The Clean-Up Crew',
    strand: 'foodWebs',
    text: paras(
      'When a tree falls in the forest, it does not stay there forever. Mushrooms and other fungi grow on the log. Bacteria too small to see feed on the wood. Earthworms, beetles and pill bugs chew through the soft, rotting pieces. These living things are decomposers.',
      'Decomposers break down dead plants and animals into simpler materials. Those materials return to the soil, where the roots of living plants can take them in again. Without decomposers, the forest floor would be buried under dead leaves and logs, and plants would run short of the nutrients they need.',
      'Matter moves in a cycle: from plants to animals to decomposers and back to the soil. Energy is different. It enters the food web as sunlight and leaves as heat, so living things need a steady supply from the sun.',
    ),
    questions: [
      { question: 'What is the main job of decomposers?', answer: 'breaking down dead things and returning materials to the soil', options: ['making food from sunlight', 'breaking down dead things and returning materials to the soil', 'hunting smaller animals', 'carrying seeds and pollen to brand-new places in the forest'] },
      { question: 'What would happen in a forest without decomposers?', answer: 'Dead logs would pile up, and plants would lack nutrients.', options: ['Trees would grow faster than ever.', 'Dead logs would pile up, and plants would lack nutrients.', 'Animals would stop needing to find food to eat each day.', 'The sun would stop shining there.'] },
      { question: 'How is energy different from matter in an ecosystem?', answer: 'Matter cycles, but energy must keep coming from the sun.', options: ['Energy cycles, but new matter keeps coming from the sun.', 'Both are used up and gone forever.', 'Matter cycles, but energy must keep coming from the sun.', 'Both come only from the soil.'] },
    ],
  },
  {
    title: 'Balance in a Pond',
    strand: 'foodWebs',
    text: paras(
      'A healthy pond is a balanced community. Algae and pond plants make food and oxygen. Tiny animals called zooplankton eat the algae. Small fish eat the zooplankton, and herons eat the fish.',
      'Sometimes people upset the balance. If fertilizer from nearby lawns washes into the pond, algae can grow out of control and cover the surface like a green blanket. When that huge amount of algae dies, decomposers use up much of the oxygen in the water as they break it down. Fish may not have enough oxygen to survive.',
      'Keeping fertilizer away from the water’s edge and planting native grasses along the shore can help a pond stay balanced.',
    ),
    questions: [
      { question: 'Why can too much algae harm the fish?', answer: 'Decomposers use up oxygen as the dead algae breaks down.', options: ['The algae eats the fish.', 'Decomposers use up oxygen as the dead algae breaks down.', 'The thick algae makes the pond water much too cold for fish.', 'Herons hide in the algae.'] },
      { question: 'Which of these is a consumer in the pond?', answer: 'zooplankton', options: ['algae', 'pond plants', 'zooplankton', 'sunlight'] },
      { question: 'What is one way people can help a pond stay balanced?', answer: 'Keep fertilizer away from the water.', options: ['Add more fertilizer to the pond to help it grow.', 'Keep fertilizer away from the water.', 'Remove all the pond plants.', 'Scare away the herons.'] },
    ],
  },
  // ── Earth's spheres (5-ESS2) ─────────────────────────────────────────────
  {
    title: 'Earth’s Four Spheres',
    strand: 'spheres',
    text: paras(
      'Scientists describe Earth as four big systems, called spheres. The geosphere is the solid Earth: rocks, soil, sand and the hot layers deep inside. The hydrosphere is all of Earth’s water, in oceans, lakes, rivers, ice and underground. The atmosphere is the layer of gases that surrounds the planet. The biosphere includes every living thing, from whales to mushrooms to you.',
      'The spheres are always interacting. When rain falls on a mountain, the atmosphere and hydrosphere are shaping the geosphere. When a tree’s roots crack a rock, the biosphere is changing the geosphere. When you breathe out, you add carbon dioxide from the biosphere to the atmosphere.',
    ),
    questions: [
      { question: 'Which sphere includes a glacier?', answer: 'the hydrosphere', options: ['the geosphere', 'the hydrosphere', 'the atmosphere', 'the biosphere'] },
      { question: 'A tree’s roots crack a rock. Which two spheres are interacting?', answer: 'the biosphere and the geosphere', options: ['the biosphere and the geosphere', 'the atmosphere and the hydrosphere', 'the hydrosphere and the geosphere', 'the atmosphere and the biosphere'] },
      { question: 'When you breathe out, which sphere gains carbon dioxide?', answer: 'the atmosphere', options: ['the geosphere', 'the hydrosphere', 'the atmosphere', 'the biosphere'] },
    ],
  },
  {
    title: 'Where Is Earth’s Water?',
    strand: 'spheres',
    text: paras(
      'Earth is called the blue planet, and for good reason: water covers about 71 percent of its surface. But almost all of that water, about 97 percent, is salty ocean water that people cannot drink unless the salt is removed.',
      'Only about 3 percent of Earth’s water is fresh, and most of that is hard to reach. More than two-thirds of the fresh water is frozen in glaciers and ice caps, mostly near the poles. Much of the rest is groundwater, hidden in the spaces between rocks and soil underground. The lakes and rivers we see hold only a tiny part of Earth’s fresh water.',
      'That is why protecting fresh water matters so much: the supply people can easily use is small.',
    ),
    questions: [
      { question: 'About how much of Earth’s water is salty?', answer: 'about 97 percent', options: ['about 3 percent', 'about 50 percent', 'about 71 percent', 'about 97 percent'] },
      { question: 'Where is most of Earth’s fresh water?', answer: 'frozen in glaciers and ice caps', options: ['in lakes and rivers', 'frozen in glaciers and ice caps', 'in clouds in the sky', 'in the oceans'] },
      { question: 'Why does the author say protecting fresh water matters?', answer: 'The fresh water people can easily use is a small amount.', options: ['Oceans are running out of salt.', 'The fresh water people can easily use is a small amount.', 'Glaciers are the easiest place for people to drink from.', 'Most of Earth is covered by land.'] },
    ],
  },
  {
    title: 'How the Spheres Shape the Land',
    strand: 'spheres',
    text: paras(
      'A canyon can take millions of years to form. As a river flows, it carries sand and pebbles that scrape the riverbed, slowly carving it deeper. Here the hydrosphere is shaping the geosphere.',
      'Wind, part of the atmosphere, also changes the land. In deserts, wind blows sand against rocks, wearing them into strange shapes. Ocean waves pound cliffs and break off pieces of rock, which in time become beach sand.',
      'Living things play a part as well. Plant roots hold soil in place, so hillsides covered with plants wash away more slowly during storms. Burrowing animals mix and loosen the soil. Every landscape you see has been shaped by spheres working together.',
    ),
    questions: [
      { question: 'Which sphere is shaping the land when wind blows sand against rocks?', answer: 'the atmosphere', options: ['the atmosphere', 'the biosphere', 'the hydrosphere', 'none of the spheres'] },
      { question: 'How do plant roots affect a hillside during a storm?', answer: 'They hold the soil so less of it washes away.', options: ['They make the hillside wash away faster in heavy rain.', 'They hold the soil so less of it washes away.', 'They turn the soil into rock.', 'They pull rain up into the clouds.'] },
      { question: 'What is the main idea of the passage?', answer: 'Landforms are shaped by the spheres working together.', options: ['Canyons form in just a few days.', 'Only rivers can change the land.', 'Landforms are shaped by the spheres working together.', 'Deserts have the strangest rocks on the whole planet.'] },
    ],
  },
  {
    title: 'Weather: Where Air Meets Water',
    strand: 'spheres',
    text: paras(
      'Weather happens where the atmosphere and the hydrosphere meet. The sun warms ocean water, and some of it evaporates into the air. As the moist air rises and cools, the water vapor condenses into clouds. Winds carry the clouds over land, where the water falls as rain or snow.',
      'The ocean also affects temperature. Water heats up and cools down more slowly than land. That is why towns near the ocean usually have milder winters and cooler summers than towns far inland. Large ocean currents carry warm or cold water thousands of miles, changing the weather of the coasts they pass.',
    ),
    questions: [
      { question: 'Why do towns near the ocean often have milder winters?', answer: 'Ocean water cools down more slowly than land.', options: ['Ocean towns get more sunshine.', 'Ocean water cools down more slowly than land.', 'Snow cannot fall anywhere near salty ocean water.', 'Wind never blows near the coast.'] },
      { question: 'What happens as moist air rises and cools?', answer: 'Water vapor condenses into clouds.', options: ['The air turns straight into ocean water.', 'Water vapor condenses into clouds.', 'The clouds dry up and vanish.', 'The air gets heavier and sinks.'] },
      { question: 'According to the passage, weather happens where which two spheres meet?', answer: 'the atmosphere and the hydrosphere', options: ['the geosphere and the biosphere', 'the atmosphere and the hydrosphere', 'the biosphere and the hydrosphere', 'the geosphere and the atmosphere'] },
    ],
  },
  // ── sky (5-PS2-1, 5-ESS1-1, 5-ESS1-2) ────────────────────────────────────
  {
    title: 'The Sun Is a Star',
    strand: 'sky',
    text: paras(
      'On a clear night you can see thousands of stars. Each one is a giant ball of hot, glowing gas, and so is our sun. The sun looks much bigger and brighter than the other stars for one main reason: it is much closer to us.',
      'The sun is about 93 million miles away. The next closest star is so far away that its light takes more than four years to reach Earth. Many stars are actually bigger and brighter than the sun, but because they are so distant, they look like tiny points of light.',
      'Think about a flashlight. Up close, it can be dazzling, but seen from across a football field, it looks like a small dot. Distance changes how bright a light appears.',
    ),
    questions: [
      { question: 'Why does the sun look brighter than other stars?', answer: 'It is much closer to Earth than any other star.', options: ['It is the biggest star in the whole universe.', 'It is much closer to Earth than any other star.', 'It is the only star that is hot.', 'It is made of burning fire instead of glowing gas.'] },
      { question: 'What does the flashlight example help explain?', answer: 'Distance changes how bright a light looks.', options: ['Flashlights are brighter than real stars are.', 'Distance changes how bright a light looks.', 'Football fields are very dark at night.', 'Stars need batteries to shine.'] },
      { question: 'Which statement about other stars is true, according to the passage?', answer: 'Some are bigger and brighter than the sun.', options: ['All of them are smaller and dimmer than the sun.', 'Some are bigger and brighter than the sun.', 'They are closer than the sun.', 'They only shine at night.'] },
    ],
  },
  {
    title: 'Shadows Through the Day',
    strand: 'sky',
    text: paras(
      'Shadows change all day long because the sun’s position in the sky seems to change. In the morning, the sun is low in the east, so shadows are long and point toward the west. As the sun climbs higher, shadows get shorter. Around noon, when the sun is highest, shadows are at their shortest. In the afternoon, the sun sinks toward the west, and shadows grow long again, now pointing east.',
      'The sun is not really moving across the sky. Earth is spinning, turning once every 24 hours. As your part of Earth turns toward the sun, you have day. As it turns away, you have night.',
    ),
    questions: [
      { question: 'At 8 a.m., which way does a tree’s shadow point?', answer: 'toward the west', options: ['toward the east', 'toward the west', 'straight up', 'toward the sun'] },
      { question: 'When are shadows shortest?', answer: 'around noon, when the sun is highest', options: ['early in the morning', 'around noon, when the sun is highest', 'just before sunset, when it is low', 'at midnight'] },
      { question: 'What causes day and night?', answer: 'Earth spinning once every 24 hours', options: ['the sun moving around Earth', 'the moon blocking the sun', 'Earth spinning once every 24 hours', 'Earth circling the sun once a year'] },
    ],
  },
  {
    title: 'Star Patterns and Seasons',
    strand: 'sky',
    text: paras(
      'If you look at the night sky in winter and again in summer, you will see different star patterns. In the Northern Hemisphere, the bright pattern called Orion is easy to spot on winter evenings, but it is hidden on summer evenings.',
      'The stars have not moved away. Instead, Earth travels around the sun once a year. At night, we look out from the side of Earth facing away from the sun. As Earth moves along its path, that night side faces different parts of space, so we see different stars in different seasons. During the day, stars are still in the sky, but the sun’s bright light hides them.',
      'Long ago, people used these changing star patterns as a calendar, to know when to plant and when to harvest.',
    ),
    questions: [
      { question: 'Why can Orion be seen on winter evenings but not summer evenings?', answer: 'Earth’s trip around the sun changes which stars face us at night.', options: ['Orion moves away to another galaxy every summer and returns.', 'Earth’s trip around the sun changes which stars face us at night.', 'Clouds cover Orion every summer.', 'Stars only shine when it is cold.'] },
      { question: 'Why can’t we see stars during the day?', answer: 'The sun’s bright light hides them.', options: ['The stars go out every morning at sunrise.', 'The sun’s bright light hides them.', 'The stars move below the ground.', 'The moon blocks them.'] },
      { question: 'How did people long ago use star patterns?', answer: 'as a calendar for planting and harvesting', options: ['to light up their homes and fields at night', 'as a calendar for planting and harvesting', 'to measure how hot the sun was', 'to tell what time of day it was at noon'] },
    ],
  },
  {
    title: 'Gravity, the Downward Pull',
    strand: 'sky',
    text: paras(
      'Drop a ball, and it falls toward the ground. Throw it up, and it comes back down. The force that pulls it is gravity. Earth’s gravity pulls every object toward the center of the planet.',
      'Because Earth is shaped like a ball, “down” means toward Earth’s center wherever you are. A child in Australia and a child in Canada both feel pulled down, even though they stand on opposite sides of the planet. Nobody falls off.',
      'Gravity also keeps the moon traveling around Earth and holds our atmosphere close to the planet.',
    ),
    questions: [
      { question: 'What does “down” mean anywhere on Earth?', answer: 'toward the center of Earth', options: ['toward the South Pole', 'toward the center of Earth', 'toward the nearest ocean or sea', 'toward the sun'] },
      { question: 'Why don’t people in Australia fall off Earth?', answer: 'Gravity pulls them toward Earth’s center too.', options: ['They hold on tightly to the ground.', 'Gravity pulls them toward Earth’s center too.', 'Australia is on the top half of the world.', 'The air pushes them up.'] },
      { question: 'Which of these does gravity do, according to the passage?', answer: 'keeps the moon moving around Earth', options: ['makes the sun shine', 'keeps the moon moving around Earth', 'turns day into night as it pulls the sun down', 'makes stars twinkle'] },
    ],
  },
]

/** The spheres, as the options name them. */
export const SPHERE_NAMES = ['geosphere', 'hydrosphere', 'atmosphere', 'biosphere'] as const
export type SphereName = (typeof SPHERE_NAMES)[number]

/** Things to sort into a sphere (5-ESS2-1). */
export const SPHERE_THINGS: { thing: string; sphere: SphereName }[] = [
  { thing: 'a volcano', sphere: 'geosphere' },
  { thing: 'a sand dune', sphere: 'geosphere' },
  { thing: 'a granite boulder', sphere: 'geosphere' },
  { thing: 'the soil in a garden', sphere: 'geosphere' },
  { thing: 'a mountain range', sphere: 'geosphere' },
  { thing: 'a glacier', sphere: 'hydrosphere' },
  { thing: 'groundwater deep underground', sphere: 'hydrosphere' },
  { thing: 'an iceberg', sphere: 'hydrosphere' },
  { thing: 'a river', sphere: 'hydrosphere' },
  { thing: 'the ocean', sphere: 'hydrosphere' },
  { thing: 'the wind', sphere: 'atmosphere' },
  { thing: 'the oxygen you breathe', sphere: 'atmosphere' },
  { thing: 'the gases that surround Earth', sphere: 'atmosphere' },
  { thing: 'a gentle breeze', sphere: 'atmosphere' },
  { thing: 'a coral reef', sphere: 'biosphere' },
  { thing: 'a mushroom', sphere: 'biosphere' },
  { thing: 'a school of fish', sphere: 'biosphere' },
  { thing: 'a pine forest', sphere: 'biosphere' },
  { thing: 'a honeybee', sphere: 'biosphere' },
]

/** Two spheres at work in one event (5-ESS2-1). */
export const SPHERE_EVENTS: { event: string; spheres: [SphereName, SphereName] }[] = [
  { event: 'Waves crash against a rocky cliff and break off pieces of rock.', spheres: ['hydrosphere', 'geosphere'] },
  { event: 'A volcano blasts ash and gas high into the sky.', spheres: ['geosphere', 'atmosphere'] },
  { event: 'A deer drinks from a cool mountain stream.', spheres: ['biosphere', 'hydrosphere'] },
  { event: 'Wind blows sand across the desert and wears down a rock.', spheres: ['atmosphere', 'geosphere'] },
  { event: 'Leaves give off oxygen into the air on a sunny day.', spheres: ['biosphere', 'atmosphere'] },
  { event: 'Earthworms tunnel through the soil and loosen it.', spheres: ['biosphere', 'geosphere'] },
  { event: 'The sun-warmed sea gives off water vapor into the air.', spheres: ['hydrosphere', 'atmosphere'] },
  { event: 'A river carves a canyon deeper over millions of years.', spheres: ['hydrosphere', 'geosphere'] },
  { event: 'A whale rises to the surface to breathe in fresh air.', spheres: ['biosphere', 'atmosphere'] },
  { event: 'Rain soaks a field and makes the soil muddy.', spheres: ['hydrosphere', 'geosphere'] },
]

/** Two graphs of Earth's water (5-ESS2-2), as cups out of 100, with their questions. */
export const WATER_GRAPHS: {
  title: string
  bars: { label: string; value: number; emoji?: string }[]
  questions: G5SciQuestion[]
}[] = [
  {
    title: 'If all of Earth’s water filled 100 cups',
    bars: [
      { label: 'Salty ocean water', value: 97, emoji: '🌊' },
      { label: 'Ice and glaciers', value: 2, emoji: '🧊' },
      { label: 'Liquid fresh water', value: 1, emoji: '💧' },
    ],
    questions: [
      { question: 'Out of 100 cups of Earth’s water, how many cups are salty ocean water?', answer: '97 cups', options: ['3 cups', '50 cups', '97 cups', '2 cups'] },
      { question: 'How many of the 100 cups are fresh water of any kind?', answer: '3 cups', options: ['1 cup', '2 cups', '3 cups', '97 cups'] },
      { question: 'What does the graph show about Earth’s fresh water?', answer: 'There is much less fresh water than salt water.', options: ['There is more fresh water than salt water.', 'There is much less fresh water than salt water.', 'Most fresh water is liquid.', 'Fresh water and salt water are equal.'] },
    ],
  },
  {
    title: 'If all of Earth’s fresh water filled 100 cups',
    bars: [
      { label: 'Ice and glaciers', value: 69, emoji: '🧊' },
      { label: 'Groundwater', value: 30, emoji: '🪨' },
      { label: 'Lakes and rivers', value: 1, emoji: '🏞️' },
    ],
    questions: [
      { question: 'According to the graph, where is most of Earth’s fresh water?', answer: 'in ice and glaciers', options: ['in lakes and rivers', 'in groundwater', 'in ice and glaciers', 'in the oceans'] },
      { question: 'How many of the 100 cups of fresh water are in lakes and rivers?', answer: '1 cup', options: ['1 cup', '30 cups', '69 cups', '100 cups'] },
      { question: 'How many cups of fresh water are liquid, either underground or in lakes and rivers?', answer: '31 cups', options: ['1 cup', '30 cups', '31 cups', '69 cups'] },
    ],
  },
]
