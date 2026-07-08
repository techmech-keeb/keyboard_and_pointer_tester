using System.Text;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using SharpCompress.Compressors.Xz;

namespace Olsk60Tester;

/// <summary>
/// Bridges {type:"vialhid"} WebView2 messages from the web UI to the raw
/// HID device. The UI owns the Vial protocol (ui/vial.js); this class only
/// opens the device, moves 32-byte packets, and XZ-decompresses the
/// firmware-embedded vial.json (browsers have no XZ decoder).
/// Ops: open {index} / send {data[32]} / xz {data[]} / close.
/// Replies echo the request seq; unsolicited {op:"closed"} signals unplug.
/// </summary>
internal sealed class VialHidBridge : IDisposable
{
    private readonly Control _ui;                       // for thread marshalling
    private readonly CoreWebView2 _core;
    private readonly SemaphoreSlim _gate = new(1, 1);   // lockstep, one op at a time
    private RawHidDevice? _dev;
    private bool _disposed;

    public VialHidBridge(Control ui, CoreWebView2 core)
    {
        _ui = ui;
        _core = core;
    }

    /// <summary>root must be a Clone() — the JsonDocument is disposed by the caller.</summary>
    public void HandleMessage(JsonElement root)
    {
        _ = Task.Run(async () =>
        {
            await _gate.WaitAsync();
            try
            {
                await ProcessAsync(root);
            }
            catch (Exception ex)
            {
                Reply(new { type = "vialhid", op = "error", seq = GetSeq(root), ok = false, error = ex.Message });
            }
            finally
            {
                _gate.Release();
            }
        });
    }

    private static long GetSeq(JsonElement root)
        => root.TryGetProperty("seq", out var s) && s.TryGetInt64(out var v) ? v : 0;

    private async Task ProcessAsync(JsonElement root)
    {
        var op = root.TryGetProperty("op", out var o) ? o.GetString() : null;
        var seq = GetSeq(root);

        switch (op)
        {
            case "open":
            {
                _dev?.Dispose();
                _dev = null;
                var index = root.TryGetProperty("index", out var idx) ? idx.GetInt32() : 0;
                var paths = RawHidDevice.EnumeratePaths();
                if (paths.Count == 0)
                {
                    Reply(new { type = "vialhid", op = "open", seq, ok = false, error = "no raw-hid device", count = 0 });
                    return;
                }
                var dev = RawHidDevice.Open(paths[index % paths.Count]);
                if (dev is null)
                {
                    Reply(new { type = "vialhid", op = "open", seq, ok = false, error = "open failed", count = paths.Count });
                    return;
                }
                _dev = dev;
                Reply(new { type = "vialhid", op = "open", seq, ok = true, product = dev.Product, count = paths.Count });
                break;
            }
            case "send":
            {
                if (_dev is null)
                {
                    Reply(new { type = "vialhid", op = "send", seq, ok = false, error = "not open" });
                    return;
                }
                var data = ReadBytes(root, 32);
                try
                {
                    using var cts = new CancellationTokenSource(500);
                    _dev.Flush(); // drop stale reports; keeps request/response lockstep
                    await _dev.WriteAsync(data, cts.Token);
                    var resp = await _dev.ReadAsync(cts.Token);
                    Reply(new { type = "vialhid", op = "send", seq, ok = true, data = resp });
                }
                catch (OperationCanceledException)
                {
                    Reply(new { type = "vialhid", op = "send", seq, ok = false, error = "timeout" });
                }
                catch (IOException ex)
                {
                    DropDevice(ex.Message, seq);
                }
                catch (ObjectDisposedException ex)
                {
                    DropDevice(ex.Message, seq);
                }
                break;
            }
            case "xz":
            {
                // The connected device is untrusted input: cap both the
                // compressed payload and the decompressed output so a
                // hostile "keyboard" cannot feed us an XZ bomb.
                const int maxCompressed = 512 * 1024;
                const int maxDecompressed = 1024 * 1024; // real vial.json is a few KB
                var compressed = ReadBytes(root, maxCompressed);
                using var input = new MemoryStream(compressed);
                using var xz = new XZStream(input);
                using var output = new MemoryStream();
                var chunk = new byte[16 * 1024];
                var overflow = false;
                int n;
                while ((n = await xz.ReadAsync(chunk)) > 0)
                {
                    if (output.Length + n > maxDecompressed) { overflow = true; break; }
                    output.Write(chunk, 0, n);
                }
                if (overflow)
                    Reply(new { type = "vialhid", op = "xz", seq, ok = false, error = "definition too large" });
                else
                    Reply(new { type = "vialhid", op = "xz", seq, ok = true, text = Encoding.UTF8.GetString(output.ToArray()) });
                break;
            }
            case "close":
            {
                _dev?.Dispose();
                _dev = null;
                Reply(new { type = "vialhid", op = "close", seq, ok = true });
                break;
            }
        }
    }

    private void DropDevice(string reason, long seq)
    {
        _dev?.Dispose();
        _dev = null;
        Reply(new { type = "vialhid", op = "send", seq, ok = false, error = reason });
        Reply(new { type = "vialhid", op = "closed" });
    }

    private static byte[] ReadBytes(JsonElement root, int max)
    {
        if (!root.TryGetProperty("data", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return Array.Empty<byte>();
        var n = Math.Min(arr.GetArrayLength(), max);
        var buf = new byte[n];
        var i = 0;
        foreach (var e in arr.EnumerateArray())
        {
            if (i >= n) break;
            buf[i++] = (byte)e.GetInt32();
        }
        return buf;
    }

    private void Reply(object payload)
    {
        if (_disposed) return;
        var json = JsonSerializer.Serialize(payload);
        try
        {
            // CoreWebView2 is single-threaded: marshal back to the UI thread
            _ui.BeginInvoke(() =>
            {
                if (!_disposed)
                {
                    try { _core.PostWebMessageAsJson(json); }
                    catch (InvalidOperationException) { /* webview torn down */ }
                }
            });
        }
        catch (InvalidOperationException) { /* form closing */ }
    }

    public void Dispose()
    {
        _disposed = true;
        _dev?.Dispose();
        _dev = null;
    }
}
