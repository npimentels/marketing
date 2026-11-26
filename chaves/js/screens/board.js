/* Tela Quadro — todas as chaves por andar, com o nome de quem está com cada uma */
(function (App) {
  'use strict';
  var h = App.dom.h, icon = App.dom.icon;
  var store = App.store, domain = App.domain, c = App.ui.c;

  function floorSummary(use, late) {
    if (!use && !late) return { text: 'todas no quadro', alert: false };
    var parts = [];
    if (use) parts.push(use + ' em uso');
    if (late) parts.push(late + (late === 1 ? ' atrasada' : ' atrasadas'));
    return { text: parts.join(' · '), alert: late > 0 };
  }

  function render(root, ctx) {
    var view = ctx.view, state = store.state, floors = state.settings.floors, now = new Date();
    var holders = domain.keyHolders(state.movs);
    var counts = domain.boardCounts(state, now);
    var outCount = counts.use + counts.late;

    var jump = h('select', {
      'aria-label': 'Ir para andar',
      onchange: function (e) {
        var el = document.getElementById('floor-' + e.target.value);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        e.target.selectedIndex = 0;
      }
    }, [h('option', { value: '', text: 'Ir para andar' })].concat(floors.map(function (f, i) {
      return h('option', { value: String(i), text: f.label });
    })));

    var floorCards = [];
    floors.forEach(function (f, i) {
      var use = 0, late = 0, tiles = [];
      f.keys.forEach(function (k) {
        var m = holders[k];
        var st = m ? (domain.status(m, now) === 'atrasada' ? 'late' : 'use') : 'free';
        if (st === 'use') use++;
        if (st === 'late') late++;
        if (view.boardOnlyOut && st === 'free') return;
        tiles.push(c.keyTile(k, st, m ? domain.firstName(m.name) : '', function () { App.sheets.key(k); }));
      });
      if (view.boardOnlyOut && !tiles.length) return;
      var sum = floorSummary(use, late);
      floorCards.push(h('section', { class: 'floor-card', id: 'floor-' + i }, [
        h('div', { class: 'floor-card__head' }, [
          h('span', { text: f.label }),
          h('span', { class: 'floor-card__summary' + (sum.alert ? ' is-alert' : ''), text: sum.text })
        ]),
        h('div', { class: 'key-grid' }, tiles)
      ]));
    });

    if (!floors.length) {
      floorCards.push(c.emptyState({ icon: 'board', title: 'Nenhum andar cadastrado', text: 'Cadastre os andares e apartamentos em Ajustes.',
        action: { label: 'Abrir Ajustes', run: function () { ctx.go('settings'); } } }));
    } else if (!floorCards.length) {
      floorCards.push(c.emptyState({ icon: 'check', title: 'Todas as chaves estão no quadro', text: 'Nenhuma chave fora agora.' }));
    }

    App.dom.append(root, [
      c.header(floors.length + ' andares · ' + counts.total + ' chaves', 'Quadro',
        h('label', { class: 'pill' }, [icon('board'), 'Andar', icon('chevronDown'), jump])),
      h('div', { class: 'stack stack--lg' }, [
        h('div', { class: 'legend' }, [
          h('span', { class: 'legend__item' }, [h('span', { class: 'legend__swatch' }), 'No quadro (' + counts.available + ')']),
          h('span', { class: 'legend__item' }, [h('span', { class: 'legend__swatch legend__swatch--use' }), 'Em uso (' + counts.use + ')']),
          h('span', { class: 'legend__item' }, [h('span', { class: 'legend__swatch legend__swatch--late' }), 'Atrasada (' + counts.late + ')'])
        ]),
        h('div', { class: 'chips no-scrollbar' }, [
          c.chip('Todas as chaves', { active: !view.boardOnlyOut, onClick: function () { view.boardOnlyOut = false; ctx.rerender(); } }),
          c.chip('Só as que estão fora', { active: view.boardOnlyOut, count: outCount, onClick: function () { view.boardOnlyOut = true; ctx.rerender(); } })
        ]),
        h('div', { class: 'stack' }, floorCards)
      ])
    ]);
  }

  App.screens = App.screens || {};
  App.screens.board = { render: render, hasCta: true };
})(window.App = window.App || {});
