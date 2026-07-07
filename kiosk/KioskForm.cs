using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Olsk60Tester;

internal sealed class KioskForm : Form
{
    private readonly bool _kioskMode;
    private readonly WebView2 _webView = new();
    private KeyboardHook? _hook;
    private System.Windows.Forms.Timer? _focusGuard;
    private bool _allowExit;

    public KioskForm(bool kioskMode)
    {
        _kioskMode = kioskMode;

        Text = "OLSK60 INPUT LAB";
        BackColor = Color.Black;
        StartPosition = FormStartPosition.Manual;

        if (_kioskMode)
        {
            FormBorderStyle = FormBorderStyle.None;
            Bounds = Screen.PrimaryScreen?.Bounds ?? new Rectangle(0, 0, 1920, 1080);
            TopMost = true;
            ShowInTaskbar = false;
        }
        else
        {
            FormBorderStyle = FormBorderStyle.Sizable;
            Bounds = new Rectangle(80, 60, 1400, 950);
        }

        _webView.Dock = DockStyle.Fill;
        _webView.DefaultBackgroundColor = Color.Black;
        Controls.Add(_webView);
    }

    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);

        if (_kioskMode)
        {
            // block Win key & co., keep the display awake, keep focus
            _hook = new KeyboardHook();
            _hook.BlockedKey += OnBlockedKey;
            _hook.ExitRequested += () => BeginInvoke(ExitKiosk);

            SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED);

            _focusGuard = new System.Windows.Forms.Timer { Interval = 1000 };
            _focusGuard.Tick += (_, _) => ReassertForeground();
            _focusGuard.Start();
        }

        var userData = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "OLSK60Tester");
        var env = await CoreWebView2Environment.CreateAsync(null, userData);
        await _webView.EnsureCoreWebView2Async(env);

        var core = _webView.CoreWebView2;
        var s = core.Settings;
        s.AreDefaultContextMenusEnabled = false;
        s.AreDevToolsEnabled = false;
        s.IsZoomControlEnabled = false;
        s.AreBrowserAcceleratorKeysEnabled = false;
        s.IsStatusBarEnabled = false;
        s.IsSwipeNavigationEnabled = false;
        s.IsPinchZoomEnabled = false;
        s.IsPasswordAutosaveEnabled = false;
        s.IsGeneralAutofillEnabled = false;

        core.NewWindowRequested += (_, a) => a.Handled = true;
        core.WebMessageReceived += (_, a) =>
        {
            try
            {
                using var doc = JsonDocument.Parse(a.WebMessageAsJson);
                var type = doc.RootElement.TryGetProperty("type", out var t) ? t.GetString() : null;
                if (type == "ready") PostHostHello();
                else if (type == "exit") BeginInvoke(ExitKiosk); // staff exit from the UI
            }
            catch (JsonException) { /* ignore malformed messages */ }
        };
        core.NavigationCompleted += (_, _) => PostHostHello();

        var uiDir = Path.Combine(AppContext.BaseDirectory, "ui");
        core.SetVirtualHostNameToFolderMapping(
            "olsk60.app", uiDir, CoreWebView2HostResourceAccessKind.Allow);
        core.Navigate("https://olsk60.app/index.html");
    }

    private void PostHostHello()
    {
        if (_kioskMode)
            _webView.CoreWebView2?.PostWebMessageAsJson("""{"type":"host","kiosk":true}""");
    }

    private void OnBlockedKey(KeyboardHook.KeyInfo k)
    {
        // hook callback runs on the message loop thread, but marshal defensively
        BeginInvoke(() =>
        {
            var json = JsonSerializer.Serialize(new { type = "key", code = k.Code, key = k.Key, down = k.Down, repeat = k.Repeat });
            _webView.CoreWebView2?.PostWebMessageAsJson(json);
        });
    }

    private void ReassertForeground()
    {
        if (_allowExit) return;
        var fg = GetForegroundWindow();
        if (fg == IntPtr.Zero) return;
        var root = GetAncestor(fg, GA_ROOT);
        if (root != Handle)
        {
            Activate();
            SetForegroundWindow(Handle);
        }
    }

    private void ExitKiosk()
    {
        _allowExit = true;
        Close();
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (_kioskMode && !_allowExit)
        {
            e.Cancel = true; // ignore Alt+F4 & friends
            return;
        }
        _focusGuard?.Stop();
        _hook?.Dispose();
        if (_kioskMode) SetThreadExecutionState(ES_CONTINUOUS);
        base.OnFormClosing(e);
    }

    private const uint ES_CONTINUOUS = 0x80000000;
    private const uint ES_SYSTEM_REQUIRED = 0x00000001;
    private const uint ES_DISPLAY_REQUIRED = 0x00000002;
    private const uint GA_ROOT = 2;

    [DllImport("kernel32.dll")]
    private static extern uint SetThreadExecutionState(uint esFlags);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern IntPtr GetAncestor(IntPtr hWnd, uint gaFlags);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetForegroundWindow(IntPtr hWnd);
}
