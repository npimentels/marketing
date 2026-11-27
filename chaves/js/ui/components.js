/* Componentes visuais reutilizados pelas telas e folhas */
(function (App) {
  'use strict';
  var h = App.dom.h, icon = App.dom.icon, D = App.dates, domain = App.domain;

  /** Cabeçalho: sobrelinha, título com palavra em destaque (laranja) e ação */
  function header(eyebrow, title, highlight, action) {
    return h('header', { class: 'app-header' }, [
      h('div', { class: 'app-header__text' }, [
        h('div', { class: 'app-header__eyebrow', text: eyebrow }),
        h('h1', { class: 'app-header__title' }, [title + ' ', highlight ? h('em', { text: highlight }) : null])
      ]),
      action ? h('div', { class: 'app-header__action' }, [action]) : null
    ]);
  }

  function iconButton(name, label, onClick, variant) {
    return h('button', { class: 'icon-btn icon-btn--' + (variant || 'soft'), type: 'button', 'aria-label': label, onclick: onClick }, [icon(name)]);
  }

  function stat(value, label, variant, animKey, fromZero) {
    var valueEl = h('span', { class: 'stat__value' });
    if (animKey) App.motion.count(valueEl, animKey, value, fromZero); else valueEl.textContent = String(value);
    return h('div', { class: 'stat' + (variant ? ' stat--' + variant : '') }, [valueEl, h('span', { class: 'stat__label', text: label })]);
  }

  function chip(label, opts) {
    opts = opts || {};
    return h('button', {
      class: 'chip' + (opts.small ? ' chip--sm' : '') + (opts.accent ? ' chip--accent' : '') + (opts.active ? ' is-active' : '') + (opts.extraClass ? ' ' + opts.extraClass : ''),
      type: 'button', 'aria-pressed': opts.active ? 'true' : 'false', onclick: opts.onClick
    }, [opts.dot ? h('span', { class: 'chip__dot' }) : null, label]);
  }

  /**
   * Controle segmentado com indicador que desliza.
   * items: [{ id, label, count?, countLate? }] · onChange(id) é chamado já com a UI atualizada.
   */
  function segmented(items, activeId, onChange, opts) {
    opts = opts || {};
    var indicator = h('span', { class: 'segmented__indicator', 'aria-hidden': 'true' });
    var idx = Math.max(0, items.map(function (i) { return i.id; }).indexOf(activeId));
    var buttons = items.map(function (it, i) {
      return h('button', {
        class: 'segmented__btn' + (i === idx ? ' is-active' : ''), type: 'button', role: 'tab',
        'aria-selected': i === idx ? 'true' : 'false',
        onclick: function () {
          if (i === idx) return;
          idx = i;
          buttons.forEach(function (b, j) { b.classList.toggle('is-active', j === i); b.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
          place(true);
          App.ui.vibrate(6);
          onChange(it.id);
        }
      }, [
        h('span', { class: 'segmented__label', text: it.label }),
        it.count != null ? h('span', { class: 'segmented__count' + (it.countLate && it.count ? ' segmented__count--late' : ''), text: String(it.count) }) : null
      ]);
    });
    var el = h('div', { class: 'segmented' + (opts.dark ? ' segmented--dark' : '') + (opts.compact ? ' segmented--compact' : ''), role: 'tablist' }, [indicator].concat(buttons));

    function place(animate) {
      var b = buttons[idx];
      if (!b || !b.offsetWidth) return;
      if (!animate) indicator.style.transition = 'none';
      indicator.style.width = b.offsetWidth + 'px';
      indicator.style.transform = 'translateX(' + b.offsetLeft + 'px)';
      if (!animate) { void indicator.offsetWidth; indicator.style.transition = ''; }
    }
    el.__place = place;
    requestAnimationFrame(function () { place(false); });
    return el;
  }

  function sectionHead(title, right) {
    return h('div', { class: 'section-head' }, [
      h('h2', { class: 'section-head__title', text: title }),
      typeof right === 'string' ? h('span', { class: 'section-head__hint', text: right }) : right || null
    ]);
  }

  function avatar(m, size) {
    var st = domain.status(m);
    var variant = st === 'atrasada' ? ' avatar--late' : st === 'devolvida' ? ' avatar--done' : '';
    return h('span', { class: 'avatar' + variant + (size === 'lg' ? ' avatar--lg' : ''), 'aria-hidden': 'true', text: domain.initials(m.name) });
  }

  /** Texto curto do status: "há 2h15", "desde ontem", "devolvida 11:40" */
  function statusText(m, now) {
    var st = domain.status(m, now);
    if (st === 'devolvida') return 'Devolvida ' + D.when(domain.lastReturnAt(m));
    if (st === 'em_uso') { var t = D.elapsed(m.createdAt, now); return t === 'agora' ? 'Em uso agora' : 'Em uso há ' + t; }
    var days = D.daysBetween(D.dayKey(m.createdAt), D.dayKey(now || new Date()));
    return days === 0 ? 'Atrasada' : days === 1 ? 'Atrasada desde ontem' : 'Atrasada há ' + days + ' dias';
  }

  function statusBadge(m, now) {
    var st = domain.status(m, now);
    var cls = st === 'devolvida' ? 'badge--ok' : st === 'atrasada' ? 'badge--late' : 'badge--use is-pulsing';
    var text = st === 'devolvida' ? 'Devolvida' : st === 'atrasada' ? 'Atrasada' : D.elapsed(m.createdAt, now);
    return h('span', { class: 'badge ' + cls, text: text });
  }

  function keyTags(m, opts) {
    opts = opts || {};
    var late = domain.status(m) === 'atrasada';
    return h('div', { class: 'key-tags' }, m.keys.map(function (k) {
      var cls = 'key-tag' + (m.returned[k] ? ' key-tag--returned' : late ? ' key-tag--late' : '');
      return h('span', { class: cls, text: k, 'aria-label': 'Chave ' + k + (m.returned[k] ? ' devolvida' : '') });
    }));
  }

  /** Cartão "pessoa + chaves" — o principal da tela Início */
  function movementCard(m, opts) {
    var now = opts.now || new Date();
    var st = domain.status(m, now);
    var open = domain.openKeys(m).length;
    var meta = st === 'devolvida'
      ? ['Retirou ', h('strong', { text: D.when(m.createdAt) }), ' · devolveu ', h('strong', { text: D.when(domain.lastReturnAt(m)) })]
      : ['Retirou ', h('strong', { text: D.when(m.createdAt) })].concat(domain.isPartial(m) ? [' · ' + (m.keys.length - open) + '/' + m.keys.length + ' devolvidas'] : []);

    var card = h('article', {
      class: 'mov-card' + (st === 'atrasada' ? ' is-late' : '') + (st === 'devolvida' ? ' is-done' : ''),
      role: 'button', tabindex: '0', 'data-flip': 'mov-' + m.id,
      'aria-label': m.name + ' está com as chaves ' + domain.openKeys(m).join(', ') + '. ' + statusText(m, now),
      onclick: function () { opts.onOpen(m); },
      onkeydown: function (e) { if (e.key === 'Enter') opts.onOpen(m); }
    }, [
      h('div', { class: 'mov-card__head' }, [
        avatar(m),
        h('div', { class: 'mov-card__who' }, [
          h('div', { class: 'mov-card__name', text: m.name }),
          h('div', { class: 'mov-card__role', text: m.role || (m.keys.length + (m.keys.length === 1 ? ' chave' : ' chaves')) })
        ]),
        statusBadge(m, now)
      ]),
      h('div', { class: 'mov-card__label', text: st === 'devolvida' ? 'Chaves devolvidas' : 'Está com ' + (open === 1 ? 'a chave' : 'as chaves') }),
      keyTags(m),
      m.notes ? h('p', { class: 'mov-card__note', text: m.notes }) : null,
      h('div', { class: 'mov-card__foot' }, [
        h('div', { class: 'mov-card__meta' }, [icon('clock'), h('span', null, meta)]),
        st !== 'devolvida' && opts.onReturn ? h('button', {
          class: 'btn btn--accent btn--sm', type: 'button',
          text: open > 1 ? 'Devolver ' + open : 'Devolver',
          onclick: function (e) { e.stopPropagation(); opts.onReturn(m, card); }
        }) : null
      ])
    ]);
    return card;
  }

  /** Linha "chave -> pessoa" (visão por chave) */
  function keyRow(key, m, now, onClick) {
    var st = domain.status(m, now);
    var returnedAt = m.returned[key];
    var side = returnedAt ? ['Devolvida', D.when(returnedAt)]
      : st === 'atrasada' ? ['Atrasada', D.when(m.createdAt)]
      : D.elapsed(m.createdAt, now) === 'agora' ? ['Retirada', 'agora'] : ['Há', D.elapsed(m.createdAt, now)];
    return h('button', {
      class: 'key-row' + (st === 'atrasada' && !returnedAt ? ' is-late' : ''), type: 'button', 'data-flip': 'row-' + key,
      'aria-label': 'Chave ' + key + ' com ' + m.name, onclick: onClick
    }, [
      h('span', { class: 'key-row__num', text: key }),
      h('div', { class: 'key-row__main' }, [
        h('div', { class: 'key-row__name', text: m.name }),
        h('div', { class: 'key-row__sub', text: (m.role ? m.role + ' · ' : '') + 'retirou ' + D.when(m.createdAt) })
      ]),
      h('div', { class: 'key-row__side' }, [side[0], h('strong', { text: side[1] })])
    ]);
  }

  /** Quadradinho de chave. state: free | use | late | selected | busy | returned */
  function keyTile(key, state, caption, onClick) {
    return h('button', {
      class: 'key-tile' + (state && state !== 'free' ? ' is-' + state : ''), type: 'button',
      'data-flip': 'tile-' + key, 'data-flip-state': state || 'free',
      'aria-label': 'Chave ' + key + (caption ? ', ' + caption : ''), onclick: onClick
    }, [
      h('span', { class: 'key-tile__num', text: key }),
      h('span', { class: 'key-tile__who', text: caption || ' ' })
    ]);
  }

  function emptyState(o) {
    return h('div', { class: 'empty' }, [
      h('div', { class: 'empty__icon' }, [icon(o.icon || 'inbox')]),
      h('div', { class: 'empty__title', text: o.title }),
      o.text ? h('p', { class: 'empty__text', text: o.text }) : null,
      o.action ? h('button', { class: 'btn btn--accent btn--sm', text: o.action.label, onclick: o.action.run }) : null
    ]);
  }

  function field(label, control, hint) {
    return h('label', { class: 'field' }, [
      h('span', { class: 'field__label', text: label }),
      control,
      hint ? h('span', { class: 'field__hint', text: hint }) : null
    ]);
  }

  /** Título de etapa numerada: (1) Quem está pegando ............ extra */
  function stepTitle(num, label, extra) {
    return h('div', { class: 'step-title' }, [
      h('span', { class: 'step-title__label' }, [h('span', { class: 'step-title__num', text: String(num) }), label]),
      extra || null
    ]);
  }

  App.ui.c = {
    header: header, iconButton: iconButton, stat: stat, chip: chip, segmented: segmented, sectionHead: sectionHead,
    avatar: avatar, statusText: statusText, statusBadge: statusBadge, keyTags: keyTags, movementCard: movementCard,
    keyRow: keyRow, keyTile: keyTile, emptyState: emptyState, field: field, stepTitle: stepTitle
  };
})(window.App = window.App || {});
