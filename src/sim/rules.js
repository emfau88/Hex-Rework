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
export const DIFFICULTY = Object.freeze({
  easy: Object.freeze({ think: 2.6, margin: 1.4, sides: 2, waves: 0, actions: 1, reinforce: 1, frontKeep: 3, castleKeep: 16, build: 0.2, incomeMul: 0.85, humanBias: 0.6, rushAfter: 180 }),
  normal: Object.freeze({ think: 1.6, margin: 1.18, sides: 4, waves: 1, actions: 1, reinforce: 2, frontKeep: 5, castleKeep: 22, build: 0.45, incomeMul: 1, humanBias: 1, rushAfter: 100 }),
  hard: Object.freeze({ think: 1.3, margin: 1.1, sides: 6, waves: 2, actions: 2, reinforce: 3, frontKeep: 6, castleKeep: 26, build: 0.65, incomeMul: 1, humanBias: 1.1, rushAfter: 60 }),
});
