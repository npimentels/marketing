/* =========================================================
   Tela Quadro — todas as chaves por andar, com o nome de quem
   está com cada uma. Barra de andares fixa no topo que acompanha
   a rolagem.
   ========================================================= */
(function (App) {
  'use strict';
  var h = App.dom.h;
  var store = App.store, domain = App.domain, c = App.ui.c, motion = App.motion;

  var observer = null;

  function shortLabel(label) { return label.replace(/\s*andar\s*/i, '').trim() || label; }

  function floorSummary(use, late) {
    if (!use && !late) return { text: 'todas no quadro', late: false };
    var parts = [];
    if (use) parts.push(use + ' em uso');
    if (late) parts.push(late + (late === 1 ? ' atrasada' : ' atrasadas'));
    return { text: parts.join(' · '), late: late > 0 };
  }

  /** Destaca na barra o andar visível e mantém o chip à vista */
  function trackVisibleFloor(cards, chipsById, strip) {
    if (observer) observer.disconnect();
    if (!('IntersectionObserver' in window)) return;
    var visible = {};
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting ? e.boundingClientRect.top : null; });
      var best = null, bestTop = Infinity;
      Object.keys(visible).forEach(function (id) {
        var top = visible[id];
        if (top != null && Math.abs(top - 80) < bestTop) { bestTop = Math.abs(top - 80); best = id; }
      });
      if (!best) return;
      Object.keys(chipsById).forEach(function (id) { chipsById[id].classList.toggle('is-active', id === best); });
      var chip = chipsById[best];
      strip.scrollTo({ left: chip.offsetLeft - strip.clientWidth / 2 + chip.offsetWidth / 2, behavior: 'smooth' });
    }, { rootMargin: '-72px 0px -55% 0px', threshold: [0, 0.2, 0.6] });
    cards.forEach(function (card) { observer.observe(card); });
  }

  function render(root, ctx) {
    var view = ctx.view, state = store.state, floors = state.settings.floors, now = new Date();
    var holders = domain.keyHolders(state.movs);
    var counts = domain.boardCounts(state, now);

    var chipsById = {};
    var chipStrip = h('div', { class: 'chips no-scrollbar' });
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
      var id = 'floor-' + i, sum = floorSummary(use, late);
      var card = h('section', { class: 'floor-card', id: id, 'data-flip': id }, [
        h('div', { class: 'floor-card__head' }, [
          h('h2', { class: 'floor-card__title', text: f.label }),
          h('span', { class: 'floor-card__summary' + (sum.late ? ' is-late' : ''), text: sum.text })
        ]),
        h('div', { class: 'key-grid' }, tiles)
      ]);
      floorCards.push(card);
      chipsById[id] = c.chip(shortLabel(f.label), {
        small: true, extraClass: (use || late ? 'has-out' : '') + (late ? ' has-late' : ''),
        onClick: function () { card.scrollIntoView({ behavior: motion.reduced ? 'auto' : 'smooth', block: 'start' }); }
      });
      chipStrip.appendChild(chipsById[id]);
    });

    var content = floorCards.slice();
    if (!floors.length) {
      content.push(c.emptyState({ icon: 'board', title: 'Nenhum andar cadastrado', text: 'Cadastre os andares e apartamentos em Ajustes.',
        action: { label: 'Abrir Ajustes', run: function () { ctx.go('settings'); } } }));
    } else if (!floorCards.length) {
      content.push(c.emptyState({ icon: 'check', title: 'Todas as chaves estão no quadro', text: 'Nenhuma chave fora agora.' }));
    }

    var intro = [
      h('div', { class: 'legend' }, [
        h('span', { class: 'legend__item' }, [h('span', { class: 'legend__swatch' }), 'No quadro · ' + counts.available]),
        h('span', { class: 'legend__item' }, [h('span', { class: 'legend__swatch legend__swatch--use' }), 'Em uso · ' + counts.use]),
        h('span', { class: 'legend__item' }, [h('span', { class: 'legend__swatch legend__swatch--late' }), 'Atrasada · ' + counts.late])
      ]),
      c.segmented([
        { id: 'all', label: 'Todas as chaves' },
        { id: 'out', label: 'Só as que estão fora', count: counts.use + counts.late }
      ], view.boardOnlyOut ? 'out' : 'all', function (id) {
        view.boardOnlyOut = id === 'out';
        setTimeout(function () { ctx.rerender('swap'); }, 120);
      })
    ];

    App.dom.append(root, [
      c.header(floors.length + ' andares · ' + counts.total + ' chaves', 'Quadro de', 'chaves'),
      h('div', { class: 'stack stack--lg' }, intro.concat([
        floorCards.length ? h('div', { class: 'floor-strip' }, [chipStrip]) : null,
        h('div', { class: 'stack' }, content)
      ]))
    ]);

    if (ctx.mode !== 'update') {
      motion.stagger(intro, 'anim-rise');
      motion.stagger(content.slice(0, 4), 'anim-rise', 2);
    }
    trackVisibleFloor(floorCards, chipsById, chipStrip);
  }

  App.screens = App.screens || {};
  App.screens.board = { render: render };
})(window.App = window.App || {});
