// App shell: screens, HUD, game loop. The rules live in src/sim, the picture in src/render.

import { Game } from './sim/game.js';
import { MISSIONS } from './sim/maps.js';
import { DioramaRenderer } from './render/renderer.js';
import { PALETTE_HEX } from './render/models.js';
import { Overlay } from './ui/overlay.js';
import { i18n } from './ui/i18n.js';
import { loadStore, saveStore } from './ui/store.js';
import { Sfx } from './audio/sfx.js';
import { attachInput } from './input.js';

const $ = (sel) => document.querySelector(sel);
const NAMES = ['AZUR', 'EMBER', 'JADE', 'SOLAR'];
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const star = '<svg><use href="#i-star"/></svg>';

class App {
  constructor() {
    this.store = loadStore();
    i18n.init(this.store.lang);
    this.el = $('#app');
    this.sfx = new Sfx();
    this.sfx.enabled = this.store.sound;
    this.renderer = new DioramaRenderer($('#world'));
    this.overlay = new Overlay($('#overlay'));
    this.ui = { selected: -1, hover: -1, targets: null, dragPath: null, dragging: false, pointer: null, human: -1, sendFraction: this.store.sendFraction, showNumbers: false, tutorialPath: null };
    this.mode = 'menu';
    this.mission = null;
    this.last = 0;
    this.timers = [];
    this.hudAt = 0;
    this.targetsAt = 0;
    this.alarmAt = -100;
    this.tutorial = null;

    this.buildMenu();
    this.bind();
    attachInput($('#overlay'), this);
    this.applyLanguage();
    this.resize();
    this.startAttract();
    requestAnimationFrame((ms) => this.frame(ms));
  }

  // ---------------------------------------------------------------- screens

  setMode(mode) {
    this.mode = mode;
    this.el.dataset.mode = mode === 'menu' ? 'menu' : 'play';
    $('#menu').hidden = mode !== 'menu';
    $('#pause').hidden = mode !== 'pause';
    $('#result').hidden = mode !== 'result';
    this.ui.showNumbers = mode !== 'menu';
    this.resize();
  }

  clearTimers() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  later(ms, fn) {
    this.timers.push(setTimeout(fn, ms));
  }

  /** A computer-only match plays behind the menu. */
  startAttract() {
    this.clearTimers();
    this.select(-1);
    this.mission = null;
    this.tutorial = null;
    this.ui.human = -1;
    this.ui.tutorialPath = null;
    this.game = new Game({ mission: MISSIONS.find((m) => m.id === 'four'), seed: (Math.random() * 1e9) | 0, difficulty: 'hard', human: -1, wide: this.wide() });
    this.setHint('');
    this.setMode('menu');
    this.refreshMenu();
  }

  startMission(mission, seed) {
    this.clearTimers();
    this.sfx.unlock();
    this.select(-1);
    this.mission = mission;
    this.seed = seed ?? (mission.random ? (Math.random() * 1e9) | 0 : mission.seed);
    this.game = new Game({
      mission,
      seed: this.seed,
      difficulty: mission.tutorial ? 'easy' : this.store.difficulty,
      human: 0,
      playerColor: this.store.color,
      autoSupply: this.store.supply,
      wide: this.wide(),
    });
    this.ui.human = 0;
    this.alarmAt = -100;
    this.tutorial = mission.tutorial ? { step: 0, at: 0 } : null;
    this.ui.tutorialPath = null;
    this.setMode('play');
    this.updateHud(true);
    this.setHint(this.tutorial ? i18n.t('hint0') : '');
    this.banner(i18n.t(`intro${mission.factions}`), '#f2c36b', 2600);
  }

  /** Wide screens get a landscape island, phones in portrait a tall one. */
  wide() {
    return window.innerWidth > window.innerHeight * 1.15;
  }

  // ------------------------------------------------------------------- menu

  buildMenu() {
    $('#colors').innerHTML = NAMES.map((n, i) => `<button data-color="${i}" style="color:${PALETTE_HEX[i]}"><i style="background:${PALETTE_HEX[i]}"></i>${n}</button>`).join('');
    $('#difficulty').innerHTML = ['easy', 'normal', 'hard'].map((d) => `<button data-diff="${d}" data-t="${d}"></button>`).join('');
  }

  refreshMenu() {
    for (const b of document.querySelectorAll('#colors button')) b.classList.toggle('on', Number(b.dataset.color) === this.store.color);
    for (const b of document.querySelectorAll('#difficulty button')) b.classList.toggle('on', b.dataset.diff === this.store.difficulty);
    $('#missions').innerHTML = MISSIONS.map((m, i) => {
      const got = this.store.stars[m.id] || 0;
      const stars = m.random ? '' : `<span class="mini-stars">${[0, 1, 2].map((k) => `<span class="${k < got ? 'got' : ''}">${star}</span>`).join('')}</span>`;
      return `<button data-mission="${m.id}"><span class="no">${m.random ? '?' : i + 1}</span><span class="txt"><span class="name">${i18n.pick(m.name)}</span><span class="blurb">${i18n.pick(m.blurb)}</span></span>${stars}</button>`;
    }).join('');
    $('#btn-sound use').setAttribute('href', this.store.sound ? '#i-sound' : '#i-mute');
    $('#btn-lang').textContent = i18n.lang.toUpperCase();
  }

  applyLanguage() {
    i18n.apply();
    this.refreshMenu();
    $('#supply-state').textContent = this.store.supply ? 'ON' : 'OFF';
  }

  bind() {
    const save = () => saveStore(this.store);
    $('#colors').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      this.store.color = Number(b.dataset.color);
      save();
      this.refreshMenu();
    });
    $('#difficulty').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      this.store.difficulty = b.dataset.diff;
      save();
      this.refreshMenu();
    });
    $('#missions').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) this.startMission(MISSIONS.find((m) => m.id === b.dataset.mission));
    });
    $('#btn-sound').addEventListener('click', () => {
      this.store.sound = this.sfx.enabled = !this.store.sound;
      save();
      this.sfx.unlock();
      this.refreshMenu();
    });
    $('#btn-lang').addEventListener('click', () => {
      i18n.lang = i18n.lang === 'de' ? 'en' : 'de';
      this.store.lang = i18n.lang;
      document.documentElement.lang = i18n.lang;
      save();
      this.applyLanguage();
    });
    $('#btn-full').addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    });

    $('#btn-pause').addEventListener('click', () => this.mode === 'play' && this.setMode('pause'));
    $('#btn-resume').addEventListener('click', () => this.setMode('play'));
    $('#btn-restart').addEventListener('click', () => this.startMission(this.mission, this.mission.random ? this.seed : undefined));
    $('#btn-quit').addEventListener('click', () => this.startAttract());
    $('#btn-retry').addEventListener('click', () => this.startMission(this.mission, this.mission.random ? this.seed : undefined));
    $('#btn-menu').addEventListener('click', () => this.startAttract());
    $('#btn-next').addEventListener('click', () => {
      const next = MISSIONS[MISSIONS.indexOf(this.mission) + 1];
      this.startMission(next || this.mission);
    });

    $('#btn-send').addEventListener('click', () => {
      this.ui.sendFraction = this.store.sendFraction = this.ui.sendFraction >= 1 ? 0.5 : 1;
      save();
      this.sfx.play('select');
      this.updateHud(true);
    });
    $('#btn-supply').addEventListener('click', () => {
      this.store.supply = !this.store.supply;
      save();
      if (this.game && this.ui.human >= 0) this.game.factions[this.ui.human].autoSupply = this.store.supply;
      this.sfx.play('select');
      this.updateHud(true);
    });
    for (const type of ['tower', 'farm']) {
      $(`#btn-${type}`).addEventListener('click', () => {
        if (!this.canCommand() || this.ui.selected < 0) return;
        if (this.game.build(this.ui.human, this.ui.selected, type)) this.updateHud(true);
      });
    }

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play') this.setMode('pause');
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.select(-1);
      else if ((e.key === ' ' || e.key.toLowerCase() === 'p') && (this.mode === 'play' || this.mode === 'pause')) {
        e.preventDefault();
        this.setMode(this.mode === 'play' ? 'pause' : 'play');
      } else if (e.key === '1' || e.key === '2') {
        this.ui.sendFraction = this.store.sendFraction = e.key === '1' ? 0.5 : 1;
        save();
        this.updateHud(true);
      }
    });
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.resize(w, h, dpr);
    this.overlay.resize(w, h, dpr);
    const playing = this.mode !== 'menu';
    this.renderer.setInsets(playing ? $('#top').offsetHeight - 6 : 0, playing ? $('#bottom').offsetHeight - 12 : 0);
  }

  // --------------------------------------------------------------- commands

  canCommand() {
    return this.mode === 'play' && this.game.phase === 'running' && this.ui.human >= 0;
  }

  select(id) {
    const ui = this.ui;
    if (id >= 0 && this.game.tiles[id].owner !== ui.human) id = -1;
    if (id === ui.selected) return;
    ui.selected = id;
    ui.hover = -1;
    ui.dragPath = null;
    ui.targets = id >= 0 ? this.game.reachable(ui.human, id) : null;
    if (id >= 0) this.sfx.play('select');
    this.updateHud(true);
  }

  order(from, to) {
    if (from < 0 || to < 0) return;
    this.game.send(this.ui.human, from, to, this.ui.sendFraction);
    this.select(-1);
  }

  // ------------------------------------------------------------------ frame

  frame(ms) {
    const now = ms / 1000;
    const dt = Math.min(0.1, Math.max(0, now - this.last));
    this.last = now;
    const game = this.game;

    try {
      // The renderer must know the current match before any of its events arrive.
      if (this.renderer.game !== game) this.renderer.setGame(game);
      if (this.mode === 'play' || this.mode === 'menu') game.step(dt);
      for (const e of game.drainEvents()) this.onEvent(e, now);

      const ui = this.ui;
      if (ui.selected >= 0) {
        if (game.tiles[ui.selected].owner !== ui.human || game.phase !== 'running') this.select(-1);
        else if (now - this.targetsAt > 0.25) {
          this.targetsAt = now;
          ui.targets = game.reachable(ui.human, ui.selected);
        }
      }
      if (this.tutorial) this.runTutorial(now);

      this.renderer.render(game, now, ui);
      this.overlay.draw(game, this.renderer, ui, now);
      if (now - this.hudAt > 0.2) this.updateHud(false);
    } catch (err) {
      this.fatal(err);
      return;
    }
    requestAnimationFrame((t) => this.frame(t));
  }

  onEvent(e, now) {
    const game = this.game;
    const human = this.ui.human;
    this.renderer.onEvent(e, game, now);
    const name = (id) => `<span style="color:${PALETTE_HEX[game.factions[id].color]}">${game.factions[id].name}</span>`;
    const quiet = this.mode === 'menu' ? 0 : 1;

    // In the menu match there is no human (-1); neutral fields are -1 as well, so compare with care.
    const mine = (id) => human >= 0 && id === human;

    switch (e.type) {
      case 'send':
        if (mine(e.owner)) this.sfx.play('send');
        break;
      case 'capture':
        if (mine(e.owner)) this.sfx.play('capture');
        else if (mine(e.previous)) this.sfx.play('lost');
        else this.sfx.play('capture', 0.22 * quiet);
        if (e.citadel) this.banner(i18n.t('citadel', { name: name(e.owner) }), null, 2200);
        break;
      case 'repel':
        if (mine(e.owner) || mine(e.defender)) this.sfx.play('repel', 0.8);
        if (mine(e.defender) && e.tile === game.factions[human].castle && now - this.alarmAt > 7) {
          this.alarmAt = now;
          this.sfx.play('alarm');
          this.banner(i18n.t('alarm'), '#ff8d7f', 2200);
        }
        break;
      case 'build':
        if (mine(e.owner)) this.sfx.play('build');
        break;
      case 'storm':
        this.sfx.play('storm', quiet);
        this.banner(i18n.t('storm'), '#ff8d7f', 3200);
        break;
      case 'kingdom':
        this.sfx.play('castle', quiet);
        if (game.phase === 'running') this.banner(i18n.t('falls', { name: name(e.fallen) }), null, 2600);
        break;
      case 'victory':
        this.banner(i18n.t('wins', { name: name(e.winner) }), null, 4000);
        if (human >= 0) {
          this.later(600, () => this.sfx.play('victory'));
          this.later(2400, () => this.showResult(true));
        } else this.later(6000, () => this.mode === 'menu' && this.startAttract());
        break;
      case 'defeat':
        this.later(500, () => this.sfx.play('defeat'));
        this.later(2400, () => this.showResult(false));
        break;
      default:
    }
  }

  // -------------------------------------------------------------------- HUD

  banner(html, color, ms) {
    const el = $('#banner');
    el.innerHTML = html;
    el.style.color = color || '';
    el.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  setHint(text) {
    const el = $('#hint');
    if (text) el.textContent = text;
    el.classList.toggle('show', Boolean(text));
  }

  updateHud(force) {
    const game = this.game;
    this.hudAt = this.last;
    if (this.mode === 'menu') return;
    const stats = game.stats();
    const human = this.ui.human;

    $('#clock').textContent = clock(game.time);
    $('#clock').classList.toggle('storm', game.storm);
    $('#share-bar').innerHTML = stats.factions.map((f) => `<i style="width:${((f.tiles / stats.playable) * 100).toFixed(1)}%;background:${PALETTE_HEX[f.color]}"></i>`).join('');
    $('#share-legend').innerHTML = stats.factions
      .map((f) => `<span class="${f.alive ? '' : 'out'}${f.id === human ? ' you' : ''}" style="color:${PALETTE_HEX[f.color]}">${f.name} ${f.tiles}</span>`)
      .join('');

    if (!force && this.ui.selected < 0) return;
    $('#send-value').textContent = this.ui.sendFraction >= 1 ? '100 %' : '50 %';
    $('#btn-supply').classList.toggle('on', this.store.supply);
    $('#supply-state').textContent = this.store.supply ? 'ON' : 'OFF';
    const sel = this.ui.selected >= 0 ? game.tiles[this.ui.selected] : null;
    for (const type of ['tower', 'farm']) {
      const btn = $(`#btn-${type}`);
      const cost = human >= 0 ? game.buildCost(type, human) : 0;
      const can = Boolean(sel) && game.canBuild(human, sel.id, type);
      btn.disabled = !can;
      btn.classList.toggle('ready', can && sel.units >= cost + 1);
      btn.classList.toggle('saving', Boolean(sel) && sel.order === type);
      $(`#cost-${type}`).textContent = cost;
    }
  }

  showResult(won) {
    if (this.mode === 'menu') return;
    const game = this.game;
    const m = this.mission;
    const stats = game.humanStats;
    const goals = [won, won && game.time <= m.par, won && stats.lost <= 3];
    const got = goals.filter(Boolean).length;
    if (won && !m.random) {
      this.store.stars[m.id] = Math.max(this.store.stars[m.id] || 0, got);
      this.store.best[m.id] = Math.min(this.store.best[m.id] || Infinity, Math.round(game.time));
      saveStore(this.store);
    }
    const title = $('#result-title');
    title.textContent = i18n.t(won ? 'victory' : 'defeat');
    title.className = `sheet-title big ${won ? 'win' : 'loss'}`;
    $('#result-sub').textContent = i18n.t(won ? 'victorySub' : 'defeatSub');
    const labels = [i18n.t('goalWin'), i18n.t('goalTime', { t: clock(m.par) }), i18n.t('goalHold')];
    $('#result-stars').innerHTML = goals.map((g, i) => `<div class="${g ? 'got' : ''}">${star}<span>${labels[i]}</span></div>`).join('');
    $('#result-stats').innerHTML = `<div><b>${clock(game.time)}</b>${i18n.t('time')}</div><div><b>${stats.captured}</b>${i18n.t('fields')}</div><div><b>${stats.lost}</b>${i18n.t('lost')}</div>`;
    const hasNext = won && !m.random && MISSIONS.indexOf(m) < MISSIONS.length - 1;
    $('#btn-next').hidden = !hasNext;
    $('#btn-retry').classList.toggle('primary', !hasNext);
    this.setHint('');
    this.setMode('result');
  }

  // --------------------------------------------------------------- tutorial

  runTutorial(now) {
    const game = this.game;
    const tut = this.tutorial;
    const ui = this.ui;
    if (this.mode !== 'play' || game.phase !== 'running') {
      ui.tutorialPath = null;
      return;
    }
    const advance = (step) => {
      tut.step = step;
      tut.at = game.time;
      this.setHint(i18n.t(`hint${step}`));
    };
    if (tut.step === 0) {
      if (game.humanStats.sent > 0) advance(1);
      else if (!ui.tutorialPath && !ui.dragging && ui.selected < 0) {
        // Show the gesture: from the castle through own land to a free field.
        const castle = game.factions[0].castle;
        for (const id of game.reachable(0, castle)) {
          if (game.tiles[id].owner < 0) {
            ui.tutorialPath = game.findPath(0, castle, id);
            break;
          }
        }
      } else if (ui.dragging || ui.selected >= 0) ui.tutorialPath = null;
    } else {
      ui.tutorialPath = null;
      const tiles = game.stats().factions[0].tiles;
      if (tut.step === 1 && (tiles >= 12 || game.time - tut.at > 30)) advance(2);
      else if (tut.step === 2 && (game.humanStats.built > 0 || game.time - tut.at > 25)) advance(3);
    }
  }

  fatal(err) {
    console.error(err);
    const el = $('#fatal');
    el.hidden = false;
    el.textContent = String(err && err.message ? err.message : err);
  }
}

try {
  window.__app = new App();
} catch (err) {
  console.error(err);
  const el = document.querySelector('#fatal');
  el.hidden = false;
  el.textContent = /WebGL2/.test(String(err)) ? i18n.t('noWebgl') : String(err && err.message ? err.message : err);
}

