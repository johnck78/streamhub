package com.streamhub.firetv;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.graphics.Color;
import android.view.Gravity;

public class MainActivity extends Activity {
    private static final String HOME = "https://johnck78.github.io/streamhub/";
    private static final String HOST = "johnck78.github.io";
    private WebView webView;
    private AlertDialog exitDialog;
    private FrameLayout root;
    private TextView errorView;
    private boolean mainFrameLoadFailed = false;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(10, 16, 27));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(10, 16, 27));
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.setWebChromeClient(new WebChromeClient());
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                mainFrameLoadFailed = false;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Navigation stays within the StreamHub website. CDN/API fetches remain normal subresource requests.
                android.net.Uri uri = request.getUrl();
                return !("https".equals(uri.getScheme()) && HOST.equalsIgnoreCase(uri.getHost())
                    && uri.getPath() != null && uri.getPath().startsWith("/streamhub/"));
            }
            @Override public void onPageFinished(WebView view, String url) {
                // TV Mode is stored on the device for later launches.
                view.evaluateJavascript("try{localStorage.setItem('streamhub_tv_mode','true');document.body.classList.add('tv-mode');document.getElementById('tvHelp').hidden=false;document.getElementById('tvToggle').textContent='TV Mode: On';document.getElementById('tvToggle').setAttribute('aria-pressed','true');document.getElementById('surprise').focus()}catch(e){}", null);
                if (!mainFrameLoadFailed && errorView != null) errorView.setVisibility(View.GONE);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) { mainFrameLoadFailed = true; showError("StreamHub could not connect. Check Wi-Fi and press Select to retry."); }
            }
        });
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        webView.loadUrl(HOME);
        webView.requestFocus();
    }

    private void showError(String message) {
        if (errorView == null) {
            errorView = new TextView(this);
            errorView.setTextColor(Color.WHITE);
            errorView.setBackgroundColor(Color.rgb(18, 33, 51));
            errorView.setTextSize(24);
            errorView.setGravity(Gravity.CENTER);
            errorView.setFocusable(true);
            errorView.setOnClickListener(v -> webView.reload());
            errorView.setOnKeyListener((v, keyCode, event) -> {
                if (event.getAction() == KeyEvent.ACTION_UP && keyCode == KeyEvent.KEYCODE_DPAD_CENTER) {
                    webView.reload(); return true;
                }
                return false;
            });
            root.addView(errorView, new FrameLayout.LayoutParams(-1,-1));
        }
        errorView.setText(message);
        errorView.setVisibility(View.VISIBLE);
        errorView.requestFocus();
    }

    @Override public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
            return;
        }
        if (mainFrameLoadFailed) {
            showExitDialog();
            return;
        }
        webView.evaluateJavascript(
            "typeof window.streamHubBack === 'function' && window.streamHubBack()",
            handled -> {
                if (!"true".equals(handled) && !isFinishing() && !isDestroyed()) {
                    showExitDialog();
                }
            });
    }

    @Override public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_ESCAPE && !event.isCanceled()) {
            onBackPressed();
            return true;
        }
        return super.onKeyUp(keyCode, event);
    }

    private void showExitDialog() {
        if (exitDialog != null && exitDialog.isShowing()) return;
        exitDialog = new AlertDialog.Builder(this)
            .setTitle("Exit StreamHub?")
            .setNegativeButton("Keep browsing", (dialog, which) -> dialog.dismiss())
            .setPositiveButton("Exit", (dialog, which) -> finish())
            .show();
        exitDialog.getButton(AlertDialog.BUTTON_NEGATIVE).requestFocus();
    }

    @Override protected void onDestroy() {
        if (webView != null) { root.removeView(webView); webView.destroy(); }
        super.onDestroy();
    }
}
