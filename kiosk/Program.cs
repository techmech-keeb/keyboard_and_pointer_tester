namespace Olsk60Tester;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        using var mutex = new Mutex(true, "OLSK60Tester_SingleInstance", out var createdNew);
        if (!createdNew) return;

        // --windowed: development mode (no fullscreen lock, no key blocking)
        var windowed = args.Any(a => a.Equals("--windowed", StringComparison.OrdinalIgnoreCase));

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new KioskForm(kioskMode: !windowed));
    }
}
