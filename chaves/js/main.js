/* =========================================================
   Inicialização: navegação entre abas (com transição),
   botão central "+", botão "voltar" do Android e atualização
   automática a cada minuto.
   ========================================================= */
(function (App) {
  'use strict';
  var $ = App.dom.$, clear = App.dom.clear, D = App.dates, ui = App.ui, store = App.store, motion = App.motion;

  var TAB_ORDER = ['home', 'board', 'report', 'settings'];

  /** Estado da interface (não é gravado) */
  var view = {
    name: 'home',
    date: D.today(),
    homeFilter: 'open',
    homeMode: 'people',
    search: '',
    showReturned: false,
    boardOnlyOut: false,
    reportMonth: null,
    reportOlder: true
  };

  /**
   * ctx.mode diz às telas como animar:
   *  'nav'    — chegou trocando de aba (desliza + cascata + contadores do zero)
   *  'swap'   — mesma tela, conteúdo trocado (cascata)
   *  'update' — dados mudaram (só reposiciona suavemente, sem piscar)
   */
  var ctx = { view: view, mode: 'nav', rerender: function (mode) { render(mode || 'swap'); }, go: go };

  function draw(root) { clear(root); App.screens[view.name].render(root, ctx); }

  function render(mode, direction) {
    var root = $('screen');
    ctx.mode = mode || 'update';
    if (ctx.mode === 'update') motion.flip(root, function () { draw(root); });
    else draw(root);

    root.classList.remove('enter-left', 'enter-right');
    if (ctx.mode === 'nav' && direction && !motion.reduced) {
      void root.offsetWidth;
      root.classList.add(direction > 0 ? 'enter-right' : 'enter-left');
    }
    document.querySelectorAll('.tab').forEach(function (t) {
      var active = t.dataset.view === view.name;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function go(name) {
    if (view.name === name) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    var dir = TAB_ORDER.indexOf(name) - TAB_ORDER.indexOf(view.name);
    view.name = name;
    window.scrollTo({ top: 0, behavior: 'instant' });
    render('nav', dir);
    ui.vibrate(6);
  }

  function isTyping() {
    var el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
  }

  // ---------- Eventos globais ----------
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { go(t.dataset.view); });
  });
  $('fab').addEventListener('click', function () { App.sheets.checkout(); });

  store.subscribe(function () { render('update'); });
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
    if (!ui.hasOpen() && !isTyping()) render('update');
  }, 60000);

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  render('nav');
})(window.App = window.App || {});
