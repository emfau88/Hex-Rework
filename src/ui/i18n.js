// Two languages from the start: English is the portal default, German follows the browser.

const TEXT = {
  de: {
    tagline: '4 Reiche · 1 Krone',
    pickColor: 'Wähle deine Farbe',
    chooseMission: 'Mission',
    difficulty: 'Stärke der Gegner',
    easy: 'Leicht',
    normal: 'Normal',
    hard: 'Schwer',
    protoNote: 'Prototyp 0.1 · Regeln, Karten und Balance sind vorläufig',
    send: 'Senden',
    tower: 'Turm',
    farm: 'Hof',
    supply: 'Nachschub',
    pause: 'Pause',
    resume: 'Weiter',
    restart: 'Neustart',
    menu: 'Menü',
    retry: 'Nochmal',
    next: 'Nächste Mission',
    victory: 'SIEG',
    defeat: 'NIEDERLAGE',
    victorySub: 'Die letzte Krone gehört dir.',
    defeatSub: 'Deine Burg ist gefallen.',
    time: 'Zeit',
    fields: 'Erobert',
    lost: 'Verloren',
    goalWin: 'Sieg',
    goalTime: 'Unter {t}',
    goalHold: 'Höchstens 3 Felder verloren',
    falls: '{name} FÄLLT',
    wins: '{name} SIEGT',
    citadel: '{name} NIMMT DIE ZITADELLE',
    storm: 'STURM · MAUERN BRÖCKELN',
    alarm: 'DEINE BURG WIRD ANGEGRIFFEN',
    intro2: '2 REICHE · 1 KRONE',
    intro3: '3 REICHE · 1 KRONE',
    intro4: '4 REICHE · 1 KRONE',
    hint0: 'Ziehe von deiner Burg auf ein graues Feld.',
    hint1: 'Erobere freie Felder. Jedes Feld liefert Truppen.',
    hint2: 'Tippe ein eigenes Feld an und baue einen Turm oder Hof.',
    hint3: 'Nimm die feindliche Burg, dann gehört dir das ganze Reich.',
    how1: 'Ziehe von einem eigenen Feld auf ein Ziel. Oder tippe erst das Feld, dann das Ziel an.',
    how2: 'Truppen laufen durch dein eigenes Gebiet bis zum Ziel. Der Pfeil zeigt, ob der Angriff reicht.',
    how3: 'Wer eine Burg erobert, bekommt das ganze Reich. Verlierst du deine Burg, ist die Partie vorbei.',
    how4: 'Turm: +60 % Verteidigung. Hof: mehr Truppen. Reicht es noch nicht, spart das Feld darauf.',
    soundOn: 'Ton an',
    soundOff: 'Ton aus',
    fullscreen: 'Vollbild',
    noWebgl: 'Dieser Browser unterstützt kein WebGL2. Bitte einen aktuellen Browser verwenden.',
  },
  en: {
    tagline: '4 Kingdoms · 1 Crown',
    pickColor: 'Pick your color',
    chooseMission: 'Mission',
    difficulty: 'Rival strength',
    easy: 'Easy',
    normal: 'Normal',
    hard: 'Hard',
    protoNote: 'Prototype 0.1 · rules, maps and balance are provisional',
    send: 'Send',
    tower: 'Tower',
    farm: 'Farm',
    supply: 'Supply',
    pause: 'Paused',
    resume: 'Resume',
    restart: 'Restart',
    menu: 'Menu',
    retry: 'Retry',
    next: 'Next mission',
    victory: 'VICTORY',
    defeat: 'DEFEAT',
    victorySub: 'The last crown is yours.',
    defeatSub: 'Your castle has fallen.',
    time: 'Time',
    fields: 'Captured',
    lost: 'Lost',
    goalWin: 'Victory',
    goalTime: 'Under {t}',
    goalHold: 'Lose 3 fields at most',
    falls: '{name} FALLS',
    wins: '{name} WINS',
    citadel: '{name} TAKES THE CITADEL',
    storm: 'STORM · WALLS CRUMBLE',
    alarm: 'YOUR CASTLE IS UNDER ATTACK',
    intro2: '2 KINGDOMS · 1 CROWN',
    intro3: '3 KINGDOMS · 1 CROWN',
    intro4: '4 KINGDOMS · 1 CROWN',
    hint0: 'Drag from your castle to a grey field.',
    hint1: 'Take free fields. Every field yields troops.',
    hint2: 'Tap one of your fields and build a tower or a farm.',
    hint3: 'Take the enemy castle and the whole kingdom is yours.',
    how1: 'Drag from one of your fields to a target. Or tap the field, then the target.',
    how2: 'Troops march through your own land to the target. The arrow shows whether the attack is enough.',
    how3: 'Whoever takes a castle gets the whole kingdom. Lose your own castle and the match is over.',
    how4: 'Tower: +60 % defence. Farm: more troops. If a field cannot pay yet, it saves up.',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    fullscreen: 'Fullscreen',
    noWebgl: 'This browser does not support WebGL2. Please use a current browser.',
  },
};

export const i18n = {
  lang: 'en',

  init(saved) {
    this.lang = saved || ((navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en');
    document.documentElement.lang = this.lang;
  },

  t(key, vars) {
    let s = TEXT[this.lang][key] ?? TEXT.en[key] ?? key;
    if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, vars[k]);
    return s;
  },

  /** Text of a { de, en } object from the mission data. */
  pick(obj) {
    return obj[this.lang] ?? obj.en;
  },

  apply(root = document) {
    for (const el of root.querySelectorAll('[data-t]')) el.textContent = this.t(el.dataset.t);
  },
};
