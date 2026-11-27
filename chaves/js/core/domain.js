/* =========================================================
   Regras do negócio — funções puras, sem DOM e sem gravação.

   Retirada (movement):
   { id, name, role, notes, keys: ['101', ...],
     returned: { '101': isoDate },   // chaves já devolvidas
     late: bool,                       // marcada como atrasada à mão
     createdAt, updatedAt,
     events: [{ type: 'checkout'|'return'|'late'|'unlate', at, keys? }] }

   Status (calculado, nunca gravado):
     devolvida — todas as chaves voltaram
     atrasada  — ainda há chave fora e (marcada à mão OU retirada em dia anterior)
     em_uso    — ainda há chave fora, retirada hoje
   ========================================================= */
(function (App) {
  'use strict';
  var D = App.dates;

  var STATUS_LABEL = { em_uso: 'Em uso', atrasada: 'Atrasada', devolvida: 'Devolvida' };

  // ---------- Retiradas ----------
  function openKeys(m) { return m.keys.filter(function (k) { return !m.returned[k]; }); }
  function returnedKeys(m) { return m.keys.filter(function (k) { return !!m.returned[k]; }); }
  function isOpen(m) { return openKeys(m).length > 0; }
  function isPartial(m) { var r = returnedKeys(m).length; return r > 0 && r < m.keys.length; }

  function status(m, now) {
    if (!isOpen(m)) return 'devolvida';
    if (m.late || D.dayKey(m.createdAt) < D.dayKey(now || new Date())) return 'atrasada';
    return 'em_uso';
  }

  function lastReturnAt(m) {
    var last = null;
    Object.keys(m.returned).forEach(function (k) { if (!last || m.returned[k] > last) last = m.returned[k]; });
    return last;
  }

  function hasReturnOn(m, day) {
    return Object.keys(m.returned).some(function (k) { return D.dayKey(m.returned[k]) === day; });
  }

  // ---------- Coleções ----------
  function byCreatedAsc(a, b) { return a.createdAt < b.createdAt ? -1 : 1; }
  function byCreatedDesc(a, b) { return a.createdAt < b.createdAt ? 1 : -1; }

  /** Retiradas com chaves ainda fora, mais antigas primeiro */
  function openMovements(movs) { return movs.filter(isOpen).sort(byCreatedAsc); }
  function lateMovements(movs, now) { return movs.filter(function (m) { return status(m, now) === 'atrasada'; }).sort(byCreatedAsc); }
  /** Totalmente devolvidas, com a última devolução no dia */
  function returnedOn(movs, day) {
    return movs.filter(function (m) { return !isOpen(m) && D.dayKey(lastReturnAt(m)) === day; })
      .sort(function (a, b) { return lastReturnAt(a) < lastReturnAt(b) ? 1 : -1; });
  }
  /** Retiradas feitas no dia */
  function createdOn(movs, day) { return movs.filter(function (m) { return D.dayKey(m.createdAt) === day; }).sort(byCreatedDesc); }
  /** Tudo que aconteceu no dia: retiradas ou devoluções */
  function activityOn(movs, day) {
    return movs.filter(function (m) { return D.dayKey(m.createdAt) === day || hasReturnOn(m, day); }).sort(byCreatedDesc);
  }
  /** Ainda em aberto, retiradas antes do dia */
  function openBefore(movs, day) {
    return movs.filter(function (m) { return isOpen(m) && D.dayKey(m.createdAt) < day; }).sort(byCreatedAsc);
  }

  /** Mapa chave -> retirada que está com ela agora */
  function keyHolders(movs, exceptId) {
    var map = {};
    movs.forEach(function (m) {
      if (m.id === exceptId) return;
      openKeys(m).forEach(function (k) { map[k] = m; });
    });
    return map;
  }

  /** Histórico de uma chave, mais recente primeiro */
  function keyHistory(movs, key, limit) {
    return movs.filter(function (m) { return m.keys.indexOf(key) >= 0; }).sort(byCreatedDesc).slice(0, limit || 5);
  }

  /** Situação atual do quadro (em número de chaves) */
  function boardCounts(state, now) {
    var holders = keyHolders(state.movs);
    var c = { total: 0, use: 0, late: 0, available: 0 };
    allKeys(state.settings.floors).forEach(function (k) {
      c.total++;
      var m = holders[k];
      if (!m) c.available++;
      else if (status(m, now) === 'atrasada') c.late++;
      else c.use++;
    });
    return c;
  }

  /** Números do dia para o relatório */
  function dayStats(movs, day, now) {
    var s = { checkouts: 0, keys: 0, returned: 0, use: 0, late: 0 };
    createdOn(movs, day).forEach(function (m) {
      s.checkouts++;
      s.keys += m.keys.length;
      s.returned += returnedKeys(m).length;
      var open = openKeys(m).length;
      if (status(m, now) === 'atrasada') s.late += open; else s.use += open;
    });
    return s;
  }

  // ---------- Andares e chaves ----------
  function allKeys(floors) {
    var out = [];
    floors.forEach(function (f) { out.push.apply(out, f.keys); });
    return out;
  }

  function floorIndexOf(key, floors) {
    for (var i = 0; i < floors.length; i++) if (floors[i].keys.indexOf(key) >= 0) return i;
    return -1;
  }

  function sortKeys(keys, floors) {
    var order = {};
    allKeys(floors).forEach(function (k, i) { order[k] = i; });
    return keys.slice().sort(function (a, b) {
      var oa = a in order ? order[a] : 1e9, ob = b in order ? order[b] : 1e9;
      return oa - ob || String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
    });
  }

  /**
   * Numeração: andar + nº do apto. Até 9 aptos por andar usa 1 dígito
   * (1º andar: 11–18 · 10º: 101–108 · 16º: 161–168); com 10 ou mais, 2 dígitos (101–112).
   * scheme 'hundreds' força o formato antigo (andar x 100), usado só na migração.
   */
  function keyNumber(floor, apt, perFloor, scheme) {
    var base = scheme === 'hundreds' || perFloor > 9 ? 100 : 10;
    return String(floor * base + apt);
  }

  function generateFloors(from, to, perFloor, scheme) {
    var floors = [];
    for (var f = from; f <= to; f++) {
      var keys = [];
      for (var a = 1; a <= perFloor; a++) keys.push(keyNumber(f, a, perFloor, scheme));
      floors.push({ label: f === 0 ? 'Térreo' : f + 'º andar', keys: keys });
    }
    return floors;
  }

  function floorsToText(floors) {
    return floors.map(function (f) { return f.label + ': ' + f.keys.join(', '); }).join('\n');
  }

  function textToFloors(text) {
    var floors = [];
    text.split('\n').forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var i = line.indexOf(':');
      var label = i >= 0 ? line.slice(0, i).trim() : '';
      var keys = (i >= 0 ? line.slice(i + 1) : line).split(/[,;]+/)
        .map(function (k) { return k.trim(); }).filter(Boolean);
      if (keys.length) floors.push({ label: label || 'Andar ' + (floors.length + 1), keys: keys });
    });
    return floors;
  }

  // ---------- Pessoas e busca ----------
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }

  function initials(name) {
    var p = String(name).trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  function firstName(name) { return String(name).trim().split(/\s+/)[0] || ''; }

  function matches(m, query) {
    var q = norm(query);
    if (!q) return true;
    if (m.keys.indexOf(query.trim()) >= 0) return true;
    return norm([m.name, m.role, m.notes, m.keys.join(' ')].join(' ')).indexOf(q) >= 0;
  }

  /** Pessoas que já retiraram chaves (para sugestões), mais recentes primeiro */
  function knownPeople(movs) {
    var map = {};
    movs.forEach(function (m) {
      var k = norm(m.name);
      if (!map[k] || map[k].last < m.createdAt) map[k] = { name: m.name, role: m.role || '', last: m.createdAt };
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return a.last < b.last ? 1 : -1; });
  }

  App.domain = {
    STATUS_LABEL: STATUS_LABEL,
    openKeys: openKeys, returnedKeys: returnedKeys, isOpen: isOpen, isPartial: isPartial,
    status: status, lastReturnAt: lastReturnAt,
    openMovements: openMovements, lateMovements: lateMovements, returnedOn: returnedOn,
    createdOn: createdOn, activityOn: activityOn, openBefore: openBefore,
    keyHolders: keyHolders, keyHistory: keyHistory, boardCounts: boardCounts, dayStats: dayStats,
    allKeys: allKeys, floorIndexOf: floorIndexOf, sortKeys: sortKeys,
    keyNumber: keyNumber, generateFloors: generateFloors, floorsToText: floorsToText, textToFloors: textToFloors,
    norm: norm, initials: initials, firstName: firstName, matches: matches, knownPeople: knownPeople
  };
})(window.App = window.App || {});
