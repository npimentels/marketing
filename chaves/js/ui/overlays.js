/* =========================================================
   Camadas sobrepostas: folha inferior (sheet), diálogo de
   confirmação e aviso (toast). Mantém uma pilha para o botão
   "voltar" do Android fechar sempre a camada de cima.
   ========================================================= */
(function (App) {
  'use strict';
  var h = App.dom.h, icon = App.dom.icon;

  // ---------- Pilha de camadas ----------
  var stack = [];
  function pushLayer(close) { stack.push(close); document.body.classList.add('is-locked'); }
  function removeLayer(close) {
    stack = stack.filter(function (c) { return c !== close; });
    if (!stack.length) document.body.classList.remove('is-locked');
  }
  /** Fecha a camada de cima. Retorna false se não havia nenhuma. */
  function closeTop() {
    if (!stack.length) return false;
    stack[stack.length - 1]();
    return true;
  }
  function hasOpen() { return stack.length > 0; }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeTop(); });

  // ---------- Arrastar para baixo para fechar ----------
  function enableDragToClose(root, panel, backdrop, handles, close) {
    var startY = 0, dy = 0, lastY = 0, lastT = 0, velocity = 0, dragging = false;

    function onDown(e) {
      if (e.button > 0 || (e.target.closest && e.target.closest('button'))) return;
      dragging = true; startY = lastY = e.clientY; lastT = performance.now(); dy = 0; velocity = 0;
      root.classList.add('is-dragging');
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    function onMove(e) {
      if (!dragging) return;
      var raw = e.clientY - startY;
      dy = raw > 0 ? raw : raw * 0.25;                       // resistência para cima
      var now = performance.now();
      velocity = (e.clientY - lastY) / Math.max(1, now - lastT);
      lastY = e.clientY; lastT = now;
      panel.style.transform = 'translateY(' + dy + 'px)';
      backdrop.style.opacity = String(Math.max(0, 1 - Math.max(0, dy) / panel.offsetHeight));
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      root.classList.remove('is-dragging');
      panel.style.transform = '';
      backdrop.style.opacity = '';
      if (dy > panel.offsetHeight * 0.28 || velocity > 0.55) close();
    }
    handles.forEach(function (el) {
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });
  }

  // ---------- Folha inferior ----------
  /**
   * openSheet({ title, body: [nós], foot: [nós], onClose })
   * Retorna { close, panel, setBody(nós), setFoot(nós) }
   */
  function openSheet(opts) {
    var body = h('div', { class: 'sheet__body' });
    var foot = h('div', { class: 'sheet__foot' });
    var root, closed = false;

    function close() {
      if (closed) return;
      closed = true;
      removeLayer(close);
      root.classList.remove('is-dragging');
      root.classList.remove('is-open');
      setTimeout(function () { root.remove(); }, 420);
      if (opts.onClose) opts.onClose();
    }

    var grabZone = h('div', { class: 'sheet__grab-zone' }, [h('div', { class: 'sheet__grab' })]);
    var head = h('div', { class: 'sheet__head' }, [
      h('h2', { class: 'sheet__title', text: opts.title }),
      h('button', { class: 'sheet__close', 'aria-label': 'Fechar', onclick: close }, [icon('close')])
    ]);
    var panel = h('div', { class: 'sheet__panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title }, [grabZone, head, body, foot]);
    var backdrop = h('div', { class: 'sheet__backdrop', onclick: close });
    root = h('div', { class: 'sheet' }, [backdrop, panel]);
    enableDragToClose(root, panel, backdrop, [grabZone, head], close);

    function setBody(nodes) { App.dom.append(App.dom.clear(body), nodes); }
    function setFoot(nodes) {
      App.dom.append(App.dom.clear(foot), nodes);
      foot.classList.toggle('is-hidden', !nodes || !nodes.length);
    }
    setBody(opts.body || []);
    setFoot(opts.foot || []);

    document.body.appendChild(root);
    pushLayer(close);
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('is-open'); }); });
    return { close: close, panel: panel, body: body, setBody: setBody, setFoot: setFoot };
  }

  // ---------- Diálogo de confirmação ----------
  /** confirm({ title, text, confirmLabel, danger }) -> Promise<boolean> */
  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var root;
      function done(result) {
        removeLayer(cancel);
        root.remove();
        resolve(result);
      }
      function cancel() { done(false); }
      var ok = h('button', { class: 'btn ' + (opts.danger ? 'btn--danger-solid' : 'btn--primary'), text: opts.confirmLabel || 'Confirmar', onclick: function () { done(true); } });
      root = h('div', { class: 'dialog', role: 'alertdialog', 'aria-modal': 'true' }, [
        h('div', { class: 'dialog__backdrop', onclick: cancel }),
        h('div', { class: 'dialog__panel' }, [
          h('h2', { class: 'dialog__title', text: opts.title }),
          opts.text ? h('p', { class: 'dialog__text', text: opts.text }) : null,
          h('div', { class: 'btn-row' }, [h('button', { class: 'btn btn--secondary', text: 'Cancelar', onclick: cancel }), ok])
        ])
      ]);
      document.body.appendChild(root);
      pushLayer(cancel);
      ok.focus({ preventScroll: true });
    });
  }

  // ---------- Aviso (toast) ----------
  var toastEl = null, toastTimer = null;

  /** toast('Mensagem', { tone: 'ok'|'error', action: { label, run } }) */
  function toast(message, opts) {
    opts = opts || {};
    if (toastEl) toastEl.remove();
    clearTimeout(toastTimer);
    var el = h('div', { class: 'toast' + (opts.tone === 'error' ? ' toast--error' : ''), role: 'status', 'aria-live': 'polite' }, [
      opts.tone ? h('span', { class: 'toast__icon' }, [icon(opts.tone === 'error' ? 'close' : 'check')]) : null,
      h('span', { class: 'toast__text', text: message }),
      opts.action ? h('button', {
        class: 'toast__action', text: opts.action.label,
        onclick: function () { hide(); opts.action.run(); }
      }) : null
    ]);
    function hide() {
      el.classList.remove('is-visible');
      setTimeout(function () { el.remove(); if (toastEl === el) toastEl = null; }, 200);
    }
    toastEl = el;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-visible'); });
    toastTimer = setTimeout(hide, opts.action ? 5000 : 2600);
  }

  function vibrate(ms) { if (navigator.vibrate) navigator.vibrate(ms || 12); }

  App.ui = { openSheet: openSheet, confirm: confirmDialog, toast: toast, vibrate: vibrate, closeTop: closeTop, hasOpen: hasOpen };
})(window.App = window.App || {});
