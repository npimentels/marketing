/* Tela Ajustes — local, andares/apartamentos e backup */
(function (App) {
  'use strict';
  var h = App.dom.h, icon = App.dom.icon, D = App.dates;
  var store = App.store, domain = App.domain, storage = App.storage, ui = App.ui, c = App.ui.c, platform = App.platform;

  var APP_VERSION = '2.0';

  function numberInput(value, min) {
    return h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: String(min), value: String(value) });
  }

  function render(root) {
    var settings = store.state.settings;

    // ---------- Local ----------
    var placeInput = h('input', { class: 'input', type: 'text', placeholder: 'Ex.: Residencial Aurora', value: settings.place,
      onchange: function (e) { store.updateSettings({ place: e.target.value.trim() }); ui.toast('Nome salvo', { tone: 'ok' }); } });

    // ---------- Andares ----------
    var fromIn = numberInput(1, 0), toIn = numberInput(settings.floors.length || 16, 0), perIn = numberInput(settings.floors.length ? settings.floors[0].keys.length : 8, 1);
    var floorsText = h('textarea', { class: 'input input--mono', rows: '8', spellcheck: 'false', autocapitalize: 'off' });
    floorsText.value = domain.floorsToText(settings.floors);

    function generate() {
      var from = parseInt(fromIn.value, 10), to = parseInt(toIn.value, 10), per = parseInt(perIn.value, 10);
      if ([from, to, per].some(isNaN) || to < from || per < 1 || per > 99 || to - from > 200) {
        ui.toast('Confira os números de andares e apartamentos', { tone: 'error' });
        return;
      }
      floorsText.value = domain.floorsToText(domain.generateFloors(from, to, per));
      ui.toast('Lista gerada — toque em Salvar lista');
    }

    function saveFloors() {
      var floors = domain.textToFloors(floorsText.value);
      if (!floors.length) { ui.toast('Informe ao menos um andar com chaves', { tone: 'error' }); return; }
      var all = domain.allKeys(floors), seen = {}, dup = all.filter(function (k) { var d = seen[k]; seen[k] = 1; return d; });
      if (dup.length) { ui.toast('Chave repetida: ' + dup[0], { tone: 'error' }); return; }
      store.updateSettings({ floors: floors });
      ui.toast(floors.length + ' andares · ' + all.length + ' chaves salvos', { tone: 'ok' });
    }

    // ---------- Backup ----------
    function exportBackup() {
      platform.saveFile(platform.textToBytes(storage.toBackup(store.state)), 'backup-chaves-' + D.today() + '.json', 'application/json');
    }
    var fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'is-hidden',
      onchange: function (e) {
        var file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var data;
          try { data = storage.fromBackup(reader.result); }
          catch (err) { ui.toast('Arquivo de backup inválido', { tone: 'error' }); return; }
          ui.confirm({ title: 'Restaurar backup?', text: 'Os dados atuais serão substituídos por ' + data.movs.length + ' retiradas do arquivo.', confirmLabel: 'Restaurar' })
            .then(function (ok) { if (ok) { store.replaceAll(data); ui.toast('Backup restaurado', { tone: 'ok' }); } });
        };
        reader.readAsText(file);
      } });

    function clearAll() {
      ui.confirm({ title: 'Apagar todas as retiradas?', text: 'O histórico inteiro será apagado. Os andares e ajustes continuam. Faça um backup antes.', confirmLabel: 'Apagar tudo', danger: true })
        .then(function (ok) { if (ok) { store.clearMovements(); ui.toast('Retiradas apagadas', { tone: 'ok' }); } });
    }

    App.dom.append(root, [
      c.header('Configurações', 'Ajustes'),
      h('div', { class: 'stack stack--lg' }, [
        h('section', { class: 'card stack' }, [
          h('h2', { class: 'card__title', text: 'Local' }),
          c.field('Nome do prédio ou serviço', placeInput, 'Aparece no topo e no relatório.')
        ]),
        h('section', { class: 'card stack' }, [
          h('div', null, [
            h('h2', { class: 'card__title', text: 'Andares e apartamentos' }),
            h('p', { class: 'card__text', text: 'Gere a lista automaticamente ou edite à mão: uma linha por andar, no formato “1º andar: 101, 102”.' })
          ]),
          h('div', { class: 'grid-3' }, [c.field('1º andar', fromIn), c.field('Último', toIn), c.field('Aptos/andar', perIn)]),
          h('button', { class: 'btn btn--secondary btn--block', type: 'button', text: 'Gerar lista', onclick: generate }),
          c.field('Lista de chaves', floorsText),
          h('button', { class: 'btn btn--primary btn--block', type: 'button', text: 'Salvar lista', onclick: saveFloors })
        ]),
        h('section', { class: 'card stack' }, [
          h('div', null, [
            h('h2', { class: 'card__title', text: 'Backup' }),
            h('p', { class: 'card__text', text: 'Os dados ficam só neste aparelho. Exporte um backup de vez em quando.' })
          ]),
          h('div', { class: 'btn-row' }, [
            h('button', { class: 'btn btn--outline', type: 'button', onclick: exportBackup }, [icon('download'), 'Exportar']),
            h('button', { class: 'btn btn--outline', type: 'button', onclick: function () { fileInput.click(); } }, [icon('inbox'), 'Importar']),
            fileInput
          ])
        ]),
        h('section', { class: 'card stack' }, [
          h('h2', { class: 'card__title', text: 'Apagar dados' }),
          h('button', { class: 'btn btn--danger btn--block', type: 'button', onclick: clearAll }, [icon('trash'), 'Apagar todas as retiradas'])
        ]),
        h('p', { class: 'footnote', text: 'Controle de Chaves · versão ' + APP_VERSION })
      ])
    ]);
  }

  App.screens = App.screens || {};
  App.screens.settings = { render: render, hasCta: false };
})(window.App = window.App || {});
