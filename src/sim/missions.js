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
    // Turn mode (branch runden): turns for the second star, and the rival retuned for turns. On
    // "normal" it keeps more troops at its front (7 instead of 5), so it attacks less: the stand-in
    // beginner then wins 51 of 60 instead of 35 to 38 (docs/RUNDEN-PLAN.md, section 19).
    parTurns: 30,
    turnAiBy: { normal: { frontKeep: 7 } },
    turnsTuned: true,
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
 * The campaign "Die Krone ist weg" as far as it is built, in order (docs/UMSETZUNG-RUNDEN.md). It is on
 * trial: played in turns and reached only through its own links, not through the menu.
 *   …/index.html?probe=kampagne    the first mission; "next mission" leads on through this list
 *   …/index.html?probe=trollwald   one mission directly
 * What a mission of the campaign may carry on top of the usual:
 *   after   two sentences on the result sheet when it is won       late   the same when the clock ran out
 *   reward  { choice: [perk, perk] } the person picks one improvement, or { gift: name } something new
 *           that comes along; improvements count in every later mission of this list (TURN_RULES.perks)
 *   talk    short lines of the captain during the match, each said once: start, raid (the first mark on
 *           an own field), held (a raid bounced off), lost (a field fell to a raid), off (a raid was
 *           called off), near (an own field touches the goal), late (three turns left)
 */
export const PROBES = [
  {
    // Mission 1 is the first mission of the menu, unchanged, with what the campaign adds to it.
    ...CAMPAIGN[0],
    probe: true,
    after: {
      de: 'Die Krone gehört dir. Beim Krönungsfest ist sie dann plötzlich weg. Am Fenster: große, haarige Fußspuren.',
      en: 'The crown is yours. At the coronation feast it is suddenly gone. At the window: large, hairy footprints.',
    },
    reward: { choice: ['drummer', 'granary'] },
  },
  {
    id: 'trollwald',
    no: 2,
    probe: true,
    name: { de: 'Im Trollwald', en: 'In the Troll Woods' },
    blurb: { de: 'Trollstamm · Höhlen', en: 'Troll tribe · caves' },
    brief: {
      de: 'Trolle haben deine Krone gestohlen und sitzen damit in ihrem Wald. Nimm ihre große Höhle.',
      en: 'Trolls have stolen your crown and sit on it in their woods. Take their great cave.',
    },
    lesson: {
      de: 'Jede Höhle überfällt alle drei Züge dein schwächstes Feld am Waldrand. Das Ziel ist einen Zug vorher markiert.',
      en: 'Every third turn each cave raids your weakest field at the rim of the woods. The target is marked one turn ahead.',
    },
    reward: { gift: 'knight' },
    talk: {
      start: {
        de: 'Die Trolle sitzen mit unserer Krone in ihrer großen Höhle hinter dem Wald. Holen wir sie, bevor sie Ohrringe daraus machen.',
        en: 'The trolls sit on our crown in their great cave behind the woods. Let us fetch it before they turn it into earrings.',
      },
      raid: {
        de: 'Sie rüsten zum Überfall! Das markierte Feld ist nach unserem Zug dran. Schick Truppen hin, bau einen Turm, oder nimm ihnen das Waldfeld davor.',
        en: 'They are getting ready to raid! The marked field is next, after our move. Send troops, build a tower, or take the forest field in front of it.',
      },
      held: {
        de: 'Abgewehrt! In der Höhle sitzen jetzt weniger Trolle. Ein guter Moment für einen Besuch.',
        en: 'Beaten off! There are fewer trolls in that cave now. A good moment for a visit.',
      },
      lost: {
        de: 'Ein Feld ist weg. Halb so wild: Zurückholen kostet nur einen Befehl.',
        en: 'A field is gone. No harm done: taking it back costs just one command.',
      },
      off: {
        de: 'Der Überfall fällt aus: Sie kommen nicht mehr an das Feld heran.',
        en: 'The raid is off: they cannot get at the field any more.',
      },
      near: {
        de: 'Wir stehen vor der großen Höhle. Von mehreren Seiten zugleich geht es leichter.',
        en: 'We stand before the great cave. From several sides at once it is easier.',
      },
      late: {
        de: 'Die Trolle heizen schon den Schmelzofen an. Noch drei Züge!',
        en: 'The trolls are firing up the furnace already. Three turns left!',
      },
    },
    // What the screen says when the mission is won, and when the clock has run out.
    after: {
      de: 'In der Höhle liegt keine Krone: Die Trolle haben sie längst gegen eine Ziege getauscht. Dafür sitzt dort Ritter Kunibert im Kochtopf. Er hatte „alles im Griff“.',
      en: 'There is no crown in the cave: the trolls swapped it for a goat long ago. But Sir Kunibert sits there in the cooking pot. He had "everything under control".',
    },
    late: {
      de: 'Zu spät. Die Trolle tragen jetzt goldene Ohrringe.',
      en: 'Too late. The trolls are wearing golden earrings now.',
    },
    wildName: { de: 'TROLLE', en: 'TROLLS' },
    factions: 1,
    wild: true,
    objective: { type: 'lair' },
    parTurns: 12,
    seed: 41,
    storm: false,
    // Nobody else moves first here, so the opening move has all its commands. After turn 18 the
    // mission is lost: the clock that keeps it short. The trolls raid often and far: every cave every
    // third round, against the weakest field anywhere at the rim of their woods.
    // Every raid has twelve trolls (`more` 0): with small caves the parties hardly grew anyway, and the
    // sentence "every raid is stronger than the last" was not true.
    // Measured with the stand-in players (tools/audit/mission.mjs, 60 matches, two sets of dice): the
    // beginner wins 73 to 77 % (around turn 16), the clever one always (turn 13 to 14), the
    // single-minded one always (turn 10); the trolls raid 9 to 11 times and take about 6 fields.
    // With the drummer the beginner wins 65 to 72 %, with the granary 85 to 87 %; the others always.
    // The person who played it first (24.11.2026) won in turn 9 after 3:14 minutes.
    turns: { firstCommands: null, turnLimit: 18, troll: { reach: 99, first: 2, stagger: 1, every: 3, raid: 12, more: 0, home: 0.3, grow: 4 } },
    rules: { startRing: 10 },
    // The woods of the trolls fill the east: forest fields with trolls on them, two small caves at
    // the rim (north and south) and the great cave behind them. The west is free land for the kingdom.
    layout: [
      'm  m  .  f  f!:8 f!t:22 f!:8 m  m',
      '  m  .  .  f  f!:8 f!:10 f!:10 m',
      'w  .  .  .  f!:8 f!:10 f!:12 m  m',
      '  .  K0 .  .  f!:8 f!:12 .!t:34 m',
      'w  .  .  .  f!:8 f!:10 f!:12 m  m',
      '  m  .  .  f  f!:8 f!:10 f!:10 m',
      'm  m  .  f  f!:8 f!t:22 f!:8 m  m',
    ],
  },
];

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
