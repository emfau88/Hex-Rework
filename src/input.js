// Pointer input: drag from an own field to a target, or tap the field and then the target.
// Works the same for mouse, touch and pen.

const DRAG_START = 10; // pixels before a press counts as a drag

export function attachInput(el, app) {
  let down = null;

  const position = (e) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const hoverAt = (p) => {
    const ui = app.ui;
    ui.hover = -1;
    ui.dragPath = null;
    if (ui.selected < 0 || !ui.targets) return;
    const id = app.renderer.pick(p.x, p.y);
    if (id >= 0 && id !== ui.selected && ui.targets.has(id)) {
      ui.hover = id;
      ui.dragPath = app.game.findPath(ui.human, ui.selected, id);
    }
  };

  el.addEventListener('pointerdown', (e) => {
    if (!app.canCommand() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    app.sfx.unlock();
    const ui = app.ui;
    const p = position(e);
    const id = app.renderer.pick(p.x, p.y);
    const own = id >= 0 && app.game.tiles[id].owner === ui.human;
    const order = ui.selected >= 0 && id >= 0 && id !== ui.selected && ui.targets && ui.targets.has(id);
    down = { p, id, own, order, moved: false, wasSelected: id === ui.selected };
    ui.pointer = p;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a convenience only */
    }
    if (order) return; // decided on release: a tap orders, a drag starts a new order from here
    if (own) {
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
    }
    ui.dragging = false;
    ui.hover = -1;
    ui.dragPath = null;
  };

  el.addEventListener('pointerup', (e) => release(e, false));
  el.addEventListener('pointercancel', (e) => release(e, true));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
