// Pointer input. Works the same for mouse, touch and pen.
//
//   Order:           drag from an own field to a target, or tap the field and then the target.
//   Combined attack: tap a foreign field twice. Every own field next to it attacks at once.
//                    The first tap (or hovering with the mouse) shows what the attack would achieve.
//   Cancel:          tap the selected field again, tap empty ground, Esc or the right mouse button.

const DRAG_START = 10; // pixels before a press counts as a drag
const DOUBLE_TAP = 2500; // ms the preview of a combined attack stays armed for the second tap

export function attachInput(el, app) {
  let down = null;
  let armed = { id: -1, at: 0 };

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
      return;
    }
    ui.assault = null;
    if (id >= 0 && id !== ui.selected && ui.targets.has(id)) {
      ui.hover = id;
      ui.dragPath = app.game.findPath(ui.human, ui.selected, id);
    }
  };

  el.addEventListener('pointerdown', (e) => {
    if (!app.canCommand()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) {
      if (e.button === 2) {
        app.ui.assault = null;
        app.select(-1);
      }
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
      ui.dragging = false;
      ui.assault = null;
      app.select(-1);
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
      // First tap arms the combined attack and shows its forecast, the second one sends it.
      const now = performance.now();
      const plan = assaultAt(d.id);
      if (plan && armed.id === d.id && now - armed.at < DOUBLE_TAP) {
        app.assault(d.id);
        armed = { id: -1, at: 0 };
        ui.assault = null;
      } else {
        armed = plan ? { id: d.id, at: now } : { id: -1, at: 0 };
        ui.assault = plan;
      }
    } else if (!d.own) {
      ui.assault = null;
    }
    ui.dragging = false;
    ui.hover = -1;
    ui.dragPath = null;
  };

  el.addEventListener('pointerup', (e) => release(e, false));
  el.addEventListener('pointercancel', (e) => release(e, true));
  el.addEventListener('pointerleave', () => {
    if (!down) app.ui.assault = null;
  });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
