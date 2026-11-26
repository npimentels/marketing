/* Componentes visuais reutilizados pelas telas e folhas */
(function (App) {
  'use strict';
  var h = App.dom.h, icon = App.dom.icon, D = App.dates, domain = App.domain;

  /** Cabeçalho de tela: sobrelinha, título e ação à direita */
  function header(eyebrow, title, action) {
    return h('header', { class: 'app-header' }, [
      h('div', { class: 'app-header__text' }, [
        h('div', { class: 'app-header__eyebrow', text: eyebrow }),
        h('h1', { class: 'app-header__title', text: title })
      ]),
      action ? h('div', { class: 'app-header__action' }, [action]) : null
    ]);
  }

  /** Pílula com a data; toca para abrir o calendário nativo */
  function datePill(day, onChange) {
    var input = h('input', {
      type: 'date', value: day, max: D.today(), 'aria-label': 'Escolher data',
      onchange: function (e) {
        var v = e.target.value;
        if (v) onChange(v > D.today() ? D.today() : v);
      }
    });
    return h('label', { class: 'pill' }, [icon('calendar'), D.shortDate(day), icon('chevronDown'), input]);
  }

  function stat(value, label, variant) {
    return h('div', { class: 'stat' + (variant ? ' stat--' + variant : '') }, [
      h('span', { class: 'stat__value', text: String(value) }),
      h('span', { class: 'stat__label', text: label })
    ]);
  }

  function chip(label, opts) {
    opts = opts || {};
    return h('button', {
      class: 'chip' + (opts.small ? ' chip--sm' : '') + (opts.active ? ' is-active' : ''),
      type: 'button', 'aria-pressed': opts.active ? 'true' : 'false', onclick: opts.onClick
    }, [
      opts.dot ? h('span', { class: 'chip__dot' }) : null,
      label,
      opts.count != null ? h('span', { class: 'chip__count', text: String(opts.count) }) : null
    ]);
  }

  function sectionHead(title, hint) {
    return h('div', { class: 'section-head' }, [
      h('span', { class: 'section-head__title', text: title }),
      hint ? h('span', { class: 'section-head__hint', text: hint }) : null
    ]);
  }

  function avatar(m, size) {
    var st = domain.status(m);
    var variant = st === 'atrasada' ? ' avatar--alert' : st === 'devolvida' ? ' avatar--muted' : '';
    return h('span', { class: 'avatar' + variant + (size === 'lg' ? ' avatar--lg' : ''), 'aria-hidden': 'true', text: domain.initials(m.name) });
  }

  /** Selo com status e tempo: "Em uso · 2h15", "Atrasada · desde ontem", "Devolvida" */
  function statusBadge(m, now) {
    var st = domain.status(m, now);
    if (st === 'devolvida') return h('span', { class: 'badge badge--ok' }, ['Devolvida']);
    if (st === 'em_uso') return h('span', { class: 'badge badge--use' }, ['Em uso · ' + D.elapsed(m.createdAt, now)]);
    var days = D.daysBetween(D.dayKey(m.createdAt), D.dayKey(now || new Date()));
    var since = days === 0 ? '' : days === 1 ? ' · desde ontem' : ' · há ' + days + ' dias';
    return h('span', { class: 'badge badge--late' }, ['Atrasada' + since]);
  }

  function keyTags(m) {
    return h('div', { class: 'key-tags' }, m.keys.map(function (k) {
      return h('span', { class: 'key-tag' + (m.returned[k] ? ' key-tag--returned' : ''), text: k });
    }));
  }

  /** Cartão "quem está com quais chaves" */
  function movementCard(m, opts) {
    var now = opts.now || new Date();
    var st = domain.status(m, now);
    var open = domain.openKeys(m).length;
    var meta = [h('span', null, ['Retirou ', h('strong', { text: D.when(m.createdAt) })])];
    if (st === 'devolvida') meta.push(h('span', null, [' · Devolveu ', h('strong', { text: D.when(domain.lastReturnAt(m)) })]));
    else if (domain.isPartial(m)) meta.push(h('span', null, [' · ' + (m.keys.length - open) + ' de ' + m.keys.length + ' devolvidas']));

    return h('article', {
      class: 'mov-card' + (st === 'atrasada' ? ' is-late' : '') + (st === 'devolvida' ? ' is-done' : ''),
      role: 'button', tabindex: '0', 'aria-label': m.name + ', ' + domain.STATUS_LABEL[st],
      onclick: function () { opts.onOpen(m); },
      onkeydown: function (e) { if (e.key === 'Enter') opts.onOpen(m); }
    }, [
      h('div', { class: 'mov-card__head' }, [
        avatar(m),
        h('div', { class: 'mov-card__who' }, [
          h('div', { class: 'mov-card__name', text: m.name }),
          m.role ? h('div', { class: 'mov-card__role', text: m.role }) : null
        ]),
        statusBadge(m, now)
      ]),
      keyTags(m),
      m.notes ? h('p', { class: 'mov-card__note', text: m.notes }) : null,
      h('div', { class: 'mov-card__foot' }, [
        h('div', { class: 'mov-card__meta' }, meta),
        st !== 'devolvida' && opts.onReturn ? h('button', {
          class: 'btn btn--primary btn--sm', type: 'button',
          text: open > 1 ? 'Devolver ' + open : 'Devolver',
          onclick: function (e) { e.stopPropagation(); opts.onReturn(m); }
        }) : null
      ])
    ]);
  }

  /**
   * Quadradinho de chave.
   * state: 'free' | 'use' | 'late' | 'selected' | 'busy' | 'returned'
   */
  function keyTile(key, state, caption, onClick) {
    var cls = 'key-tile' + (state && state !== 'free' ? ' is-' + state : '');
    return h('button', { class: cls, type: 'button', 'aria-label': 'Chave ' + key + (caption ? ', ' + caption : ''), onclick: onClick }, [
      h('span', { class: 'key-tile__num', text: key }),
      h('span', { class: 'key-tile__who', text: caption || ' ' })
    ]);
  }

  /** Estado vazio com ícone, texto e ação opcional */
  function emptyState(o) {
    return h('div', { class: 'empty' }, [
      h('div', { class: 'empty__icon' }, [icon(o.icon || 'inbox')]),
      h('div', { class: 'empty__title', text: o.title }),
      o.text ? h('p', { class: 'empty__text', text: o.text }) : null,
      o.action ? h('button', { class: 'btn btn--primary btn--sm', text: o.action.label, onclick: o.action.run }) : null
    ]);
  }

  function field(label, control, hint) {
    return h('label', { class: 'field' }, [
      h('span', { class: 'field__label', text: label }),
      control,
      hint ? h('span', { class: 'field__hint', text: hint }) : null
    ]);
  }

  App.ui.c = {
    header: header, datePill: datePill, stat: stat, chip: chip, sectionHead: sectionHead,
    avatar: avatar, statusBadge: statusBadge, keyTags: keyTags, movementCard: movementCard,
    keyTile: keyTile, emptyState: emptyState, field: field
  };
})(window.App = window.App || {});
