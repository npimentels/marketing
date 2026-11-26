/* =========================================================
   Relatório diário em PDF (A4).
   App.report.daily(state, { day, resp, includeOlder }) -> { bytes, name }
   ========================================================= */
(function (App) {
  'use strict';
  var D = App.dates, domain = App.domain;

  var RED = [0.784, 0.063, 0.18];
  var GREEN = [0.12, 0.48, 0.3];
  var MUTED = 0.4;
  var M = 40;            // margem
  var FS = 8.5, LH = 11, PAD = 5;

  var COLS = [
    { title: 'Retirada', w: 50 },
    { title: 'Nome / Empresa', w: 112 },
    { title: 'Chaves', w: 116 },
    { title: 'Status', w: 80 },
    { title: 'Devolução', w: 56 },
    { title: 'Observações', w: 0 }   // resto da largura
  ];

  function daily(state, opts) {
    var day = opts.day, now = new Date(), place = state.settings.place, floors = state.settings.floors;
    var dayList = domain.createdOn(state.movs, day).reverse();
    var older = opts.includeOlder ? domain.openBefore(state.movs, day) : [];

    var pdf = new App.MiniPDF();
    var W = pdf.w - 2 * M, PH = pdf.h, bottom = PH - 50, y = 0;
    COLS[5].w = W - COLS.slice(0, 5).reduce(function (a, c) { return a + c.w; }, 0);

    // ---------- Cabeçalho ----------
    function newPage(first) {
      pdf.addPage();
      y = M;
      if (!first) {
        pdf.text(M, y + 10, 'Relatório de Movimentação de Chaves — ' + D.dmy(D.parseDay(day)), { size: 9, color: MUTED });
        y += 26;
        return;
      }
      pdf.rect(M, y, W, 4, { fill: 0 });
      y += 26;
      pdf.text(M, y, 'Relatório de Movimentação de Chaves', { size: 18, bold: true });
      y += 18;
      if (place) { pdf.text(M, y, place, { size: 11 }); y += 15; }
      pdf.text(M, y, D.longDate(day), { size: 11, bold: true });
      pdf.text(M + W, y, 'Gerado em ' + D.dmyhm(now), { size: 9, align: 'right', color: MUTED });
      y += 10;
      if (opts.resp) { pdf.text(M, y + 10, 'Responsável pelo turno: ' + opts.resp, { size: 10 }); y += 14; }
      y += 12;
    }

    function ensure(space) { if (y + space > bottom) newPage(false); }

    function sectionTitle(t) {
      ensure(60);
      pdf.text(M, y, t, { size: 11, bold: true });
      y += 10;
    }

    // ---------- Resumo ----------
    function summary() {
      var s = domain.dayStats(state.movs, day, now);
      var items = [
        ['Retiradas', s.checkouts, 'dark'], ['Chaves retiradas', s.keys], ['Chaves devolvidas', s.returned],
        ['Chaves em uso', s.use], ['Chaves atrasadas', s.late, s.late ? 'alert' : null]
      ];
      var gap = 8, bw = (W - gap * (items.length - 1)) / items.length, bh = 46;
      items.forEach(function (it, i) {
        var x = M + i * (bw + gap), dark = it[2] === 'dark';
        if (dark) pdf.rect(x, y, bw, bh, { fill: 0 });
        else pdf.rect(x, y, bw, bh, { stroke: it[2] === 'alert' ? RED : 0.8, width: 0.8 });
        pdf.text(x + bw / 2, y + 24, String(it[1]), { size: 18, bold: true, align: 'center', color: dark ? 1 : it[2] === 'alert' ? RED : 0 });
        pdf.text(x + bw / 2, y + 38, it[0], { size: 7.5, align: 'center', color: dark ? 1 : 0.3, maxWidth: bw - 6 });
      });
      y += bh + 24;
    }

    // ---------- Tabela ----------
    function tableHead() {
      pdf.rect(M, y, W, 18, { fill: 0 });
      var x = M;
      COLS.forEach(function (c) { pdf.text(x + PAD, y + 12, c.title, { size: 8, bold: true, color: 1 }); x += c.w; });
      y += 18;
    }

    function cellLines(m, withDate) {
      var st = domain.status(m, now);
      var returned = domain.returnedKeys(m);
      var partial = domain.isPartial(m);
      var last = domain.lastReturnAt(m);
      var nameW = COLS[1].w - 2 * PAD, keysW = COLS[2].w - 2 * PAD;
      var name = pdf.wrap(m.name, FS, true, nameW).map(function (t) { return { t: t, bold: true }; });
      var role = m.role ? pdf.wrap(m.role, FS - 1, false, nameW).map(function (t) { return { t: t, size: FS - 1, color: MUTED }; }) : [];
      var keys = pdf.wrap(m.keys.join(', '), FS, false, keysW).map(function (t) { return { t: t }; });
      if (partial) keys = keys.concat(pdf.wrap('Devolvidas: ' + returned.join(', '), FS - 1, false, keysW).map(function (t) { return { t: t, size: FS - 1, color: MUTED }; }));
      var status = [{ t: domain.STATUS_LABEL[st], bold: true, color: st === 'atrasada' ? RED : 0, marker: st }];
      if (partial) status.push({ t: returned.length + ' de ' + m.keys.length + ' dev.', size: FS - 1, color: MUTED });
      return [
        withDate || D.dayKey(m.createdAt) !== day ? [{ t: D.dm(m.createdAt) }, { t: D.hm(m.createdAt), color: MUTED }] : [{ t: D.hm(m.createdAt) }],
        name.concat(role),
        keys,
        status,
        [{ t: last ? (D.dayKey(last) !== day ? D.dm(last) + ' ' : '') + D.hm(last) : '—' }],
        m.notes ? pdf.wrap(m.notes, FS - 0.5, false, COLS[5].w - 2 * PAD).map(function (t) { return { t: t, size: FS - 0.5 }; }) : [{ t: '' }]
      ];
    }

    function marker(kind, x, top) {
      var s = 7;
      if (kind === 'devolvida') pdf.rect(x, top, s, s, { fill: GREEN });
      else if (kind === 'atrasada') pdf.rect(x, top, s, s, { fill: RED });
      else pdf.rect(x, top, s, s, { stroke: 0, width: 0.8 });
    }

    function table(items, withDate) {
      if (!items.length) {
        pdf.rect(M, y, W, 24, { stroke: 0.6, width: 0.5 });
        pdf.text(M + W / 2, y + 15, 'Nenhuma retirada registrada.', { size: 9, align: 'center', color: MUTED });
        y += 24;
        return;
      }
      tableHead();
      items.forEach(function (m, idx) {
        var cells = cellLines(m, withDate);
        var rows = Math.max.apply(null, cells.map(function (c) { return c.length; }));
        var rh = rows * LH + 2 * PAD;
        if (y + rh > bottom) { newPage(false); tableHead(); }
        if (idx % 2 === 1) pdf.rect(M, y, W, rh, { fill: 0.955 });
        var x = M;
        cells.forEach(function (lines, ci) {
          lines.forEach(function (ln, li) {
            var off = ln.marker ? 11 : 0;
            if (ln.marker) marker(ln.marker, x + PAD, y + PAD + 1.5 + li * LH);
            pdf.text(x + PAD + off, y + PAD + 8 + li * LH, ln.t, {
              size: ln.size || FS, bold: !!ln.bold, color: ln.color == null ? 0 : ln.color, maxWidth: COLS[ci].w - 2 * PAD - off
            });
          });
          x += COLS[ci].w;
        });
        y += rh;
        pdf.line(M, y, M + W, y, { width: 0.3, color: 0.75 });
      });
    }

    // ---------- Chaves fora agora, agrupadas por pessoa ----------
    function keysOutNow() {
      var open = domain.openMovements(state.movs);
      var total = open.reduce(function (a, m) { return a + domain.openKeys(m).length; }, 0);
      y += 26;
      sectionTitle('Chaves fora do quadro no momento da emissão (' + total + ')');
      y += 4;
      if (!open.length) { pdf.text(M, y + 8, 'Todas as chaves estão no quadro.', { size: 9 }); y += 14; return; }
      open.forEach(function (m) {
        var late = domain.status(m, now) === 'atrasada';
        var label = m.name + (late ? ' (atrasada)' : '') + ':';
        var lw = Math.min(200, pdf.textWidth(label, 9, true) + 6);
        var keys = pdf.wrap(domain.sortKeys(domain.openKeys(m), floors).join(', ') + '  —  desde ' + D.dm(m.createdAt) + ' ' + D.hm(m.createdAt), 9, false, W - lw);
        ensure(keys.length * 13 + 4);
        pdf.text(M, y + 8, label, { size: 9, bold: true, color: late ? RED : 0, maxWidth: 200 });
        keys.forEach(function (ln, i) { pdf.text(M + lw, y + 8 + i * 13, ln, { size: 9 }); });
        y += keys.length * 13 + 3;
      });
    }

    // ---------- Montagem ----------
    newPage(true);
    summary();
    sectionTitle('Retiradas do dia');
    table(dayList, false);
    if (older.length) {
      y += 26;
      sectionTitle('Ainda em aberto de dias anteriores');
      table(older, true);
    }
    keysOutNow();

    // assinatura
    ensure(70);
    y = Math.max(y + 40, bottom - 40);
    pdf.line(M, y, M + 220, y, { width: 0.6 });
    pdf.text(M, y + 12, opts.resp || 'Responsável pelo turno', { size: 8.5, color: 0.35 });
    pdf.line(M + W - 220, y, M + W, y, { width: 0.6 });
    pdf.text(M + W - 220, y + 12, 'Assinatura', { size: 8.5, color: 0.35 });

    // rodapé
    var total = pdf.pages.length;
    for (var i = 0; i < total; i++) {
      pdf.setPage(i);
      pdf.line(M, PH - 32, M + W, PH - 32, { width: 0.3, color: 0.6 });
      pdf.text(M, PH - 20, 'Controle de Chaves' + (place ? ' — ' + place : ''), { size: 7.5, color: MUTED, maxWidth: W - 80 });
      pdf.text(M + W, PH - 20, 'Página ' + (i + 1) + ' de ' + total, { size: 7.5, color: MUTED, align: 'right' });
    }

    return { bytes: pdf.output({ title: 'Relatório de chaves ' + day }), name: 'relatorio-chaves-' + day + '.pdf' };
  }

  App.report = { daily: daily };
})(window.App = window.App || {});
