namespace Olsk60Tester;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        using var mutex = new Mutex(true, "OLSK60Tester_SingleInstance", out var createdNew);
        if (!createdNew) return;

        // Default: app mode (normal resizable window).
        // --kiosk: exhibition mode (fullscreen lock, key blocking).
        // --windowed remains a backwards-compatible alias for app mode.
        var kiosk = args.Any(a => a.Equals("--kiosk", StringComparison.OrdinalIgnoreCase));

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new KioskForm(kioskMode: kiosk));
    }
}
