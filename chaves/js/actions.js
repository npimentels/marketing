/* Ações do usuário que alteram dados, sempre com retorno visual e "Desfazer" */
(function (App) {
  'use strict';
  var store = App.store, domain = App.domain, ui = App.ui;

  function undoable(snap, message) {
    return { label: 'Desfazer', run: function () { store.restore(snap); ui.toast(message); } };
  }

  /** Devolve as chaves (todas as abertas se keys não for informado) */
  function returnKeys(m, keys) {
    var snap = store.snapshot();
    var list = store.returnKeys(m.id, keys);
    if (!list.length) return;
    ui.vibrate();
    var who = domain.firstName(m.name);
    var msg = list.length === 1 ? who + ' devolveu a chave ' + list[0] : who + ' devolveu ' + list.length + ' chaves';
    ui.toast(msg, { tone: 'ok', action: undoable(snap, 'Devolução desfeita') });
  }

  function checkout(data) {
    var snap = store.snapshot();
    var m = store.checkout(data);
    ui.vibrate();
    var n = m.keys.length;
    ui.toast((n === 1 ? 'Chave ' + m.keys[0] : n + ' chaves') + ' com ' + domain.firstName(m.name),
      { tone: 'ok', action: undoable(snap, 'Retirada desfeita') });
    return m;
  }

  function update(id, data) {
    store.update(id, data);
    ui.toast('Alterações salvas', { tone: 'ok' });
  }

  function setLate(m, late) {
    store.setLate(m.id, late);
    ui.toast(late ? 'Marcada como atrasada' : 'Atraso removido', { tone: 'ok' });
  }

  function remove(m) {
    return ui.confirm({
      title: 'Excluir retirada?',
      text: m.name + ' · ' + m.keys.length + (m.keys.length === 1 ? ' chave' : ' chaves') + '. Ela sai do histórico e do relatório.',
      confirmLabel: 'Excluir', danger: true
    }).then(function (ok) {
      if (!ok) return false;
      var snap = store.snapshot();
      store.remove(m.id);
      ui.toast('Retirada excluída', { tone: 'ok', action: undoable(snap, 'Exclusão desfeita') });
      return true;
    });
  }

  App.actions = { returnKeys: returnKeys, checkout: checkout, update: update, setLate: setLate, remove: remove };
})(window.App = window.App || {});
