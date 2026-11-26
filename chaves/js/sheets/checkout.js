/* =========================================================
   Folha "Nova retirada" / "Editar retirada" em 3 etapas:
   1) quem está pegando  2) quais chaves  3) observação
   ========================================================= */
(function (App) {
  'use strict';
  var h = App.dom.h, icon = App.dom.icon, clear = App.dom.clear, append = App.dom.append;
  var store = App.store, domain = App.domain, ui = App.ui, c = App.ui.c;

  function shortFloorLabel(label) { return label.replace(/\s*andar\s*/i, '').trim() || label; }

  /** opts: { id?: string (editar), presetKeys?: string[] } */
  function open(opts) {
    opts = opts || {};
    var state = store.state, floors = state.settings.floors;
    var editing = opts.id ? store.find(opts.id) : null;
    var holders = domain.keyHolders(state.movs, editing && editing.id);
    var people = domain.knownPeople(state.movs);
    var selected = (editing ? editing.keys : (opts.presetKeys || [])).slice();
    var firstIdx = selected.length ? domain.floorIndexOf(selected[0], floors) : 0;
    var floorIdx = firstIdx >= 0 ? firstIdx : 0;

    // ---------- Etapa 1: pessoa ----------
    var nameInput = h('input', {
      class: 'input', type: 'text', placeholder: 'Nome completo', autocomplete: 'off', autocapitalize: 'words',
      value: editing ? editing.name : '', oninput: function () { renderSuggestions(); renderSubmit(); }
    });
    var roleInput = h('input', {
      class: 'input', type: 'text', placeholder: 'Empresa ou função (opcional)', autocomplete: 'off',
      value: editing ? editing.role : ''
    });
    var suggestionsBox = h('div', { class: 'suggestions' });

    function renderSuggestions() {
      var q = domain.norm(nameInput.value);
      var list = people.filter(function (p) {
        var n = domain.norm(p.name);
        return q ? n.indexOf(q) >= 0 && n !== q : true;
      }).slice(0, 4);
      clear(suggestionsBox);
      suggestionsBox.classList.toggle('is-hidden', !list.length || !!editing);
      list.forEach(function (p) {
        suggestionsBox.appendChild(c.chip(p.name + (p.role ? ' · ' + p.role : ''), {
          small: true,
          onClick: function () {
            nameInput.value = p.name;
            if (p.role) roleInput.value = p.role;
            renderSuggestions(); renderSubmit();
          }
        }));
      });
    }

    // ---------- Etapa 2: chaves ----------
    var countEl = h('span', { class: 'step-title__count' });
    var selectedBox = h('div', { class: 'key-tags' });
    var floorTabs = h('div', { class: 'chips no-scrollbar' });
    var floorHead = h('div', { class: 'row row--between' });
    var grid = h('div', { class: 'key-grid' });
    var quickInput = h('input', {
      class: 'input', type: 'text', inputmode: 'numeric', placeholder: 'Ou digite o nº da chave',
      autocomplete: 'off', enterkeyhint: 'done',
      onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); addTyped(); } }
    });

    function toggleKey(k) {
      var i = selected.indexOf(k);
      if (i >= 0) selected.splice(i, 1); else selected.push(k);
      renderKeys();
    }

    function tryAdd(k) {
      if (holders[k]) {
        ui.toast('Chave ' + k + ' está com ' + holders[k].name, { tone: 'error' });
        return false;
      }
      if (selected.indexOf(k) < 0) selected.push(k);
      return true;
    }

    function addTyped() {
      var k = quickInput.value.trim();
      if (!k) return;
      var idx = domain.floorIndexOf(k, floors);
      if (idx < 0) { ui.toast('Chave ' + k + ' não existe na lista', { tone: 'error' }); return; }
      if (tryAdd(k)) { floorIdx = idx; quickInput.value = ''; renderKeys(); }
    }

    function renderKeys() {
      var sortedSel = domain.sortKeys(selected, floors);
      var n = selected.length;
      countEl.textContent = n ? n + (n === 1 ? ' selecionada' : ' selecionadas') : '';

      clear(selectedBox);
      if (!n) selectedBox.appendChild(h('span', { class: 'field__hint', text: 'Toque nas chaves abaixo para selecionar.' }));
      sortedSel.forEach(function (k) {
        selectedBox.appendChild(h('button', {
          class: 'key-tag key-tag--selected', type: 'button', 'aria-label': 'Remover chave ' + k,
          onclick: function () { toggleKey(k); }
        }, [k, icon('close')]));
      });

      clear(floorTabs);
      floors.forEach(function (f, i) {
        var inFloor = f.keys.filter(function (k) { return selected.indexOf(k) >= 0; }).length;
        floorTabs.appendChild(c.chip(shortFloorLabel(f.label), {
          small: true, active: i === floorIdx, dot: inFloor > 0 && i !== floorIdx,
          onClick: function () { floorIdx = i; renderKeys(); }
        }));
      });
      var activeTab = floorTabs.children[floorIdx];
      if (activeTab) requestAnimationFrame(function () {
        floorTabs.scrollLeft = activeTab.offsetLeft - floorTabs.clientWidth / 2 + activeTab.clientWidth / 2;
      });

      var floor = floors[floorIdx];
      clear(grid);
      clear(floorHead);
      if (floor) {
        var free = floor.keys.filter(function (k) { return !holders[k]; });
        var allSelected = free.length > 0 && free.every(function (k) { return selected.indexOf(k) >= 0; });
        append(floorHead, [
          h('strong', { class: 'field__hint', text: floor.label + ' · ' + free.length + ' no quadro' }),
          free.length ? h('button', {
            class: 'link-btn', type: 'button', text: allSelected ? 'Limpar andar' : 'Selecionar andar',
            onclick: function () {
              free.forEach(function (k) {
                var i = selected.indexOf(k);
                if (allSelected && i >= 0) selected.splice(i, 1);
                if (!allSelected && i < 0) selected.push(k);
              });
              renderKeys();
            }
          }) : null
        ]);
        floor.keys.forEach(function (k) {
          var holder = holders[k];
          var st = holder ? 'busy' : selected.indexOf(k) >= 0 ? 'selected' : 'free';
          grid.appendChild(c.keyTile(k, st, holder ? 'com ' + domain.firstName(holder.name) : '', function () {
            if (holder) ui.toast('Chave ' + k + ' está com ' + holder.name, { tone: 'error' });
            else toggleKey(k);
          }));
        });
      }
      renderSubmit();
    }

    // ---------- Etapa 3: observação ----------
    var notesInput = h('textarea', { class: 'input', rows: '2', placeholder: 'Ex.: vistoria do ar-condicionado' });
    notesInput.value = editing ? editing.notes : '';

    // ---------- Botão de confirmar ----------
    var submit = h('button', { class: 'btn btn--primary btn--lg btn--block', type: 'button', onclick: save });

    function renderSubmit() {
      var n = selected.length, hasName = !!nameInput.value.trim();
      submit.disabled = !hasName || !n;
      if (editing) submit.textContent = 'Salvar alterações';
      else if (!hasName) submit.textContent = 'Informe quem está pegando';
      else if (!n) submit.textContent = 'Selecione as chaves';
      else submit.textContent = 'Registrar retirada de ' + n + (n === 1 ? ' chave' : ' chaves');
    }

    function save() {
      var data = {
        name: nameInput.value.trim().replace(/\s+/g, ' '),
        role: roleInput.value.trim(), notes: notesInput.value.trim(), keys: selected.slice()
      };
      if (!data.name || !data.keys.length) return;
      if (editing) App.actions.update(editing.id, data);
      else App.actions.checkout(data);
      sheet.close();
    }

    var sheet = ui.openSheet({
      title: editing ? 'Editar retirada' : 'Nova retirada',
      body: [
        h('section', { class: 'stack' }, [
          h('span', { class: 'field__label', text: '1 · Quem está pegando' }),
          nameInput, suggestionsBox, roleInput
        ]),
        h('section', { class: 'stack' }, [
          h('div', { class: 'step-title' }, [h('span', { class: 'field__label', text: '2 · Chaves' }), countEl]),
          selectedBox, floorTabs, floorHead, grid,
          h('div', { class: 'row' }, [h('div', { class: 'grow' }, [quickInput]),
            h('button', { class: 'btn btn--secondary', type: 'button', text: 'Adicionar', onclick: addTyped })])
        ]),
        h('section', { class: 'stack' }, [
          h('span', { class: 'field__label', text: '3 · Observação (opcional)' }), notesInput
        ])
      ],
      foot: [submit]
    });

    renderSuggestions();
    renderKeys();
    if (!editing) setTimeout(function () { nameInput.focus(); }, 280);
  }

  App.sheets = App.sheets || {};
  App.sheets.checkout = open;
})(window.App = window.App || {});
