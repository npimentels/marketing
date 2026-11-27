/* Persistência no aparelho (localStorage) + migração de versões antigas + backup */
(function (App) {
  'use strict';
  var domain = App.domain;

  var STORAGE_KEY = 'controle-chaves.v1';   // mantido para não perder dados existentes
  var VERSION = 3;

  function defaultFloors() { return domain.generateFloors(1, 16, 8); }

  function freshState() {
    return { version: VERSION, settings: { place: '', floors: defaultFloors(), resp: '' }, movs: [] };
  }

  /** Converte uma retirada do formato v1 (pendente/entregue/não entregue) para v2 */
  function migrateMovementV1(m) {
    var history = m.history || [];
    var out = {
      id: m.id, name: m.name, role: m.role || '', notes: m.notes || '', keys: m.keys.slice(),
      returned: {}, late: false, createdAt: m.createdAt, updatedAt: m.updatedAt || m.createdAt,
      events: [{ type: 'checkout', at: m.createdAt, keys: m.keys.slice() }]
    };
    if (m.status === 'entregue') {
      var lastDelivered = history.filter(function (h) { return h.status === 'entregue'; }).pop();
      var at = (lastDelivered && lastDelivered.at) || out.updatedAt;
      out.keys.forEach(function (k) { out.returned[k] = at; });
      out.events.push({ type: 'return', at: at, keys: out.keys.slice() });
    } else if (m.status === 'nao_entregue') {
      var lastLate = history.filter(function (h) { return h.status === 'nao_entregue'; }).pop();
      out.late = true;
      out.events.push({ type: 'late', at: (lastLate && lastLate.at) || out.updatedAt });
    }
    return out;
  }

  /**
   * Listas padrão antigas (andar x 100: 101, 102…) -> numeração nova (andar x 10: 11, 12…).
   * As chaves das retiradas já registradas são renomeadas junto (mesmo apartamento, nome novo).
   */
  function migrateNumbering(s) {
    var floorsJson = JSON.stringify(s.settings.floors);
    var oldLayouts = [[1, 10, 4], [1, 16, 8]];
    var match = oldLayouts.filter(function (l) {
      return floorsJson === JSON.stringify(domain.generateFloors(l[0], l[1], l[2], 'hundreds'));
    })[0];
    if (!match) return;
    var rename = {};
    for (var f = match[0]; f <= match[1]; f++) {
      for (var a = 1; a <= match[2]; a++) rename[domain.keyNumber(f, a, match[2], 'hundreds')] = domain.keyNumber(f, a, 8);
    }
    function mapKey(k) { return rename[k] || k; }
    s.movs.forEach(function (m) {
      m.keys = m.keys.map(mapKey);
      var returned = {};
      Object.keys(m.returned || {}).forEach(function (k) { returned[mapKey(k)] = m.returned[k]; });
      m.returned = returned;
      (m.events || []).forEach(function (e) { if (e.keys) e.keys = e.keys.map(mapKey); });
    });
    s.settings.floors = defaultFloors();
  }

  function migrate(s) {
    if (!s || !s.settings || !Array.isArray(s.movs)) throw new Error('formato inválido');
    s.settings.place = s.settings.place || '';
    s.settings.resp = s.settings.resp || '';
    if (!Array.isArray(s.settings.floors) || !s.settings.floors.length) s.settings.floors = defaultFloors();
    if (!s.version || s.version < 2) s.movs = s.movs.map(migrateMovementV1);
    migrateNumbering(s);
    s.movs.forEach(function (m) { m.returned = m.returned || {}; m.events = m.events || []; });
    s.version = VERSION;
    return s;
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { /* sem acesso */ }
    if (!raw) return freshState();
    try {
      var s = migrate(JSON.parse(raw));
      save(s);
      return s;
    } catch (e) {
      return freshState();
    }
  }

  /** @returns {boolean} se conseguiu gravar */
  function save(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
    catch (e) { return false; }
  }

  function toBackup(state) { return JSON.stringify(state, null, 2); }

  /** Lê um arquivo de backup (de qualquer versão). Lança erro se inválido. */
  function fromBackup(text) { return migrate(JSON.parse(text)); }

  App.storage = { load: load, save: save, toBackup: toBackup, fromBackup: fromBackup, defaultFloors: defaultFloors };
})(window.App = window.App || {});
