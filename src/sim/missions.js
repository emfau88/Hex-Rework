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
    tutorial: true,
    par: 300,
    seed: 11,
    aiDelay: 8,
    // A patient teacher: slow, never storms the player's castle early, and does not answer every siege.
    ai: { think: 2.2, margin: 1.4, sides: 2, reinforce: 2, frontKeep: 5, rushAfter: 240, incomeMul: 0.9 },
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
    par: 360,
    seed: 23,
    aiDelay: 4,
    // EMBER starts ahead and sits behind the passes, so it grows a little slower and storms late.
    ai: { rushAfter: 210, incomeMul: 0.85 },
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
      de: 'Zwei Rivalen und eine Zitadelle in der Mitte. Wer sie 60 Sekunden hält, gewinnt. Beide Burgen zu nehmen gewinnt auch.',
      en: 'Two rivals and a citadel in the middle. Whoever holds it for 60 seconds wins. Taking both castles wins as well.',
    },
    lesson: {
      de: 'Wer eine Burg nimmt, erbt das ganze Reich. Die Zitadelle hältst du nur, wenn auch die Felder um sie herum dir gehören.',
      en: 'Whoever takes a castle inherits the kingdom. You only hold the citadel if the fields around it are yours too.',
    },
    factions: 3,
    objective: { type: 'hold', seconds: 60 },
    par: 420,
    seed: 37,
    aiDelay: 2,
    // Two hard rivals that both go for the player's castle at once leave no room to play the mission.
    aiBy: { hard: { humanBias: 0.75, rushAfter: 180 } },
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
