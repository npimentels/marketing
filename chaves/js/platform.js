/* Salvar / compartilhar arquivos: usa a ponte nativa do APK (window.AndroidApp)
   quando existe, senão as APIs do navegador. */
(function (App) {
  'use strict';
  var native = window.AndroidApp || null;

  function toBase64(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  function download(bytes, name, mime) {
    var url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    var a = App.dom.h('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  /** Salva um arquivo (no Android abre o seletor "Salvar em…") */
  function saveFile(bytes, name, mime) {
    if (native) native.saveFile(toBase64(bytes), name, mime);
    else { download(bytes, name, mime); App.ui.toast('Arquivo baixado', { tone: 'ok' }); }
  }

  /** Abre o menu de compartilhamento (WhatsApp, e-mail…) */
  function shareFile(bytes, name, mime, title) {
    if (native) { native.shareFile(toBase64(bytes), name, mime); return; }
    var file = null;
    try { file = new File([bytes], name, { type: mime }); } catch (e) { /* navegador antigo */ }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: title }).catch(function () {});
    } else {
      download(bytes, name, mime);
      App.ui.toast('Compartilhamento indisponível — arquivo baixado');
    }
  }

  function textToBytes(text) { return new TextEncoder().encode(text); }

  App.platform = { isNative: !!native, saveFile: saveFile, shareFile: shareFile, textToBytes: textToBytes };
})(window.App = window.App || {});
