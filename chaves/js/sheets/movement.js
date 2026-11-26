/* Folha de detalhes de uma retirada: chaves, devolução parcial, histórico e ações */
(function (App) {
  'use strict';
  var h = App.dom.h, icon = App.dom.icon, D = App.dates;
  var store = App.store, domain = App.domain, ui = App.ui, c = App.ui.c, actions = App.actions;

  function timeline(m) {
    var items = m.events.slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; }).map(function (e) {
      var title, text = D.when(e.at), dot = '';
      if (e.type === 'checkout') {
        title = 'Retirada';
        text = (e.keys ? e.keys.length + (e.keys.length === 1 ? ' chave' : ' chaves') + ' · ' : '') + text;
      } else if (e.type === 'return') {
        title = 'Devolução'; dot = 'ok';
        text = (e.keys || []).join(', ') + ' · ' + text;
      } else if (e.type === 'late') {
        title = 'Marcada como atrasada'; dot = 'alert';
      } else {
        title = 'Atraso removido'; dot = 'muted';
      }
      return h('div', { class: 'timeline__item' }, [
        h('span', { class: 'timeline__dot' + (dot ? ' timeline__dot--' + dot : '') }),
        h('div', null, [h('div', { class: 'timeline__title', text: title }), h('div', { class: 'timeline__text', text: text })])
      ]);
    });
    return h('div', { class: 'timeline' }, items);
  }

  function open(id) {
    var sheet = null;
    var chosen = null;     // chaves marcadas para devolver

    function render() {
      var m = store.find(id);
      if (!m) { sheet.close(); return; }
      var open = domain.openKeys(m);
      var st = domain.status(m);
      if (!chosen) chosen = open.slice();
      chosen = chosen.filter(function (k) { return open.indexOf(k) >= 0; });

      // Chaves: com mais de uma aberta, dá para escolher quais devolver
      var keysBlock;
      if (open.length > 1) {
        keysBlock = h('div', { class: 'key-grid' }, m.keys.map(function (k) {
          if (m.returned[k]) return c.keyTile(k, 'returned', 'dev. ' + D.hm(m.returned[k]));
          var on = chosen.indexOf(k) >= 0;
          return c.keyTile(k, on ? 'selected' : 'free', on ? 'devolver' : 'fica', function () {
            if (on) chosen.splice(chosen.indexOf(k), 1); else chosen.push(k);
            render();
          });
        }));
      } else {
        keysBlock = c.keyTags(m);
      }

      sheet.setBody([
        h('div', { class: 'person' }, [
          c.avatar(m, 'lg'),
          h('div', { class: 'grow' }, [
            h('div', { class: 'person__name', text: m.name }),
            h('div', { class: 'person__sub', text: m.role || 'Retirou ' + D.when(m.createdAt) })
          ]),
          c.statusBadge(m)
        ]),
        h('section', { class: 'stack' }, [
          h('div', { class: 'step-title' }, [
            h('span', { class: 'field__label', text: 'Chaves (' + m.keys.length + ')' }),
            open.length > 1 ? h('span', { class: 'field__hint', text: 'Toque para escolher quais devolver' }) : null
          ]),
          keysBlock
        ]),
        m.notes ? h('section', { class: 'stack' }, [h('span', { class: 'field__label', text: 'Observação' }), h('p', { class: 'note-box', text: m.notes })]) : null,
        h('section', { class: 'stack' }, [h('span', { class: 'field__label', text: 'Histórico' }), timeline(m)]),
        h('div', { class: 'btn-row btn-row--wrap' }, [
          h('button', { class: 'btn btn--outline btn--sm', type: 'button', onclick: function () { sheet.close(); App.sheets.checkout({ id: m.id }); } }, [icon('edit'), 'Editar']),
          st !== 'devolvida' ? h('button', {
            class: 'btn btn--outline btn--sm', type: 'button', text: m.late ? 'Remover atraso' : 'Marcar atrasada',
            onclick: function () { actions.setLate(m, !m.late); render(); }
          }) : null,
          h('button', { class: 'btn btn--danger btn--sm btn--full', type: 'button', onclick: function () {
            actions.remove(m).then(function (removed) { if (removed) sheet.close(); });
          } }, [icon('trash'), 'Excluir'])
        ])
      ]);

      if (!open.length) { sheet.setFoot([]); return; }
      var n = chosen.length;
      var label = n === 0 ? 'Selecione as chaves a devolver'
        : n === open.length ? (n === 1 ? 'Devolver chave ' + chosen[0] : 'Devolver todas (' + n + ')')
        : 'Devolver ' + n + ' de ' + open.length + ' chaves';
      sheet.setFoot([h('button', {
        class: 'btn btn--primary btn--lg btn--block', type: 'button', text: label, disabled: n === 0,
        onclick: function () { actions.returnKeys(m, chosen.slice()); sheet.close(); }
      })]);
    }

    var m0 = store.find(id);
    if (!m0) return;
    sheet = ui.openSheet({ title: 'Retirada' });
    render();
  }

  App.sheets = App.sheets || {};
  App.sheets.movement = open;
})(window.App = window.App || {});
