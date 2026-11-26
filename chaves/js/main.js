/* =========================================================
   Inicialização: estado da navegação, abas, botão principal,
   botão "voltar" do Android e atualização automática.
   ========================================================= */
(function (App) {
  'use strict';
  var $ = App.dom.$, clear = App.dom.clear, D = App.dates, ui = App.ui, store = App.store;

  /** Estado da interface (não é gravado) */
  var view = {
    name: 'home',
    date: D.today(),
    homeFilter: 'open',
    search: '',
    showReturned: false,
    boardOnlyOut: false,
    reportOlder: true
  };

  var ctx = { view: view, rerender: render, go: go };

  function render() {
    var screen = App.screens[view.name];
    var root = $('screen');
    clear(root);
    screen.render(root, ctx);
    root.classList.toggle('has-cta', !!screen.hasCta);
    $('cta').classList.toggle('is-hidden', !screen.hasCta);
    document.querySelectorAll('.tab').forEach(function (t) {
      var active = t.dataset.view === view.name;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function go(name) {
    if (view.name === name) return;
    view.name = name;
    render();
    window.scrollTo(0, 0);
  }

  function isTyping() {
    var el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
  }

  // ---------- Eventos globais ----------
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { go(t.dataset.view); });
  });
  $('cta').addEventListener('click', function () { App.sheets.checkout(); });

  store.subscribe(function () { render(); });
  store.onSaveError = function () { ui.toast('Não foi possível salvar no aparelho', { tone: 'error' }); };

  /** Botão "voltar" do Android (chamado pelo APK): true = tratado aqui */
  window.__back = function () {
    if (ui.closeTop()) return true;
    if (view.name !== 'home') { go('home'); return true; }
    return false;
  };

  // A cada minuto: atualiza tempos ("2h15") e acompanha a virada do dia
  var lastToday = D.today();
  setInterval(function () {
    var t = D.today();
    if (t !== lastToday) { if (view.date === lastToday) view.date = t; lastToday = t; }
    if (!ui.hasOpen() && !isTyping()) render();
  }, 60000);

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  render();
})(window.App = window.App || {});
