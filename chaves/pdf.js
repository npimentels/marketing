/*
 * MiniPDF — gerador de PDF simples, sem dependências e que funciona offline.
 * Usa as fontes padrão Helvetica / Helvetica-Bold com codificação WinAnsi
 * (suporta acentos do português). Coordenadas em pontos, origem no topo.
 */
(function (global) {
  'use strict';

  // Larguras AFM (1/1000 em) para os caracteres 32..126
  var W_REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  var W_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

  // Caracteres Unicode fora do Latin-1 que existem na WinAnsi
  var WIN_EXTRA = {
    0x20AC: 0x80, 0x201A: 0x82, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
    0x2030: 0x89, 0x2039: 0x8B, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94,
    0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2122: 0x99, 0x203A: 0x9B
  };

  function toWin(str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c >= 32 && c < 127) out += str[i];
      else if (c >= 0xA0 && c <= 0xFF) out += String.fromCharCode(c);
      else if (WIN_EXTRA[c]) out += String.fromCharCode(WIN_EXTRA[c]);
      else if (c === 9 || c === 10 || c === 13) out += ' ';
      else {
        var base = str[i].normalize ? str[i].normalize('NFD')[0] : '?';
        var bc = base.charCodeAt(0);
        out += (bc >= 32 && bc < 127) ? base : '?';
      }
    }
    return out;
  }

  function charWidth(ch, bold) {
    var table = bold ? W_BOLD : W_REG;
    var c = ch.charCodeAt(0);
    if (c >= 32 && c <= 126) return table[c - 32];
    if (c === 0x95) return 350;
    if (c === 0x96) return 556;
    if (c === 0x97) return 1000;
    if (c === 0x85) return 1000;
    // letras acentuadas: usa a largura da letra base
    var base = String.fromCharCode(c).normalize('NFD')[0];
    var bc = base.charCodeAt(0);
    if (bc >= 32 && bc <= 126) return table[bc - 32];
    return 556;
  }

  function esc(s) { return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
  function n(v) { return (Math.round(v * 100) / 100).toString(); }

  function MiniPDF(opts) {
    opts = opts || {};
    this.w = opts.width || 595.28;   // A4
    this.h = opts.height || 841.89;
    this.pages = [];
    this.cur = null;
  }

  MiniPDF.prototype.addPage = function () {
    this.cur = [];
    this.pages.push(this.cur);
    return this.pages.length;
  };

  MiniPDF.prototype.setPage = function (i) { this.cur = this.pages[i]; };

  // largura de um texto já convertido para WinAnsi
  function rawWidth(s, size, bold) {
    var w = 0;
    for (var i = 0; i < s.length; i++) w += charWidth(s[i], bold);
    return w * size / 1000;
  }

  MiniPDF.prototype.textWidth = function (str, size, bold) {
    return rawWidth(toWin(String(str)), size, bold);
  };

  MiniPDF.prototype.text = function (x, y, str, o) {
    o = o || {};
    var size = o.size || 10, bold = !!o.bold;
    var s = toWin(String(str));
    if (o.maxWidth) s = this._fit(s, size, bold, o.maxWidth);
    var tw = rawWidth(s, size, bold);
    if (o.align === 'right') x -= tw;
    else if (o.align === 'center') x -= tw / 2;
    var gray = o.gray == null ? 0 : o.gray;
    this.cur.push('BT ' + n(gray) + ' g /' + (bold ? 'F2' : 'F1') + ' ' + n(size) + ' Tf ' +
      n(x) + ' ' + n(this.h - y) + ' Td (' + esc(s) + ') Tj ET');
  };

  MiniPDF.prototype._fit = function (s, size, bold, maxW) {
    if (rawWidth(s, size, bold) <= maxW) return s;
    var ell = '\x85';
    while (s.length && rawWidth(s + ell, size, bold) > maxW) s = s.slice(0, -1);
    return s + ell;
  };

  // Quebra o texto em linhas que caibam em maxW
  MiniPDF.prototype.wrap = function (str, size, bold, maxW) {
    var self = this, lines = [];
    String(str).split(/\n/).forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean), line = '';
      if (!words.length) { lines.push(''); return; }
      words.forEach(function (w) {
        var test = line ? line + ' ' + w : w;
        if (self.textWidth(test, size, bold) <= maxW) { line = test; return; }
        if (line) lines.push(line);
        // palavra maior que a largura: corta
        while (self.textWidth(w, size, bold) > maxW) {
          var k = w.length;
          while (k > 1 && self.textWidth(w.slice(0, k), size, bold) > maxW) k--;
          lines.push(w.slice(0, k));
          w = w.slice(k);
        }
        line = w;
      });
      if (line) lines.push(line);
    });
    return lines;
  };

  MiniPDF.prototype.line = function (x1, y1, x2, y2, o) {
    o = o || {};
    this.cur.push(n(o.gray == null ? 0 : o.gray) + ' G ' + n(o.width || 0.5) + ' w ' +
      (o.dash ? '[' + o.dash.join(' ') + '] 0 d ' : '[] 0 d ') +
      n(x1) + ' ' + n(this.h - y1) + ' m ' + n(x2) + ' ' + n(this.h - y2) + ' l S');
  };

  MiniPDF.prototype.rect = function (x, y, w, h, o) {
    o = o || {};
    var cmd = n(x) + ' ' + n(this.h - y - h) + ' ' + n(w) + ' ' + n(h) + ' re ';
    if (o.fill != null && o.stroke) cmd = n(o.fill) + ' g ' + n(o.strokeGray || 0) + ' G ' + n(o.width || 0.5) + ' w [] 0 d ' + cmd + 'B';
    else if (o.fill != null) cmd = n(o.fill) + ' g ' + cmd + 'f';
    else cmd = n(o.strokeGray || 0) + ' G ' + n(o.width || 0.5) + ' w [] 0 d ' + cmd + 'S';
    this.cur.push(cmd);
  };

  MiniPDF.prototype.output = function (meta) {
    meta = meta || {};
    var objs = [];
    function add(s) { objs.push(s); return objs.length; }

    var catalogId = add(null);
    var pagesId = add(null);
    var f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    var f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    var kids = [];
    var self = this;
    this.pages.forEach(function (cmds) {
      var stream = cmds.join('\n');
      var cId = add('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
      var pId = add('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 ' + n(self.w) + ' ' + n(self.h) + '] ' +
        '/Resources << /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R >> >> /Contents ' + cId + ' 0 R >>');
      kids.push(pId + ' 0 R');
    });
    objs[catalogId - 1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
    objs[pagesId - 1] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + kids.length + ' >>';
    var info = add('<< /Title (' + esc(toWin(meta.title || 'Documento')) + ') /Producer (Controle de Chaves) >>');

    var out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    var offsets = [];
    objs.forEach(function (o, i) {
      offsets.push(out.length);
      out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n';
    });
    var xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offsets.forEach(function (off) { out += ('0000000000' + off).slice(-10) + ' 00000 n \n'; });
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalogId + ' 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF';

    var bytes = new Uint8Array(out.length);
    for (var i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xFF;
    return bytes;
  };

  global.MiniPDF = MiniPDF;
})(window);
