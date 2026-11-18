// All balance numbers in one place. Units are troops, seconds and hex steps.

export const RULES = Object.freeze({
  step: 0.1,

  // Movement: seconds per hex, plus a small penalty for entering rough ground.
  march: 0.8,
  marchHill: 0.2,
  marchForest: 0.1,

  // Troops per second on a supplied field.
  income: Object.freeze({ plain: 0.3, forest: 0.3, hill: 0.24, citadel: 1.4, castle: 1.3 }),
  farmBonus: 0.45,

  // Growth stops at the cap; arriving troops may stack up to maxUnits.
  cap: Object.freeze({ field: 40, citadel: 60, castle: 60 }),
  maxUnits: 99,

  // A defender counts as units × defense.
  defense: Object.freeze({ plain: 1, forest: 1.25, hill: 1.45, citadel: 1.3 }),
  towerDefense: 0.6,
  castleDefense: 0.4,
  ruinDefense: 0.2,

  // Every further building of the same kind costs more, so nobody can wall off a whole border.
  towerCost: 10,
  towerStep: 5,
  farmCost: 8,
  farmStep: 3,

  // Storm: from this moment walls crumble. Terrain, tower and castle bonuses fade away and
  // defenders count for less and less, so attacking pays off and every match comes to an end.
  stormStart: 210,
  stormLength: 120,
  stormDefense: 0.5,

  startCastle: 16,
  startRing: 2,

  // Whoever takes a castle inherits the whole kingdom, with this share of its troops.
  conquestKeep: 0.5,

  // Automatic supply: interior fields forward their troops to the front.
  supplyInterval: 1.0,
  supplyMin: 5,
});

// think: seconds between decisions · margin: superiority wanted before attacking ·
// castleKeep: garrison the castle never gives away · rushAfter: no attack on any castle before this second.
export const DIFFICULTY = Object.freeze({
  easy: Object.freeze({ think: 2.4, margin: 1.5, castleKeep: 14, build: 0.25, incomeMul: 0.8, humanBias: 0.8, rushAfter: 150 }),
  normal: Object.freeze({ think: 1.4, margin: 1.2, castleKeep: 20, build: 0.5, incomeMul: 1, humanBias: 1, rushAfter: 90 }),
  hard: Object.freeze({ think: 0.8, margin: 1.06, castleKeep: 24, build: 0.7, incomeMul: 1, humanBias: 1.1, rushAfter: 50 }),
});
