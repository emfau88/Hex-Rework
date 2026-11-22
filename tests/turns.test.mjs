// Turn mode (branch runden): rules of a move, commands, preview, undo and whole matches.  node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { TurnGame, aiTurn, aiNext, runCommand, planBreak, planMass, idleMoves } from '../src/sim/turns.js';
import { MISSIONS } from '../src/sim/missions.js';
import { TURN_RULES } from '../src/sim/rules.js';
import { LAB, at, give } from './lab.mjs';

const duel = MISSIONS.find((m) => m.id === 'duel');

/** The small open test map in turn mode; the person (kingdom 0) begins. Nobody ships supply unless asked. */
function turnLab(extra = {}, supply = false) {
  const game = new TurnGame({ mission: { ...LAB, ...extra }, human: 0 });
  for (const f of game.factions) f.autoSupply = supply;
  return game;
}

/** Owner and troops of every field, to compare two states. */
const state = (g) => g.tiles.map((t) => `${t.owner}:${t.units.toFixed(4)}:${t.building || ''}:${t.castle}`).join(' ');

test('whoever begins has one command in the first move, everybody else three', () => {
  const g = turnLab();
  assert.equal(g.turn, 1);
  assert.equal(g.current, 0);
  assert.equal(g.commandsLeft, TURN_RULES.firstCommands);
  g.endTurn();
  assert.equal(g.current, 1);
  assert.equal(g.turn, 1);
  assert.equal(g.commandsLeft, TURN_RULES.commands);
  g.endTurn();
  assert.equal(g.current, 0);
  assert.equal(g.turn, 2);
  assert.equal(g.commandsLeft, TURN_RULES.commands);
  assert.equal(g.time, TURN_RULES.seconds, 'the game clock runs on by one turn');
});

test('nothing happens between commands: the clock does not run by itself', () => {
  const g = turnLab();
  const before = state(g);
  g.step(10);
  assert.equal(g.time, 0);
  assert.equal(state(g), before);
});

test('at the start of its move a kingdom grows; crowded fields shrink back, cut-off fields wither', () => {
  const g = turnLab();
  const grow = at(g, 1, 0); // next to the castle
  const crowd = at(g, 0, 1); // next to the castle
  const lone = at(g, 3, 0); // no link to the castle
  give(g, grow, 0, 5);
  give(g, crowd, 0, 28);
  give(g, lone, 0, 10);
  const castle = g.tiles[g.factions[0].castle].units;
  g.endTurn();
  g.endTurn();
  assert.equal(grow.units, 5 + TURN_RULES.income.plain);
  assert.equal(crowd.units, g.cap(crowd));
  assert.equal(lone.units, 10 - TURN_RULES.cutOff);
  assert.equal(g.tiles[g.factions[0].castle].units, castle + TURN_RULES.income.castle);
  g.endTurn();
  g.endTurn();
  g.endTurn();
  g.endTurn();
  assert.equal(lone.units, 1, 'a cut-off field never withers below 1');
});

test('an attack is fought out at once, the preview says exactly what happens, and the surplus goes back', () => {
  const g = turnLab();
  const a = at(g, 1, 0);
  const b = at(g, 0, 1);
  const target = at(g, 1, 1); // touches a and b
  give(g, a, 0, 25);
  give(g, b, 0, 25);
  give(g, target, -1, 3);
  const parts = g.assaultParts(0, target.id, 1);
  assert.equal(parts.length, 2);
  const preview = g.preview(0, target.id, parts);
  assert.ok(preview.won);
  assert.equal(preview.left, g.cap(target) + g.R.overfill, 'at most what the field feeds plus crowding moves in');
  assert.ok(preview.back.length === 2 && preview.back.every((x) => x.units > 0), 'the rest goes back to both fields');
  const res = g.attack(0, target.id, parts);
  assert.equal(target.owner, 0);
  assert.equal(target.units, preview.left);
  assert.equal(a.units, 1 + preview.back.find((x) => x.tile === a.id).units);
  assert.equal(b.units, 1 + preview.back.find((x) => x.tile === b.id).units);
  assert.equal(res.lost, preview.lost);
  assert.ok(Math.abs(48 - preview.lost - preview.left - preview.back.reduce((s, x) => s + x.units, 0)) < 1e-9, 'nobody is lost on the way');
  assert.equal(g.commandsLeft, TURN_RULES.firstCommands - 1);
});

test('an attack that is beaten off leaves the defenders the preview promised', () => {
  const g = turnLab();
  g.endTurn();
  g.endTurn(); // a full move with three commands
  const a = at(g, 1, 0);
  const target = at(g, 2, 0);
  give(g, a, 0, 12);
  give(g, target, 1, 18);
  const parts = g.assaultParts(0, target.id, 1);
  const preview = g.preview(0, target.id, parts);
  assert.equal(preview.won, false);
  g.attack(0, target.id, parts);
  assert.equal(target.owner, 1);
  assert.equal(target.units, preview.left);
  assert.equal(a.units, 1);
  assert.ok(target.units > 0 && target.units < 18);
});

test('attacks from several sides cost less than from one, as in real time', () => {
  const g = turnLab();
  const target = at(g, 1, 1);
  give(g, target, 1, 12);
  give(g, at(g, 1, 0), 0, 25);
  give(g, at(g, 0, 1), 0, 1);
  const one = g.preview(0, target.id, [{ origin: at(g, 1, 0).id, units: 24 }]);
  give(g, at(g, 0, 1), 0, 13);
  give(g, at(g, 1, 0), 0, 13);
  const two = g.preview(0, target.id, g.assaultParts(0, target.id, 1));
  assert.ok(one.won && two.won);
  assert.ok(two.lost < one.lost, `two sides lose ${two.lost.toFixed(1)}, one side ${one.lost.toFixed(1)}`);
});

test('with the fields behind, an attack through a single edge gets through', () => {
  const g = turnLab();
  const front = at(g, 1, 0);
  const behind = at(g, 0, 1);
  const target = at(g, 2, 0); // touches front only
  give(g, front, 0, 20);
  give(g, behind, 0, 20);
  give(g, target, 1, 20);
  assert.equal(g.preview(0, target.id, g.assaultParts(0, target.id, 1)).won, false);
  const parts = g.assaultParts(0, target.id, 1, true);
  assert.equal(parts.length, 2);
  assert.ok(!parts.some((p) => p.origin === g.factions[0].castle), 'the castle stays home');
  const preview = g.preview(0, target.id, parts);
  assert.ok(preview.won);
  assert.ok(preview.plan.every((p) => p.from === front.id), 'both fight at the one edge');
  give(g, at(g, 0, 2), 1, 3); // now a rival stands next to the field behind
  assert.equal(g.assaultParts(0, target.id, 1, true).length, 1, 'a field behind that faces a rival of its own stays');
});

test('a computer move given command by command is the same move', () => {
  const play = (stepwise) => {
    const g = new TurnGame({ mission: duel, seed: 4321, human: -1, wide: true });
    for (let k = 0; k < 24 && g.phase === 'running'; k++) {
      const f = g.factions[g.current];
      if (stepwise) {
        const memo = {};
        for (let c = aiNext(g, f, memo); c && runCommand(g, f.id, c); c = aiNext(g, f, memo));
        g.shipSupply();
        g.deliver();
        g.passOn();
      } else {
        aiTurn(g, f);
        g.endTurn();
      }
    }
    return state(g);
  };
  assert.equal(play(true), play(false));
});

test('moving troops: any distance through own land, at once, up to what the field takes', () => {
  const g = turnLab();
  g.endTurn();
  g.endTurn();
  const a = at(g, 1, 0);
  const b = at(g, 2, 0);
  const c = at(g, 3, 0);
  give(g, a, 0, 20);
  give(g, b, 0, 1);
  give(g, c, 0, 25);
  const m = g.move(0, a.id, c.id, 19);
  assert.equal(m.units, g.cap(c) + g.R.overfill - 25, 'only up to the limit plus crowding');
  assert.equal(c.units, 30);
  assert.equal(g.commandsLeft, 2);
  give(g, b, 1, 5); // the way is cut
  assert.equal(g.move(0, a.id, c.id, 5), null);
  assert.equal(g.move(0, a.id, b.id, 5), null, 'foreign fields are attacked, not moved to');
  assert.equal(g.commandsLeft, 2, 'a refused command costs nothing');
});

test('building only with the troops on the field: no saving up, one command', () => {
  const g = turnLab();
  g.endTurn();
  g.endTurn();
  const f = at(g, 1, 0);
  give(g, f, 0, 5);
  assert.equal(g.buildOption(0, f.id, 'farm').state, 'short', 'saving up does not exist');
  assert.equal(g.build(0, f.id, 'farm'), false);
  assert.equal(g.commandsLeft, 3);
  give(g, f, 0, 12);
  const cost = g.buildCost('farm', 0);
  assert.equal(g.build(0, f.id, 'farm'), true);
  assert.equal(f.building, 'farm');
  assert.equal(f.units, 12 - cost);
  assert.equal(g.commandsLeft, 2);
  assert.equal(f.order, null);
});

test('undo takes the commands of this move back one by one, a capture included', () => {
  const g = turnLab();
  g.endTurn();
  g.endTurn();
  const a = at(g, 1, 0);
  const target = at(g, 2, 0);
  give(g, a, 0, 20);
  give(g, at(g, 0, 1), 0, 12);
  give(g, target, 1, 4);
  const start = state(g);
  assert.ok(g.attack(0, target.id, g.assaultParts(0, target.id, 1)).won);
  const afterAttack = state(g);
  assert.ok(g.move(0, at(g, 0, 1).id, target.id, 6));
  assert.equal(g.commandsLeft, 1);
  assert.equal(g.undo(), true);
  assert.equal(state(g), afterAttack);
  assert.equal(g.undo(), true);
  assert.equal(state(g), start);
  assert.equal(target.owner, 1);
  assert.equal(g.commandsLeft, 3);
  assert.equal(g.entry.commands.length, 0);
  assert.equal(g.undo(), false, 'nothing left to take back');
  g.endTurn();
  assert.equal(g.undo(), false, 'a finished move cannot be taken back');
});

test('the supply ships at the end of the move, so a field just taken is manned before the rival moves', () => {
  const g = turnLab({}, true);
  g.endTurn();
  g.endTurn();
  const castle = g.tiles[g.factions[0].castle];
  const a = at(g, 1, 0);
  const target = at(g, 2, 0);
  give(g, castle, 0, 50);
  give(g, a, 0, 20);
  give(g, at(g, 0, 1), 0, 20);
  give(g, target, -1, 2);
  give(g, at(g, 3, 0), 1, 5); // a rival behind the target
  g.attack(0, target.id, [{ origin: a.id, units: 10 }]);
  const taken = target.units;
  const entry = g.entry;
  g.endTurn();
  assert.ok(entry.supply.some((s) => s.to === target.id), 'supply went to the field just taken');
  assert.ok(target.units > taken);
  assert.equal(g.current, 1);
});

test('a computer kingdom spends its commands, and the same seed plays the same match', () => {
  const play = () => {
    const g = new TurnGame({ mission: duel, seed: 1234, human: -1, wide: true });
    const used = [];
    while (g.phase === 'running') {
      aiTurn(g, g.factions[g.current]);
      used.push(g.entry.commands.length);
      g.endTurn();
    }
    return { g, used };
  };
  const one = play();
  const two = play();
  assert.equal(one.g.phase, 'finished');
  assert.ok(one.g.turn <= TURN_RULES.turnLimit + 1);
  assert.equal(state(one.g), state(two.g));
  assert.equal(one.g.winner, two.g.winner);
  assert.equal(one.g.turn, two.g.turn);
  assert.ok(one.used.every((n, i) => n <= (i === 0 ? TURN_RULES.firstCommands : TURN_RULES.commands)), 'never more commands than allowed');
  assert.ok(one.used.reduce((s, n) => s + n, 0) > one.used.length, 'the computer does use its commands');
});

test('a computer kingdom plays only in its own move, and the person is left to move', () => {
  const g = new TurnGame({ mission: duel, seed: 77, human: 0, wide: true });
  assert.equal(g.current, 0);
  g.advance();
  assert.equal(g.current, 0, 'nothing happens while the person is to move');
  assert.equal(g.attack(1, g.factions[0].castle, [{ origin: g.factions[1].castle, units: 5 }]), null, 'no commands out of turn');
  g.endTurn();
  g.advance();
  assert.equal(g.current, 0);
  assert.equal(g.turn, 2);
  assert.ok(g.log.some((e) => e.owner === 1 && e.commands.length > 0), 'the rival moved');
});

test('the storm comes by turns: edges widen and cover fades', () => {
  const g = new TurnGame({ mission: duel, seed: 5, human: -1, wide: true });
  const castle = g.tiles[g.factions[0].castle];
  const cover = g.defense(castle);
  assert.equal(g.stormProgress(), 0);
  g.turn = TURN_RULES.stormTurn + TURN_RULES.stormTurns;
  assert.equal(g.stormProgress(), 1);
  assert.equal(g.defense(castle), 1);
  assert.ok(cover > 1.5);
  assert.equal(g.frontage(), g.R.frontage * g.R.stormFrontage);
});

// ---------------------------------------------------------------- rivals that play a match to its end

test('breakthrough: where the attack from one side fails, the fields behind follow', () => {
  const g = new TurnGame({ mission: LAB, human: -1 });
  for (const f of g.factions) f.autoSupply = false;
  const front = at(g, 1, 0);
  const behind = at(g, 0, 1);
  const target = at(g, 2, 0); // touches front only
  give(g, front, 0, 20);
  give(g, behind, 0, 2);
  give(g, target, 1, 20);
  const f = g.factions[0];
  assert.equal(planBreak(g, f), null, 'nothing gets through yet');
  give(g, behind, 0, 20);
  const plan = planBreak(g, f);
  assert.equal(plan.target, target.id);
  assert.deepEqual(plan.parts.map((p) => p.origin).sort(), [front.id, behind.id].sort());
  assert.ok(g.preview(0, plan.target, plan.parts).won, 'what it plans does take the field');
});

test('bringing troops up: the hinterland sends to the field behind the front, never from a front', () => {
  const g = new TurnGame({ mission: LAB, human: -1 });
  for (const f of g.factions) f.autoSupply = false;
  const front = at(g, 1, 0);
  const behind = at(g, 0, 1);
  const target = at(g, 2, 0);
  const far = at(g, 0, 2); // behind `behind`, away from every rival
  give(g, front, 0, 20);
  give(g, behind, 0, 2);
  give(g, far, 0, 14);
  give(g, target, 1, 20);
  const f = g.factions[0];
  const move = planMass(g, f);
  assert.ok(move, 'there is something to bring up');
  assert.equal(move.to, behind.id, 'to the field that would follow the attack');
  assert.notEqual(move.from, front.id);
  assert.ok(runCommand(g, 0, { type: 'move', ...move }));
  assert.equal(behind.units, 2 + move.units);
  assert.equal(g.entry.commands.at(-1).type, 'move');
});

test('idleMoves counts the moves in a row without an attack, not the running one', () => {
  const g = turnLab();
  assert.equal(idleMoves(g, 1), 0);
  g.endTurn(); // the person; kingdom 1 begins
  g.endTurn(); // kingdom 1 did nothing
  g.endTurn();
  assert.equal(g.current, 1);
  assert.equal(idleMoves(g, 1), 1, 'one finished move without an attack');
  give(g, at(g, 3, 2), 1, 10);
  give(g, at(g, 2, 2), 0, 1);
  assert.ok(g.attack(1, at(g, 2, 2).id, [{ origin: at(g, 3, 2).id, units: 9 }]));
  assert.equal(idleMoves(g, 1), 1, 'the running move does not count');
  g.endTurn();
  g.endTurn();
  assert.equal(idleMoves(g, 1), 0, 'the last move had an attack');
});

test('a person who never gives a command loses the castle on every strength, without long pauses', () => {
  // On these islands the rivals used to wait at a single edge: the castle stood until turn 48 or 53,
  // on seed 1374 until the turn limit.
  for (const seed of [1374, 1714]) {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const g = new TurnGame({ mission: duel, seed, difficulty, human: 0, wide: true });
      let quiet = 0;
      let longest = 0;
      let moved = false;
      while (g.phase === 'running') {
        if (g.current !== 0) {
          aiTurn(g, g.factions[g.current]);
          quiet = g.entry.commands.some((c) => c.type === 'attack') ? 0 : quiet + 1;
          longest = Math.max(longest, quiet);
          moved ||= g.entry.commands.some((c) => c.type === 'move');
        }
        g.endTurn();
      }
      assert.equal(g.winner, 1, `seed ${seed}, ${difficulty}: the rival takes the castle`);
      assert.ok(g.turn <= 35, `seed ${seed}, ${difficulty}: over in turn ${g.turn}`);
      assert.ok(longest < 5, `seed ${seed}, ${difficulty}: longest pause ${longest} moves`);
      if (seed === 1374 && difficulty === 'normal') assert.ok(moved, 'the rival brought troops up with a move');
    }
  }
});

// ---------------------------------------------------------------- what the help of the turn mode says

test('the help of the turn mode states the numbers the rules use', async () => {
  const { i18n } = await import('../src/ui/i18n.js');
  const { RULES } = await import('../src/sim/rules.js');
  const lang = i18n.lang;
  i18n.lang = 'de';
  try {
    const build = i18n.t('turnHow8');
    const growth = i18n.t('turnHow9');
    const cover = i18n.t('turnHow10');
    const de = (n) => String(n).replace('.', ',');
    const pct = (v) => `+${Math.round(v * 100)} %`;
    for (const part of [`Turm (${RULES.towerCost} Truppen, jeder weitere ${RULES.towerStep} mehr)`, pct(RULES.towerDefense), `Hof (${RULES.farmCost} Truppen, jeder weitere ${RULES.farmStep} mehr)`, `+${de(TURN_RULES.farmBonus)} Truppen pro Zug`]) {
      assert.ok(build.includes(part), `"${part}" stands in: ${build}`);
    }
    const I = TURN_RULES.income;
    assert.equal(I.plain, I.forest);
    for (const part of [`Wiese und Wald ${de(I.plain)}`, `Hügel ${de(I.hill)}`, `Zitadelle ${de(I.citadel)}`, `Burg ${de(I.castle)}`, `nährt ${RULES.cap.field} Truppen`, `Zitadelle ${RULES.cap.citadel}`, `Burg ${RULES.cap.castle}`]) {
      assert.ok(growth.includes(part), `"${part}" stands in: ${growth}`);
    }
    for (const part of [`Wald ${pct(RULES.defense.forest - 1)}`, `Hügel ${pct(RULES.defense.hill - 1)}`, `Turm ${pct(RULES.towerDefense)}`, `Burg ${pct(RULES.castleDefense)}`]) {
      assert.ok(cover.includes(part), `"${part}" stands in: ${cover}`);
    }
    // Attackers a full field takes from one side, fought with the real battle.
    const need = (terrain, building) => {
      for (let n = 1; n < 200; n++) {
        const g = turnLab();
        const target = at(g, 1, 1);
        target.terrain = terrain;
        target.building = building;
        give(g, target, 1, RULES.cap.field);
        if (g._battle(target, [{ owner: 0, from: at(g, 1, 0).id, units: n }]).fallen) return n;
      }
      return Infinity;
    };
    for (const part of [`auf der Wiese ${need('plain', null)}`, `im Wald ${need('forest', null)}`, `auf dem Hügel ${need('hill', null)}`, `mit Turm ${need('plain', 'tower')}`]) {
      assert.ok(cover.includes(part), `"${part}" stands in: ${cover}`);
    }
  } finally {
    i18n.lang = lang;
  }
});

// ---------------------------------------------------------------- every map of the menu in turns

test('every map the menu starts plays to an end in turns, with a person who only ends the move', async () => {
  const { CAMPAIGN } = await import('../src/sim/missions.js');
  const { SKIRMISH } = await import('../src/sim/maps.js');
  const maps = [...CAMPAIGN, ...SKIRMISH.filter((m) => m.random)];
  assert.deepEqual(maps.map((m) => m.id), ['m1', 'm2', 'm3', 'duel', 'random']);
  for (const mission of maps) {
    assert.ok(mission.parTurns > 0, `${mission.id} has a goal in turns for the second star`);
    const g = new TurnGame({ mission, seed: mission.seed ?? 4711, human: 0, wide: true });
    assert.equal(g.current, 0, 'the person begins');
    let moves = 0;
    while (g.phase === 'running' && moves++ < 400) {
      if (g.current !== 0) aiTurn(g, g.factions[g.current]);
      g.endTurn();
    }
    assert.equal(g.phase, 'finished', `${mission.id} comes to an end`);
    assert.ok(g.turn <= TURN_RULES.turnLimit + 1);
  }
});

test('the citadel mission counts turns: the goal of 60 seconds is 8 turns, counted at the start of the holder\'s move', async () => {
  const { CAMPAIGN } = await import('../src/sim/missions.js');
  const m3 = CAMPAIGN.find((m) => m.id === 'm3');
  const g = new TurnGame({ mission: m3, seed: m3.seed, human: 0, wide: true });
  for (const f of g.factions) f.autoSupply = false;
  assert.equal(g.objective.turns, Math.ceil(m3.objective.seconds / TURN_RULES.seconds));
  assert.equal(g.objective.turns, 8);
  assert.ok(/\{n\} Züge/.test(m3.briefTurns.de), 'its briefing for turns speaks of turns');
  // The person holds the citadel and its whole ring: every own move adds one turn.
  const prize = g.tiles[g.objective.tile];
  give(g, prize, 0, 20);
  for (const n of prize.neighbors) if (g.tiles[n].passable) give(g, g.tiles[n], 0, 10);
  const round = () => {
    do g.endTurn();
    while (g.phase === 'running' && g.current !== 0);
  };
  round();
  assert.equal(g.hold.owner, 0);
  assert.equal(g.hold.time, 1);
  for (let i = 0; i < 6; i++) round();
  assert.equal(g.hold.time, 7);
  assert.equal(g.phase, 'running');
  round();
  assert.equal(g.phase, 'finished');
  assert.equal(g.winner, 0);
  assert.equal(g.reason, 'hold');
});

test('while the first lesson runs, a rival that is stuck neither breaks through nor gathers troops', () => {
  const g = new TurnGame({ mission: LAB, human: -1 });
  for (const f of g.factions) f.autoSupply = false;
  const front = at(g, 1, 0);
  const behind = at(g, 0, 1);
  const target = at(g, 2, 0);
  give(g, front, 0, 20);
  give(g, behind, 0, 20);
  give(g, target, 1, 20);
  const f = g.factions[0];
  assert.ok(planBreak(g, f), 'without the lesson it would break through');
  g.reserved = new Set([target.id]);
  assert.equal(planBreak(g, f), null, 'the practice field of the lesson is left alone');
  g.reserved = null;
  g.truce = true;
  assert.equal(planBreak(g, f), null, 'and during the truce nothing is attacked this way');
  give(g, behind, 0, 2);
  give(g, at(g, 0, 2), 0, 14);
  assert.equal(planMass(g, f), null, 'nor are troops brought up for it');
  g.truce = false;
  assert.ok(planMass(g, f));
});
