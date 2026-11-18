// Shared helpers for the rule tests: a small open map on which the tests give every order themselves.
import { Game } from '../src/sim/game.js';

// Kingdom 0 sits top left, kingdom 1 bottom right, everything else is free land.
export const LAB = {
  id: 'lab',
  factions: 2,
  ring: false,
  storm: false,
  layout: ['K0 .  .  .  .', '  .  .  .  .  .', '.  .  .  .  K1'],
};

/** @param {number} [human] seat of the player; nobody thinks or ships supply either way */
export function lab(extra = {}, human = -1) {
  const game = new Game({ mission: { ...LAB, ...extra }, human });
  for (const f of game.factions) {
    f.thinkAt = Infinity; // nobody plays: the tests give every order themselves
    f.autoSupply = false;
  }
  return game;
}

/** Field in column `col` of row `row`, as written in the layout. */
export const at = (game, col, row) => game.tiles.find((t) => t.r === row && t.q === col - ((row - (row & 1)) >> 1));

export const give = (game, tile, owner, units) => {
  tile.owner = owner;
  tile.units = units;
  game._supply();
};

export const run = (game, seconds) => {
  for (let i = 0; i < Math.round(seconds * 10); i++) game.step(0.1);
};
