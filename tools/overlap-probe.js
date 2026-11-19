// Measuring aid for the browser, not part of the game: plays a mission with the computer in the
// player's seat and counts, picture by picture, numbers that cover each other on screen.
//   1. node serve.mjs, open the game, set the window to the size to check (for example a phone)
//   2. in the browser console:
//        eval(await (await fetch('/tools/overlap-probe.js')).text());
//        await __probe('m2', { seconds: 600 })
//   bad: pictures in which digits lie on other digits. Marching troops are counted apart: their
//   numbers travel with them and may pass over others. dropped: attackers' numbers left out for
//   lack of room.
window.__probe = async function probe(id, { seconds = 900, every = 1, seed } = {}) {
  const app = window.__app;
  const { MISSIONS } = await import('/src/sim/missions.js');
  const mission = MISSIONS.find((m) => m.id === id);
  app.startMission(mission, seed);
  app.tutorial = null;
  app.game.truce = false;
  app.game.reserved = null;
  app.setHint('');
  app.setMode('pause'); // the page's own loop stops stepping; this loop steps and draws
  const game = app.game;
  game.factions[0].human = false;
  const ov = app.overlay;
  const ctx = ov.ctx;
  const plain = ctx.fillText.bind(ctx);
  let texts = [];
  ctx.fillText = (text, x, y) => {
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(ctx.font)[1]);
    texts.push({ text: String(text), x, y, w: ctx.measureText(text).width, h: size * 0.8, color: ctx.fillStyle });
    plain(text, x, y);
  };
  const pairs = {};
  const shots = [];
  let pictures = 0;
  let bad = 0;
  let dropped = 0;
  let sieges = 0;
  try {
    for (let t = 0; t < seconds && game.phase === 'running'; t += every) {
      for (let k = 0; k < every * 10; k++) game.step(0.1);
      game.drainEvents();
      texts = [];
      const now = performance.now() / 1000;
      app.renderer.render(game, now, app.ui);
      ov.draw(game, app.renderer, app.ui, now);
      // Marching numbers do not dodge on purpose (they would jump); find them by their position.
      const march = [];
      for (const a of game.armies) {
        if (a.done || a.kind === 'supply') continue;
        const pos = app.renderer.armyPosition(game, a);
        const p = app.renderer.project(pos.x, pos.y + 0.75, pos.z);
        march.push({ x: p.x, y: p.y + 0.5, text: String(a.units) });
      }
      for (const b of texts) {
        b.kind = march.some((m) => m.text === b.text && Math.abs(m.x - b.x) < 1 && Math.abs(m.y - b.y) < 1) ? 'march' : /s$|hält|holds/.test(b.text) && b.color === '#ffffff' && !/^\d+$/.test(b.text) ? 'tag' : b.color === '#06141b' ? 'siege' : 'field';
      }
      pictures++;
      dropped += ov.stats.dropped || 0;
      sieges += texts.filter((b) => b.kind === 'siege').length;
      let hit = false;
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i];
          const b = texts[j];
          if (Math.abs(a.x - b.x) * 2 < a.w + b.w - 1 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 1) {
            const key = [a.kind, b.kind].sort().join('+');
            pairs[key] = (pairs[key] || 0) + 1;
            if (!key.includes('march')) {
              hit = true;
              if (shots.length < 12) shots.push({ t: Math.round(game.time), a: [a.kind, a.text, Math.round(a.x), Math.round(a.y)], b: [b.kind, b.text, Math.round(b.x), Math.round(b.y)] });
            }
          }
        }
      }
      if (hit) bad++;
    }
  } finally {
    ctx.fillText = plain;
  }
  return { id, pictures, bad, dropped, sieges, pairs, shots, end: Math.round(game.time), phase: game.phase, winner: game.winner, w: innerWidth, h: innerHeight };
};
