// App shell: screens, HUD, game loop. The rules live in src/sim, the picture in src/render.

import { Game } from './sim/game.js';
import { TurnGame } from './sim/turns.js';
import { CAMPAIGN as CAMPAIGN_MISSIONS, PROBES, SHOWCASE } from './sim/missions.js';
import { SKIRMISH } from './sim/maps.js';
import { TURN_RULES } from './sim/rules.js';
import { TurnPlay } from './ui/turnplay.js';
import { DioramaRenderer } from './render/renderer.js';
import { PALETTE_HEX } from './render/models.js';
import { Overlay, FLOAT_SECONDS, decimal } from './ui/overlay.js';
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
// Branch runden: everything the menu starts is played turn by turn (docs/RUNDEN-PLAN.md). The rules
// of the real-time game stay in the code and keep their tests; only the match behind the menu still
// runs on them. `parTurns` of a mission is its goal for the second star; `turnsTuned` marks the maps
// whose numbers have been measured for turns.
const inTurns = (m) => Object.freeze({ ...m, turnMode: true });
const CAMPAIGN = CAMPAIGN_MISSIONS.map(inTurns);
const FREE_PLAY = SKIRMISH.filter((m) => m.random).map(inTurns);
const ALL_MISSIONS = [...CAMPAIGN, ...FREE_PLAY];
// Missions on trial (docs/UMSETZUNG-RUNDEN.md): not in the menu, each has its own link …?probe=<id>.
const PROBE_MISSIONS = PROBES.map(inTurns);
// While maps are still untuned, every mission is open: a mission that cannot be won yet must not
// lock the ones after it away from being tried.
const OPEN_FOR_TESTING = ALL_MISSIONS.some((m) => !m.turnsTuned);
/** Turns the citadel has to be held in a mission with that goal (as TurnGame works it out). */
const holdTurns = (m) => Math.ceil(m.objective.seconds / (m.turns?.seconds ?? TURN_RULES.seconds));
// Figure showcase: what a tap does (play as usual, or set a side), how many troops it sets, and how
// fast the time runs there.
const LAB_TOOLS = ['order', 'knight', 'troll', 'wild', 'own', 'rival', 'free'];
const LAB_AMOUNTS = [1, 5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 99];
const LAB_SPEEDS = [0.25, 0.5, 1, 3];
const LAB_SPEED_LABEL = { 0.25: '¼×', 0.5: '½×', 1: '1×', 3: '3×' };

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
      march: null, // turn mode: the command whose troops are marching (see TurnPlay._show)
      floaters: [], // turn mode: what the own fields just gained, floating up: { tile, units, at }
      fieldInfo: null, // turn mode: growth of the selected own field and why: { tile, text, bad }
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
    this.lab = null; // the figure showcase while it is open: { tool, amount, speed, paused, inspect }
    this.turns = null; // turn mode: the commands, the bar and the playback of the rivals' moves
    this.flashTimer = 0;

    this.buildMenu();
    this.bind();
    this.input = attachInput($('#overlay'), this);
    this.applyLanguage();
    this.resize();
    this.startAttract();
    // The figure showcase has its own link and is not in the menu: …/index.html?schau
    if (new URLSearchParams(location.search).has('schau')) this.startLab();
    // So does every mission on trial: …/index.html?probe=trollwald opens its briefing.
    // …?probe=kampagne opens the first mission of the campaign on trial.
    const wanted = new URLSearchParams(location.search).get('probe');
    const probe = wanted === 'kampagne' ? PROBE_MISSIONS[0] : PROBE_MISSIONS.find((m) => m.id === wanted);
    // …&ritter: Ritter Kunibert waits at the person's castle in the missions on trial (turn mode only).
    // A trial with him counts nothing in the saved progress.
    this.knightTrial = Boolean(probe) && new URLSearchParams(location.search).has('ritter');
    if (probe) this.openMission(probe);
    $('#say').addEventListener('click', () => this.hush());
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
    // The side panels belong to a running or paused match of the player. In the figure showcase its
    // own panel takes the place of the one on the left.
    const panels = (mode === 'play' || mode === 'pause') && this.ui.human >= 0;
    $('#panel-own').hidden = !panels || Boolean(this.lab);
    $('#panel-rivals').hidden = !panels;
    this.el.toggleAttribute('data-lab', Boolean(this.lab));
    this.el.toggleAttribute('data-turns', Boolean(this.turns));
    $('#turnbar').hidden = !(this.turns && mode === 'play');
    $('#how-turns').hidden = !this.turns;
    $('#how-time').hidden = Boolean(this.turns);
    // Turn mode has no pause: the sheet is the help.
    const head = $('#pause-title');
    head.dataset.t = this.turns ? 'options' : 'pause';
    head.textContent = i18n.t(head.dataset.t);
    if (this.turns && mode === 'play') this.turns.hud();
    $('#lab').hidden = !this.lab || behindSheet;
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
    this.lab = null;
    this.turns = null;
    this.mission = null;
    this.tutorial = null;
    this.ui.human = -1;
    this.ui.assault = null;
    this.ui.tutorialPath = null;
    this.ui.tutorialMark = null;
    this.ui.goalMark = null;
    this.sayQueue = null;
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
    const hold = mission.objective?.type === 'hold';
    const inTurnMode = Boolean(mission.turnMode);
    $('#brief-text').textContent = inTurnMode && mission.briefTurns ? i18n.pick(mission.briefTurns).replace('{n}', holdTurns(mission)) : i18n.pick(mission.brief);
    $('#brief-lesson').textContent = i18n.pick(mission.lesson);
    // Where the captain explains the new rule during the match, the briefing stays short.
    $('#brief-lesson').parentElement.hidden = Boolean(mission.talk);
    const perks = this.perksFor(mission);
    $('#brief-perks').hidden = !perks.length;
    $('#brief-perks').textContent = i18n.t('briefPerks', { list: perks.map((p) => i18n.t(`perk_${p}`)).join(', ') });
    $('#brief-goal').textContent = mission.objective?.type === 'lair' ? i18n.t('goalLairLong', { n: mission.turns?.turnLimit ?? TURN_RULES.turnLimit })
      : mission.objective?.type === 'take' ? (mission.turns?.turnLimit ? i18n.t('goalTakeLongN', { n: mission.turns.turnLimit }) : i18n.t('goalTakeLong'))
      : !hold ? i18n.t('goalConquerLong')
      : inTurnMode ? i18n.t('goalCitadelLongTurns', { n: holdTurns(mission) })
      : i18n.t('goalCitadelLong', { s: mission.objective.seconds });
    $('#brief-stars').innerHTML = this.goalLabels(mission)
      .map((label) => `<div>${star}<span>${label}</span></div>`)
      .join('');
    this.setMode('brief');
  }

  startMission(mission, seed) {
    this.clearTimers();
    this.sfx.unlock();
    this.select(-1);
    this.lab = null;
    this.mission = mission;
    this.seed = seed ?? (mission.random ? (Math.random() * 1e9) | 0 : mission.seed);
    const Rules = mission.turnMode ? TurnGame : Game;
    this.game = new Rules({
      mission,
      seed: this.seed,
      difficulty: this.store.difficulty,
      human: 0,
      playerColor: this.store.color,
      // Turn mode: the supply always runs (its switch is gone there); real time keeps the setting.
      autoSupply: mission.turnMode ? true : this.store.supply,
      wide: this.wide(),
      perks: this.perksFor(mission),
      hero: this.knightTrial && mission.turnMode && mission.probe ? 'knight' : null,
    });
    this.turns = mission.turnMode ? new TurnPlay(this) : null;
    // The captain's lines: which were said already, and which wait for their turn on screen.
    this.said = new Set();
    this.sayQueue = [];
    this.hush();
    // For the end of the match: how long it was played, and how long the person took for each move.
    this.playMs = 0;
    this.moveTimes = [];
    this.raidHints = 0;
    // A goal on the map (the great cave) stays marked until it is taken.
    // In a mission with `goalSign` the castle of the first rival carries the same sign.
    const goalTile = this.game.objective.type === 'lair' || this.game.objective.type === 'take' ? this.game.objective.tile
      : mission.goalSign ? this.game.factions.find((f) => !f.wild && f.id !== 0)?.castle ?? -1
      : -1;
    this.ui.goalMark = goalTile >= 0 ? { tile: goalTile, text: i18n.t('goalMark') } : null;
    this.ui.human = 0;
    this.ui.assault = null;
    this.ui.turnPreview = null;
    this.ui.march = null;
    this.ui.floaters = [];
    this.ui.fieldInfo = null;
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
    else if (mission.talk?.start) {
      // The captain says why we are here; the new rule follows when it first matters.
      this.setHint('');
      this.later(1400, () => this.speak('start'));
    } else if (mission.lesson) {
      // The new rule of the mission stays on screen for the opening.
      this.setHint(i18n.pick(mission.lesson));
      this.later(16000, () => this.setHint(''));
    } else if (this.turns) this.flash(i18n.t('turnFirst'), 9000);
    else this.setHint('');
    this.banner(i18n.t(this.game.objective.type === 'lair' ? 'introLair' : `intro${this.game.factions.length}`), '#f2c36b', 2600);
  }

  /**
   * Improvements that count in `mission`: what the person picked after the earlier missions of the
   * campaign on trial. The missions of the menu and free play never have any.
   */
  perksFor(mission) {
    if (!mission.probe) return [];
    return PROBE_MISSIONS.filter((m) => m.no < mission.no).map((m) => this.store.perks[m.id]).filter(Boolean);
  }

  /**
   * The captain speaks: a line of the mission (mission.talk[key]) appears as a speech bubble at the own
   * castle. Every line is said once per match; several wait for each other.
   */
  speak(key) {
    const line = this.mission?.talk?.[key];
    if (!line || !this.said || this.said.has(key) || this.game.phase !== 'running') return;
    this.said.add(key);
    this.sayQueue.push(line);
  }

  /**
   * The captain's lines that depend on where the person stands: `meet` once an own field touches a
   * rival's field, `near` once one touches a rival's castle.
   */
  talkAtBorders() {
    const talk = this.mission?.talk;
    if (!talk || !this.said) return;
    const game = this.game;
    const me = this.ui.human;
    if (talk.meet && !this.said.has('meet')) {
      const rival = (id) => game.tiles[id].owner >= 0 && game.tiles[id].owner !== me && !game.isWild(game.tiles[id].owner);
      if (game.tiles.some((t) => t.owner === me && t.neighbors.some(rival))) this.speak('meet');
    }
    if (talk.near && !this.said.has('near')) {
      const castles = game.factions.filter((f) => f.alive && !f.wild && f.id !== me).map((f) => game.tiles[f.castle]);
      if (castles.some((c) => c.neighbors.some((n) => game.tiles[n].owner === me))) this.speak('near');
    }
  }

  /** Closes the speech bubble; the next line that waits follows a moment later. */
  hush() {
    this.saying = null;
    $('#say').hidden = true;
    this.sayAfter = (this.last || 0) + 0.6;
  }

  /** Called every frame: shows the next waiting line, keeps the bubble at the castle, and closes it in time. */
  updateSay(now) {
    const el = $('#say');
    if (this.mode !== 'play' || !this.sayQueue) {
      if (!el.hidden) el.hidden = true;
      return;
    }
    // A line stays long enough to be read; once the next one waits, it makes room after a short while.
    if (this.saying && (now >= this.saying.until || (this.sayQueue.length && now >= this.saying.since + 3))) this.hush();
    if (!this.saying && this.sayQueue.length && now >= (this.sayAfter || 0)) {
      const text = i18n.pick(this.sayQueue.shift());
      this.saying = { since: now, until: now + 3.5 + text.length * 0.055 };
      $('#say-who').textContent = i18n.t('whoCaptain');
      $('#say-text').textContent = text;
    }
    if (!this.saying) return;
    el.hidden = false;
    // Where the castle stands in the lower half of the screen (a phone held upright), the fields in front
    // of it lie above: the bubble then hangs below the castle, if it fits above the bars at the bottom.
    // Otherwise above the castle where there is room, else below it; never off the screen.
    const home = this.game.tiles[this.game.factions[this.ui.human]?.castle];
    if (!home) return;
    const p = this.renderer.tileAnchor(home);
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const W = this.el.clientWidth;
    const left = Math.max(8, Math.min(W - w - 8, p.x - w / 2));
    const bar = $('#turnbar');
    const floor = (bar && !bar.hidden && bar.offsetHeight ? bar.offsetTop : $('#bottom').offsetTop) - 8;
    const fitsBelow = p.y + 22 + h <= floor;
    const above = !(fitsBelow && p.y > this.el.clientHeight / 2) && p.y - h - 58 > 54;
    el.classList.toggle('below', !above);
    el.style.left = `${left}px`;
    el.style.top = `${above ? p.y - h - 58 : p.y + 22}px`;
    el.style.setProperty('--tail', `${Math.max(16, Math.min(w - 16, p.x - left))}px`);
  }

  /** A hint that goes away by itself after `ms`, unless another one replaces it. */
  flash(text, ms) {
    this.setHint(text);
    clearTimeout(this.flashTimer);
    const shown = $('#hint').textContent;
    this.flashTimer = setTimeout(() => {
      if ($('#hint').textContent === shown) this.setHint('');
    }, ms);
  }

  // ------------------------------------------------------- figure showcase

  /**
   * Figure showcase (link ?schau): a test island on which monsters and troops are set by hand. The
   * time can be stopped, slowed down and stepped; the panel shows the values of the field last tapped.
   * The tool, the number of troops and the pace stay when it is started again.
   */
  startLab() {
    this.clearTimers();
    this.sfx.unlock();
    this.select(-1);
    const before = this.lab;
    this.lab = { tool: before?.tool ?? 'order', amount: before?.amount ?? 20, speed: before?.speed ?? 1, paused: false, inspect: -1 };
    this.turns = null;
    this.mission = SHOWCASE;
    this.tutorial = null;
    this.game = new Game({ mission: SHOWCASE, human: 0, playerColor: this.store.color, wide: this.wide() });
    this.ui.human = 0;
    this.ui.assault = null;
    this.ui.tutorialPath = null;
    this.ui.tutorialMark = null;
    this.ui.goalMark = null;
    this.sayQueue = null;
    this.events = [];
    // The knight waits at the player's castle, so he can be seen without setting anything.
    this.game.placeHero(this.game.factions[0].castle, 'knight');
    this.buildLab();
    this.setMode('play');
    this.setHint('');
    this.updateHud(true);
  }

  /** Side that a tap sets with this tool: -1 free land, null for "orders". */
  labOwner(tool) {
    const game = this.game;
    return tool === 'wild' || tool === 'troll' ? game.wild : tool === 'own' ? this.ui.human : tool === 'rival' ? 1 - this.ui.human : tool === 'free' ? -1 : null;
  }

  /** Whether a tap on the board sets troops instead of giving orders. */
  placing() {
    return Boolean(this.lab && this.lab.tool !== 'order' && this.canCommand());
  }

  /** The panel's buttons. The kingdoms are named after the colours of this showcase. */
  buildLab() {
    const game = this.game;
    $('#lab-tools').innerHTML = LAB_TOOLS.map((tool) => {
      const owner = this.labOwner(tool);
      const f = owner >= 0 ? game.factions[owner] : null;
      const label = f && !f.wild ? f.name : i18n.t(`lab_${tool}`);
      const dot = owner === null ? '' : `<i style="--c:${f ? PALETTE_HEX[f.color] : '#b9c9c6'}"></i>`;
      return `<button data-tool="${tool}">${dot}${label}</button>`;
    }).join('');
    $('#lab-time').innerHTML = [
      `<button data-time="pause" aria-label="${i18n.t('pause')}"><svg><use href="#i-pause"/></svg></button>`,
      ...LAB_SPEEDS.map((s) => `<button data-time="${s}">${LAB_SPEED_LABEL[s]}</button>`),
      `<button data-time="step">${i18n.t('labStep')}</button>`,
    ].join('');
    this.refreshLab();
  }

  refreshLab() {
    const lab = this.lab;
    if (!lab) return;
    for (const b of document.querySelectorAll('#lab-tools button')) b.classList.toggle('on', b.dataset.tool === lab.tool);
    for (const b of document.querySelectorAll('#lab-time button')) {
      if (b.dataset.time === 'pause') {
        b.classList.toggle('on', lab.paused);
        b.querySelector('use').setAttribute('href', lab.paused ? '#i-play' : '#i-pause');
      } else if (b.dataset.time !== 'step') b.classList.toggle('on', !lab.paused && Number(b.dataset.time) === lab.speed);
    }
    $('#lab-amount').textContent = lab.amount;
    this.updateLabInfo();
  }

  /** A tap with a placing tool: the field gets that side and the chosen number of troops. */
  place(id) {
    const lab = this.lab;
    if (!lab || id < 0 || !this.canCommand()) return;
    const t = this.game.tiles[id];
    lab.inspect = id;
    if (!t.passable) return;
    if (lab.tool === 'knight') {
      // The knight stands on any field of a kingdom, its castle too; a second tap takes him off.
      if (this.game.placeHero(id, 'knight')) this.sfx.play('build', 0.5);
      else this.say(id, i18n.t('labKnightNo'));
      this.updateLabInfo();
      return;
    }
    if (t.castle >= 0) {
      this.say(id, i18n.t('labCastleNo'));
      return;
    }
    const done = lab.tool === 'troll' ? this.game.placeLair(id, 'troll', lab.amount) : this.game.place(this.labOwner(lab.tool), id, lab.amount);
    if (done) this.sfx.play('build', 0.5);
    this.updateLabInfo();
  }

  /** Every tap on a field: the showcase shows its values. */
  inspect(id) {
    if (!this.lab || id < 0) return;
    this.lab.inspect = id;
    this.updateLabInfo();
  }

  /** The field whose values the panel shows: the selected one, the one previewed, else the last tapped. */
  labTile() {
    const ui = this.ui;
    if (ui.selected >= 0) return ui.selected;
    if (ui.assault) return ui.assault.target;
    return this.lab.inspect;
  }

  updateLabInfo() {
    const lab = this.lab;
    if (!lab) return;
    const game = this.game;
    const el = $('#lab-info');
    const id = this.labTile();
    const t = id >= 0 ? game.tiles[id] : null;
    if (!t || !t.passable) {
      const html = `<p>${i18n.t('labHint')}</p>`;
      if (el.innerHTML !== html) el.innerHTML = html;
      return;
    }
    const f = t.owner >= 0 ? game.factions[t.owner] : null;
    const color = (side) => PALETTE_HEX[side.color];
    const title = f && f.wild && t.beast ? i18n.t(`${t.beast}Name`) : f ? this.nameOf(f) : null;
    const who = f ? `<b style="color:${color(f)}">${title}</b>` : `<b>${i18n.t('labFreeLand')}</b>`;
    const ground = t.castle >= 0 ? i18n.t('labCastle') : t.cave ? i18n.t('ground_cave') : i18n.t(`ground_${t.terrain}`);
    const n = Math.floor(t.units + 1e-6);
    const cover = `×${game.defense(t).toFixed(2)}`;
    // Attackers at the edges: from how many sides and how many in all.
    const foes = t.pools.filter((p) => p.owner !== t.owner);
    const sides = new Set(foes.map((p) => p.from)).size;
    const sideText = sides === 1 ? i18n.t('labSide1') : i18n.t('labSides', { n: sides });
    const rows = [];
    if (f && f.wild) {
      // A lair breeds and raids; any other field of the wilds only holds what stands on it.
      const lair = t.lair;
      const L = lair ? game.R[lair.kind] : null;
      rows.push([i18n.t('labStrength'), lair ? `${n} / ${lair.size}` : n]);
      if (lair) rows.push([i18n.t('labBreed'), t.units >= lair.size - 0.01 ? i18n.t('full') : `+${game.income(t).toFixed(2)}/s`]);
      rows.push([i18n.t('labAttack'), L ? i18n.t('labRaid', { n: L.raid, s: L.every }) : i18n.t('labNone')]);
      rows.push([i18n.t('labReach'), L ? i18n.t('labReachNear') : '–']);
      rows.push([i18n.t('labCover'), cover]);
      let plan;
      if (sides) plan = i18n.t('labPlanDefend', { sides: sideText });
      else if (lair) {
        // Seconds as on the countdown above the cave: real seconds at the pace that is set.
        const s = Math.max(0, Math.ceil((lair.at - game.time) / (this.ui.pace || 1) - 1e-6));
        const prey = lair.marked && lair.target >= 0 ? game.tiles[lair.target] : null;
        const side = prey && prey.owner >= 0 ? game.factions[prey.owner] : null;
        if (side) plan = i18n.t('labPlanRaidAt', { who: `<b style="color:${color(side)}">${this.nameOf(side)}</b>`, s });
        else if (lair.marked || game.prey(t) < 0) plan = i18n.t('labPlanNoPrey');
        else plan = i18n.t('labPlanRaidIn', { s });
      } else plan = i18n.t('labPlanHold');
      rows.push([i18n.t('labPlan'), plan]);
    } else {
      rows.push([i18n.t('panelTroops'), f ? `${n} / ${game.cap(t)}` : n]);
      const growth = !f ? i18n.t('labNoGrowth') : !t.supplied ? i18n.t('labCut') : t.units >= game.cap(t) - 0.01 ? i18n.t('full') : `+${game.income(t).toFixed(2)}/s`;
      rows.push([i18n.t('panelGrowth'), growth]);
      rows.push([i18n.t('labCover'), cover]);
      if (t.hero === 'knight') rows.push([i18n.t('labHero'), i18n.t('labKnight', { n: game.R.knightEdge, m: game.R.frontage })]);
      if (sides) {
        const units = Math.round(foes.reduce((s, p) => s + p.units, 0));
        rows.push([i18n.t('labFight'), i18n.t('labFightText', { sides: sideText, u: units })]);
      }
    }
    const html = `<div>${who} · ${ground}</div><dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
    if (el.innerHTML !== html) el.innerHTML = html;
  }

  /** Name of a side as shown on screen; the wilds are named in the player's language. */
  nameOf(f) {
    // A mission against one kind of monsters calls them by their name ("TROLLE").
    return f.wild ? (this.mission?.wildName ? i18n.pick(this.mission.wildName) : i18n.t('wildName')) : f.name;
  }

  /** Wide screens get a landscape island, phones in portrait a tall one. */
  wide() {
    return window.innerWidth > window.innerHeight * 1.15;
  }

  unlocked(mission) {
    if (OPEN_FOR_TESTING) return true;
    const i = CAMPAIGN.indexOf(mission);
    return i <= 0 || Boolean(this.store.done[CAMPAIGN[i - 1].id]);
  }

  /** A text of the turn mode where there is one (key + "Turns"), else the one of the real-time game. */
  tt(key, vars) {
    if (this.turns) {
      const own = `${key}Turns`;
      const text = i18n.t(own, vars);
      if (text !== own) return text;
    }
    return i18n.t(key, vars);
  }

  goalLabels(mission) {
    const second = mission.turnMode ? i18n.t('goalTurns', { n: mission.parTurns }) : i18n.t('goalTime', { t: clock(mission.par) });
    return [i18n.t('goalWin'), second, i18n.t('goalHold', { n: mission.loseLimit ?? 3 })];
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
    const untuned = `<span class="tag">${i18n.t('untuned')}</span>`;
    $('#untuned-note').hidden = !OPEN_FOR_TESTING;
    $('#missions').innerHTML = CAMPAIGN.map((m) => {
      const open = this.unlocked(m);
      const got = this.store.stars[m.id] || 0;
      const stars = `<span class="mini-stars">${[0, 1, 2].map((k) => `<span class="${k < got ? 'got' : ''}">${star}</span>`).join('')}</span>`;
      const no = open ? m.no : '<svg><use href="#i-lock"/></svg>';
      const blurb = open ? `${i18n.pick(m.blurb)}${m.turnsTuned ? '' : untuned}` : i18n.t('locked');
      return `<button data-mission="${m.id}" class="${open ? '' : 'locked'}"><span class="no">${no}</span><span class="txt"><span class="name">${i18n.pick(m.name)}</span><span class="blurb">${blurb}</span></span>${open ? stars : ''}</button>`;
    }).join('');
    $('#skirmish').innerHTML = FREE_PLAY.map(
      (m) => `<button data-mission="${m.id}"><span class="no">?</span><span class="txt"><span class="name">${i18n.pick(m.name)}</span><span class="blurb">${i18n.pick(m.blurb)}${m.turnsTuned ? '' : untuned}</span></span></button>`,
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
      const mission = ALL_MISSIONS.find((m) => m.id === b.dataset.mission);
      if (mission && this.unlocked(mission)) this.openMission(mission);
    };
    $('#missions').addEventListener('click', pick);
    $('#skirmish').addEventListener('click', pick);
    $('#btn-undo').addEventListener('click', () => this.undo());
    $('#btn-endturn').addEventListener('click', () => this.endMove());
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

    const again = () => (this.lab ? this.startLab() : this.startMission(this.mission, this.mission.random ? this.seed : undefined));
    $('#btn-view').addEventListener('click', () => this.renderer.resetView());
    $('#btn-turn').addEventListener('click', () => this.turnView());
    $('#btn-pause').addEventListener('click', () => this.togglePause());
    $('#btn-continue').addEventListener('click', () => this.setMode('play'));
    $('#btn-options').addEventListener('click', () => this.setMode('options'));
    $('#btn-resume').addEventListener('click', () => this.setMode('play'));
    $('#btn-restart').addEventListener('click', again);
    $('#btn-quit').addEventListener('click', () => this.startAttract());
    $('#btn-retry').addEventListener('click', again);
    $('#btn-menu').addEventListener('click', () => this.startAttract());
    $('#btn-log').addEventListener('click', async () => {
      const b = $('#btn-log');
      try {
        await navigator.clipboard.writeText(this.protocol());
        b.textContent = i18n.t('copied');
      } catch {
        b.textContent = i18n.t('copyFailed');
      }
    });
    $('#result-reward').addEventListener('click', (e) => {
      const b = e.target.closest('[data-perk]');
      if (!b || !this.mission?.reward?.choice) return;
      this.store.perks[this.mission.id] = b.dataset.perk;
      saveStore(this.store);
      this.sfx.play('select');
      this.showReward(this.mission.reward);
    });
    $('#btn-next').addEventListener('click', () => {
      const chain = this.mission.probe ? PROBE_MISSIONS : CAMPAIGN;
      const next = chain[chain.indexOf(this.mission) + 1];
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

    // Figure showcase: tool, number of troops, time.
    $('#lab-tools').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !this.lab) return;
      this.input.cancel(); // a selection or an armed attack belongs to the tool before
      this.lab.tool = b.dataset.tool;
      this.sfx.play('select');
      this.refreshLab();
    });
    for (const b of document.querySelectorAll('#lab [data-step]')) {
      b.addEventListener('click', () => {
        if (!this.lab) return;
        const i = LAB_AMOUNTS.indexOf(this.lab.amount) + Number(b.dataset.step);
        this.lab.amount = LAB_AMOUNTS[Math.max(0, Math.min(LAB_AMOUNTS.length - 1, i))];
        this.refreshLab();
      });
    }
    $('#lab-time').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      const lab = this.lab;
      if (!b || !lab) return;
      const what = b.dataset.time;
      if (what === 'pause') lab.paused = !lab.paused;
      else if (what === 'step') {
        // One second forward, then it stands still again.
        lab.paused = true;
        if (this.game.phase === 'running') this.game.step(1);
      } else {
        lab.speed = Number(what);
        lab.paused = false;
      }
      this.refreshLab();
    });

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      // In turn mode nothing runs while the person is away, so there is nothing to pause.
      if (!document.hidden || this.mode !== 'play' || this.turns) return;
      if (this.lab) {
        this.lab.paused = true;
        this.refreshLab();
      } else this.setMode('pause');
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Drops the selection, the preview and a combined attack that was armed by a first tap.
        this.input.cancel();
      } else if ((e.key === ' ' || e.key.toLowerCase() === 'p') && this.lab && this.mode === 'play') {
        e.preventDefault();
        this.lab.paused = !this.lab.paused; // in the showcase the space bar stops and starts the time
        this.refreshLab();
      } else if (this.turns && e.key === 'Enter' && this.mode === 'play') {
        e.preventDefault();
        this.endMove(); // ends the move, or skips the rivals' moves
      } else if (this.turns && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && this.mode === 'play') {
        e.preventDefault();
        this.undo();
      } else if (this.turns && e.key.toLowerCase() === 'z' && !e.ctrlKey && !e.metaKey && !e.altKey && this.mode === 'play') {
        this.undo();
      } else if ((e.key === ' ' || e.key.toLowerCase() === 'p') && (this.mode === 'play' || this.mode === 'pause' || this.mode === 'options')) {
        e.preventDefault();
        this.togglePause();
      } else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey && (this.mode === 'play' || this.mode === 'pause')) {
        this.turnView();
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
    let top = playing ? $('#top').offsetHeight - 6 : 0;
    let left = 0;
    let right = 0;
    const lab = $('#lab');
    if (playing && this.lab && !lab.hidden) {
      // The showcase panel stands beside the island on wide screens and above it on phones. Beside it,
      // the island also keeps clear of the panel on the right.
      if (lab.offsetWidth < w * 0.5) {
        left = lab.offsetLeft + lab.offsetWidth;
        const rivals = $('#panel-rivals');
        if (!rivals.hidden && rivals.offsetWidth) right = w - rivals.offsetLeft;
      } else top = lab.offsetTop + lab.offsetHeight;
    }
    // In turn mode the bar with the move stands above the buttons and the island keeps clear of it.
    const bar = $('#turnbar');
    const below = playing ? $('#bottom').offsetHeight - 12 + (this.turns && !bar.hidden ? bar.offsetHeight + 4 : 0) : 0;
    this.renderer.setInsets(top, below, left, right);
  }

  // --------------------------------------------------------------- commands

  /** Orders are taken while the match runs and during the planning pause. */
  canCommand() {
    if (this.turns) return this.mode === 'play' && this.turns.myMove();
    return (this.mode === 'play' || this.mode === 'pause') && this.game.phase === 'running' && this.ui.human >= 0;
  }

  /** Milliseconds for the second tap of a combined attack. Turn mode has no clock, so more. */
  tapWindow() {
    return this.turns ? 10000 : 2500;
  }

  /** Turns the view on by one side of the island (six views in all). A drag in progress is dropped. */
  turnView() {
    if (!this.game || (this.mode !== 'play' && this.mode !== 'pause')) return;
    this.input.cancel();
    this.renderer.turnBy(1);
    this.sfx.play('select');
  }

  /** Turn mode: takes back the last command of this move. */
  undo() {
    if (!this.turns || this.mode !== 'play') return;
    this.input.cancel();
    if (this.turns.undo()) this.sfx.play('select');
    else if (this.turns.myMove()) this.flash(i18n.t('noUndo'), 2500);
    this.updateHud(true);
  }

  /** Turn mode: ends the move; while the rivals move, the same button plays the rest at once. */
  endMove() {
    if (!this.turns || this.mode !== 'play') return;
    this.input.cancel();
    if (this.turns.busy) this.turns.skip();
    else this.turns.endMove(this.last);
    this.updateHud(true);
  }

  /**
   * Pause button, space bar and P: into the planning pause and back into the match. In the figure
   * showcase the button opens the sheet with help, restart and the way back to the menu; the time
   * there has buttons of its own.
   */
  togglePause() {
    // The showcase and the turn mode need no planning pause: the button opens the sheet.
    if (this.lab || this.turns) this.setMode(this.mode === 'play' ? 'options' : 'play');
    else if (this.mode === 'play') this.setMode('pause');
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
    if (this.turns) {
      const problem = this.canCommand() ? this.turns.order(from, to, this.ui.sendFraction) : null;
      if (problem) this.refuse(problem === 'commands' ? from : to, problem);
      this.select(-1);
      this.updateHud(true);
      return;
    }
    const problem = this.game.sendProblem(this.ui.human, from, to, this.ui.sendFraction);
    if (problem) this.refuse(from, problem);
    else this.game.send(this.ui.human, from, to, this.ui.sendFraction);
    this.select(-1);
  }

  /** Combined attack: every own field next to the target sends at once. */
  assault(target) {
    if (!this.canCommand() || target < 0) return;
    this.select(-1);
    if (this.turns) {
      const problem = this.turns.assault(target, this.ui.sendFraction);
      if (problem) this.refuse(target, problem);
      this.updateHud(true);
      return;
    }
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
    // Turn mode: troops of the last command that are still marching arrive first.
    if (this.turns) this.turns.flush();
    if (this.turns && this.game.commandsLeft < 1) {
      this.say(id, i18n.t('noCommands'));
      return;
    }
    if (this.game.build(human, id, type)) {
      // Turn mode: the next tap is a new command, not an order from the field just built on.
      if (this.turns) this.select(-1);
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

  /**
   * Turn mode: what an own field gains per turn and what that depends on, as one short line.
   * A full field gains nothing, a field cut off from the castle loses troops.
   */
  fieldInfo(t) {
    const game = this.game;
    if (!t || t.owner !== this.ui.human) return null;
    const cap = game.cap(t);
    if (!t.supplied) return { tile: t.id, text: i18n.t('infoCutOff', { n: decimal(game.T.cutOff) }), bad: true };
    if (t.units >= cap) return { tile: t.id, text: i18n.t('infoFull', { n: cap }), bad: false };
    const kind = t.castle >= 0 ? 'infoCastle' : t.terrain === 'citadel' ? 'infoCitadel' : t.terrain === 'hill' ? 'infoHill' : t.terrain === 'forest' ? 'infoForest' : 'infoPlain';
    const farm = t.building === 'farm' ? ` · ${i18n.t('infoFarm', { n: decimal(game.T.farmBonus) })}` : '';
    return { tile: t.id, text: `${i18n.t(kind)} +${decimal(game.turnIncome(t))}${i18n.t('perTurn')}${farm} · ${i18n.t('infoUpTo', { n: cap })}`, bad: false };
  }

  /** An order was not carried out: say why, for a moment, at the field it was about. */
  refuse(tile, problem) {
    const key = problem === 'troops' ? 'noTroops' : problem === 'full' ? 'targetFull' : problem === 'commands' ? 'noCommands' : 'noPath';
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
    // Time on the clock a person has played this match (a tab left alone for a while does not count).
    if (this.mode === 'play' && this.ui.human >= 0 && now - this.last < 30) this.playMs = (this.playMs || 0) + (now - this.last) * 1000;
    this.last = now;
    const game = this.game;

    try {
      // The renderer must know the current match before any of its events arrive.
      if (this.renderer.game !== game) this.renderer.setGame(game);
      // The player's matches run at the chosen pace; the match behind the menu always at full speed.
      // In the figure showcase the time is set on its panel.
      this.ui.pace = this.lab ? (this.lab.paused ? 0 : this.lab.speed) : this.ui.human >= 0 ? this.pace() : 1;
      if (this.mode === 'play' || this.mode === 'menu' || this.mode === 'brief') game.step(dt * this.ui.pace);
      // Turn mode: the rivals' moves play back on screen while the options sheet is closed.
      if (this.turns && this.mode === 'play') this.turns.update(now);
      for (const e of game.drainEvents()) this.onEvent(e, now);
      this.updateSay(now);

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
      // Turn mode: the double tap shows exactly what it will do, worked out with the rules.
      ui.turnPreview = this.turns && ui.assault ? this.turns.preview(ui.assault.target, ui.sendFraction) : null;
      ui.noCommands = Boolean(this.turns && this.turns.left() < 1);
      ui.coverHints = Boolean(this.turns); // the preview of an attack names the cover of its target
      if (this.tutorial) this.runTutorial(now);
      if (ui.notices.length) ui.notices = ui.notices.filter((n) => now - n.at < 1.8 && n.tile < game.tiles.length);
      if (ui.floaters.length) ui.floaters = ui.floaters.filter((f) => now - f.at < FLOAT_SECONDS);
      // Turn mode: the selected own field says what it gains per turn and why.
      ui.fieldInfo = this.turns && ui.selected >= 0 && this.mode === 'play' ? this.fieldInfo(game.tiles[ui.selected]) : null;

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
    const name = (id) => (id >= 0 ? `<span style="color:${PALETTE_HEX[game.factions[id].color]}">${this.nameOf(game.factions[id])}</span>` : '');
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
        if (mine(e.owner)) {
          this.sfx.play('capture');
          this.speak('first');
        } else if (mine(e.previous)) {
          this.sfx.play('lost');
          this.note(i18n.t('evLost', { name: name(e.owner) }), true);
          this.speak(game.isWild(e.owner) ? 'lost' : 'taken');
        }
        else this.sfx.play('capture', 0.22 * quiet);
        if (e.citadel) this.banner(i18n.t('citadel', { name: name(e.owner) }), null, 2200);
        if (e.citadel && mine(e.owner)) this.note(i18n.t('evCitadel'));
        break;
      case 'herohome':
        this.say(e.tile, i18n.t('evKnightHome'));
        break;
      case 'heroaway':
        // Turn mode: he rides home and sits out a few moves.
        this.say(e.tile, i18n.t('evKnightAway', { n: e.turns }));
        if (mine(e.owner)) {
          this.note(i18n.t('evKnightAway', { n: e.turns }), true);
          this.speak('away');
        }
        break;
      case 'heroback':
        this.say(e.tile, i18n.t('evKnightBack'));
        if (mine(e.owner)) this.note(i18n.t('evKnightBack'));
        break;
      case 'herolost':
        if (mine(e.owner)) this.note(i18n.t('evKnightLost'));
        break;
      case 'repel':
        if (mine(e.owner)) this.sfx.play('lost', 0.6);
        else if (this.turns && mine(e.defender)) {
          this.note(i18n.t('evTurnHeld', { name: name(e.owner) }));
          if (game.isWild(e.owner)) this.speak('held');
        }
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
      case 'raidwarn':
        // Monsters mark their next target: a warning for whoever owns it.
        if (mine(e.defender)) this.sfx.play('alarm', 0.7);
        this.note(i18n.t('evRaid', { name: name(e.defender) }), mine(e.defender));
        // Turn mode: the first mark comes with a sentence on what can be done about it. Where the mission
        // has a captain, he says it; otherwise the hint line does, the first two times.
        if (this.turns && mine(e.defender)) {
          if (this.mission?.talk?.raid) this.speak('raid');
          else if (this.raidHints++ < 2) this.flash(i18n.t('raidHint'), 9000);
        }
        break;
      case 'raidoff':
        // A marked raid does not set out after all: the way was cut, or the lair is too weak.
        if (mine(e.defender)) {
          this.note(i18n.t('evRaidOff', { name: name(e.defender) }));
          this.speak('off');
        }
        break;
      case 'lair':
        if (mine(e.by)) this.sfx.play('castle', 0.6);
        this.note(i18n.t('evLair', { name: name(e.by) }));
        break;
      case 'victory':
        this.banner(i18n.t('wins', { name: name(e.winner) }), null, 4000);
        if (human >= 0) {
          this.later(600, () => this.sfx.play('victory'));
          this.later(2400, () => this.showResult(true));
        } else this.later(6000, () => this.mode === 'menu' && this.startAttract());
        break;
      case 'defeat':
        // Monsters that take the player's castle do not win: nobody does (`by` is -1).
        if (this.turns && game.reason === 'turns') this.banner(i18n.t('turnLimit'), '#ff8d7f', 4000);
        else if (e.by >= 0) this.banner(i18n.t('wins', { name: name(e.by) }), null, 4000);
        else this.banner(i18n.t('wildWins'), '#ff8d7f', 4000);
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
    if (this.lab) {
      text.textContent = i18n.t('labTitle');
      text.style.color = '';
      bar.hidden = true;
      return;
    }
    if (game.objective.type === 'lair') {
      // A mission against the wilds: the goal is their great cave, and the clock is the number of turns.
      const left = game.T ? game.T.turnLimit - game.turn + 1 : 0;
      text.textContent = left > 1 ? i18n.t('goalLair', { n: left }) : i18n.t('goalLair1');
      text.style.color = left <= 3 ? '#ff8d7f' : '';
      bar.hidden = true;
      if (this.ui.goalMark && !game.tiles[game.objective.tile].lair) this.ui.goalMark = null;
      // The captain speaks up once the person stands next to the goal.
      if (this.mission?.talk?.near && !this.said?.has('near') && game.tiles[game.objective.tile].neighbors.some((n) => game.tiles[n].owner === this.ui.human)) this.speak('near');
      return;
    }
    if (game.objective.type === 'take') {
      // A field to take (a pass): the mission names it; with a turn limit the clock shows too.
      const w = this.mission?.goalWord ? i18n.pick(this.mission.goalWord) : i18n.t('goalTakeWord');
      const left = this.mission?.turns?.turnLimit && game.T ? game.T.turnLimit - game.turn + 1 : 0;
      text.textContent = !left ? i18n.t('goalTake', { w }) : left > 1 ? i18n.t('goalTakeN', { w, n: left }) : i18n.t('goalTake1', { w });
      text.style.color = left && left <= 3 ? '#ff8d7f' : '';
      bar.hidden = true;
      if (this.mission?.talk?.near && !this.said?.has('near') && game.tiles[game.objective.tile].neighbors.some((n) => game.tiles[n].owner === this.ui.human)) this.speak('near');
      return;
    }
    if (game.objective.type !== 'hold') {
      const left = game.factions.filter((f) => f.alive && !f.wild && f.id !== this.ui.human).length;
      text.textContent = i18n.t('goalConquer', { n: left });
      text.style.color = '';
      bar.hidden = true;
      if (this.ui.goalMark && game.tiles[this.ui.goalMark.tile].owner === this.ui.human) this.ui.goalMark = null;
      this.talkAtBorders();
      return;
    }
    const hold = game.hold;
    // Turn mode counts the turns the citadel was held, real time the seconds.
    const s = this.turns ? game.objective.turns : game.objective.seconds;
    bar.hidden = false;
    if (hold.owner < 0) {
      text.textContent = this.tt('goalFree', { s });
      text.style.color = '';
      bar.firstElementChild.style.width = '0%';
      return;
    }
    const f = game.factions[hold.owner];
    const vars = { name: f.name, t: Math.floor(hold.time), s };
    text.textContent = this.tt(hold.secure ? 'goalRun' : 'goalStop', vars);
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
    $('#btn-turn').setAttribute('aria-label', i18n.t('viewTurn'));
    $('#btn-turn').title = i18n.t('viewTurn');
    // A mission with its own limit of turns shows it next to the turn.
    const limit = this.turns && this.mission?.turns?.turnLimit ? game.T.turnLimit : 0;
    $('#clock').textContent = !this.turns ? clock(game.time) : limit ? i18n.t('turnLabelOf', { n: Math.min(game.turn, limit), m: limit }) : i18n.t('turnLabel', { n: game.turn });
    $('#clock').classList.toggle('storm', game.storm);
    if (this.turns) this.turns.hud();
    $('#share-bar').innerHTML = stats.factions.map((f) => `<i style="width:${((f.tiles / stats.playable) * 100).toFixed(1)}%;background:${PALETTE_HEX[f.color]}"></i>`).join('');
    $('#share-legend').innerHTML = stats.factions
      .map((f) => `<span class="${f.alive ? '' : 'out'}${f.id === human ? ' you' : ''}" style="color:${PALETTE_HEX[f.color]}">${this.nameOf(game.factions[f.id])} ${f.tiles}</span>`)
      .join('');
    this.updateGoal();
    this.updatePanels(stats);
    if (this.lab) this.updateLabInfo();

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
      // In turn mode building is a command: only in the own move and while commands are left.
      const turnBlocked = this.turns && (!this.turns.myMove() || this.turns.left() < 1);
      btn.disabled = turnBlocked || (state !== 'now' && state !== 'save' && state !== 'saving');
      btn.classList.toggle('ready', state === 'now');
      btn.classList.toggle('saving', state === 'saving');
      btn.classList.toggle('blocked', Boolean(why));
      $(`#cost-${type}`).textContent = option.cost;
      // Turn mode: where nothing stands in the way, the button says what the building gives.
      const gain = !why && this.turns ? (type === 'tower' ? i18n.t('gainTower', { n: Math.round(game.R.towerDefense * 100) }) : i18n.t('gainFarm', { n: decimal(game.T.farmBonus) })) : '';
      $(`#why-${type}`).textContent = why || gain;
      $(`#why-${type}`).classList.toggle('gain', Boolean(gain));
    }
  }

  /** Remembers an event for the panel on wide screens. `html` may carry coloured kingdom names. */
  note(html, bad = false) {
    if (this.ui.human < 0) return;
    this.events.push({ at: this.turns ? `Z${this.game.turn}` : clock(this.game.time), html, bad });
    if (this.events.length > 5) this.events.shift();
  }

  /** Side panels: the own kingdom in numbers, the rivals, and what happened lately. */
  updatePanels(stats) {
    const game = this.game;
    const human = this.ui.human;
    if (human < 0 || $('#panel-rivals').hidden) return; // in the showcase only the one on the right is shown
    const me = stats.factions[human];
    let growth = 0;
    let towers = 0;
    let farms = 0;
    for (const t of game.tiles) {
      if (t.owner !== human) continue;
      if (t.units < game.cap(t)) growth += this.turns ? game.turnIncome(t) : game.income(t); // a full field grows no further
      if (t.building === 'tower') towers++;
      else if (t.building === 'farm') farms++;
    }
    $('#own-fields').textContent = me.tiles;
    $('#own-troops').textContent = Math.round(me.units);
    $('#own-growth').textContent = `+${growth.toFixed(1)}${this.turns ? i18n.t('perTurn') : '/s'}`;
    $('#own-towers').textContent = towers;
    $('#own-farms').textContent = farms;
    $('#rivals').innerHTML = stats.factions
      .filter((f) => f.id !== human)
      .map((f) => `<div class="${f.alive ? '' : 'out'}"><b style="color:${PALETTE_HEX[f.color]}">${this.nameOf(game.factions[f.id])}</b><span>${f.tiles} · ${Math.round(f.units)}</span></div>`)
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
    const fast = m.turnMode ? game.turn <= m.parTurns : game.time <= m.par;
    const goals = [won, won && fast, won && stats.lost <= (m.loseLimit ?? 3)];
    const got = goals.filter(Boolean).length;
    // A trial with the knight (…&ritter) counts nothing.
    if (won && !m.random && !game.heroTrial) {
      this.store.done[m.id] = true;
      this.store.stars[m.id] = Math.max(this.store.stars[m.id] || 0, got);
      this.store.best[m.id] = Math.min(this.store.best[m.id] || Infinity, Math.round(game.time));
      saveStore(this.store);
    }
    const title = $('#result-title');
    title.textContent = i18n.t(won ? 'victory' : 'defeat');
    title.className = `sheet-title big ${won ? 'win' : 'loss'}`;
    const byHold = game.reason === 'hold';
    const lostTo = game.factions[game.winner];
    // A mission of the campaign may tell its own two sentences: how it went on, or why it was too late.
    $('#result-sub').textContent = won ? (m.after ? i18n.pick(m.after) : i18n.t(byHold ? 'victoryHold' : game.reason === 'lair' ? 'victoryLair' : game.reason === 'take' ? 'victoryTake' : 'victorySub'))
      : game.reason === 'turns' ? (m.late ? i18n.pick(m.late) : i18n.t('defeatTurns', { n: game.T.turnLimit }))
      : !lostTo ? i18n.t('defeatWild')
      : i18n.t(byHold ? 'defeatHold' : 'defeatSub', { name: lostTo.name });
    const labels = this.goalLabels(m);
    $('#result-stars').innerHTML = goals.map((g, i) => `<div class="${g ? 'got' : ''}">${star}<span>${labels[i]}</span></div>`).join('');
    const spent = this.turns ? `<div><b>${Math.min(game.turn, game.T.turnLimit)}</b>${i18n.t('turnsStat')}</div>` : `<div><b>${clock(game.time)}</b>${i18n.t('time')}</div>`;
    // Turn mode also says how long the match took on the clock: missions are meant to last 5 to 15 minutes.
    const took = this.turns ? `<div><b>${clock((this.playMs || 0) / 1000)}</b>${i18n.t('duration')}</div>` : '';
    $('#result-stats').innerHTML = `${spent}${took}<div><b>${stats.captured}</b>${i18n.t('fields')}</div><div><b>${stats.lost}</b>${i18n.t('lost')}</div>`;
    const log = $('#btn-log');
    log.hidden = !this.turns;
    log.textContent = i18n.t('copyLog');
    // A mission of the campaign on trial leads on to the next one of that campaign.
    const chain = m.probe ? PROBE_MISSIONS : CAMPAIGN;
    const hasNext = won && chain.indexOf(m) >= 0 && chain.indexOf(m) < chain.length - 1;
    $('#btn-next').hidden = !hasNext;
    $('#btn-retry').classList.toggle('primary', !hasNext);
    this.showReward(won ? m.reward : null);
    this.setHint('');
    this.setMode('result');
  }

  /**
   * The reward of a won mission on the result sheet: one of two improvements to pick (the next mission
   * waits for the choice, and it can be changed by winning the mission again), or something new that
   * comes along.
   */
  showReward(reward) {
    const box = $('#result-reward');
    const next = $('#btn-next');
    box.hidden = !reward;
    next.disabled = false;
    next.textContent = i18n.t('next');
    if (!reward) return;
    const card = (id, kind, tag, on) => `<${tag} class="perk${on ? ' on' : ''}"${tag === 'button' ? ` data-perk="${id}"` : ''}><b>${i18n.t(`${kind}_${id}`)}</b><span>${i18n.t(`${kind}_${id}_d`)}</span></${tag}>`;
    if (reward.gift) {
      box.innerHTML = `<p class="eyebrow">${i18n.t('rewardNew')}</p>${card(reward.gift, 'gift', 'div', true)}`;
      return;
    }
    const picked = this.store.perks[this.mission.id];
    box.innerHTML = `<p class="eyebrow">${i18n.t('rewardPick')}</p>${reward.choice.map((id) => card(id, 'perk', 'button', picked === id)).join('')}`;
    next.disabled = !picked;
    if (!picked) next.textContent = i18n.t('rewardFirst');
  }

  /**
   * The match in turn mode as a short text, to paste where it can be looked at: one line per move with
   * its commands, and for the person the seconds the move took.
   *   A12:14+  attack on field 12 with 14 troops, taken (− held)   M3>9:6  moved 6 from 3 to 9   B7:farm
   */
  protocol() {
    const game = this.game;
    const m = this.mission;
    const human = this.ui.human;
    const head = `${m.id} · ${this.store.difficulty} · Startwert ${this.seed}${game.heroTrial ? ' · mit Ritter' : ''} · ${game.winner === human ? 'Sieg' : 'kein Sieg'} (${game.reason || 'läuft'}) · Zug ${game.turn} · ${clock((this.playMs || 0) / 1000)} min · Verloren ${game.humanStats.lost}`;
    const times = new Map((this.moveTimes || []).map((x) => [x.turn, x.s]));
    const lines = game.log.map((e) => {
      const who = e.owner === human ? 'ich' : this.nameOf(game.factions[e.owner]);
      const cmds = e.commands.map((c) => {
        // R: the knight rode along; R0: it was his free attack.
        const knight = c.hero ? (c.free ? 'R0' : 'R') : '';
        if (c.type === 'attack') return `A${c.target}:${c.plan.reduce((s, p) => s + p.units, 0)}${c.won ? '+' : '−'}${knight}`;
        if (c.type === 'move') return `M${c.from}>${c.to}:${c.units}${knight}`;
        return `B${c.tile}:${c.building}`;
      });
      const secs = e.owner === human && times.has(e.turn) ? ` ${times.get(e.turn)}s` : '';
      return `Z${e.turn} ${who}${secs}: ${cmds.join(' ') || '–'}`;
    });
    const key = 'A Ziel:Truppen+ genommen / − abgewehrt · M von>nach:Truppen · B Feld:Gebäude' + (game.heroTrial ? ' · R Ritter dabei, R0 gratis' : '');
    return [head, key, ...lines].join('\n');
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
      const text = this.tt(key, vars);
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
