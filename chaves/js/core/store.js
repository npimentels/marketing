/* =========================================================
   Estado da aplicação. Toda alteração de dados passa por aqui:
   altera -> grava no aparelho -> avisa as telas (subscribe).
   ========================================================= */
(function (App) {
  'use strict';
  var domain = App.domain, storage = App.storage;

  var state = storage.load();
  var listeners = [];

  function commit() {
    if (!storage.save(state) && App.store.onSaveError) App.store.onSaveError();
    listeners.forEach(function (fn) { fn(state); });
  }

  function nowIso() { return new Date().toISOString(); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function find(id) { return state.movs.filter(function (m) { return m.id === id; })[0] || null; }
  function sorted(keys) { return domain.sortKeys(keys, state.settings.floors); }

  function subscribe(fn) { listeners.push(fn); }

  // ---------- Retiradas ----------
  /** data: { name, role, notes, keys, createdAt? } */
  function checkout(data) {
    var at = data.createdAt || nowIso();
    var m = {
      id: uid(), name: data.name, role: data.role || '', notes: data.notes || '',
      keys: sorted(data.keys), returned: {}, late: false, createdAt: at, updatedAt: at,
      events: [{ type: 'checkout', at: at, keys: sorted(data.keys) }]
    };
    state.movs.push(m);
    commit();
    return m;
  }

  function update(id, data) {
    var m = find(id);
    if (!m) return;
    m.name = data.name; m.role = data.role || ''; m.notes = data.notes || '';
    m.keys = sorted(data.keys);
    Object.keys(m.returned).forEach(function (k) { if (m.keys.indexOf(k) < 0) delete m.returned[k]; });
    m.updatedAt = nowIso();
    commit();
  }

  /** Devolve as chaves informadas (ou todas). Retorna as chaves devolvidas. */
  function returnKeys(id, keys) {
    var m = find(id);
    if (!m) return [];
    var open = domain.openKeys(m);
    var list = (keys || open).filter(function (k) { return open.indexOf(k) >= 0; });
    if (!list.length) return [];
    var at = nowIso();
    list.forEach(function (k) { m.returned[k] = at; });
    m.events.push({ type: 'return', at: at, keys: list });
    m.updatedAt = at;
    commit();
    return list;
  }

  function setLate(id, late) {
    var m = find(id);
    if (!m || !!m.late === !!late) return;
    m.late = !!late;
    m.events.push({ type: late ? 'late' : 'unlate', at: nowIso() });
    m.updatedAt = nowIso();
    commit();
  }

  function remove(id) {
    state.movs = state.movs.filter(function (m) { return m.id !== id; });
    commit();
  }

  // ---------- Desfazer ----------
  function snapshot() { return JSON.stringify(state.movs); }
  function restore(snap) { state.movs = JSON.parse(snap); commit(); }

  // ---------- Ajustes e backup ----------
  function updateSettings(patch) {
    Object.keys(patch).forEach(function (k) { state.settings[k] = patch[k]; });
    commit();
  }
  function replaceAll(newState) { state = newState; commit(); }
  function clearMovements() { state.movs = []; commit(); }

  App.store = {
    get state() { return state; },
    subscribe: subscribe, find: find,
    checkout: checkout, update: update, returnKeys: returnKeys, setLate: setLate, remove: remove,
    snapshot: snapshot, restore: restore,
    updateSettings: updateSettings, replaceAll: replaceAll, clearMovements: clearMovements,
    onSaveError: null
  };
})(window.App = window.App || {});
