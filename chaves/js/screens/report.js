/* Tela Relatório — resumo do dia e geração do PDF */
(function (App) {
  'use strict';
  var h = App.dom.h, icon = App.dom.icon, D = App.dates;
  var store = App.store, domain = App.domain, c = App.ui.c, platform = App.platform;

  function previewRows(list, now) {
    return h('div', { class: 'card' }, [h('div', { class: 'list-rows' }, list.map(function (m) {
      var st = domain.status(m, now);
      return h('div', { class: 'list-row', role: 'button', tabindex: '0', onclick: function () { App.sheets.movement(m.id); } }, [
        h('span', { class: 'list-row__time', text: D.hm(m.createdAt) }),
        h('div', { class: 'list-row__main' }, [
          h('div', { class: 'list-row__title', text: m.name }),
          h('div', { class: 'list-row__sub', text: m.keys.join(', ') })
        ]),
        c.statusBadge(m, now)
      ]);
    }))]);
  }

  function render(root, ctx) {
    var view = ctx.view, state = store.state, now = new Date();
    var day = view.date;
    var stats = domain.dayStats(state.movs, day, now);
    var list = domain.createdOn(state.movs, day).reverse();

    var respInput = h('input', {
      class: 'input', type: 'text', placeholder: 'Seu nome', value: state.settings.resp, autocomplete: 'name',
      onchange: function (e) { store.updateSettings({ resp: e.target.value.trim() }); }
    });
    var olderCheck = h('input', { type: 'checkbox', checked: view.reportOlder, onchange: function (e) { view.reportOlder = e.target.checked; } });

    function build() {
      if (respInput.value.trim() !== state.settings.resp) store.updateSettings({ resp: respInput.value.trim() });
      return App.report.daily(store.state, { day: day, resp: respInput.value.trim(), includeOlder: view.reportOlder });
    }

    App.dom.append(root, [
      c.header('PDF do dia', 'Relatório', c.datePill(day, function (d) { view.date = d; ctx.rerender(); })),
      h('div', { class: 'stack stack--lg' }, [
        h('section', { class: 'card stack' }, [
          h('div', null, [h('h2', { class: 'card__title', text: D.longDate(day) }), h('p', { class: 'card__text', text: 'Resumo das retiradas feitas neste dia.' })]),
          h('div', { class: 'stats stats--2' }, [
            c.stat(stats.checkouts, stats.checkouts === 1 ? 'Retirada' : 'Retiradas', 'dark'),
            c.stat(stats.keys, 'Chaves retiradas'),
            c.stat(stats.returned, 'Chaves devolvidas'),
            c.stat(stats.use + stats.late, stats.late ? 'Em aberto (' + stats.late + ' atrasadas)' : 'Em aberto', stats.late ? 'alert' : null)
          ])
        ]),
        h('section', { class: 'card stack' }, [
          c.field('Responsável pelo turno', respInput, 'Aparece no PDF, junto da assinatura.'),
          h('label', { class: 'check' }, [olderCheck, 'Incluir chaves ainda em aberto de dias anteriores']),
          h('div', { class: 'btn-row' }, [
            h('button', { class: 'btn btn--primary', type: 'button', onclick: function () { var r = build(); platform.saveFile(r.bytes, r.name, 'application/pdf'); } }, [icon('download'), 'Baixar PDF']),
            h('button', { class: 'btn btn--outline', type: 'button', onclick: function () { var r = build(); platform.shareFile(r.bytes, r.name, 'application/pdf', 'Relatório de chaves'); } }, [icon('share'), 'Compartilhar'])
          ])
        ]),
        c.sectionHead('Retiradas do dia', list.length ? list.length + ' no total' : ''),
        list.length ? previewRows(list, now) : c.emptyState({ icon: 'report', title: 'Nenhuma retirada neste dia', text: 'O PDF sai mesmo assim, com as chaves fora do quadro.' })
      ])
    ]);
  }

  App.screens = App.screens || {};
  App.screens.report = { render: render, hasCta: false };
})(window.App = window.App || {});
