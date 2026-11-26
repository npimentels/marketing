/* Datas e horários (formato brasileiro). Funções puras. */
(function (App) {
  'use strict';

  var MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toDate(v) { return v instanceof Date ? v : new Date(v); }
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /** "AAAA-MM-DD" no fuso local */
  function dayKey(v) {
    var d = toDate(v);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function today() { return dayKey(new Date()); }
  function parseDay(day) { var p = day.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function shiftDay(day, n) { var d = parseDay(day); d.setDate(d.getDate() + n); return dayKey(d); }
  function daysBetween(fromDay, toDay) { return Math.round((parseDay(toDay) - parseDay(fromDay)) / 86400000); }

  function hm(v) { var d = toDate(v); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dm(v) { var d = toDate(v); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1); }
  function dmy(v) { return dm(v) + '/' + toDate(v).getFullYear(); }
  function dmyhm(v) { return dmy(v) + ' ' + hm(v); }

  /** "Quinta-feira, 26 de novembro de 2026" */
  function longDate(day) {
    return capitalize(parseDay(day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  }

  /** "Hoje, 26 nov" · "Ontem, 25 nov" · "Ter, 24 nov" */
  function shortDate(day) {
    var d = parseDay(day), t = today();
    var base = d.getDate() + ' ' + MONTHS[d.getMonth()];
    if (d.getFullYear() !== new Date().getFullYear()) base += ' ' + d.getFullYear();
    if (day === t) return 'Hoje, ' + base;
    if (day === shiftDay(t, -1)) return 'Ontem, ' + base;
    return capitalize(d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')) + ', ' + base;
  }

  /** "08:12" (hoje) · "ontem 16:40" · "24/11 16:40" */
  function when(v) {
    var k = dayKey(v), t = today();
    if (k === t) return hm(v);
    if (k === shiftDay(t, -1)) return 'ontem ' + hm(v);
    return dm(v) + ' ' + hm(v);
  }

  /** Tempo decorrido: "agora", "40 min", "2h15", "3 dias" */
  function elapsed(fromIso, now) {
    var min = Math.max(0, Math.floor(((now || new Date()) - toDate(fromIso)) / 60000));
    if (min < 1) return 'agora';
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), m = min % 60;
    if (h < 24) return h + 'h' + (m ? pad(m) : '');
    var d = Math.floor(h / 24);
    return d + (d === 1 ? ' dia' : ' dias');
  }

  App.dates = {
    pad: pad, dayKey: dayKey, today: today, parseDay: parseDay, shiftDay: shiftDay, daysBetween: daysBetween,
    hm: hm, dm: dm, dmy: dmy, dmyhm: dmyhm, longDate: longDate, shortDate: shortDate, when: when, elapsed: elapsed
  };
})(window.App = window.App || {});
