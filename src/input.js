// Pointer input. Works the same for mouse, touch and pen.
//
//   Order:           drag from an own field to a target, or tap the field and then the target.
//   Combined attack: tap a foreign field twice. Every own field next to it attacks at once.
//                    The first tap (or hovering with the mouse) shows what the attack would achieve.
//   Cancel:          tap the selected field again, tap empty ground, Esc or the right mouse button.
//
// The first tap on a foreign field arms the combined attack; only a second tap on the same field
// sends it. Whatever happens in between disarms it again: a cancel, another action, the preview
// disappearing or moving to another field. A single tap must never send troops.

const DRAG_START = 10; // pixels before a press counts as a drag
const DOUBLE_TAP = 2500; // ms the preview of a combined attack stays armed for the second tap

/**
 * @param {EventTarget} el   the element that receives the pointer events
 * @param {object} app       the app shell (ui state, game, renderer, select/order/assault)
 * @param {() => number} [clock]  milliseconds; replaceable for tests
 * @returns {{ cancel: () => void, disarm: () => void }}
 *   cancel  drops selection, preview and the armed attack (Esc, right mouse button)
 *   disarm  only takes back the armed attack; call it for every other action of the player
 */
export function attachInput(el, app, clock = () => performance.now()) {
  let down = null;
  let armed = { id: -1, at: 0 };

  const disarm = () => {
    armed = { id: -1, at: 0 };
  };

  const cancel = () => {
    disarm();
    down = null;
    app.ui.dragging = false;
    app.ui.assault = null;
    app.select(-1);
  };

  const position = (e) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const assaultAt = (id) => {
    const ui = app.ui;
    if (id < 0 || app.game.tiles[id].owner === ui.human) return null;
    const sources = app.game.flankers(ui.human, id);
    return sources.length ? { target: id, sources } : null;
  };

  const hoverAt = (p) => {
    const ui = app.ui;
    ui.hover = -1;
    ui.dragPath = null;
    const id = app.renderer.pick(p.x, p.y);
    if (ui.selected < 0 || !ui.targets) {
      // Nothing selected: over a foreign field, preview the combined attack of all neighbours.
      ui.assault = assaultAt(id);
      // The armed attack lives only as long as its own preview is the one on screen.
      if (!ui.assault || ui.assault.target !== armed.id) disarm();
      return;
    }
    ui.assault = null;
    disarm();
    if (id >= 0 && id !== ui.selected && ui.targets.has(id)) {
      ui.hover = id;
      ui.dragPath = app.game.findPath(ui.human, ui.selected, id);
    }
  };

  el.addEventListener('pointerdown', (e) => {
    if (!app.canCommand()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) {
      if (e.button === 2) cancel();
      else disarm();
      return;
    }
    e.preventDefault();
    app.sfx.unlock();
    const ui = app.ui;
    const p = position(e);
    const id = app.renderer.pick(p.x, p.y);
    const own = id >= 0 && app.game.tiles[id].owner === ui.human;
    const order = ui.selected >= 0 && id >= 0 && id !== ui.selected && ui.targets && ui.targets.has(id);
    down = { p, id, own, order, moved: false, wasSelected: id === ui.selected, foreign: id >= 0 && !own && !order };
    ui.pointer = p;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a convenience only */
    }
    // Only a press on a foreign field can be the second tap; everything else is another action.
    if (!down.foreign) disarm();
    if (order) return; // decided on release: a tap orders, a drag starts a new order from here
    if (own) {
      ui.assault = null;
      app.select(id);
      ui.dragging = true;
    } else {
      app.select(-1);
    }
  });

  el.addEventListener('pointermove', (e) => {
    const ui = app.ui;
    const p = position(e);
    if (!down) {
      if (e.pointerType === 'mouse' && app.canCommand()) hoverAt(p);
      return;
    }
    ui.pointer = p;
    if (!down.moved && Math.hypot(p.x - down.p.x, p.y - down.p.y) > DRAG_START) {
      down.moved = true;
      disarm(); // a drag is not a tap
      if (down.order && down.own) {
        down.order = false;
        app.select(down.id);
        ui.dragging = true;
      }
    }
    if (ui.dragging) hoverAt(p);
  });

  const release = (e, cancelled) => {
    if (!down) return;
    const ui = app.ui;
    const d = down;
    down = null;
    if (cancelled || !app.canCommand()) {
      cancel();
      return;
    }
    if (d.order) {
      app.order(ui.selected, d.id);
    } else if (ui.dragging) {
      if (d.moved) {
        hoverAt(position(e));
        if (ui.hover >= 0) app.order(ui.selected, ui.hover);
        else app.select(-1);
      } else if (d.wasSelected) {
        app.select(-1);
      }
    } else if (d.foreign && !d.moved) {
      // First tap arms the combined attack and shows its forecast, the second one sends it,
      // provided that very preview is still on screen and nothing has disarmed it since.
      const now = clock();
      const plan = assaultAt(d.id);
      const shown = ui.assault && ui.assault.target === d.id;
      if (plan && shown && armed.id === d.id && now - armed.at < DOUBLE_TAP) {
        disarm();
        ui.assault = null;
        app.assault(d.id);
      } else {
        armed = plan ? { id: d.id, at: now } : { id: -1, at: 0 };
        ui.assault = plan;
      }
    } else {
      // Empty ground, or a drag that started on a foreign field.
      disarm();
      if (!d.own) ui.assault = null;
    }
    ui.dragging = false;
    ui.hover = -1;
    ui.dragPath = null;
  };

  el.addEventListener('pointerup', (e) => release(e, false));
  el.addEventListener('pointercancel', (e) => release(e, true));
  el.addEventListener('pointerleave', (e) => {
    // Only a mouse can leave the board without lifting. A finger "leaves" every time it is lifted,
    // and that must neither hide the preview of the first tap nor take back the armed attack.
    if (down || !e || e.pointerType !== 'mouse') return;
    app.ui.assault = null;
    disarm();
  });
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  return { cancel, disarm };
}
