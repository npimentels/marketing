(function () {
  'use strict';

  var STORE_KEY = 'controle-chaves.v1';
  var STATUS = {
    pendente: 'Pendente',
    entregue: 'Entregue',
    nao_entregue: 'Não entregue'
  };

  // ---------------- Estado ----------------
  var state = load();
  var ui = {
    view: 'movs',
    date: todayStr(),
    filter: 'all',
    search: '',
    editingId: null,
    form: { keys: [], status: 'pendente' }
  };

  function defaultFloors() { return generateFloors(1, 16, 8); }

  function generateFloors(from, to, per) {
    var floors = [];
    for (var f = from; f <= to; f++) {
      var keys = [];
      for (var a = 1; a <= per; a++) keys.push(String(f * 100 + a));
      floors.push({ label: f === 0 ? 'Térreo' : f + 'º andar', keys: keys });
    }
    return floors;
  }

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.settings && Array.isArray(s.movs)) {
        // quem ainda usa a lista padrão antiga (10 andares x 4) passa para a nova (16 andares x 8)
        if (JSON.stringify(s.settings.floors) === JSON.stringify(generateFloors(1, 10, 4))) {
          s.settings.floors = defaultFloors();
          localStorage.setItem(STORE_KEY, JSON.stringify(s));
        }
        return s;
      }
    } catch (e) { /* ignora */ }
    return { settings: { place: '', floors: defaultFloors(), resp: '' }, movs: [] };
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast('Não foi possível salvar no aparelho'); }
  }

  // ---------------- Datas ----------------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayStr() { return dateStr(new Date()); }
  function parseDay(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dayOf(iso) { return dateStr(new Date(iso)); }
  function hm(iso) { var d = new Date(iso); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dm(iso) { var d = new Date(iso); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1); }
  function dmyhm(d) { return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function longDate(s) {
    return parseDay(s).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function shiftDay(s, delta) { var d = parseDay(s); d.setDate(d.getDate() + delta); return dateStr(d); }

  // ---------------- Consultas ----------------
  function movsOfDay(day) {
    return state.movs.filter(function (m) { return dayOf(m.createdAt) === day; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  }
  function olderOpen(day) {
    return state.movs.filter(function (m) { return dayOf(m.createdAt) < day && m.status !== 'entregue'; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  }
  function isOpen(m) { return m.status !== 'entregue'; }

  // mapa chave -> movimentação em aberto
  function keysOut(exceptId) {
    var map = {};
    state.movs.forEach(function (m) {
      if (m.id === exceptId || !isOpen(m)) return;
      m.keys.forEach(function (k) { map[k] = m; });
    });
    return map;
  }

  function counts(list) {
    var c = { total: list.length, keys: 0, pendente: 0, entregue: 0, nao_entregue: 0 };
    list.forEach(function (m) { c.keys += m.keys.length; c[m.status]++; });
    return c;
  }

  function sortKeys(keys) {
    var order = {};
    var i = 0;
    state.settings.floors.forEach(function (f) { f.keys.forEach(function (k) { order[k] = i++; }); });
    return keys.slice().sort(function (a, b) {
      var oa = a in order ? order[a] : 1e9, ob = b in order ? order[b] : 1e9;
      return oa - ob || String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
    });
  }

  // ---------------- Utilidades de DOM ----------------
  var $ = function (id) { return document.getElementById(id); };
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 2200);
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ---------------- Renderização ----------------
  function render() {
    $('placeName').textContent = state.settings.place || '';
    var cap = function (t) { return t.charAt(0).toUpperCase() + t.slice(1); };
    $('dateText').textContent = cap(ui.date === todayStr() ? 'Hoje, ' + parseDay(ui.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : parseDay(ui.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
    $('dateInput').value = ui.date;
    $('nextDay').disabled = ui.date >= todayStr();
    $('nextDay').style.opacity = ui.date >= todayStr() ? .3 : 1;

    document.querySelectorAll('.view').forEach(function (v) { v.classList.add('hidden'); });
    $('view-' + ui.view).classList.remove('hidden');
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.view === ui.view); });
    $('fab').classList.toggle('hidden', ui.view === 'settings' || ui.view === 'report');

    if (ui.view === 'movs') renderMovs();
    if (ui.view === 'keys') renderKeys();
    if (ui.view === 'report') renderReport();
    if (ui.view === 'settings') renderSettings();
  }

  function statsEl(c) {
    function s(n, l, fill) { return h('div', { class: 'stat' + (fill ? ' fill' : '') }, [h('b', { text: String(n) }), h('small', { text: l })]); }
    var box = document.createDocumentFragment();
    box.appendChild(s(c.total, 'Movim.', true));
    box.appendChild(s(c.pendente, 'Pend.'));
    box.appendChild(s(c.entregue, 'Entreg.'));
    box.appendChild(s(c.nao_entregue, 'Não ent.'));
    return box;
  }

  function matches(m) {
    if (ui.filter !== 'all' && m.status !== ui.filter) return false;
    if (!ui.search) return true;
    var q = norm(ui.search);
    return norm(m.name + ' ' + (m.role || '') + ' ' + m.keys.join(' ') + ' ' + (m.notes || '')).indexOf(q) >= 0;
  }
  function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  function movCard(m, old) {
    var seg = h('div', { class: 'segmented' }, Object.keys(STATUS).map(function (st) {
      return h('button', {
        class: m.status === st ? 'on' : '', 'data-status': st, text: STATUS[st],
        onclick: function () { setStatus(m.id, st); }
      });
    }));
    var last = m.history && m.history.length > 1 ? m.history[m.history.length - 1] : null;
    var timeTxt = (old ? dm(m.createdAt) + ' ' : '') + 'Retirada ' + hm(m.createdAt);
    return h('div', { class: 'mov' + (old ? ' old' : '') }, [
      h('div', { class: 'mov-top' }, [
        h('div', null, [h('div', { class: 'mov-name', text: m.name }), m.role ? h('div', { class: 'mov-role', text: m.role }) : null]),
        h('div', { class: 'mov-time' }, [
          timeTxt,
          last ? h('br') : null,
          last ? STATUS[last.status] + ' ' + (dayOf(last.at) !== dayOf(m.createdAt) ? dm(last.at) + ' ' : '') + hm(last.at) : null
        ])
      ]),
      h('div', { class: 'mov-keys' }, sortKeys(m.keys).map(function (k) { return h('span', { class: 'kchip', text: k }); })),
      m.notes ? h('p', { class: 'mov-notes', text: m.notes }) : null,
      h('div', { class: 'mov-actions' }, [seg, h('button', { class: 'edit-btn', text: 'Editar', onclick: function () { openForm(m.id); } })])
    ]);
  }

  function renderMovs() {
    var day = movsOfDay(ui.date);
    var st = $('stats'); st.innerHTML = ''; st.appendChild(statsEl(counts(day)));
    document.querySelectorAll('.chip-filter').forEach(function (b) { b.classList.toggle('active', b.dataset.filter === ui.filter); });

    var list = $('movList'); list.innerHTML = '';
    var shown = day.filter(matches);
    if (!shown.length) {
      list.appendChild(h('div', { class: 'empty', text: day.length ? 'Nenhum resultado para o filtro.' : 'Nenhuma movimentação neste dia. Toque em + para registrar.' }));
    }
    shown.forEach(function (m) { list.appendChild(movCard(m)); });

    var older = olderOpen(ui.date).filter(matches);
    var box = $('olderOpen'); box.innerHTML = '';
    if (older.length) {
      box.appendChild(h('div', { class: 'section-title', text: 'Em aberto de dias anteriores (' + older.length + ')' }));
      var l = h('div', { class: 'list' });
      older.forEach(function (m) { l.appendChild(movCard(m, true)); });
      box.appendChild(l);
    }
  }

  function renderKeys() {
    var out = keysOut();
    var board = $('keyBoard'); board.innerHTML = '';
    state.settings.floors.forEach(function (f) {
      var nOut = f.keys.filter(function (k) { return out[k]; }).length;
      board.appendChild(h('div', { class: 'floor' }, [
        h('div', { class: 'floor-head' }, [f.label, h('span', { text: nOut ? nOut + ' fora' : 'todas no quadro' })]),
        h('div', { class: 'keys-grid' }, f.keys.map(function (k) {
          var m = out[k];
          return h('button', {
            class: 'kbox' + (m ? (m.status === 'nao_entregue' ? ' late' : ' out') : ''), text: k,
            onclick: function () {
              if (m) toast(k + ': ' + m.name + ' — ' + STATUS[m.status] + ' desde ' + dm(m.createdAt) + ' ' + hm(m.createdAt));
              else toast(k + ': no quadro');
            }
          });
        }))
      ]));
    });
    if (!state.settings.floors.length) board.appendChild(h('div', { class: 'empty', text: 'Cadastre os andares em Ajustes.' }));
  }

  function renderReport() {
    $('reportDateText').textContent = longDate(ui.date);
    var st = $('reportStats'); st.innerHTML = ''; st.appendChild(statsEl(counts(movsOfDay(ui.date))));
    if (document.activeElement !== $('reportResp')) $('reportResp').value = state.settings.resp || '';
  }

  function floorsToText(floors) {
    return floors.map(function (f) { return f.label + ': ' + f.keys.join(', '); }).join('\n');
  }
  function textToFloors(txt) {
    var floors = [];
    txt.split('\n').forEach(function (line) {
      line = line.trim(); if (!line) return;
      var i = line.indexOf(':');
      var label = i >= 0 ? line.slice(0, i).trim() : 'Andar ' + (floors.length + 1);
      var rest = i >= 0 ? line.slice(i + 1) : line;
      var keys = rest.split(/[,;]+/).map(function (k) { return k.trim(); }).filter(Boolean);
      if (keys.length) floors.push({ label: label || 'Andar', keys: keys });
    });
    return floors;
  }

  function renderSettings() {
    $('setPlace').value = state.settings.place || '';
    $('setFloors').value = floorsToText(state.settings.floors);
  }

  // ---------------- Ações ----------------
  function setStatus(id, status) {
    var m = state.movs.find(function (x) { return x.id === id; });
    if (!m || m.status === status) return;
    var now = new Date().toISOString();
    m.status = status;
    m.updatedAt = now;
    m.history = m.history || [];
    m.history.push({ status: status, at: now });
    save(); render();
    toast(m.name + ': ' + STATUS[status]);
  }

  // ---------- Formulário ----------
  function openForm(id) {
    ui.editingId = id || null;
    var m = id ? state.movs.find(function (x) { return x.id === id; }) : null;
    ui.form = { keys: m ? m.keys.slice() : [], status: m ? m.status : 'pendente' };
    $('sheetTitle').textContent = m ? 'Editar movimentação' : 'Nova movimentação';
    $('fName').value = m ? m.name : '';
    $('fRole').value = m ? (m.role || '') : '';
    $('fNotes').value = m ? (m.notes || '') : '';
    $('fDelete').classList.toggle('hidden', !m);

    var names = {};
    state.movs.forEach(function (x) { names[x.name] = 1; });
    $('namesList').innerHTML = '';
    Object.keys(names).sort().forEach(function (nm) { $('namesList').appendChild(h('option', { value: nm })); });

    renderPicker();
    renderFormStatus();
    $('sheet').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (!m) setTimeout(function () { $('fName').focus(); }, 150);
  }

  function closeForm() {
    $('sheet').classList.add('hidden');
    document.body.style.overflow = '';
    ui.editingId = null;
  }

  function renderPicker() {
    var busy = keysOut(ui.editingId);
    var box = $('fKeys'); box.innerHTML = '';
    var sel = {}; ui.form.keys.forEach(function (k) { sel[k] = 1; });
    var known = {};
    state.settings.floors.forEach(function (f) {
      f.keys.forEach(function (k) { known[k] = 1; });
      var free = f.keys.filter(function (k) { return !busy[k]; });
      var allSel = free.length && free.every(function (k) { return sel[k]; });
      box.appendChild(h('div', { class: 'floor' }, [
        h('div', { class: 'floor-head' }, [f.label, h('button', {
          class: 'floor-all', type: 'button', text: allSel ? 'limpar' : 'todas',
          onclick: function () {
            free.forEach(function (k) {
              var i = ui.form.keys.indexOf(k);
              if (allSel && i >= 0) ui.form.keys.splice(i, 1);
              if (!allSel && i < 0) ui.form.keys.push(k);
            });
            renderPicker();
          }
        })]),
        h('div', { class: 'keys-grid' }, f.keys.map(function (k) {
          var b = busy[k];
          return h('button', {
            type: 'button', class: 'kbox' + (sel[k] ? ' sel' : '') + (b ? ' busy' : ''), text: k,
            onclick: function () {
              if (b) { toast('Chave ' + k + ' está com ' + b.name + ' (' + STATUS[b.status] + ')'); return; }
              var i = ui.form.keys.indexOf(k);
              if (i >= 0) ui.form.keys.splice(i, 1); else ui.form.keys.push(k);
              renderPicker();
            }
          });
        }))
      ]));
    });
    // chaves que não existem mais na lista atual (edição de registro antigo)
    var extra = ui.form.keys.filter(function (k) { return !known[k]; });
    if (extra.length) {
      box.appendChild(h('div', { class: 'floor' }, [
        h('div', { class: 'floor-head', text: 'Outras' }),
        h('div', { class: 'keys-grid' }, extra.map(function (k) {
          return h('button', { type: 'button', class: 'kbox sel', text: k, onclick: function () {
            ui.form.keys.splice(ui.form.keys.indexOf(k), 1); renderPicker();
          } });
        }))
      ]));
    }
    var n = ui.form.keys.length;
    $('fKeysCount').textContent = n ? '— ' + n + ' selecionada' + (n > 1 ? 's' : '') + ': ' + sortKeys(ui.form.keys).join(', ') : '';
  }

  function renderFormStatus() {
    document.querySelectorAll('#fStatus button').forEach(function (b) { b.classList.toggle('on', b.dataset.status === ui.form.status); });
  }

  function saveForm() {
    var name = $('fName').value.trim();
    if (!name) { toast('Informe o nome de quem pegou'); $('fName').focus(); return; }
    if (!ui.form.keys.length) { toast('Selecione pelo menos uma chave'); return; }
    var now = new Date().toISOString();
    var m = ui.editingId ? state.movs.find(function (x) { return x.id === ui.editingId; }) : null;
    if (m) {
      if (m.status !== ui.form.status) { m.history = m.history || []; m.history.push({ status: ui.form.status, at: now }); }
      m.name = name; m.role = $('fRole').value.trim(); m.notes = $('fNotes').value.trim();
      m.keys = sortKeys(ui.form.keys); m.status = ui.form.status; m.updatedAt = now;
      toast('Movimentação atualizada');
    } else {
      // registra no dia selecionado (horário atual se for hoje)
      var created = new Date();
      if (ui.date !== todayStr()) {
        var d = parseDay(ui.date); d.setHours(created.getHours(), created.getMinutes(), created.getSeconds());
        created = d;
      }
      var iso = created.toISOString();
      var hist = [{ status: 'pendente', at: iso }];
      if (ui.form.status !== 'pendente') hist.push({ status: ui.form.status, at: iso });
      state.movs.push({
        id: uid(), name: name, role: $('fRole').value.trim(), notes: $('fNotes').value.trim(),
        keys: sortKeys(ui.form.keys), status: ui.form.status, createdAt: iso, updatedAt: iso, history: hist
      });
      toast('Movimentação registrada');
    }
    save(); closeForm(); render();
  }

  function deleteMov() {
    if (!ui.editingId) return;
    if (!confirm('Excluir esta movimentação? Essa ação não pode ser desfeita.')) return;
    state.movs = state.movs.filter(function (x) { return x.id !== ui.editingId; });
    save(); closeForm(); render(); toast('Movimentação excluída');
  }

  // ---------------- PDF ----------------
  function buildPdf() {
    var day = ui.date;
    var list = movsOfDay(day).slice().reverse(); // ordem cronológica
    var older = $('reportOlder').checked ? olderOpen(day).slice().reverse() : [];
    var resp = $('reportResp').value.trim();
    state.settings.resp = resp; save();

    var pdf = new MiniPDF();
    var M = 40, W = pdf.w - 2 * M, PH = pdf.h, bottom = PH - 50;
    var y;

    function header(first) {
      pdf.addPage();
      y = M;
      if (first) {
        pdf.rect(M, y, W, 4, { fill: 0 });
        y += 26;
        pdf.text(M, y, 'Relatório de Movimentação de Chaves', { size: 18, bold: true });
        y += 18;
        if (state.settings.place) { pdf.text(M, y, state.settings.place, { size: 11 }); y += 15; }
        var ld = longDate(day);
        pdf.text(M, y, ld.charAt(0).toUpperCase() + ld.slice(1), { size: 11, bold: true });
        pdf.text(M + W, y, 'Gerado em ' + dmyhm(new Date()), { size: 9, align: 'right', gray: 0.35 });
        y += 10;
        if (resp) { y += 4; pdf.text(M, y + 6, 'Responsável pelo turno: ' + resp, { size: 10 }); y += 10; }
        y += 8;
      } else {
        pdf.text(M, y + 10, 'Relatório de Movimentação de Chaves — ' + dmyhm(parseDay(day)).slice(0, 10), { size: 9, gray: 0.35 });
        y += 24;
      }
    }

    function summary() {
      var c = counts(list);
      var items = [['Movimentações', c.total], ['Chaves movimentadas', c.keys], ['Entregues', c.entregue], ['Pendentes', c.pendente], ['Não entregues', c.nao_entregue]];
      var gap = 8, bw = (W - gap * (items.length - 1)) / items.length, bh = 46;
      items.forEach(function (it, i) {
        var x = M + i * (bw + gap);
        if (i === 0) pdf.rect(x, y, bw, bh, { fill: 0 });
        else pdf.rect(x, y, bw, bh, { width: 0.8 });
        pdf.text(x + bw / 2, y + 24, String(it[1]), { size: 18, bold: true, align: 'center', gray: i === 0 ? 1 : 0 });
        pdf.text(x + bw / 2, y + 38, it[0], { size: 7.5, align: 'center', gray: i === 0 ? 1 : 0.3, maxWidth: bw - 6 });
      });
      y += bh + 22;
    }

    var cols = [
      { t: 'Retirada', w: 50 },
      { t: 'Nome / Empresa', w: 116 },
      { t: 'Chaves', w: 114 },
      { t: 'Status', w: 76 },
      { t: 'Atualização', w: 58 },
      { t: 'Observações', w: 0 }
    ];
    cols[5].w = W - cols.slice(0, 5).reduce(function (a, c) { return a + c.w; }, 0);
    var FS = 8.5, LH = 11, PAD = 5;

    function tableHead() {
      pdf.rect(M, y, W, 18, { fill: 0 });
      var x = M;
      cols.forEach(function (c) { pdf.text(x + PAD, y + 12, c.t, { size: 8, bold: true, gray: 1 }); x += c.w; });
      y += 18;
    }

    function sectionTitle(t) {
      if (y + 60 > bottom) header(false);
      pdf.text(M, y, t, { size: 11, bold: true });
      y += 8;
    }

    function rows(items, withDate) {
      if (!items.length) {
        pdf.rect(M, y, W, 24, { width: 0.5, strokeGray: 0.6 });
        pdf.text(M + W / 2, y + 15, 'Nenhuma movimentação registrada.', { size: 9, align: 'center', gray: 0.4 });
        y += 24;
        return;
      }
      tableHead();
      items.forEach(function (m, idx) {
        var last = m.history && m.history.length > 1 ? m.history[m.history.length - 1] : null;
        var upd = last ? (dayOf(last.at) !== day ? dm(last.at) + ' ' : '') + hm(last.at) : '—';
        var cells = [
          [(withDate || dayOf(m.createdAt) !== day ? dm(m.createdAt) + ' ' : '') + hm(m.createdAt)],
          pdf.wrap(m.name, FS, true, cols[1].w - 2 * PAD).concat(m.role ? pdf.wrap(m.role, FS - 1, false, cols[1].w - 2 * PAD) : []),
          pdf.wrap(sortKeys(m.keys).join(', '), FS, false, cols[2].w - 2 * PAD),
          [STATUS[m.status]],
          [upd],
          m.notes ? pdf.wrap(m.notes, FS - 0.5, false, cols[5].w - 2 * PAD) : ['']
        ];
        var nameLines = pdf.wrap(m.name, FS, true, cols[1].w - 2 * PAD).length;
        var lines = Math.max.apply(null, cells.map(function (c) { return c.length; }));
        var rh = lines * LH + 2 * PAD;
        if (y + rh > bottom) { header(false); tableHead(); }
        if (idx % 2 === 1) pdf.rect(M, y, W, rh, { fill: 0.95 });
        var x = M;
        cells.forEach(function (c, ci) {
          c.forEach(function (ln, li) {
            var bold = (ci === 1 && li < nameLines) || ci === 3;
            var gray = ci === 1 && li >= nameLines ? 0.4 : 0;
            var off = ci === 3 ? 11 : 0;
            pdf.text(x + PAD + off, y + PAD + 8 + li * LH, ln, { size: ci === 1 && li >= nameLines ? FS - 1 : FS, bold: bold, gray: gray, maxWidth: cols[ci].w - 2 * PAD - off });
          });
          x += cols[ci].w;
        });
        // marcador visual de status
        var sx = M + cols[0].w + cols[1].w + cols[2].w + PAD;
        if (m.status === 'entregue') pdf.rect(sx, y + PAD + 1.5, 7, 7, { fill: 0 });
        else if (m.status === 'pendente') pdf.rect(sx, y + PAD + 1.5, 7, 7, { width: 0.8 });
        else { pdf.rect(sx, y + PAD + 1.5, 7, 7, { width: 0.8 }); pdf.line(sx, y + PAD + 8.5, sx + 7, y + PAD + 1.5, { width: 0.8 }); }
        y += rh;
        pdf.line(M, y, M + W, y, { width: 0.3, gray: 0.7 });
      });
    }

    header(true);
    summary();
    sectionTitle('Movimentações do dia');
    y += 4;
    rows(list, false);

    if (older.length) {
      y += 24;
      sectionTitle('Chaves em aberto de dias anteriores');
      y += 4;
      rows(older, true);
    }

    // chaves fora do quadro no momento
    var out = keysOut();
    var outKeys = sortKeys(Object.keys(out));
    y += 24;
    sectionTitle('Chaves fora do quadro no momento da emissão (' + outKeys.length + ')');
    y += 6;
    var outLines = pdf.wrap(outKeys.length ? outKeys.join(', ') : 'Todas as chaves estão no quadro.', 9, false, W);
    outLines.forEach(function (ln) {
      if (y + 14 > bottom) header(false);
      pdf.text(M, y + 8, ln, { size: 9 });
      y += 13;
    });

    // assinatura
    if (y + 70 > bottom) header(false);
    y = Math.max(y + 40, bottom - 40);
    pdf.line(M, y, M + 220, y, { width: 0.6 });
    pdf.text(M, y + 12, resp ? resp : 'Responsável pelo turno', { size: 8.5, gray: 0.35 });
    pdf.line(M + W - 220, y, M + W, y, { width: 0.6 });
    pdf.text(M + W - 220, y + 12, 'Assinatura', { size: 8.5, gray: 0.35 });

    // rodapé com numeração
    var total = pdf.pages.length;
    for (var i = 0; i < total; i++) {
      pdf.setPage(i);
      pdf.line(M, PH - 32, M + W, PH - 32, { width: 0.3, gray: 0.6 });
      pdf.text(M, PH - 20, 'Controle de Chaves' + (state.settings.place ? ' — ' + state.settings.place : ''), { size: 7.5, gray: 0.4, maxWidth: W - 80 });
      pdf.text(M + W, PH - 20, 'Página ' + (i + 1) + ' de ' + total, { size: 7.5, gray: 0.4, align: 'right' });
    }

    var bytes = pdf.output({ title: 'Relatório de chaves ' + day });
    var name = 'relatorio-chaves-' + day + '.pdf';
    return { bytes: bytes, name: name };
  }

  // Ponte com o app Android (quando o app roda dentro do APK)
  var native = window.AndroidApp || null;
  function toBase64(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  function downloadPdf() {
    var r = buildPdf();
    if (native) { native.saveFile(toBase64(r.bytes), r.name, 'application/pdf'); return; }
    var blob = new Blob([r.bytes], { type: 'application/pdf' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: r.name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
    toast('PDF gerado');
  }

  function sharePdf() {
    var r = buildPdf();
    if (native) { native.shareFile(toBase64(r.bytes), r.name, 'application/pdf'); return; }
    var file;
    try { file = new File([r.bytes], r.name, { type: 'application/pdf' }); } catch (e) { file = null; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Relatório de chaves' }).catch(function () {});
    } else {
      toast('Compartilhamento indisponível — baixando o PDF');
      downloadPdf();
    }
  }

  // ---------------- Backup ----------------
  function exportData() {
    if (native) {
      var bytes = new TextEncoder().encode(JSON.stringify(state, null, 2));
      native.saveFile(toBase64(bytes), 'backup-chaves-' + todayStr() + '.json', 'application/json');
      return;
    }
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: 'backup-chaves-' + todayStr() + '.json' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var s = JSON.parse(reader.result);
        if (!s.settings || !Array.isArray(s.movs)) throw new Error('formato');
        if (!confirm('Substituir os dados atuais pelos do backup (' + s.movs.length + ' movimentações)?')) return;
        state = s; save(); render(); toast('Backup importado');
      } catch (e) { toast('Arquivo de backup inválido'); }
    };
    reader.readAsText(file);
  }

  // ---------------- Eventos ----------------
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { ui.view = t.dataset.view; render(); window.scrollTo(0, 0); });
  });
  $('prevDay').addEventListener('click', function () { ui.date = shiftDay(ui.date, -1); render(); });
  $('nextDay').addEventListener('click', function () { if (ui.date < todayStr()) { ui.date = shiftDay(ui.date, 1); render(); } });
  $('dateInput').addEventListener('change', function (e) { if (e.target.value) { ui.date = e.target.value > todayStr() ? todayStr() : e.target.value; render(); } });

  document.querySelectorAll('.chip-filter').forEach(function (b) {
    b.addEventListener('click', function () { ui.filter = b.dataset.filter; renderMovs(); });
  });
  $('search').addEventListener('input', function (e) { ui.search = e.target.value; renderMovs(); });

  $('fab').addEventListener('click', function () { openForm(null); });
  $('sheetCancel').addEventListener('click', closeForm);
  $('sheetSave').addEventListener('click', saveForm);
  $('fDelete').addEventListener('click', deleteMov);
  $('sheet').addEventListener('click', function (e) { if (e.target === $('sheet')) closeForm(); });
  document.querySelectorAll('#fStatus button').forEach(function (b) {
    b.addEventListener('click', function () { ui.form.status = b.dataset.status; renderFormStatus(); });
  });

  $('btnPdf').addEventListener('click', downloadPdf);
  $('btnShare').addEventListener('click', sharePdf);

  $('btnGen').addEventListener('click', function () {
    var from = parseInt($('genFrom').value, 10), to = parseInt($('genTo').value, 10), per = parseInt($('genPer').value, 10);
    if (isNaN(from) || isNaN(to) || isNaN(per) || to < from || per < 1 || per > 99 || to - from > 200) { toast('Valores inválidos'); return; }
    $('setFloors').value = floorsToText(generateFloors(from, to, per));
    toast('Lista gerada — toque em Salvar ajustes');
  });
  $('btnSaveSettings').addEventListener('click', function () {
    var floors = textToFloors($('setFloors').value);
    if (!floors.length) { toast('Informe ao menos um andar com chaves'); return; }
    state.settings.place = $('setPlace').value.trim();
    state.settings.floors = floors;
    save(); render(); toast('Ajustes salvos');
  });
  $('btnExport').addEventListener('click', exportData);
  $('importFile').addEventListener('change', function (e) { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; });
  $('btnClear').addEventListener('click', function () {
    if (!confirm('Apagar TODAS as movimentações? Os ajustes serão mantidos.')) return;
    state.movs = []; save(); render(); toast('Movimentações apagadas');
  });

  // Atualiza a data automaticamente ao virar o dia (app aberto o tempo todo)
  var lastToday = todayStr();
  setInterval(function () {
    var t = todayStr();
    if (t !== lastToday) { if (ui.date === lastToday) ui.date = t; lastToday = t; render(); }
  }, 60000);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  // Botão "voltar" do Android: fecha o formulário ou volta para a primeira aba
  window.__back = function () {
    if (!$('sheet').classList.contains('hidden')) { closeForm(); return true; }
    if (ui.view !== 'movs') { ui.view = 'movs'; render(); return true; }
    return false;
  };

  render();
})();
