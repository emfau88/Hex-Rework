// All balance numbers in one place. Units are troops, seconds and hex steps.
//
// Rule set 0.2. Four ideas carry the game:
//   1. Supply    – a field feeds only so many troops; anything above melts away.
//   2. Edges     – a battle takes time; only a few attackers fight at one edge, all defenders fight back.
//   3. Encircle  – follows from 2: strong fields and castles fall to attacks from several sides.
//   4. Cut off   – fields without a link to their castle neither grow nor keep their troops.

export const RULES = Object.freeze({
  step: 0.1,

  // Movement: seconds per hex, plus a small penalty for entering rough ground.
  march: 0.8,
  marchHill: 0.2,
  marchForest: 0.1,

  // Troops per second on a supplied field. Land carries the economy, not the castle.
  income: Object.freeze({ plain: 0.24, forest: 0.24, hill: 0.2, citadel: 0.6, castle: 0.8 }),
  farmBonus: 0.3,

  // 1. Supply: how many troops a field feeds. Growth stops there.
  cap: Object.freeze({ field: 20, citadel: 30, castle: 40 }),
  // Arriving troops may crowd a field beyond its supply by this much; the surplus melts per second.
  overfill: 10,
  overfillDecay: 1,
  // 4. Cut off: troops lost per second on a field without a link to its castle (never below 1).
  cutOffDecay: 0.5,

  // 2. Edges: attackers that can fight at one edge at the same time, and damage per fighter and second.
  frontage: 8,
  hit: 0.5,
  // The knight (a hero, so far only in the figure showcase): where he leads an attack, this many
  // fight at that edge instead of `frontage`.
  knightEdge: 12,

  // A defender on good ground takes less damage: damage is divided by this.
  defense: Object.freeze({ plain: 1, forest: 1.25, hill: 1.45, citadel: 1.3 }),
  towerDefense: 0.6,
  castleDefense: 0.8,
  ruinDefense: 0.2,

  // Every further building of the same kind costs more, so nobody can wall off a whole border.
  towerCost: 10,
  towerStep: 5,
  farmCost: 8,
  farmStep: 3,

  // Storm: the emergency brake against endless matches. Edges widen and cover fades.
  stormStart: 420,
  stormLength: 120,
  stormFrontage: 2.5,

  startCastle: 20,
  startRing: 6,

  // Whoever takes a castle inherits the kingdom's land, but only this share of its troops.
  conquestKeep: 0.25,

  // Automatic supply: fields behind the front forward their troops to front fields with room.
  // The castle keeps a strong garrison and only passes on what grows beyond it; the six fields
  // around it keep a home guard even when the front is far away.
  supplyInterval: 1.0,
  supplyMin: 4,
  castleReserve: 32,
  ringGuard: 10,
  // Once a rival stands this close to the castle, the home guard is filled up like a front.
  alarmRange: 2,

  // Monsters (the wilds). A troll cave holds `size` trolls and breeds them back at `grow` per second.
  // Every `every` seconds a party of `raid` trolls falls on the weakest kingdom field next to it; the
  // target is marked `warn` seconds before. Starting values for the figure showcase, not yet measured.
  troll: Object.freeze({ size: 30, grow: 0.2, every: 50, raid: 8, warn: 10 }),
});

// think      seconds between decisions
// margin     how much stronger than needed an attack must look
// sides      how many fields join one attack
// waves      how many fields behind each attacker may follow as a second wave
// actions    attacks per decision
// reinforce  0 never · 1 castle only · 2 castle, its ring and buildings · 3 everything worth it
// frontKeep  troops left behind on a field that borders a rival
// castleKeep garrison the castle never gives away
// rushAfter  no attack on any castle before this second
//
// The strengths are set for people, not for programs. What decides a match is how often a kingdom
// gives an order: a person needs three to eight seconds for one, a program a fraction of that.
// Measured with stand-in players (see tools/simulate.mjs):
//   easy    for a beginner who gives an order about every 8 seconds
//   normal  for a player who gives an order about every 5 seconds
//   hard    for a practised player who gives an order every 2 to 3 seconds
export const DIFFICULTY = Object.freeze({
  easy: Object.freeze({ think: 14, margin: 1.4, sides: 2, waves: 0, actions: 1, reinforce: 1, frontKeep: 3, castleKeep: 16, build: 0.2, incomeMul: 0.6, humanBias: 0.6, rushAfter: 420 }),
  normal: Object.freeze({ think: 8, margin: 1.3, sides: 3, waves: 0, actions: 1, reinforce: 2, frontKeep: 5, castleKeep: 20, build: 0.35, incomeMul: 0.8, humanBias: 0.9, rushAfter: 300 }),
  hard: Object.freeze({ think: 3, margin: 1.18, sides: 4, waves: 1, actions: 1, reinforce: 2, frontKeep: 5, castleKeep: 22, build: 0.45, incomeMul: 1, humanBias: 1, rushAfter: 120 }),
});

// ------------------------------------------------------------------ turn mode (branch runden)
//
// The kingdoms move one after the other, each with a few commands per turn (see src/sim/turns.js and
// docs/RUNDEN-PLAN.md). Edges, cover, supply limits and building prices are the ones above; only what
// happened per second now happens once per turn. A turn stands for about `seconds` of the real-time
// game: the game clock (game.time) runs on by that much per turn, so the planner of the rivals keeps
// its sense of time.
export const TURN_RULES = Object.freeze({
  seconds: 8,
  commands: 3,
  // Troops per turn on a supplied field, added at the start of its owner's turn.
  income: Object.freeze({ plain: 2, forest: 2, hill: 1.5, citadel: 5, castle: 6 }),
  farmBonus: 2.5,
  // Lost per turn on a field without a link to its castle (never below 1).
  cutOff: 4,
  // The automatic supply ships once per turn, so smaller loads are worth it. It ships at the end of
  // the own move ('end'), so freshly taken fields are manned before the rival moves; shipped at the
  // start ('start'), the same three fields changed hands every turn and matches hardly ended.
  supplyMin: 2,
  supplyAt: 'end',
  // Commands of whoever begins, in the very first move only (null: as many as everybody). With 3 the
  // kingdom that began won 63 to 68 % of the duels between equal rivals, with 1 it won 57 to 59 %
  // (normal and hard; easy stays near 69 %).
  firstCommands: 1,
  // Storm: from this turn on the edges widen and cover fades, fully after `stormTurns` more.
  stormTurn: 40,
  stormTurns: 15,
  // Nobody wins after this many turns.
  turnLimit: 80,
  // The wilds in turns (see TurnGame._startWild): where a lair stands, they move last in every round.
  // A troll cave breeds `grow` trolls per round. Its first raid comes at the end of round `first` (each
  // further cave on the map `stagger` rounds later), then every `every` rounds. `warn` rounds before, the
  // prey is marked: the weakest kingdom field within `reach` steps, counted through the monsters' own
  // land. A party has `raid` trolls plus `more` for every raid the cave has sent before; the share `home`
  // of the cave's size always stays at home. Starting values, to be measured mission by mission.
  troll: Object.freeze({ grow: 2, every: 5, warn: 1, raid: 8, more: 2, reach: 3, home: 0.4, first: 4, stagger: 2 }),
  // Improvements the person earns in the campaign (docs/UMSETZUNG-RUNDEN.md). The rivals never have them.
  //   drummer  one more command in every `every`-th turn
  //   granary  a farm gives `farm` more troops per turn; the castle feeds `castle` more and starts with `start` more
  perks: Object.freeze({ drummer: Object.freeze({ every: 3, commands: 1 }), granary: Object.freeze({ farm: 1, castle: 10, start: 12 }) }),
});

// The same planner as in real time, with as many commands as a person. The strengths differ in how
// cleverly they plan and, as in real time, in how fast the easier ones grow.
// build      chance per turn to spend a command on a building first
// idleBuild  spend commands that found no attack worth it on a building
// rushAfter  no attack on any castle before this game second (turn × seconds)
// patience   moves without any attack a kingdom sits out before it breaks through: everything next to
//            one field attacks, and the fields behind follow (planBreak in turns.js). Without it a
//            kingdom never got past a full field or a castle it touched from too few sides.
// push       a field that was just taken attacks on with all it has (in real time part of `waves`)
// "hard" has no second wave of its own (waves 0): with it, equal kingdoms traded fields without end
// (84 of 120 duels decided on average, against 95 with `push` alone and fewer buildings).
export const TURN_DIFFICULTY = Object.freeze({
  easy: Object.freeze({ margin: 1.4, sides: 2, waves: 0, reinforce: 1, frontKeep: 3, castleKeep: 16, build: 0.15, idleBuild: false, incomeMul: 0.75, humanBias: 0.6, rushAfter: 200, patience: 2 }),
  normal: Object.freeze({ margin: 1.25, sides: 3, waves: 0, reinforce: 2, frontKeep: 5, castleKeep: 20, build: 0.3, idleBuild: true, incomeMul: 0.9, humanBias: 0.9, rushAfter: 96, patience: 1 }),
  hard: Object.freeze({ margin: 1.12, sides: 5, waves: 0, push: 1, reinforce: 2, frontKeep: 5, castleKeep: 22, build: 0.2, idleBuild: true, incomeMul: 1, humanBias: 1, rushAfter: 48, patience: 1 }),
});
