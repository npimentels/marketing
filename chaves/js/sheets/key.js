/* Folha de uma chave: com quem está agora e últimas retiradas */
(function (App) {
  'use strict';
  var h = App.dom.h, D = App.dates;
  var store = App.store, domain = App.domain, ui = App.ui, c = App.ui.c;

  function historyRows(key, sheet) {
    var list = domain.keyHistory(store.state.movs, key, 5);
    if (!list.length) return h('p', { class: 'field__hint', text: 'Esta chave ainda não foi retirada.' });
    return h('div', { class: 'list-rows' }, list.map(function (m) {
      var back = m.returned[key];
      return h('div', {
        class: 'list-row', role: 'button', tabindex: '0',
        onclick: function () { sheet.close(); App.sheets.movement(m.id); }
      }, [
        h('span', { class: 'list-row__time', text: D.dm(m.createdAt) }),
        h('div', { class: 'list-row__main' }, [
          h('div', { class: 'list-row__title', text: m.name }),
          h('div', { class: 'list-row__sub', text: 'Retirou ' + D.hm(m.createdAt) + (back ? ' · Devolveu ' + D.when(back) : ' · ainda com a chave') })
        ])
      ]);
    }));
  }

  function open(key) {
    var holder = domain.keyHolders(store.state.movs)[key];
    var floors = store.state.settings.floors;
    var floor = floors[domain.floorIndexOf(key, floors)];
    var sheet = ui.openSheet({ title: 'Chave ' + key });
    var now = new Date();

    var top = holder
      ? h('div', { class: 'card stack' }, [
          h('div', { class: 'person' }, [
            c.avatar(holder),
            h('div', { class: 'grow' }, [
              h('div', { class: 'mov-card__name', text: holder.name }),
              h('div', { class: 'person__sub', text: (holder.role ? holder.role + ' · ' : '') + 'retirou ' + D.when(holder.createdAt) })
            ]),
            c.statusBadge(holder, now)
          ]),
          holder.keys.length > 1 ? h('button', {
            class: 'btn btn--outline btn--sm', type: 'button', text: 'Ver retirada completa (' + holder.keys.length + ' chaves)',
            onclick: function () { sheet.close(); App.sheets.movement(holder.id); }
          }) : null
        ])
      : c.emptyState({ icon: 'check', title: 'No quadro', text: (floor ? floor.label + ' · ' : '') + 'disponível para retirada.' });

    sheet.setBody([
      top,
      h('section', { class: 'stack' }, [h('span', { class: 'field__label', text: 'Últimas retiradas' }), historyRows(key, sheet)])
    ]);
    sheet.setFoot([holder
      ? h('button', { class: 'btn btn--primary btn--lg btn--block', type: 'button', text: 'Devolver chave ' + key,
          onclick: function () { App.actions.returnKeys(holder, [key]); sheet.close(); } })
      : h('button', { class: 'btn btn--primary btn--lg btn--block', type: 'button', text: 'Registrar retirada desta chave',
          onclick: function () { sheet.close(); App.sheets.checkout({ presetKeys: [key] }); } })
    ]);
  }

  App.sheets = App.sheets || {};
  App.sheets.key = open;
})(window.App = window.App || {});
