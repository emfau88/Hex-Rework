// Campaign missions (hand-built maps) and skirmish presets (generated islands).
//
// Map notation (details in maps.js, buildAuthored): rows as seen on a wide screen, odd rows sit half
// a field to the right.  . plain  f forest  h hill  m mountain  w water  c citadel  K0 castle of kingdom 0
// A digit gives the field to a kingdom (.1), + adds a tower, * a farm, :n sets the garrison.

import { SKIRMISH } from './maps.js';

export const CAMPAIGN = [
  {
    id: 'm1',
    no: 1,
    name: { de: 'Erste Krone', en: 'First Crown' },
    blurb: { de: 'Duell · Einführung', en: 'Duel · tutorial' },
    brief: {
      de: 'Eine kleine Insel, ein Rivale. Vier kurze Schritte zeigen dir das Wichtigste, dann holst du dir seine Krone.',
      en: 'A small island and one rival. Four short steps show you the essentials, then you claim his crown.',
    },
    lesson: {
      de: 'Ein Feld versorgt 20 Truppen. Starke Felder fallen, wenn du sie von mehreren Seiten zugleich angreifst.',
      en: 'A field feeds 20 troops. Strong fields fall when you attack them from several sides at once.',
    },
    factions: 2,
    guide: 'basics',
    par: 300,
    // Turn mode (branch runden): turns for the second star. Estimated, not measured yet.
    parTurns: 30,
    seed: 11,
    aiDelay: 8,
    // A patient teacher on every strength: attacks from two sides at most and wants a wide margin.
    // How fast it decides and grows is set per strength, a little gentler than elsewhere.
    ai: { margin: 1.4, sides: 2, reinforce: 2, frontKeep: 5 },
    aiBy: {
      easy: { think: 14, incomeMul: 0.6, rushAfter: 600 },
      normal: { think: 7, incomeMul: 0.9, rushAfter: 600 },
      hard: { think: 3, incomeMul: 0.9, rushAfter: 240 },
    },
    // Fuller fields around the castle, so the first combined attack works right away.
    rules: { startRing: 10 },
    // The small forts (h:9) next to each castle touch two starting fields: the tutorial's practice target.
    layout: [
      'm  m  .  .  f  m  f  .  .  m  m',
      '  m  .  .  .  .  .  .  .  .  m',
      'w  .  .  h:9 f  h:16 f  h:9 .  .  w',
      '  .  K0 .  .  .  .  .  .  K1 .',
      'w  .  .  .  f  h:16 f  .  .  .  w',
      '  m  .  .  .  .  .  .  .  .  m',
      'm  m  .  .  f  m  f  .  .  m  m',
    ],
  },
  {
    id: 'm2',
    no: 2,
    name: { de: 'Die zwei Pässe', en: 'Two Passes' },
    blurb: { de: 'Duell · Gebirgsriegel', en: 'Duel · mountain ridge' },
    brief: {
      de: 'Ein Gebirge teilt die Insel. EMBER hält beide Pässe und einen Vorposten auf deiner Seite. Brich durch und nimm die Burg.',
      en: 'A ridge splits the island. EMBER holds both passes and an outpost on your side. Break through and take the castle.',
    },
    lesson: {
      de: 'Felder ohne Verbindung zur eigenen Burg schwinden. Schneide den Vorposten ab, statt ihn zu stürmen.',
      en: 'Fields without a link to their castle wither. Cut the outpost off instead of storming it.',
    },
    factions: 2,
    guide: 'cutoff',
    par: 360,
    parTurns: 45,
    seed: 23,
    aiDelay: 4,
    // EMBER starts ahead and sits behind the passes, so it storms late; on "hard" it also grows a little slower.
    aiBy: { hard: { rushAfter: 210, incomeMul: 0.85 } },
    // The passes favour the defender, so the storm comes early here and forces a decision.
    rules: { stormStart: 300 },
    layout: [
      'm  m  .  .  f  .  .  .  f  .  .  m  m',
      '  m  .  .  f  .  h  h+:14 .  f  .  .  m',
      'w  .  .  .0 .  f  .  .  .  .  .  .  w',
      '  .  .  .0* .  h  m  m  h  .  .  .  .',
      '.  K0 .  .0 .0+ f  m  f  .  .1:4 .  K1 .',
      '  .  .  .0* .  h  m  m  h  .1:4 .  .  .',
      'w  .  .  .0 .  f  .  .  .1:4 .  .  .  w',
      '  m  .  .  f  h1+:20 .1:8 .1:4 .1:4 f  .  .  m',
      'm  m  .  .  f  .  .  .  f  .  .  m  m',
    ],
  },
  {
    id: 'm3',
    no: 3,
    name: { de: 'Drei Reiche', en: 'Three Kingdoms' },
    blurb: { de: 'Zwei Rivalen · Zitadelle', en: 'Two rivals · citadel' },
    brief: {
      de: 'Zwei Rivalen und eine Zitadelle in der Mitte. Wer sie samt den Feldern ringsum insgesamt 60 Sekunden hält, gewinnt.',
      en: 'Two rivals and a citadel in the middle. Whoever holds it and the fields around it for 60 seconds in total wins.',
    },
    // The same briefing for the turn mode; {n} is the number of turns the citadel has to be held.
    briefTurns: {
      de: 'Zwei Rivalen und eine Zitadelle in der Mitte. Wer sie samt den Feldern ringsum insgesamt {n} Züge hält, gewinnt.',
      en: 'Two rivals and a citadel in the middle. Whoever holds it and the fields around it for {n} turns in total wins.',
    },
    lesson: {
      de: 'Wer eine Burg nimmt, erbt das ganze Reich. Die Zitadelle hältst du nur, wenn auch die Felder um sie herum dir gehören.',
      en: 'Whoever takes a castle inherits the kingdom. You only hold the citadel if the fields around it are yours too.',
    },
    factions: 3,
    guide: 'citadel',
    objective: { type: 'hold', seconds: 60 },
    par: 420,
    parTurns: 45,
    seed: 37,
    aiDelay: 2,
    // Two hard rivals that both go for the player's castle at once leave no room to play the mission.
    // Holding the citadel and its ring takes long, so the rivals decide slower here than elsewhere
    // and the storm comes early. Two rivals that both go for the player's castle at once would
    // leave no room to play the mission.
    aiBy: { easy: { think: 18, incomeMul: 0.5 }, normal: { think: 14 }, hard: { think: 5, humanBias: 0.75, rushAfter: 180 } },
    rules: { stormStart: 300 },
    layout: [
      'm  m  m  .  .  f  .  .  .  .  .  m  m',
      '  m  m  .  f  .  .  h  .  .  K1 .  m',
      'w  .  .  .  .  .  .  f  .  .  .  .  w',
      '  .  .  .  h  .  f:12 h:14 .  m  .  .  w',
      '.  K0 .  .  f  h:14 c:30 f:12 m  m  w  w  w',
      '  .  .  .  h  .  f:12 h:14 .  m  .  .  w',
      'w  .  .  .  .  .  .  f  .  .  .  .  w',
      '  m  m  .  f  .  .  h  .  .  K2 .  m',
      'm  m  m  .  .  f  .  .  .  .  .  m  m',
    ],
  },
];

/** Everything the menu and the balance tool can start. */
export const MISSIONS = [...CAMPAIGN, ...SKIRMISH];

/**
 * Figure showcase: a small test island, reached only through its own link (?schau), not the menu.
 * Here monsters and troops are set by hand and the time can be stopped and slowed down. Nothing
 * here is a match: it never ends, the rival does not play, nobody ships supply by himself, and
 * fields that are cut off keep their troops, so what was set stays put until it fights.
 */
export const SHOWCASE = {
  id: 'schau',
  name: { de: 'Figurenschau', en: 'Figure showcase' },
  factions: 2,
  sandbox: true,
  wild: true,
  storm: false,
  aiDelay: Infinity,
  rules: { cutOffDecay: 0 },
  // A troll cave in the middle (.!t) and a small field of the player next to it, so the first raid
  // can be watched without setting anything; everything else is set by hand.
  layout: [
    'm  m  .  .  f  .  f  .  .  m  m',
    '  m  .  .  .  .  .  .  .  .  m',
    'w  .  .  .  h  .  .  .  .  .  w',
    '  .  K0 .  .0:6 .!t .  .  .  K1 .',
    'w  .  .  .  .  .  f  .  .  .  w',
    '  m  .  .  .  .  .  .  .  .  m',
    'm  m  .  .  f  .  f  .  .  m  m',
  ],
};
