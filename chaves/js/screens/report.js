/* =========================================================
   Tela Relatório — agenda do dia (calendário + linha do tempo)
   e geração do PDF.
   ========================================================= */
(function (App) {
  'use strict';
  var h = App.dom.h, icon = App.dom.icon, D = App.dates;
  var store = App.store, domain = App.domain, c = App.ui.c, platform = App.platform, motion = App.motion;

  var WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function monthOf(day) { return day.slice(0, 7); }
  function shiftMonth(month, n) {
    var d = new Date(+month.slice(0, 4), +month.slice(5, 7) - 1 + n, 1);
    return d.getFullYear() + '-' + D.pad(d.getMonth() + 1);
  }
  function monthLabel(month) { return D.monthLabel(+month.slice(0, 4), +month.slice(5, 7) - 1); }

  /** Cartão azul com mês, faixa de dias e botões do PDF */
  function planner(view, ctx, onPdf, onShare) {
    var today = D.today(), month = view.reportMonth;
    var daysWithItems = {};
    store.state.movs.forEach(function (m) { daysWithItems[D.dayKey(m.createdAt)] = true; });

    var strip = h('div', { class: 'day-strip no-scrollbar' });
    var first = new Date(+month.slice(0, 4), +month.slice(5, 7) - 1, 1);
    var activeEl = null;
    for (var d = new Date(first); d.getMonth() === first.getMonth(); d.setDate(d.getDate() + 1)) {
      var key = D.dayKey(d);
      if (key > today) break;
      var btn = h('button', {
        class: 'day' + (key === view.date ? ' is-active' : '') + (daysWithItems[key] ? ' has-items' : ''), type: 'button',
        'aria-label': D.longDate(key), 'aria-pressed': key === view.date ? 'true' : 'false',
        onclick: (function (k) { return function () { view.date = k; ctx.rerender('swap'); }; })(key)
      }, [WEEKDAYS[d.getDay()], h('span', { class: 'day__num', text: String(d.getDate()) }), h('span', { class: 'day__dot' })]);
      if (key === view.date) activeEl = btn;
      strip.appendChild(btn);
    }
    requestAnimationFrame(function () {
      var target = activeEl || strip.lastChild;
      if (target) strip.scrollLeft = target.offsetLeft - strip.clientWidth / 2 + target.offsetWidth / 2;
    });

    var isCurrent = month >= monthOf(today);
    return h('section', { class: 'planner' }, [
      h('div', { class: 'planner__month' }, [
        c.iconButton('chevronLeft', 'Mês anterior', function () { view.reportMonth = shiftMonth(month, -1); ctx.rerender('swap'); }, 'on-dark'),
        h('span', { class: 'planner__month-label', text: monthLabel(month) }),
        h('button', {
          class: 'icon-btn icon-btn--on-dark', type: 'button', 'aria-label': 'Próximo mês', disabled: isCurrent,
          onclick: function () { view.reportMonth = shiftMonth(month, 1); ctx.rerender('swap'); }
        }, [icon('chevronRight')])
      ]),
      strip,
      h('div', { class: 'btn-row' }, [
        h('button', { class: 'btn btn--accent', type: 'button', onclick: onPdf }, [icon('download'), 'Baixar PDF']),
        h('button', { class: 'btn btn--on-dark', type: 'button', onclick: onShare }, [icon('share'), 'Compartilhar'])
      ])
    ]);
  }

  /** Linha do tempo das retiradas do dia, com a marca "agora" */
  function agenda(list, day, now) {
    var cells = [];
    var nowPlaced = day !== D.today();
    var nowIso = now.toISOString();
    list.forEach(function (m) {
      if (!nowPlaced && m.createdAt > nowIso) { cells.push(nowLine(now)); nowPlaced = true; }
      var st = domain.status(m, now);
      cells.push(h('span', { class: 'agenda__time', text: D.hm(m.createdAt) }));
      cells.push(h('div', { class: 'agenda__item' }, [h('button', {
        class: 'agenda-card' + (st === 'devolvida' ? ' is-done' : st === 'atrasada' ? ' is-late' : ''), type: 'button',
        'data-flip': 'ag-' + m.id, onclick: function () { App.sheets.movement(m.id); }
      }, [
        h('div', { class: 'agenda-card__title', text: m.name }),
        h('div', { class: 'agenda-card__sub', text: (m.role ? m.role + ' · ' : '') + c.statusText(m, now) }),
        c.keyTags(m)
      ])]));
    });
    if (!nowPlaced) cells.push(nowLine(now));
    return h('div', { class: 'agenda' }, cells);
  }

  function nowLine(now) { return h('div', { class: 'agenda__now', text: 'agora · ' + D.hm(now) }); }

  function render(root, ctx) {
    var view = ctx.view, state = store.state, now = new Date();
    var day = view.date;
    if (!view.reportMonth) view.reportMonth = monthOf(day);
    var stats = domain.dayStats(state.movs, day, now);
    var list = domain.createdOn(state.movs, day).reverse();

    var respInput = h('input', {
      class: 'input', type: 'text', placeholder: 'Seu nome', value: state.settings.resp, autocomplete: 'name',
      onchange: function (e) { store.updateSettings({ resp: e.target.value.trim() }); }
    });
    var olderCheck = h('input', { type: 'checkbox', checked: view.reportOlder, onchange: function (e) { view.reportOlder = e.target.checked; } });

    function build() {
      var resp = respInput.value.trim();
      if (resp !== state.settings.resp) store.updateSettings({ resp: resp });
      return App.report.daily(store.state, { day: day, resp: resp, includeOlder: view.reportOlder });
    }

    var blocks = [
      planner(view, ctx,
        function () { var r = build(); platform.saveFile(r.bytes, r.name, 'application/pdf'); },
        function () { var r = build(); platform.shareFile(r.bytes, r.name, 'application/pdf', 'Relatório de chaves'); }),
      c.sectionHead(D.mediumDate(day), list.length ? list.length + (list.length === 1 ? ' retirada' : ' retiradas') : ''),
      h('div', { class: 'stats' }, [
        c.stat(stats.keys, 'Chaves retiradas', 'peach', 'rep-keys-' + day, ctx.mode === 'nav'),
        c.stat(stats.returned, 'Devolvidas', null, 'rep-ret-' + day, ctx.mode === 'nav'),
        c.stat(stats.use + stats.late, stats.late ? stats.late + ' atrasadas' : 'Em aberto', stats.late ? 'late' : null, 'rep-open-' + day, ctx.mode === 'nav')
      ]),
      list.length ? agenda(list, day, now)
        : c.emptyState({ icon: 'report', title: 'Nenhuma retirada neste dia', text: 'O PDF sai mesmo assim, com as chaves que estão fora do quadro.' }),
      h('section', { class: 'card stack' }, [
        h('h2', { class: 'card__title', text: 'Opções do PDF' }),
        c.field('Responsável pelo turno', respInput, 'Aparece no PDF, junto da assinatura.'),
        h('label', { class: 'check' }, [olderCheck, 'Incluir chaves ainda em aberto de dias anteriores'])
      ])
    ];

    App.dom.append(root, [
      c.header('PDF e histórico', 'Relatório', 'diário'),
      h('div', { class: 'stack stack--lg' }, blocks)
    ]);
    if (ctx.mode !== 'update') motion.stagger(ctx.mode === 'nav' ? blocks : blocks.slice(1), 'anim-rise');
  }

  App.screens = App.screens || {};
  App.screens.report = { render: render };
})(window.App = window.App || {});
