param(
  [Parameter(Mandatory = $true)][string]$Marker,
  [Parameter(Mandatory = $true)][string]$NodeExecutable
)

$ErrorActionPreference = 'Stop'

$source = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class MuvitBreakawayFixture
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct StartupInfo
    {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct ProcessInformation
    {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool CreateProcessW(
        string applicationName,
        StringBuilder commandLine,
        IntPtr processAttributes,
        IntPtr threadAttributes,
        bool inheritHandles,
        uint creationFlags,
        IntPtr environment,
        string currentDirectory,
        ref StartupInfo startupInfo,
        out ProcessInformation processInformation);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);

    public static int TryBreakaway(string applicationName, string commandLine, out int processId)
    {
        StartupInfo startup = new StartupInfo();
        startup.cb = Marshal.SizeOf(typeof(StartupInfo));
        ProcessInformation information = new ProcessInformation();
        StringBuilder buffer = new StringBuilder(commandLine, commandLine.Length + 1);
        bool created = CreateProcessW(
            applicationName,
            buffer,
            IntPtr.Zero,
            IntPtr.Zero,
            false,
            0x01000000,
            IntPtr.Zero,
            null,
            ref startup,
            out information);
        if (!created)
        {
            processId = 0;
            return Marshal.GetLastWin32Error();
        }
        processId = information.dwProcessId;
        WaitForSingleObject(information.hProcess, 5000);
        CloseHandle(information.hThread);
        CloseHandle(information.hProcess);
        return 0;
    }
}
'@

Add-Type -TypeDefinition $source -Language CSharp -ErrorAction Stop
$script = "require('node:fs').writeFileSync('$($Marker.Replace("'", "''"))', 'escapou')"
$commandLine = '"' + $NodeExecutable + '" -e "' + $script.Replace('"', '\"') + '"'
[System.IO.File]::WriteAllText("$Marker.commandline", $commandLine, [System.Text.UTF8Encoding]::new($false))
$spawnedPid = 0
$code = [MuvitBreakawayFixture]::TryBreakaway($NodeExecutable, $commandLine, [ref]$spawnedPid)
if ($code -eq 0) {
  "criado=$spawnedPid"
} else {
  "erro=$code"
}
