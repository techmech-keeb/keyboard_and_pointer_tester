using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

namespace Olsk60Tester;

/// <summary>
/// Minimal Win32 raw-HID access for the QMK/Vial raw usage
/// (usage page 0xFF60, usage 0x61, 32-byte reports). Protocol logic
/// lives in the web UI (ui/vial.js) — this class is a dumb pipe:
/// enumerate, open, write one report, read one report.
/// </summary>
internal sealed class RawHidDevice : IDisposable
{
    public const ushort UsagePageVendor = 0xFF60;
    public const ushort UsageRaw = 0x61;

    private readonly SafeFileHandle _handle;
    private readonly FileStream _stream;

    public string Product { get; }
    public int InputReportLength { get; }   // includes report-id byte
    public int OutputReportLength { get; }

    private RawHidDevice(SafeFileHandle handle, string product, int inLen, int outLen)
    {
        _handle = handle;
        Product = product;
        InputReportLength = inLen;
        OutputReportLength = outLen;
        // bufferSize 1 = unbuffered: each 33-byte report maps to one ReadFile/WriteFile
        _stream = new FileStream(handle, FileAccess.ReadWrite, bufferSize: 1, isAsync: true);
    }

    /// <summary>Paths of all present HID interfaces exposing FF60:0061.</summary>
    public static List<string> EnumeratePaths()
    {
        var result = new List<string>();
        HidD_GetHidGuid(out var hidGuid);
        var devInfo = SetupDiGetClassDevs(ref hidGuid, null, IntPtr.Zero, DIGCF_PRESENT | DIGCF_DEVICEINTERFACE);
        if (devInfo == INVALID_HANDLE_VALUE) return result;
        try
        {
            var ifData = new SP_DEVICE_INTERFACE_DATA { cbSize = Marshal.SizeOf<SP_DEVICE_INTERFACE_DATA>() };
            for (uint i = 0; SetupDiEnumDeviceInterfaces(devInfo, IntPtr.Zero, ref hidGuid, i, ref ifData); i++)
            {
                var path = GetInterfacePath(devInfo, ref ifData);
                if (path is null) continue;
                if (ProbeUsage(path)) result.Add(path);
            }
        }
        finally
        {
            SetupDiDestroyDeviceInfoList(devInfo);
        }
        return result;
    }

    private static string? GetInterfacePath(IntPtr devInfo, ref SP_DEVICE_INTERFACE_DATA ifData)
    {
        SetupDiGetDeviceInterfaceDetail(devInfo, ref ifData, IntPtr.Zero, 0, out var size, IntPtr.Zero);
        if (size <= 0 || size > 1024) return null;
        var buf = Marshal.AllocHGlobal(size);
        try
        {
            // x64: cbSize of SP_DEVICE_INTERFACE_DETAIL_DATA_W is 8 (4-byte int + WCHAR alignment)
            Marshal.WriteInt32(buf, IntPtr.Size == 8 ? 8 : 6);
            if (!SetupDiGetDeviceInterfaceDetail(devInfo, ref ifData, buf, size, out _, IntPtr.Zero))
                return null;
            return Marshal.PtrToStringUni(buf + 4);
        }
        finally
        {
            Marshal.FreeHGlobal(buf);
        }
    }

    /// <summary>Open without R/W access just to read the top-level usage.</summary>
    private static bool ProbeUsage(string path)
    {
        using var h = CreateFile(path, 0, FILE_SHARE_READ | FILE_SHARE_WRITE, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);
        if (h.IsInvalid) return false;
        if (!HidD_GetPreparsedData(h, out var pp)) return false;
        try
        {
            return HidP_GetCaps(pp, out var caps) == HIDP_STATUS_SUCCESS
                && caps.UsagePage == UsagePageVendor
                && caps.Usage == UsageRaw;
        }
        finally
        {
            HidD_FreePreparsedData(pp);
        }
    }

    public static RawHidDevice? Open(string path)
    {
        var h = CreateFile(path, GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE,
            IntPtr.Zero, OPEN_EXISTING, FILE_FLAG_OVERLAPPED, IntPtr.Zero);
        if (h.IsInvalid) return null;

        if (!HidD_GetPreparsedData(h, out var pp))
        {
            h.Dispose();
            return null;
        }
        HIDP_CAPS caps;
        try
        {
            if (HidP_GetCaps(pp, out caps) != HIDP_STATUS_SUCCESS)
            {
                h.Dispose();
                return null;
            }
        }
        finally
        {
            HidD_FreePreparsedData(pp);
        }

        var product = "";
        var name = new char[127];
        if (HidD_GetProductString(h, name, name.Length * 2))
        {
            var s = new string(name);
            var nul = s.IndexOf('\0');
            product = nul >= 0 ? s[..nul] : s;
        }

        return new RawHidDevice(h, product, caps.InputReportByteLength, caps.OutputReportByteLength);
    }

    /// <summary>Drop any stale input reports so request/response stays in lockstep.</summary>
    public void Flush() => HidD_FlushQueue(_handle);

    /// <summary>Write one 32-byte packet (report id 0 prepended).</summary>
    public async Task WriteAsync(byte[] data32, CancellationToken ct)
    {
        var buf = new byte[Math.Max(OutputReportLength, data32.Length + 1)];
        Array.Copy(data32, 0, buf, 1, data32.Length);
        await _stream.WriteAsync(buf, ct).ConfigureAwait(false);
        await _stream.FlushAsync(ct).ConfigureAwait(false);
    }

    /// <summary>Read one input report; returns payload without the report-id byte.</summary>
    public async Task<byte[]> ReadAsync(CancellationToken ct)
    {
        var buf = new byte[Math.Max(InputReportLength, 33)];
        var n = await _stream.ReadAsync(buf, ct).ConfigureAwait(false);
        if (n <= 1) throw new IOException("empty HID report");
        return buf[1..n];
    }

    public void Dispose()
    {
        _stream.Dispose();
        _handle.Dispose();
    }

    // ---------------- P/Invoke ----------------
    private const uint DIGCF_PRESENT = 0x02;
    private const uint DIGCF_DEVICEINTERFACE = 0x10;
    private const uint GENERIC_READ = 0x80000000;
    private const uint GENERIC_WRITE = 0x40000000;
    private const uint FILE_SHARE_READ = 0x1;
    private const uint FILE_SHARE_WRITE = 0x2;
    private const uint OPEN_EXISTING = 3;
    private const uint FILE_FLAG_OVERLAPPED = 0x40000000;
    private const int HIDP_STATUS_SUCCESS = 0x00110000;
    private static readonly IntPtr INVALID_HANDLE_VALUE = new(-1);

    [StructLayout(LayoutKind.Sequential)]
    private struct SP_DEVICE_INTERFACE_DATA
    {
        public int cbSize;
        public Guid InterfaceClassGuid;
        public uint Flags;
        public IntPtr Reserved;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct HIDP_CAPS
    {
        public ushort Usage;
        public ushort UsagePage;
        public ushort InputReportByteLength;
        public ushort OutputReportByteLength;
        public ushort FeatureReportByteLength;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 17)]
        public ushort[] Reserved;
        public ushort NumberLinkCollectionNodes;
        public ushort NumberInputButtonCaps;
        public ushort NumberInputValueCaps;
        public ushort NumberInputDataIndices;
        public ushort NumberOutputButtonCaps;
        public ushort NumberOutputValueCaps;
        public ushort NumberOutputDataIndices;
        public ushort NumberFeatureButtonCaps;
        public ushort NumberFeatureValueCaps;
        public ushort NumberFeatureDataIndices;
    }

    [DllImport("hid.dll")]
    private static extern void HidD_GetHidGuid(out Guid hidGuid);

    [DllImport("hid.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool HidD_GetPreparsedData(SafeFileHandle hidDeviceObject, out IntPtr preparsedData);

    [DllImport("hid.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool HidD_FreePreparsedData(IntPtr preparsedData);

    [DllImport("hid.dll")]
    private static extern int HidP_GetCaps(IntPtr preparsedData, out HIDP_CAPS caps);

    [DllImport("hid.dll", CharSet = CharSet.Unicode)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool HidD_GetProductString(SafeFileHandle hidDeviceObject, [Out] char[] buffer, int bufferLength);

    [DllImport("hid.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool HidD_FlushQueue(SafeFileHandle hidDeviceObject);

    [DllImport("setupapi.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr SetupDiGetClassDevs(ref Guid classGuid, string? enumerator, IntPtr hwndParent, uint flags);

    [DllImport("setupapi.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetupDiEnumDeviceInterfaces(IntPtr deviceInfoSet, IntPtr deviceInfoData,
        ref Guid interfaceClassGuid, uint memberIndex, ref SP_DEVICE_INTERFACE_DATA deviceInterfaceData);

    [DllImport("setupapi.dll", CharSet = CharSet.Unicode)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetupDiGetDeviceInterfaceDetail(IntPtr deviceInfoSet,
        ref SP_DEVICE_INTERFACE_DATA deviceInterfaceData, IntPtr deviceInterfaceDetailData,
        int deviceInterfaceDetailDataSize, out int requiredSize, IntPtr deviceInfoData);

    [DllImport("setupapi.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetupDiDestroyDeviceInfoList(IntPtr deviceInfoSet);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFileHandle CreateFile(string fileName, uint desiredAccess, uint shareMode,
        IntPtr securityAttributes, uint creationDisposition, uint flagsAndAttributes, IntPtr templateFile);
}
