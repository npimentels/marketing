/* =========================================================
   Movimento: entradas em cascata, reposicionamento suave (FLIP),
   contadores animados, anel de progresso e saída de cartões.
   Usa só transform/opacity para rodar liso em qualquer celular.
   ========================================================= */
(function (App) {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE_OUT = 'cubic-bezier(.22, 1, .36, 1)';
  var EASE_SPRING = 'cubic-bezier(.34, 1.4, .64, 1)';

  function canAnimate(el) { return !reduced && el && typeof el.animate === 'function'; }

  /** Entrada em cascata: cada nó recebe a classe e um atraso pela posição */
  function stagger(nodes, cls, start) {
    if (reduced) return nodes;
    (nodes || []).forEach(function (n, i) {
      if (!n || n.nodeType !== 1) return;
      n.classList.add(cls || 'anim-rise');
      n.style.setProperty('--i', String((start || 0) + i));
      n.addEventListener('animationend', function done() {
        n.classList.remove(cls || 'anim-rise');
        n.removeEventListener('animationend', done);
      });
    });
    return nodes;
  }

  /**
   * Redesenha mantendo a continuidade visual (técnica FLIP):
   * elementos com o mesmo data-flip deslizam da posição antiga para a nova;
   * os novos surgem com um "pop"; se data-flip-state mudou, pulsam.
   */
  function flip(container, renderFn) {
    if (reduced) { renderFn(); return; }
    var before = {};
    container.querySelectorAll('[data-flip]').forEach(function (el) {
      before[el.getAttribute('data-flip')] = { rect: el.getBoundingClientRect(), state: el.getAttribute('data-flip-state') };
    });
    renderFn();
    var vh = window.innerHeight;
    container.querySelectorAll('[data-flip]').forEach(function (el) {
      var old = before[el.getAttribute('data-flip')];
      if (!canAnimate(el)) return;
      var now = el.getBoundingClientRect();
      if (now.bottom < -200 || now.top > vh + 200) return;           // fora da tela: não gasta
      if (!old) {
        el.animate([{ opacity: 0, transform: 'scale(.94) translateY(8px)' }, { opacity: 1, transform: 'none' }],
          { duration: 420, easing: EASE_SPRING });
        return;
      }
      var dx = old.rect.left - now.left, dy = old.rect.top - now.top;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
          { duration: 480, easing: EASE_OUT });
      }
      if (old.state != null && old.state !== el.getAttribute('data-flip-state')) {
        el.animate([{ transform: 'scale(.8)' }, { transform: 'scale(1.08)', offset: .6 }, { transform: 'scale(1)' }],
          { duration: 520, easing: EASE_OUT });
      }
    });
  }

  /** Saída de um cartão (desliza e encolhe). Resolve quando termina. */
  function leave(el) {
    if (!canAnimate(el)) return Promise.resolve();
    var h = el.offsetHeight;
    el.style.overflow = 'hidden';
    var a = el.animate([
      { opacity: 1, transform: 'none', height: h + 'px' },
      { opacity: 0, transform: 'translateX(48px) scale(.96)', height: h + 'px', offset: .55 },
      { opacity: 0, transform: 'translateX(48px) scale(.96)', height: '0px', paddingTop: '0px', paddingBottom: '0px', marginBottom: '-12px' }
    ], { duration: 420, easing: EASE_OUT, fill: 'forwards' });
    return new Promise(function (resolve) { a.onfinish = resolve; a.oncancel = resolve; });
  }

  /** Sacode um elemento (ex.: tentativa inválida) */
  function shake(el) {
    if (!el || reduced) return;
    el.classList.remove('anim-shake');
    void el.offsetWidth;
    el.classList.add('anim-shake');
  }

  // ---------- Números e anel que lembram o último valor ----------
  var lastValues = {};

  /** Conta de "de" até o valor (de 0 quando fromZero) */
  function count(el, key, value, fromZero) {
    var from = fromZero || lastValues[key] == null ? 0 : lastValues[key];
    lastValues[key] = value;
    if (reduced || from === value) { el.textContent = String(value); return el; }
    var start = null, dur = 700;
    el.textContent = String(from);
    function step(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(from + (value - from) * e));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    return el;
  }

  /** Anel de progresso SVG (0..1) */
  function ring(key, fraction, label, caption, fromZero) {
    var R = 40, C = 2 * Math.PI * R;
    var prev = fromZero || lastValues['ring:' + key] == null ? 0 : lastValues['ring:' + key];
    lastValues['ring:' + key] = fraction;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    var track = document.createElementNS(ns, 'circle');
    var bar = document.createElementNS(ns, 'circle');
    [track, bar].forEach(function (c) { c.setAttribute('cx', '50'); c.setAttribute('cy', '50'); c.setAttribute('r', String(R)); svg.appendChild(c); });
    track.setAttribute('class', 'ring__track');
    bar.setAttribute('class', 'ring__bar');
    bar.style.strokeDasharray = String(C);
    bar.style.strokeDashoffset = String(C * (1 - (reduced ? fraction : prev)));
    if (!reduced) requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.strokeDashoffset = String(C * (1 - fraction)); }); });
    var h = App.dom.h;
    return h('div', { class: 'ring', role: 'img', 'aria-label': label + ' ' + caption }, [
      svg,
      h('div', { class: 'ring__label' }, [h('span', { class: 'ring__value', text: label }), h('span', { class: 'ring__caption', text: caption })])
    ]);
  }

  // ---------- Controles segmentados: reposiciona o indicador ao redimensionar ----------
  window.addEventListener('resize', function () {
    document.querySelectorAll('.segmented').forEach(function (s) { if (s.__place) s.__place(false); });
  });

  App.motion = { reduced: reduced, stagger: stagger, flip: flip, leave: leave, shake: shake, count: count, ring: ring };
})(window.App = window.App || {});
