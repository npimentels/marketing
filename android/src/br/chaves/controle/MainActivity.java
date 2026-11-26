package br.chaves.controle;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/** Tela única: carrega o app web (assets/www) dentro de um WebView. */
public class MainActivity extends Activity {

    private static final int REQ_SAVE = 1;
    private static final int REQ_PICK = 2;

    private WebView web;
    private byte[] pendingBytes;
    private ValueCallback<Uri[]> pendingChooser;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setTextZoom(100);

        web.addJavascriptInterface(new Bridge(), "AndroidApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("file:")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) { }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingChooser != null) pendingChooser.onReceiveValue(null);
                pendingChooser = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Escolher backup"), REQ_PICK);
                } catch (Exception e) {
                    pendingChooser = null;
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.__back ? window.__back() : false", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String handled) {
                if (!"true".equals(handled)) MainActivity.super.onBackPressed();
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_SAVE) {
            byte[] bytes = pendingBytes;
            pendingBytes = null;
            if (resultCode != RESULT_OK || data == null || data.getData() == null || bytes == null) return;
            try {
                OutputStream os = getContentResolver().openOutputStream(data.getData(), "w");
                os.write(bytes);
                os.close();
                toast("Arquivo salvo");
            } catch (Exception e) {
                toast("Não foi possível salvar o arquivo");
            }
        } else if (requestCode == REQ_PICK) {
            if (pendingChooser == null) return;
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) result = new Uri[]{data.getData()};
            pendingChooser.onReceiveValue(result);
            pendingChooser = null;
        }
    }

    private void toast(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    private static String safeName(String name) {
        String n = name == null ? "arquivo" : name.replaceAll("[^A-Za-z0-9._-]", "_");
        return n.isEmpty() ? "arquivo" : n;
    }

    /** Funções chamadas pelo JavaScript (window.AndroidApp). */
    public class Bridge {

        /** Abre o seletor do Android para o usuário escolher onde salvar. */
        @JavascriptInterface
        public void saveFile(final String base64, final String name, final String mime) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        pendingBytes = Base64.decode(base64, Base64.DEFAULT);
                        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                        i.addCategory(Intent.CATEGORY_OPENABLE);
                        i.setType(mime);
                        i.putExtra(Intent.EXTRA_TITLE, safeName(name));
                        startActivityForResult(i, REQ_SAVE);
                    } catch (Exception e) {
                        pendingBytes = null;
                        toast("Não foi possível salvar o arquivo");
                    }
                }
            });
        }

        /** Abre o menu "Compartilhar" (WhatsApp, e-mail, Drive...). */
        @JavascriptInterface
        public void shareFile(final String base64, final String name, final String mime) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        File dir = new File(getCacheDir(), SharedFilesProvider.DIR);
                        dir.mkdirs();
                        String fname = safeName(name);
                        File f = new File(dir, fname);
                        FileOutputStream os = new FileOutputStream(f);
                        os.write(Base64.decode(base64, Base64.DEFAULT));
                        os.close();

                        Uri uri = Uri.parse("content://" + SharedFilesProvider.AUTHORITY + "/" + Uri.encode(fname));
                        Intent i = new Intent(Intent.ACTION_SEND);
                        i.setType(mime);
                        i.putExtra(Intent.EXTRA_STREAM, uri);
                        i.putExtra(Intent.EXTRA_SUBJECT, fname);
                        i.setClipData(ClipData.newRawUri(fname, uri));
                        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(Intent.createChooser(i, "Compartilhar relatório"));
                    } catch (Exception e) {
                        toast("Não foi possível compartilhar");
                    }
                }
            });
        }
    }
}
