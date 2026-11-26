/* =========================================================
   Tela Início — com quem estão as chaves agora.
   Organizada por pessoa, mais antigas primeiro.
   ========================================================= */
(function (App) {
  'use strict';
  var h = App.dom.h, icon = App.dom.icon, clear = App.dom.clear, D = App.dates;
  var store = App.store, domain = App.domain, c = App.ui.c;

  var FILTERS = [
    { id: 'open', label: 'Com chaves' },
    { id: 'late', label: 'Atrasadas' },
    { id: 'returned', label: 'Devolvidas' },
    { id: 'day', label: 'Tudo do dia' }
  ];

  function dayWord(day) { return day === D.today() ? 'hoje' : 'em ' + D.dm(D.parseDay(day)); }

  function listFor(filter, movs, day, now) {
    if (filter === 'open') return domain.openMovements(movs);
    if (filter === 'late') return domain.lateMovements(movs, now);
    if (filter === 'returned') return domain.returnedOn(movs, day);
    return domain.activityOn(movs, day);
  }

  function render(root, ctx) {
    var view = ctx.view, state = store.state, movs = state.movs, now = new Date();
    var counts = domain.boardCounts(state, now);

    var listBox = h('div', { class: 'stack' });
    var searchInput = h('input', {
      type: 'search', placeholder: 'Buscar nome ou nº da chave', value: view.search, 'aria-label': 'Buscar',
      autocomplete: 'off', enterkeyhint: 'search',
      oninput: function (e) { view.search = e.target.value; clearBtn.classList.toggle('is-hidden', !view.search); renderList(); }
    });
    var clearBtn = h('button', {
      class: 'search__clear' + (view.search ? '' : ' is-hidden'), type: 'button', 'aria-label': 'Limpar busca',
      onclick: function () { view.search = ''; searchInput.value = ''; clearBtn.classList.add('is-hidden'); renderList(); searchInput.focus(); }
    }, [icon('close')]);

    function cards(list) {
      return list.map(function (m) {
        return c.movementCard(m, {
          now: now,
          onOpen: function (mv) { App.sheets.movement(mv.id); },
          onReturn: function (mv) { App.actions.returnKeys(mv); }
        });
      });
    }

    function renderList() {
      clear(listBox);
      var q = view.search.trim();
      var list = listFor(view.homeFilter, movs, view.date, now).filter(function (m) { return domain.matches(m, q); });
      var heads = {
        open: ['Com quem estão agora', 'mais antigas primeiro'],
        late: ['Atrasadas', 'não voltaram no mesmo dia'],
        returned: ['Devolvidas ' + dayWord(view.date), ''],
        day: ['Movimentações ' + dayWord(view.date), 'retiradas e devoluções']
      }[view.homeFilter];
      listBox.appendChild(c.sectionHead(heads[0], heads[1]));

      if (!list.length) {
        if (q) listBox.appendChild(c.emptyState({ icon: 'search', title: 'Nada encontrado', text: 'Nenhum resultado para “' + q + '”.' }));
        else if (view.homeFilter === 'open') listBox.appendChild(c.emptyState({
          icon: 'check', title: 'Todas as chaves estão no quadro',
          text: 'Quando alguém pegar uma chave, ela aparece aqui com o nome da pessoa.',
          action: { label: 'Registrar retirada', run: function () { App.sheets.checkout(); } }
        }));
        else if (view.homeFilter === 'late') listBox.appendChild(c.emptyState({ icon: 'check', title: 'Nenhuma chave atrasada', text: 'Tudo em dia por aqui.' }));
        else listBox.appendChild(c.emptyState({ icon: 'inbox', title: 'Nada ' + dayWord(view.date), text: 'Troque a data no topo para ver outro dia.' }));
      }
      App.dom.append(listBox, cards(list));

      // Devolvidas do dia, recolhidas, abaixo das chaves em uso
      if (view.homeFilter === 'open') {
        var done = domain.returnedOn(movs, view.date).filter(function (m) { return domain.matches(m, q); });
        if (done.length) {
          listBox.appendChild(h('button', {
            class: 'collapse-toggle' + (view.showReturned ? ' is-open' : ''), type: 'button', 'aria-expanded': String(view.showReturned),
            onclick: function () { view.showReturned = !view.showReturned; renderList(); }
          }, [
            h('span', { class: 'row' }, [icon('check'), done.length + (done.length === 1 ? ' devolvida ' : ' devolvidas ') + dayWord(view.date)]),
            icon('chevronDown')
          ]));
          if (view.showReturned) App.dom.append(listBox, cards(done));
        }
      }
    }

    var filterCounts = {
      open: domain.openMovements(movs).length,
      late: domain.lateMovements(movs, now).length,
      returned: domain.returnedOn(movs, view.date).length,
      day: domain.activityOn(movs, view.date).length
    };

    App.dom.append(root, [
      c.header(state.settings.place || 'Controle de chaves', 'Chaves',
        c.datePill(view.date, function (d) { view.date = d; ctx.rerender(); })),
      h('div', { class: 'stack stack--lg' }, [
        h('div', { class: 'stats' }, [
          c.stat(counts.use, 'Chaves em uso', 'dark'),
          c.stat(counts.late, counts.late === 1 ? 'Atrasada' : 'Atrasadas', counts.late ? 'alert' : null),
          c.stat(counts.available, 'No quadro')
        ]),
        h('div', { class: 'search' }, [icon('search'), searchInput, clearBtn]),
        h('div', { class: 'chips no-scrollbar', role: 'toolbar', 'aria-label': 'Filtros' }, FILTERS.map(function (f) {
          return c.chip(f.label, {
            active: view.homeFilter === f.id, count: filterCounts[f.id],
            onClick: function () { view.homeFilter = f.id; ctx.rerender(); }
          });
        })),
        listBox
      ])
    ]);
    renderList();
  }

  App.screens = App.screens || {};
  App.screens.home = { render: render, hasCta: true };
})(window.App = window.App || {});
