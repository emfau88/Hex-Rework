// App shell: screens, HUD, game loop. The rules live in src/sim, the picture in src/render.

import { Game } from './sim/game.js';
import { CAMPAIGN, MISSIONS } from './sim/missions.js';
import { SKIRMISH } from './sim/maps.js';
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
// Pace of a match: how many seconds of the rules pass per second on the wall clock. The rules and
// the rivals know nothing of it, so the balance is the same at every pace; only the player gets
// more or less time to read the board.
const SPEEDS = { calm: 0.75, normal: 1, fast: 1.3 };
const ATTRACT = SKIRMISH.find((m) => m.id === 'four');
const FREE_PLAY = SKIRMISH.filter((m) => m.random);

class App {
  constructor() {
    this.store = loadStore();
    i18n.init(this.store.lang);
    this.el = $('#app');
    this.sfx = new Sfx();
    this.sfx.enabled = this.store.sound;
    this.renderer = new DioramaRenderer($('#world'));
    this.overlay = new Overlay($('#overlay'));
    this.ui = {
      selected: -1,
      hover: -1,
      targets: null,
      dragPath: null,
      dragging: false,
      pointer: null,
      assault: null,
      human: -1,
      sendFraction: this.store.sendFraction,
      pace: 1,
      notices: [], // short messages at a field, such as the reason an order was refused: { tile, text, at }
      showNumbers: false,
      tutorialPath: null,
      tutorialMark: null,
    };
    this.mode = 'menu';
    this.mission = null;
    this.pending = null;
    this.last = 0;
    this.timers = [];
    this.hudAt = 0;
    this.targetsAt = 0;
    this.alarmAt = -100;
    this.holdWarnAt = -100;
    this.tutorial = null;
    this.events = []; // what happened lately, for the panel on wide screens: { at, html, bad }
    this.eventsShown = '';

    this.buildMenu();
    this.bind();
    this.input = attachInput($('#overlay'), this);
    this.applyLanguage();
    this.resize();
    this.startAttract();
    requestAnimationFrame((ms) => this.frame(ms));
  }

  // ---------------------------------------------------------------- screens

  /**
   *   menu, brief   sheets over the computer-only match behind the menu
   *   play          the match runs
   *   pause         planning pause: the match stands still, the board stays in view and takes orders
   *   options       sheet with help, pace, restart and quit; the match stands still
   *   result        the match is over
   */
  setMode(mode) {
    this.mode = mode;
    this.input?.disarm(); // a combined attack armed before a pause or a new match is void
    const behindSheet = mode === 'menu' || mode === 'brief';
    this.el.dataset.mode = behindSheet ? 'menu' : 'play';
    this.el.toggleAttribute('data-paused', mode === 'pause');
    $('#menu').hidden = mode !== 'menu';
    $('#brief').hidden = mode !== 'brief';
    $('#pausebar').hidden = mode !== 'pause';
    $('#pause').hidden = mode !== 'options';
    $('#result').hidden = mode !== 'result';
    // The side panels belong to a running or paused match of the player.
    const panels = (mode === 'play' || mode === 'pause') && this.ui.human >= 0;
    $('#panel-own').hidden = !panels;
    $('#panel-rivals').hidden = !panels;
    $('#btn-pause use').setAttribute('href', mode === 'pause' ? '#i-play' : '#i-pause');
    this.ui.showNumbers = !behindSheet;
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
    this.ui.assault = null;
    this.ui.tutorialPath = null;
    this.ui.tutorialMark = null;
    this.game = new Game({ mission: ATTRACT, seed: (Math.random() * 1e9) | 0, difficulty: 'hard', human: -1, wide: this.wide() });
    this.setHint('');
    this.setMode('menu');
    this.refreshMenu();
  }

  /** Campaign missions open with a short briefing; free play starts right away. */
  openMission(mission) {
    if (!mission.brief) {
      this.startMission(mission);
      return;
    }
    this.pending = mission;
    $('#brief-no').textContent = i18n.t('mission', { n: mission.no });
    $('#brief-name').textContent = i18n.pick(mission.name);
    $('#brief-text').textContent = i18n.pick(mission.brief);
    $('#brief-lesson').textContent = i18n.pick(mission.lesson);
    $('#brief-goal').textContent = mission.objective?.type === 'hold' ? i18n.t('goalCitadelLong', { s: mission.objective.seconds }) : i18n.t('goalConquerLong');
    $('#brief-stars').innerHTML = this.goalLabels(mission)
      .map((label) => `<div>${star}<span>${label}</span></div>`)
      .join('');
    this.setMode('brief');
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
      difficulty: this.store.difficulty,
      human: 0,
      playerColor: this.store.color,
      autoSupply: this.store.supply,
      wide: this.wide(),
    });
    this.ui.human = 0;
    this.ui.assault = null;
    this.events = [];
    this.alarmAt = -100;
    this.holdWarnAt = -100;
    this.ui.tutorialPath = null;
    this.ui.tutorialMark = null;
    // The guided first steps run until the mission has been won once.
    this.tutorial = mission.guide && !this.store.done[mission.id] ? this.prepareTutorial(mission.guide) : null;
    this.setMode('play');
    this.updateHud(true);
    if (this.tutorial) this.setHint('');
    else if (mission.lesson) {
      // The new rule of the mission stays on screen for the opening.
      this.setHint(i18n.pick(mission.lesson));
      this.later(16000, () => this.setHint(''));
    } else this.setHint('');
    this.banner(i18n.t(`intro${this.game.factions.length}`), '#f2c36b', 2600);
  }

  /** Wide screens get a landscape island, phones in portrait a tall one. */
  wide() {
    return window.innerWidth > window.innerHeight * 1.15;
  }

  unlocked(mission) {
    const i = CAMPAIGN.indexOf(mission);
    return i <= 0 || Boolean(this.store.done[CAMPAIGN[i - 1].id]);
  }

  goalLabels(mission) {
    return [i18n.t('goalWin'), i18n.t('goalTime', { t: clock(mission.par) }), i18n.t('goalHold', { n: mission.loseLimit ?? 3 })];
  }

  // ------------------------------------------------------------------- menu

  buildMenu() {
    $('#colors').innerHTML = NAMES.map((n, i) => `<button data-color="${i}" style="color:${PALETTE_HEX[i]}"><i style="background:${PALETTE_HEX[i]}"></i>${n}</button>`).join('');
    $('#difficulty').innerHTML = ['easy', 'normal', 'hard'].map((d) => `<button data-diff="${d}" data-t="${d}"></button>`).join('');
    // The pace can be set in the menu and, during a match, on the options sheet.
    for (const el of document.querySelectorAll('.speed')) el.innerHTML = Object.keys(SPEEDS).map((s) => `<button data-speed="${s}" data-t="${s}"></button>`).join('');
  }

  /** Seconds of the rules per second on the wall clock in the player's matches. */
  pace() {
    return SPEEDS[this.store.speed] ?? SPEEDS.calm;
  }

  refreshMenu() {
    for (const b of document.querySelectorAll('#colors button')) b.classList.toggle('on', Number(b.dataset.color) === this.store.color);
    for (const b of document.querySelectorAll('#difficulty button')) b.classList.toggle('on', b.dataset.diff === this.store.difficulty);
    const speed = this.store.speed in SPEEDS ? this.store.speed : 'calm';
    for (const b of document.querySelectorAll('.speed button')) b.classList.toggle('on', b.dataset.speed === speed);
    $('#missions').innerHTML = CAMPAIGN.map((m) => {
      const open = this.unlocked(m);
      const got = this.store.stars[m.id] || 0;
      const stars = `<span class="mini-stars">${[0, 1, 2].map((k) => `<span class="${k < got ? 'got' : ''}">${star}</span>`).join('')}</span>`;
      const no = open ? m.no : '<svg><use href="#i-lock"/></svg>';
      const blurb = open ? i18n.pick(m.blurb) : i18n.t('locked');
      return `<button data-mission="${m.id}" class="${open ? '' : 'locked'}"><span class="no">${no}</span><span class="txt"><span class="name">${i18n.pick(m.name)}</span><span class="blurb">${blurb}</span></span>${open ? stars : ''}</button>`;
    }).join('');
    $('#skirmish').innerHTML = FREE_PLAY.map(
      (m) => `<button data-mission="${m.id}"><span class="no">?</span><span class="txt"><span class="name">${i18n.pick(m.name)}</span><span class="blurb">${i18n.pick(m.blurb)}</span></span></button>`,
    ).join('');
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
    for (const el of document.querySelectorAll('.speed')) {
      el.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        this.store.speed = b.dataset.speed;
        save();
        this.refreshMenu();
      });
    }
    const pick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const mission = MISSIONS.find((m) => m.id === b.dataset.mission);
      if (mission && this.unlocked(mission)) this.openMission(mission);
    };
    $('#missions').addEventListener('click', pick);
    $('#skirmish').addEventListener('click', pick);
    $('#btn-start').addEventListener('click', () => this.pending && this.startMission(this.pending));
    $('#btn-back').addEventListener('click', () => this.setMode('menu'));
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

    const again = () => this.startMission(this.mission, this.mission.random ? this.seed : undefined);
    $('#btn-view').addEventListener('click', () => this.renderer.resetView());
    $('#btn-pause').addEventListener('click', () => this.togglePause());
    $('#btn-continue').addEventListener('click', () => this.setMode('play'));
    $('#btn-options').addEventListener('click', () => this.setMode('options'));
    $('#btn-resume').addEventListener('click', () => this.setMode('play'));
    $('#btn-restart').addEventListener('click', again);
    $('#btn-quit').addEventListener('click', () => this.startAttract());
    $('#btn-retry').addEventListener('click', again);
    $('#btn-menu').addEventListener('click', () => this.startAttract());
    $('#btn-next').addEventListener('click', () => {
      const next = CAMPAIGN[CAMPAIGN.indexOf(this.mission) + 1];
      if (!next) return;
      // The briefing of the next mission appears over the menu match.
      this.startAttract();
      this.openMission(next);
    });

    $('#btn-send').addEventListener('click', () => {
      this.input.disarm(); // the armed attack was previewed with the old share
      this.ui.sendFraction = this.store.sendFraction = this.ui.sendFraction >= 1 ? 0.5 : 1;
      save();
      this.sfx.play('select');
      this.updateHud(true);
    });
    $('#btn-supply').addEventListener('click', () => {
      this.input.disarm();
      this.store.supply = !this.store.supply;
      save();
      if (this.game && this.ui.human >= 0) this.game.factions[this.ui.human].autoSupply = this.store.supply;
      this.sfx.play('select');
      this.updateHud(true);
    });
    for (const type of ['tower', 'farm']) {
      $(`#btn-${type}`).addEventListener('click', () => {
        this.input.disarm();
        this.build(type, this.ui.selected);
      });
    }

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play') this.setMode('pause');
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Drops the selection, the preview and a combined attack that was armed by a first tap.
        this.input.cancel();
      } else if ((e.key === ' ' || e.key.toLowerCase() === 'p') && (this.mode === 'play' || this.mode === 'pause' || this.mode === 'options')) {
        e.preventDefault();
        this.togglePause();
      } else if (e.key === '0' || e.key === 'Home') {
        this.renderer.resetView(); // back to the whole island
      } else if (e.key === '1' || e.key === '2') {
        this.input.disarm();
        this.ui.sendFraction = this.store.sendFraction = e.key === '1' ? 0.5 : 1;
        save();
        this.updateHud(true);
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat && this.input.key(e.key)) {
        e.preventDefault(); // S storms, T, H and F build
      }
    });
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.resize(w, h, dpr);
    this.overlay.resize(w, h, dpr);
    const playing = this.el.dataset.mode === 'play';
    this.renderer.setInsets(playing ? $('#top').offsetHeight - 6 : 0, playing ? $('#bottom').offsetHeight - 12 : 0);
  }

  // --------------------------------------------------------------- commands

  /** Orders are taken while the match runs and during the planning pause. */
  canCommand() {
    return (this.mode === 'play' || this.mode === 'pause') && this.game.phase === 'running' && this.ui.human >= 0;
  }

  /** Pause button, space bar and P: into the planning pause and back into the match. */
  togglePause() {
    if (this.mode === 'play') this.setMode('pause');
    else if (this.mode === 'pause' || this.mode === 'options') this.setMode('play');
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
    const problem = this.game.sendProblem(this.ui.human, from, to, this.ui.sendFraction);
    if (problem) this.refuse(from, problem);
    else this.game.send(this.ui.human, from, to, this.ui.sendFraction);
    this.select(-1);
  }

  /** Combined attack: every own field next to the target sends at once. */
  assault(target) {
    if (!this.canCommand() || target < 0) return;
    this.select(-1);
    // Refused only if not a single neighbour has troops to spare.
    if (!this.game.assault(this.ui.human, target, this.ui.sendFraction)) this.refuse(target, 'troops');
  }

  /**
   * Tower or farm on an own field, by button or key. The button is only active when building is
   * possible; a key can be pressed anywhere, so a refusal says why at the field.
   */
  build(type, id) {
    if (!this.canCommand() || id < 0) return;
    const human = this.ui.human;
    if (this.game.build(human, id, type)) {
      this.updateHud(true);
      return;
    }
    const option = this.game.buildOption(human, id, type);
    const text = option.state === 'short' ? i18n.t('buildShort', { n: option.need })
      : option.state === 'never' ? i18n.t('buildNever')
      : option.state === 'ground' ? i18n.t('buildGround')
      : i18n.t('buildNo');
    this.say(id, text);
  }

  /** An order was not carried out: say why, for a moment, at the field it was about. */
  refuse(tile, problem) {
    const key = problem === 'troops' ? 'noTroops' : problem === 'full' ? 'targetFull' : 'noPath';
    this.say(tile, i18n.t(key));
  }

  say(tile, text) {
    this.ui.notices.push({ tile, text, at: this.last });
    this.sfx.play('lost', 0.5);
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
      // The player's matches run at the chosen pace; the match behind the menu always at full speed.
      this.ui.pace = this.ui.human >= 0 ? this.pace() : 1;
      if (this.mode === 'play' || this.mode === 'menu' || this.mode === 'brief') game.step(dt * this.ui.pace);
      for (const e of game.drainEvents()) this.onEvent(e, now);

      const ui = this.ui;
      if (ui.selected >= 0) {
        if (game.tiles[ui.selected].owner !== ui.human || game.phase !== 'running') this.select(-1);
        else if (now - this.targetsAt > 0.25) {
          this.targetsAt = now;
          ui.targets = game.reachable(ui.human, ui.selected);
        }
      }
      if (ui.assault) {
        // The preview follows the board: neighbours may have been lost or the field taken meanwhile.
        const sources = this.canCommand() ? game.flankers(ui.human, ui.assault.target) : [];
        ui.assault = sources.length ? { target: ui.assault.target, sources } : null;
      }
      if (this.tutorial) this.runTutorial(now);
      if (ui.notices.length) ui.notices = ui.notices.filter((n) => now - n.at < 1.8 && n.tile < game.tiles.length);

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
    const quiet = this.mode === 'play' ? 1 : 0;

    // In the menu match there is no human (-1); neutral fields are -1 as well, so compare with care.
    const mine = (id) => human >= 0 && id === human;

    switch (e.type) {
      case 'send':
        if (mine(e.owner)) this.sfx.play('send');
        break;
      case 'siege':
        if (mine(e.owner)) this.sfx.play('repel', 0.5);
        else if (mine(e.defender)) {
          this.sfx.play('repel', 0.8);
          if (e.tile === game.factions[human].castle && now - this.alarmAt > 7) {
            this.alarmAt = now;
            this.sfx.play('alarm');
            this.banner(i18n.t('alarm'), '#ff8d7f', 2200);
            this.note(i18n.t('evCastle'), true);
          }
        }
        break;
      case 'capture':
        if (mine(e.owner)) this.sfx.play('capture');
        else if (mine(e.previous)) {
          this.sfx.play('lost');
          this.note(i18n.t('evLost', { name: name(e.owner) }), true);
        }
        else this.sfx.play('capture', 0.22 * quiet);
        if (e.citadel) this.banner(i18n.t('citadel', { name: name(e.owner) }), null, 2200);
        if (e.citadel && mine(e.owner)) this.note(i18n.t('evCitadel'));
        break;
      case 'repel':
        if (mine(e.owner)) this.sfx.play('lost', 0.6);
        break;
      case 'build':
        if (mine(e.owner)) {
          this.sfx.play('build');
          this.note(i18n.t('evBuilt', { what: i18n.t(e.building) }));
        }
        break;
      case 'storm':
        this.sfx.play('storm', quiet);
        this.banner(i18n.t('storm'), '#ff8d7f', 3200);
        this.note(i18n.t('evStorm'), true);
        break;
      case 'kingdom':
        this.sfx.play('castle', quiet);
        if (game.phase === 'running') this.banner(i18n.t('falls', { name: name(e.fallen) }), null, 2600);
        this.note(i18n.t('evKingdom', { a: name(e.fallen), b: name(e.by) }));
        break;
      case 'victory':
        this.banner(i18n.t('wins', { name: name(e.winner) }), null, 4000);
        if (human >= 0) {
          this.later(600, () => this.sfx.play('victory'));
          this.later(2400, () => this.showResult(true));
        } else this.later(6000, () => this.mode === 'menu' && this.startAttract());
        break;
      case 'defeat':
        this.banner(i18n.t('wins', { name: name(e.by) }), null, 4000);
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

  /** Hint line above the bottom bar. With `step` it carries a small counter such as "2/4". */
  setHint(text, step) {
    const el = $('#hint');
    if (text) {
      el.textContent = '';
      if (step) {
        const chip = document.createElement('b');
        chip.className = 'step';
        chip.textContent = step;
        el.append(chip);
      }
      el.append(text);
    }
    el.classList.toggle('show', Boolean(text));
    el.classList.toggle('ok', false);
  }

  /** The mission goal with its progress, always visible under the share bar. */
  updateGoal() {
    const game = this.game;
    const text = $('#goal-text');
    const bar = $('#goal-bar');
    if (game.objective.type !== 'hold') {
      const left = game.factions.filter((f) => f.alive && f.id !== this.ui.human).length;
      text.textContent = i18n.t('goalConquer', { n: left });
      text.style.color = '';
      bar.hidden = true;
      return;
    }
    const hold = game.hold;
    const s = game.objective.seconds;
    bar.hidden = false;
    if (hold.owner < 0) {
      text.textContent = i18n.t('goalFree', { s });
      text.style.color = '';
      bar.firstElementChild.style.width = '0%';
      return;
    }
    const f = game.factions[hold.owner];
    const vars = { name: f.name, t: Math.floor(hold.time), s };
    text.textContent = i18n.t(hold.secure ? 'goalRun' : 'goalStop', vars);
    text.style.color = PALETTE_HEX[f.color];
    bar.classList.toggle('paused', !hold.secure);
    bar.firstElementChild.style.width = `${Math.min(100, (hold.time / s) * 100)}%`;
    bar.firstElementChild.style.background = PALETTE_HEX[f.color];
    // A rival running down the clock is the most urgent thing on the board.
    if (hold.secure && hold.owner !== this.ui.human && hold.time > s * 0.5 && this.last - this.holdWarnAt > 12) {
      this.holdWarnAt = this.last;
      this.sfx.play('alarm');
      this.banner(i18n.t('holdWarn', { name: `<span style="color:${PALETTE_HEX[f.color]}">${f.name}</span>` }), '#ff8d7f', 2600);
    }
  }

  updateHud(force) {
    const game = this.game;
    this.hudAt = this.last;
    if (this.el.dataset.mode !== 'play') return;
    const stats = game.stats();
    const human = this.ui.human;

    // While the map is zoomed in, a button in the top bar leads back to the whole island.
    const view = $('#btn-view');
    view.hidden = !(this.renderer.zoom > 1.01);
    view.setAttribute('aria-label', i18n.t('viewReset'));
    view.title = i18n.t('viewReset');
    $('#clock').textContent = clock(game.time);
    $('#clock').classList.toggle('storm', game.storm);
    $('#share-bar').innerHTML = stats.factions.map((f) => `<i style="width:${((f.tiles / stats.playable) * 100).toFixed(1)}%;background:${PALETTE_HEX[f.color]}"></i>`).join('');
    $('#share-legend').innerHTML = stats.factions
      .map((f) => `<span class="${f.alive ? '' : 'out'}${f.id === human ? ' you' : ''}" style="color:${PALETTE_HEX[f.color]}">${f.name} ${f.tiles}</span>`)
      .join('');
    this.updateGoal();
    this.updatePanels(stats);

    if (!force && this.ui.selected < 0) return;
    $('#send-value').textContent = this.ui.sendFraction >= 1 ? '100 %' : '50 %';
    $('#btn-supply').classList.toggle('on', this.store.supply);
    $('#supply-state').textContent = this.store.supply ? 'ON' : 'OFF';
    const sel = this.ui.selected >= 0 ? game.tiles[this.ui.selected] : null;
    for (const type of ['tower', 'farm']) {
      const btn = $(`#btn-${type}`);
      // The button only takes what the rules will finish, and says why it refuses the rest.
      const option = sel && human >= 0 ? game.buildOption(human, sel.id, type) : { state: 'no', cost: human >= 0 ? game.buildCost(type, human) : 0, need: 0 };
      const state = option.state;
      const why = state === 'short' ? i18n.t('buildShort', { n: option.need }) : state === 'never' ? i18n.t('buildNever') : state === 'ground' ? i18n.t('buildGround') : '';
      btn.disabled = state !== 'now' && state !== 'save' && state !== 'saving';
      btn.classList.toggle('ready', state === 'now');
      btn.classList.toggle('saving', state === 'saving');
      btn.classList.toggle('blocked', Boolean(why));
      $(`#cost-${type}`).textContent = option.cost;
      $(`#why-${type}`).textContent = why;
    }
  }

  /** Remembers an event for the panel on wide screens. `html` may carry coloured kingdom names. */
  note(html, bad = false) {
    if (this.ui.human < 0) return;
    this.events.push({ at: clock(this.game.time), html, bad });
    if (this.events.length > 5) this.events.shift();
  }

  /** Side panels: the own kingdom in numbers, the rivals, and what happened lately. */
  updatePanels(stats) {
    const game = this.game;
    const human = this.ui.human;
    if (human < 0 || $('#panel-own').hidden) return;
    const me = stats.factions[human];
    let growth = 0;
    let towers = 0;
    let farms = 0;
    for (const t of game.tiles) {
      if (t.owner !== human) continue;
      if (t.units < game.cap(t)) growth += game.income(t); // a full field grows no further
      if (t.building === 'tower') towers++;
      else if (t.building === 'farm') farms++;
    }
    $('#own-fields').textContent = me.tiles;
    $('#own-troops').textContent = Math.round(me.units);
    $('#own-growth').textContent = `+${growth.toFixed(1)}/s`;
    $('#own-towers').textContent = towers;
    $('#own-farms').textContent = farms;
    $('#rivals').innerHTML = stats.factions
      .filter((f) => f.id !== human)
      .map((f) => `<div class="${f.alive ? '' : 'out'}"><b style="color:${PALETTE_HEX[f.color]}">${f.name}</b><span>${f.tiles} · ${Math.round(f.units)}</span></div>`)
      .join('');
    const html = this.events.map((e) => `<li class="${e.bad ? 'bad' : ''}"><time>${e.at}</time><span>${e.html}</span></li>`).join('');
    if (html !== this.eventsShown) {
      this.eventsShown = html;
      $('#events').innerHTML = html;
    }
  }

  showResult(won) {
    if (this.mode === 'menu' || this.mode === 'brief') return;
    const game = this.game;
    const m = this.mission;
    const stats = game.humanStats;
    const goals = [won, won && game.time <= m.par, won && stats.lost <= (m.loseLimit ?? 3)];
    const got = goals.filter(Boolean).length;
    if (won && !m.random) {
      this.store.done[m.id] = true;
      this.store.stars[m.id] = Math.max(this.store.stars[m.id] || 0, got);
      this.store.best[m.id] = Math.min(this.store.best[m.id] || Infinity, Math.round(game.time));
      saveStore(this.store);
    }
    const title = $('#result-title');
    title.textContent = i18n.t(won ? 'victory' : 'defeat');
    title.className = `sheet-title big ${won ? 'win' : 'loss'}`;
    const byHold = game.reason === 'hold';
    $('#result-sub').textContent = won ? i18n.t(byHold ? 'victoryHold' : 'victorySub') : i18n.t(byHold ? 'defeatHold' : 'defeatSub', { name: game.factions[game.winner]?.name ?? '' });
    const labels = this.goalLabels(m);
    $('#result-stars').innerHTML = goals.map((g, i) => `<div class="${g ? 'got' : ''}">${star}<span>${labels[i]}</span></div>`).join('');
    $('#result-stats').innerHTML = `<div><b>${clock(game.time)}</b>${i18n.t('time')}</div><div><b>${stats.captured}</b>${i18n.t('fields')}</div><div><b>${stats.lost}</b>${i18n.t('lost')}</div>`;
    const hasNext = won && CAMPAIGN.indexOf(m) >= 0 && CAMPAIGN.indexOf(m) < CAMPAIGN.length - 1;
    $('#btn-next').hidden = !hasNext;
    $('#btn-retry').classList.toggle('primary', !hasNext);
    this.setHint('');
    this.setMode('result');
  }

  // --------------------------------------------------------------- tutorial

  /**
   * Guided steps on the first playthrough of a mission: one short sentence at a time, with the field
   * it is about marked on the board.
   *   basics   (mission 1)  send troops · spread out · attack from several sides · take the castle
   *   cutoff   (mission 2)  cut the outpost off · take it once it has withered · on to the castle
   *   citadel  (mission 3)  reach the citadel · take it from several sides · close the ring
   */
  prepareTutorial(kind) {
    const game = this.game;
    const tut = { kind, step: 0, steps: kind === 'basics' ? 4 : 3, text: null, target: null, flashUntil: 0, until: 0 };
    if (kind === 'basics') {
      // Practice target for step 3: a free hill fort that touches at least two of the player's fields.
      // Until the last step the rival keeps the peace, so nothing disturbs the lesson.
      tut.fort = -1;
      for (const t of game.tiles) {
        if (t.owner >= 0 || t.terrain !== 'hill') continue;
        if (game.flankers(0, t.id).length >= 2 && (tut.fort < 0 || t.units < game.tiles[tut.fort].units)) tut.fort = t.id;
      }
      game.truce = true;
      game.reserved = tut.fort >= 0 ? new Set([tut.fort]) : null;
    } else if (kind === 'cutoff') {
      // The rival's tower field is its outpost; the rival field next to it is the link to its castle.
      const outpost = game.tiles.find((t) => t.owner === 1 && t.building === 'tower');
      const link = outpost && outpost.neighbors.map((n) => game.tiles[n]).find((o) => o.owner === 1);
      if (!link) return null;
      tut.outpost = outpost.id;
      tut.link = link.id;
    } else if (game.objective.type !== 'hold') return null;
    return tut;
  }

  /** Mission 1, step 1: a free field next to the player's land that half the castle garrison can take. */
  tutorialTarget() {
    const game = this.game;
    const tut = this.tutorial;
    if (tut.target && game.tiles[tut.target[tut.target.length - 1]].owner < 0) return tut.target;
    tut.target = null;
    const castle = game.factions[0].castle;
    const amount = game.sendAmount(castle, this.ui.sendFraction);
    for (const id of game.reachable(0, castle)) {
      const t = game.tiles[id];
      if (t.owner >= 0 || t.terrain === 'hill' || t.terrain === 'citadel') continue;
      const path = game.findPath(0, castle, id);
      const fc = game.forecast(id, [{ owner: 0, from: path[path.length - 2], units: amount }]);
      if (!fc.holds) {
        tut.target = path;
        break;
      }
    }
    return tut.target;
  }

  /** Whether a combined attack of all the player's neighbouring fields would take `tile` right now. */
  assaultWins(tile) {
    const game = this.game;
    if (tile.pools.some((p) => p.owner === 0)) return true; // already under way
    const extra = [];
    for (const id of game.flankers(0, tile.id)) {
      const units = game.sendAmount(id, this.ui.sendFraction);
      if (units >= 1) extra.push({ owner: 0, from: id, units });
    }
    return extra.length >= 2 && !game.forecast(tile.id, extra).holds;
  }

  runTutorial(now) {
    const game = this.game;
    const tut = this.tutorial;
    const ui = this.ui;
    ui.tutorialPath = null;
    ui.tutorialMark = null;
    // The guide stays on the board during the planning pause: that is when there is time to read it.
    if ((this.mode !== 'play' && this.mode !== 'pause') || game.phase !== 'running') return;
    if (now < tut.flashUntil) return; // the "done" tick stays for a moment
    const stats = game.humanStats;
    const rival = game.factions[1].name;

    const say = (key, vars) => {
      const text = i18n.t(key, vars);
      if (tut.text === text) return;
      tut.text = text;
      this.setHint(text, `${tut.step + 1}/${tut.steps}`);
    };
    const done = () => {
      tut.step++;
      tut.text = null;
      tut.flashUntil = now + 0.9;
      this.sfx.play('build');
      this.setHint(i18n.t('tutDone'));
      $('#hint').classList.add('ok');
    };
    /** The last sentence of a guide stays for a while and then makes room. */
    const fade = (seconds) => {
      if (!tut.until) tut.until = game.time + seconds;
      else if (game.time > tut.until) {
        this.setHint('');
        this.tutorial = null;
      }
    };

    if (tut.kind === 'basics') {
      if (tut.step === 0) {
        if (stats.captured >= 1) return done();
        say('tut0');
        // Show the gesture while the player is not already doing it and no troops are on their way.
        const path = this.tutorialTarget();
        if (path && !ui.dragging && ui.selected < 0 && !game.armies.some((a) => a.owner === 0)) {
          ui.tutorialPath = path;
          ui.tutorialMark = { tile: path[path.length - 1] };
        }
      } else if (tut.step === 1) {
        const n = Math.min(2, stats.captured - 1);
        if (n >= 2) return done();
        say('tut1', { n });
      } else if (tut.step === 2) {
        const fort = tut.fort >= 0 ? game.tiles[tut.fort] : null;
        // Done once the fort is the player's; an earlier two-sided attack elsewhere does not count,
        // because this step is about the double tap.
        if (!fort || fort.owner === 0) {
          game.truce = false;
          game.reserved = null;
          return done();
        }
        const ready = this.assaultWins(fort);
        say(ready ? 'tut2' : 'tut2wait');
        ui.tutorialMark = { tile: fort.id, taps: ready, ready };
      } else {
        say('tut3', { name: rival });
        fade(25);
      }
      return;
    }

    if (tut.kind === 'cutoff') {
      const outpost = game.tiles[tut.outpost];
      const link = game.tiles[tut.link];
      if (tut.step < 2 && outpost.owner === 0) {
        // Stormed or starved out: either way the outpost is gone.
        tut.step = 1;
        return done();
      }
      if (tut.step === 0) {
        if (!outpost.supplied) return done();
        say('tutC0', { name: rival });
        ui.tutorialMark = { tile: link.id };
      } else if (tut.step === 1) {
        if (outpost.supplied) {
          // The rival has restored the link.
          say('tutC1b');
          ui.tutorialMark = { tile: link.owner === 0 ? outpost.id : link.id };
        } else {
          say('tutC1');
          ui.tutorialMark = { tile: outpost.id };
        }
      } else {
        say('tutC2', { name: rival });
        fade(25);
      }
      return;
    }

    // citadel
    const prize = game.tiles[game.objective.tile];
    const ring = prize.neighbors.map((n) => game.tiles[n]).filter((t) => t.passable);
    const mine = ring.filter((t) => t.owner === 0).length;
    if (tut.step === 0) {
      if (prize.owner === 0 || mine >= 2) return done();
      say('tutZ0', { n: mine });
      ui.tutorialMark = { tile: prize.id };
    } else if (tut.step === 1) {
      if (prize.owner === 0) return done();
      const ready = this.assaultWins(prize);
      say(ready ? 'tutZ1' : 'tutZ1wait');
      ui.tutorialMark = { tile: prize.id, taps: ready, ready };
    } else if (prize.owner !== 0) {
      // Lost again: back to taking it.
      tut.step = 1;
      tut.text = null;
      tut.until = 0;
    } else if (game.hold.secure) {
      say('tutZ3');
      fade(20);
    } else {
      tut.until = 0;
      say('tutZ2', { n: mine, m: ring.length });
      const missing = ring.find((t) => t.owner !== 0);
      if (missing) ui.tutorialMark = { tile: missing.id };
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
