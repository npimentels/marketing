/* =========================================================
   Tela Início — quem está com cada chave, agora.
   Duas visões: por pessoa (cartões) e por chave (lista).
   ========================================================= */
(function (App) {
  'use strict';
  var h = App.dom.h, icon = App.dom.icon, clear = App.dom.clear, D = App.dates;
  var store = App.store, domain = App.domain, c = App.ui.c, motion = App.motion;

  function listFor(filter, movs, now) {
    if (filter === 'late') return domain.lateMovements(movs, now);
    if (filter === 'returned') return domain.returnedOn(movs, D.today());
    return domain.openMovements(movs);
  }

  /** Linhas "chave -> pessoa", em ordem de andar */
  function keyRowsFor(list, filter, floors, now) {
    var pairs = [];
    list.forEach(function (m) {
      var keys = filter === 'returned' ? domain.returnedKeys(m) : domain.openKeys(m);
      keys.forEach(function (k) { pairs.push({ key: k, m: m }); });
    });
    var order = domain.sortKeys(pairs.map(function (p) { return p.key; }), floors);
    pairs.sort(function (a, b) { return order.indexOf(a.key) - order.indexOf(b.key); });
    return pairs.map(function (p) { return c.keyRow(p.key, p.m, now, function () { App.sheets.key(p.key); }); });
  }

  function hero(state, counts, ctx) {
    var out = counts.use + counts.late;
    var people = domain.openMovements(state.movs).length;
    var fraction = counts.total ? counts.available / counts.total : 1;
    var countEl = h('strong');
    motion.count(countEl, 'home-out', out, ctx.mode === 'nav');
    var text = out === 0 ? 'Todas as chaves estão no quadro'
      : people + (people === 1 ? ' pessoa' : ' pessoas') + (counts.late ? ' · ' + counts.late + (counts.late === 1 ? ' atrasada' : ' atrasadas') : ' · nenhuma atrasada');
    return h('section', { class: 'hero' }, [
      h('div', { class: 'hero__body' }, [
        h('span', { class: 'hero__eyebrow', text: D.shortDate(D.today()) }),
        h('p', { class: 'hero__title' }, [countEl, out === 1 ? 'chave fora do quadro' : 'chaves fora do quadro']),
        h('span', { class: 'hero__text', text: text }),
        h('button', { class: 'btn btn--accent btn--sm', type: 'button', onclick: function () { ctx.go('board'); } }, ['Ver quadro', icon('arrowRight')])
      ]),
      motion.ring('home', fraction, Math.round(fraction * 100) + '%', 'no quadro', ctx.mode === 'nav')
    ]);
  }

  function render(root, ctx) {
    var view = ctx.view, state = store.state, movs = state.movs, now = new Date();
    var counts = domain.boardCounts(state, now);
    var listBox = h('div', { class: 'stack' });

    // ---------- Busca ----------
    var searchInput = h('input', {
      type: 'search', placeholder: 'Buscar nome ou nº da chave', value: view.search, 'aria-label': 'Buscar',
      autocomplete: 'off', enterkeyhint: 'search',
      oninput: function (e) { view.search = e.target.value; clearBtn.classList.toggle('is-hidden', !view.search); renderList(false); }
    });
    var clearBtn = h('button', {
      class: 'search__clear' + (view.search ? '' : ' is-hidden'), type: 'button', 'aria-label': 'Limpar busca',
      onclick: function () { view.search = ''; searchInput.value = ''; clearBtn.classList.add('is-hidden'); renderList(true); }
    }, [icon('close')]);

    // ---------- Lista ----------
    function onReturn(m, cardEl) {
      motion.leave(cardEl).then(function () { App.actions.returnKeys(m); });
    }

    function renderList(animate) {
      clear(listBox);
      var q = view.search.trim();
      var list = listFor(view.homeFilter, movs, now).filter(function (m) { return domain.matches(m, q); });
      var items = [];

      if (!list.length) {
        if (q) items.push(c.emptyState({ icon: 'search', title: 'Nada encontrado', text: 'Nenhum resultado para “' + q + '”.' }));
        else if (view.homeFilter === 'open') items.push(c.emptyState({
          icon: 'check', title: 'Todas as chaves estão no quadro',
          text: 'Quando alguém pegar uma chave, ela aparece aqui com o nome da pessoa.',
          action: { label: 'Registrar retirada', run: function () { App.sheets.checkout(); } }
        }));
        else if (view.homeFilter === 'late') items.push(c.emptyState({ icon: 'check', title: 'Nenhuma chave atrasada', text: 'Tudo em dia por aqui.' }));
        else items.push(c.emptyState({ icon: 'inbox', title: 'Nenhuma devolução hoje', text: 'As chaves devolvidas hoje aparecem aqui.' }));
      } else if (view.homeMode === 'keys') {
        items.push(h('div', { class: 'card card--flush' }, [h('div', { class: 'key-rows' }, keyRowsFor(list, view.homeFilter, state.settings.floors, now))]));
      } else {
        list.forEach(function (m) {
          items.push(c.movementCard(m, { now: now, onOpen: function (mv) { App.sheets.movement(mv.id); }, onReturn: onReturn }));
        });
      }

      // Devolvidas hoje, recolhidas no fim da lista "com chaves"
      if (view.homeFilter === 'open' && view.homeMode === 'people') {
        var done = domain.returnedOn(movs, D.today()).filter(function (m) { return domain.matches(m, q); });
        if (done.length) {
          items.push(h('button', {
            class: 'collapse-toggle' + (view.showReturned ? ' is-open' : ''), type: 'button', 'aria-expanded': String(view.showReturned),
            onclick: function () { view.showReturned = !view.showReturned; motion.flip(listBox, function () { renderList(false); }); }
          }, [
            h('span', { class: 'row' }, [icon('check'), done.length + (done.length === 1 ? ' devolvida hoje' : ' devolvidas hoje')]),
            icon('chevronDown')
          ]));
          if (view.showReturned) done.forEach(function (m) { items.push(c.movementCard(m, { now: now, onOpen: function (mv) { App.sheets.movement(mv.id); } })); });
        }
      }

      App.dom.append(listBox, items);
      if (animate) motion.stagger(items, 'anim-rise');
    }

    var lateCount = domain.lateMovements(movs, now).length;
    var blocks = [
      hero(state, counts, ctx),
      h('div', { class: 'search' }, [icon('search'), searchInput, clearBtn]),
      c.sectionHead('Com quem estão', c.segmented([
        { id: 'people', label: 'Pessoas' }, { id: 'keys', label: 'Chaves' }
      ], view.homeMode, function (id) { view.homeMode = id; renderList(true); }, { compact: true })),
      c.segmented([
        { id: 'open', label: 'Com chaves', count: domain.openMovements(movs).length },
        { id: 'late', label: 'Atrasadas', count: lateCount, countLate: true },
        { id: 'returned', label: 'Devolvidas', count: domain.returnedOn(movs, D.today()).length }
      ], view.homeFilter, function (id) { view.homeFilter = id; renderList(true); }),
      listBox
    ];

    App.dom.append(root, [
      c.header(state.settings.place || 'Controle de chaves', 'Controle de', 'Chaves',
        h('div', { class: 'row' }, [
          lateCount ? h('span', { class: 'sr-only', text: lateCount + ' atrasadas' }) : null,
          bellButton(lateCount, function () { view.homeFilter = 'late'; ctx.rerender(); })
        ])),
      h('div', { class: 'stack stack--lg' }, blocks)
    ]);
    renderList(ctx.mode === 'nav');
    if (ctx.mode === 'nav') motion.stagger(blocks.slice(0, 4), 'anim-rise');
  }

  /** Sino com bolinha laranja quando há atrasadas (atalho para o filtro) */
  function bellButton(lateCount, onClick) {
    var btn = c.iconButton('bell', lateCount ? 'Ver ' + lateCount + ' atrasadas' : 'Sem atrasos', onClick);
    if (lateCount) btn.appendChild(h('span', { class: 'bell-dot', 'aria-hidden': 'true' }));
    return btn;
  }

  App.screens = App.screens || {};
  App.screens.home = { render: render };
})(window.App = window.App || {});
