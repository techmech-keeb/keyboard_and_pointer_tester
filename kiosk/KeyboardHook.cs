using System.Runtime.InteropServices;

namespace Olsk60Tester;

/// <summary>
/// Low-level keyboard hook (WH_KEYBOARD_LL) that swallows every key /
/// shortcut that could take the user away from the tester:
/// Win keys, Alt+Tab, Alt+Esc, Alt+F4, Alt+Space, Ctrl+Esc.
/// Swallowed keys are reported via <see cref="BlockedKey"/> so the web UI
/// can still visualize them. Ctrl+Alt+Shift+F12 raises
/// <see cref="ExitRequested"/> (staff-only exit chord).
/// Note: Ctrl+Alt+Del is a Secure Attention Sequence and cannot be hooked —
/// see README for OS-level kiosk hardening.
/// </summary>
internal sealed class KeyboardHook : IDisposable
{
    public sealed record KeyInfo(string Code, string Key, bool Down, bool Repeat);

    public event Action<KeyInfo>? BlockedKey;
    public event Action? ExitRequested;

    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_KEYUP = 0x0101;
    private const int WM_SYSKEYDOWN = 0x0104;
    private const int WM_SYSKEYUP = 0x0105;

    private const int VK_TAB = 0x09;
    private const int VK_ESCAPE = 0x1B;
    private const int VK_SPACE = 0x20;
    private const int VK_LWIN = 0x5B;
    private const int VK_RWIN = 0x5C;
    private const int VK_F4 = 0x73;
    private const int VK_F12 = 0x7B;
    private const int VK_SHIFT = 0x10;
    private const int VK_CONTROL = 0x11;
    private const int VK_MENU = 0x12;

    private readonly LowLevelKeyboardProc _proc; // keep delegate alive
    private readonly IntPtr _hookId;
    private readonly HashSet<int> _held = new();

    public KeyboardHook()
    {
        _proc = HookCallback;
        _hookId = SetWindowsHookEx(WH_KEYBOARD_LL, _proc, GetModuleHandle(null), 0);
        if (_hookId == IntPtr.Zero)
            throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "SetWindowsHookEx failed");
    }

    private IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0)
        {
            var data = Marshal.PtrToStructure<KBDLLHOOKSTRUCT>(lParam);
            var msg = wParam.ToInt64();
            var down = msg is WM_KEYDOWN or WM_SYSKEYDOWN;
            var up = msg is WM_KEYUP or WM_SYSKEYUP;
            var vk = (int)data.vkCode;
            // NOTE: don't use LLKHF_ALTDOWN here — the context code is 0 while
            // Ctrl+Alt are held together, which broke the exit chord.
            var altHeld = (GetAsyncKeyState(VK_MENU) & 0x8000) != 0;
            var ctrlHeld = (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0;
            var shiftHeld = (GetAsyncKeyState(VK_SHIFT) & 0x8000) != 0;

            // staff exit chord
            if (down && vk == VK_F12 && ctrlHeld && altHeld && shiftHeld)
            {
                ExitRequested?.Invoke();
                return (IntPtr)1;
            }

            if (ShouldBlock(vk, altHeld, ctrlHeld))
            {
                if (down)
                {
                    var repeat = !_held.Add(vk);
                    Report(vk, true, repeat);
                }
                else if (up)
                {
                    _held.Remove(vk);
                    Report(vk, false, false);
                }
                return (IntPtr)1; // swallow
            }
        }
        return CallNextHookEx(_hookId, nCode, wParam, lParam);
    }

    private static bool ShouldBlock(int vk, bool alt, bool ctrl)
    {
        if (vk is VK_LWIN or VK_RWIN) return true;
        if (alt && vk is VK_TAB or VK_ESCAPE or VK_F4 or VK_SPACE) return true;
        if (ctrl && vk == VK_ESCAPE) return true;
        return false;
    }

    private void Report(int vk, bool down, bool repeat)
    {
        var (code, key) = vk switch
        {
            VK_LWIN => ("MetaLeft", "Meta"),
            VK_RWIN => ("MetaRight", "Meta"),
            VK_TAB => ("Tab", "Tab"),
            VK_ESCAPE => ("Escape", "Escape"),
            VK_F4 => ("F4", "F4"),
            VK_SPACE => ("Space", " "),
            _ => ($"VK{vk}", $"VK{vk}"),
        };
        BlockedKey?.Invoke(new KeyInfo(code, key, down, repeat));
    }

    public void Dispose()
    {
        if (_hookId != IntPtr.Zero) UnhookWindowsHookEx(_hookId);
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct KBDLLHOOKSTRUCT
    {
        public uint vkCode;
        public uint scanCode;
        public uint flags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string? lpModuleName);

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);
}
