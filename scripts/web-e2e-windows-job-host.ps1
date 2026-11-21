param(
  [Parameter(Mandatory = $true)][string]$ProbeScript,
  [Parameter(Mandatory = $true)][string]$ReadyFile,
  [Parameter(Mandatory = $true)][string]$ResultFile
)

$ErrorActionPreference = 'Stop'

$source = @'
using System;
using System.Runtime.InteropServices;

public static class MuvitHostJobFixture
{
    [StructLayout(LayoutKind.Sequential)]
    public struct BasicLimit
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct IoCounters
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct ExtendedLimit
    {
        public BasicLimit BasicLimitInformation;
        public IoCounters IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr CreateJobObjectW(IntPtr attributes, string name);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(IntPtr job, int informationClass, ref ExtendedLimit information, uint length);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    [DllImport("kernel32.dll")]
    private static extern IntPtr GetCurrentProcess();

    public static IntPtr Create(int activeProcessLimit)
    {
        IntPtr job = CreateJobObjectW(IntPtr.Zero, null);
        SetLimit(job, activeProcessLimit);
        if (!AssignProcessToJobObject(job, GetCurrentProcess())) throw new Exception("AssignProcessToJobObject falhou: " + Marshal.GetLastWin32Error());
        return job;
    }

    public static void Restrict(IntPtr job, int activeProcessLimit)
    {
        SetLimit(job, activeProcessLimit);
    }

    private static void SetLimit(IntPtr job, int activeProcessLimit)
    {
        ExtendedLimit information = new ExtendedLimit();
        information.BasicLimitInformation.LimitFlags = 0x00000008;
        information.BasicLimitInformation.ActiveProcessLimit = (uint)activeProcessLimit;
        if (!SetInformationJobObject(job, 9, ref information, (uint)Marshal.SizeOf(typeof(ExtendedLimit))))
            throw new Exception("SetInformationJobObject falhou: " + Marshal.GetLastWin32Error());
    }
}
'@

Add-Type -TypeDefinition $source -Language CSharp -ErrorAction Stop
function ConvertTo-MuvitProcessArgument {
  param([AllowEmptyString()][string]$Value)
  if ($Value -eq '') { return '""' }
  if ($Value -notmatch '[\s"]') { return $Value }
  $builder = New-Object System.Text.StringBuilder
  [void]$builder.Append('"')
  $backslashes = 0
  foreach ($character in $Value.ToCharArray()) {
    if ($character -eq '\') { $backslashes++; continue }
    if ($character -eq '"') {
      [void]$builder.Append(('\' * ($backslashes * 2 + 1)))
      [void]$builder.Append('"')
      $backslashes = 0
      continue
    }
    if ($backslashes -gt 0) {
      [void]$builder.Append(('\' * $backslashes))
      $backslashes = 0
    }
    [void]$builder.Append($character)
  }
  if ($backslashes -gt 0) { [void]$builder.Append(('\' * ($backslashes * 2))) }
  [void]$builder.Append('"')
  return $builder.ToString()
}
function Join-MuvitProcessArguments {
  param([string[]]$Values)
  return (($Values | ForEach-Object { ConvertTo-MuvitProcessArgument $_ }) -join ' ')
}
$job = [MuvitHostJobFixture]::Create(10)
$probeArguments = Join-MuvitProcessArguments @($ProbeScript, $ReadyFile, $ResultFile)
$probe = Start-Process -FilePath (Get-Command node).Source -ArgumentList $probeArguments -NoNewWindow -PassThru
$deadline = (Get-Date).AddSeconds(30)
while (-not (Test-Path -LiteralPath $ReadyFile) -and (Get-Date) -lt $deadline -and -not $probe.HasExited) {
  Start-Sleep -Milliseconds 50
}
if (-not (Test-Path -LiteralPath $ReadyFile)) {
  if (-not $probe.HasExited) { Stop-Process -Id $probe.Id -Force -ErrorAction SilentlyContinue }
  exit 3
}
[MuvitHostJobFixture]::Restrict($job, 3)
$probe.WaitForExit()
exit $probe.ExitCode
