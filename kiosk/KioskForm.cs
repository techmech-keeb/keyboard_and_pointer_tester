using System.Reflection;
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
    private VialHidBridge? _vialBridge;
    private System.Windows.Forms.Timer? _focusGuard;
    private bool _allowExit;

    private static readonly Size AppDefaultSize = new(1368, 912);
    private static readonly Size AppMinimumSize = new(980, 660);
    private static readonly string SettingsDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "OLSK60Tester");
    private static readonly string WindowSettingsPath = Path.Combine(SettingsDir, "window-settings.json");

    public KioskForm(bool kioskMode)
    {
        _kioskMode = kioskMode;

        Text = "Techmech keys INPUT LAB";
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
            TopMost = false;
            ShowInTaskbar = true;
            MinimumSize = AppMinimumSize;
            Bounds = LoadAppWindowBounds();
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
        _vialBridge = new VialHidBridge(this, core);
        core.WebMessageReceived += (_, a) =>
        {
            try
            {
                using var doc = JsonDocument.Parse(a.WebMessageAsJson);
                var type = doc.RootElement.TryGetProperty("type", out var t) ? t.GetString() : null;
                var op = doc.RootElement.TryGetProperty("op", out var o) ? o.GetString() : null;
                if (type == "ready") PostHostHello();
                else if (type == "exit") BeginInvoke(ExitKiosk); // staff exit from the UI
                else if (type == "vialhid") _vialBridge?.HandleMessage(doc.RootElement.Clone());
                else if (!_kioskMode && op == "resize") ResizeAppWindow(doc.RootElement);
            }
            catch (JsonException) { /* ignore malformed messages */ }
        };
        core.NavigationCompleted += (_, _) => PostHostHello();

        var uiDir = Path.Combine(AppContext.BaseDirectory, "ui");
        core.SetVirtualHostNameToFolderMapping(
            "olsk60.app", uiDir, CoreWebView2HostResourceAccessKind.Allow);
        core.Navigate("https://olsk60.app/index.html");
    }

    /// <summary>App version stamped at build time (git tag via CI, else the
    /// csproj dev default). Shown in the UI staff menu for on-site support.</summary>
    private static string AppVersion()
    {
        var asm = Assembly.GetExecutingAssembly();
        var info = asm.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion;
        if (!string.IsNullOrEmpty(info))
        {
            var plus = info.IndexOf('+'); // strip +<commit> source-link metadata
            return plus >= 0 ? info[..plus] : info;
        }
        return asm.GetName().Version?.ToString() ?? "0.0.0";
    }

    private void PostHostHello()
    {
        var json = JsonSerializer.Serialize(new { type = "host", kiosk = _kioskMode, canResize = !_kioskMode, version = AppVersion() });
        _webView.CoreWebView2?.PostWebMessageAsJson(json);
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
        if (root == Handle)
        {
            if (!TopMost) TopMost = true;
            return;
        }
        if (IsFocusExempt(root))
        {
            // rescue UI (e.g. Task Manager) is up: get out of its way,
            // it would otherwise be hidden behind this topmost window
            if (TopMost) TopMost = false;
            return;
        }
        if (!TopMost) TopMost = true;
        Activate();
        SetForegroundWindow(Handle);
    }

    /// <summary>
    /// Never steal focus back from system/rescue UI — otherwise Task Manager
    /// (reached via Ctrl+Alt+Del) becomes unusable and the kiosk can't be
    /// killed. Unknown elevated processes can't be inspected, so they are
    /// treated as exempt too.
    /// </summary>
    private static bool IsFocusExempt(IntPtr hwnd)
    {
        GetWindowThreadProcessId(hwnd, out var pid);
        if (pid == 0) return true;
        var h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
        if (h == IntPtr.Zero) return true; // likely elevated system UI
        try
        {
            var buf = new System.Text.StringBuilder(1024);
            var cap = buf.Capacity;
            if (!QueryFullProcessImageName(h, 0, buf, ref cap)) return true;
            var name = Path.GetFileNameWithoutExtension(buf.ToString()).ToLowerInvariant();
            return name is "taskmgr" or "logonui" or "consent" or "lockapp";
        }
        finally
        {
            CloseHandle(h);
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
        if (!_kioskMode) SaveAppWindowBounds();
        _focusGuard?.Stop();
        _vialBridge?.Dispose();
        _hook?.Dispose();
        if (_kioskMode) SetThreadExecutionState(ES_CONTINUOUS);
        base.OnFormClosing(e);
    }

    private static Rectangle LoadAppWindowBounds()
    {
        try
        {
            if (File.Exists(WindowSettingsPath))
            {
                var settings = JsonSerializer.Deserialize<WindowSettings>(File.ReadAllText(WindowSettingsPath));
                if (settings is not null)
                {
                    var bounds = new Rectangle(
                        settings.X,
                        settings.Y,
                        Math.Max(settings.Width, AppMinimumSize.Width),
                        Math.Max(settings.Height, AppMinimumSize.Height));
                    if (IsVisibleOnAnyScreen(bounds)) return bounds;
                }
            }
        }
        catch (IOException) { /* ignore and use default */ }
        catch (UnauthorizedAccessException) { /* ignore and use default */ }
        catch (JsonException) { /* ignore and use default */ }

        return DefaultAppBounds();
    }

    private static Rectangle DefaultAppBounds()
    {
        var area = Screen.PrimaryScreen?.WorkingArea ?? new Rectangle(0, 0, AppDefaultSize.Width, AppDefaultSize.Height);
        var width = Math.Min(AppDefaultSize.Width, area.Width);
        var height = Math.Min(AppDefaultSize.Height, area.Height);
        return new Rectangle(
            area.Left + Math.Max(0, (area.Width - width) / 2),
            area.Top + Math.Max(0, (area.Height - height) / 2),
            width,
            height);
    }

    private static bool IsVisibleOnAnyScreen(Rectangle bounds)
    {
        return Screen.AllScreens.Any((screen) => Rectangle.Intersect(screen.WorkingArea, bounds).Width >= 120
            && Rectangle.Intersect(screen.WorkingArea, bounds).Height >= 80);
    }

    private void SaveAppWindowBounds()
    {
        try
        {
            Directory.CreateDirectory(SettingsDir);
            var bounds = WindowState == FormWindowState.Normal ? Bounds : RestoreBounds;
            var settings = new WindowSettings(bounds.X, bounds.Y, bounds.Width, bounds.Height);
            File.WriteAllText(WindowSettingsPath, JsonSerializer.Serialize(settings));
        }
        catch (IOException) { /* best effort */ }
        catch (UnauthorizedAccessException) { /* best effort */ }
    }

    private void ResizeAppWindow(JsonElement message)
    {
        if (!message.TryGetProperty("w", out var wProp) || !message.TryGetProperty("h", out var hProp)) return;
        if (!wProp.TryGetInt32(out var requestedWidth) || !hProp.TryGetInt32(out var requestedHeight)) return;
        var width = Math.Max(AppMinimumSize.Width, requestedWidth);
        var height = Math.Max(AppMinimumSize.Height, requestedHeight);
        if (WindowState != FormWindowState.Normal) WindowState = FormWindowState.Normal;
        Size = new Size(width, height);
    }

    private sealed record WindowSettings(int X, int Y, int Width, int Height);

    private const uint ES_CONTINUOUS = 0x80000000;
    private const uint ES_SYSTEM_REQUIRED = 0x00000001;
    private const uint ES_DISPLAY_REQUIRED = 0x00000002;
    private const uint GA_ROOT = 2;
    private const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

    [DllImport("kernel32.dll")]
    private static extern uint SetThreadExecutionState(uint esFlags);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern IntPtr GetAncestor(IntPtr hWnd, uint gaFlags);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(uint desiredAccess, bool inheritHandle, uint processId);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool QueryFullProcessImageName(IntPtr hProcess, uint flags, System.Text.StringBuilder exeName, ref int size);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CloseHandle(IntPtr hObject);
}
