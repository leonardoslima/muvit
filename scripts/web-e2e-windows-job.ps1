$ErrorActionPreference = 'Stop'

$pipeIn = $env:MUVIT_WEB_E2E_JOB_PIPE_IN
$pipeOut = $env:MUVIT_WEB_E2E_JOB_PIPE_OUT
$token = $env:MUVIT_WEB_E2E_JOB_TOKEN
if ([string]::IsNullOrEmpty($pipeIn) -or [string]::IsNullOrEmpty($pipeOut) -or [string]::IsNullOrEmpty($token)) {
  [Console]::Error.WriteLine('bootstrap sem canal de controle')
  exit 2
}

$source = @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Muvit.Windows
{
    public static class JobSupervisor
    {
        private const int BasicAccountingInformationClass = 1;
        private const int ExtendedLimitInformationClass = 9;
        private const uint JobObjectLimitKillOnJobClose = 0x00002000;
        private const uint CreateSuspended = 0x00000004;
        private const uint CreateUnicodeEnvironment = 0x00000400;
        private const uint CreateNoWindow = 0x08000000;
        private const uint ExtendedStartupInfoPresent = 0x00080000;
        private const uint StartfUseStdHandles = 0x00000100;
        private const uint HandleFlagInherit = 0x00000001;
        private const uint Synchronize = 0x00100000;
        private const uint ProcessQueryLimitedInformation = 0x00001000;
        private const uint GenericRead = 0x80000000;
        private const uint FileShareRead = 0x00000001;
        private const uint FileShareWrite = 0x00000002;
        private const uint OpenExisting = 3;
        private const uint WaitObject0 = 0;
        private const uint Infinite = 0xFFFFFFFF;
        private const int StdInputHandle = -10;
        private const int StdOutputHandle = -11;
        private const int StdErrorHandle = -12;
        private const string AuthContext = "muvit-job-auth:";
        private const string EventsContext = "muvit-job-events:";
        private static readonly IntPtr ProcThreadAttributeJobList = new IntPtr(0x0002000D);
        private static readonly IntPtr ProcThreadAttributeHandleList = new IntPtr(0x00020002);

        [StructLayout(LayoutKind.Sequential)]
        private struct JobObjectBasicLimitInformation
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
        private struct IoCounters
        {
            public ulong ReadOperationCount;
            public ulong WriteOperationCount;
            public ulong OtherOperationCount;
            public ulong ReadTransferCount;
            public ulong WriteTransferCount;
            public ulong OtherTransferCount;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JobObjectExtendedLimitInformation
        {
            public JobObjectBasicLimitInformation BasicLimitInformation;
            public IoCounters IoInfo;
            public UIntPtr ProcessMemoryLimit;
            public UIntPtr JobMemoryLimit;
            public UIntPtr PeakProcessMemoryUsed;
            public UIntPtr PeakJobMemoryUsed;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JobObjectBasicAccountingInformation
        {
            public long TotalUserTime;
            public long TotalKernelTime;
            public long ThisPeriodTotalUserTime;
            public long ThisPeriodTotalKernelTime;
            public uint TotalPageFaultCount;
            public uint TotalProcesses;
            public uint ActiveProcesses;
            public uint TotalTerminatedProcesses;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct StartupInfoW
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
        private struct StartupInfoExW
        {
            public StartupInfoW StartupInfo;
            public IntPtr lpAttributeList;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct ProcessInformation
        {
            public IntPtr hProcess;
            public IntPtr hThread;
            public int dwProcessId;
            public int dwThreadId;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct SecurityAttributes
        {
            public int nLength;
            public IntPtr lpSecurityDescriptor;
            public int bInheritHandle;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct ProcessBasicInformation
        {
            public IntPtr ExitStatus;
            public IntPtr PebBaseAddress;
            public IntPtr AffinityMask;
            public int BasePriority;
            public IntPtr UniqueProcessId;
            public IntPtr InheritedFromUniqueProcessId;
        }

        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern IntPtr CreateJobObjectW(IntPtr attributes, string name);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetInformationJobObject(
            IntPtr job,
            int informationClass,
            ref JobObjectExtendedLimitInformation information,
            uint length);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool QueryInformationJobObject(
            IntPtr job,
            int informationClass,
            ref JobObjectBasicAccountingInformation information,
            uint length,
            out uint returnedLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool TerminateJobObject(IntPtr job, uint exitCode);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool IsProcessInJob(IntPtr process, IntPtr job, out int result);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool InitializeProcThreadAttributeList(
            IntPtr attributeList,
            int attributeCount,
            int flags,
            ref IntPtr size);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool UpdateProcThreadAttribute(
            IntPtr attributeList,
            uint flags,
            IntPtr attribute,
            IntPtr value,
            IntPtr size,
            IntPtr previousValue,
            IntPtr returnSize);

        [DllImport("kernel32.dll")]
        private static extern void DeleteProcThreadAttributeList(IntPtr attributeList);

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
            ref StartupInfoExW startupInfo,
            out ProcessInformation processInformation);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern uint ResumeThread(IntPtr thread);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr handle);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr GetStdHandle(int which);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetHandleInformation(IntPtr handle, uint mask, uint flags);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CreatePipe(
            out IntPtr readPipe,
            out IntPtr writePipe,
            ref SecurityAttributes attributes,
            uint size);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool WriteFile(
            IntPtr file,
            byte[] buffer,
            int bytesToWrite,
            out int bytesWritten,
            IntPtr overlapped);

        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern IntPtr CreateFileW(
            string fileName,
            uint desiredAccess,
            uint shareMode,
            IntPtr securityAttributes,
            uint creationDisposition,
            uint flagsAndAttributes,
            IntPtr templateFile);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr OpenProcess(uint desiredAccess, bool inheritHandle, int processId);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool GetProcessTimes(
            IntPtr process,
            out long creationTime,
            out long exitTime,
            out long kernelTime,
            out long userTime);

        [DllImport("kernel32.dll")]
        private static extern IntPtr GetCurrentProcess();

        [DllImport("kernel32.dll")]
        private static extern int GetCurrentProcessId();

        [DllImport("ntdll.dll")]
        private static extern int NtQueryInformationProcess(
            IntPtr process,
            int informationClass,
            ref ProcessBasicInformation information,
            int informationLength,
            out int returnLength);

        private static StreamWriter controlWriter;
        private static StreamWriter inputWriter;
        private static StreamReader controlReader;
        private static readonly object WriteLock = new object();
        private static readonly object StopLock = new object();
        private static readonly object ThreadHandleLock = new object();
        private static volatile bool stopRequested;
        private static volatile bool stopRejectsInput;
        private static volatile bool protocolBroken;
        private static volatile bool leaderExited;
        private static volatile bool leaderEventSent;
        private static volatile bool resumeConfirmed;
        private static volatile bool resumedLeader;
        private static int eventSequence;
        private static uint leaderExitCode;
        private static IntPtr jobHandle = IntPtr.Zero;
        private static IntPtr leaderProcess = IntPtr.Zero;
        private static IntPtr parentProcess = IntPtr.Zero;
        private static int leaderPid;
        private static int stopTimeoutMs = 5000;
        private const int PostStopDrainMs = 500;
        private const int ControlTerminalWindowMs = PostStopDrainMs + 1000;
        private static volatile bool controlChannelClosed;
        private static readonly ManualResetEvent ControlReaderFinished = new ManualResetEvent(false);
        private static readonly Queue<StdinChunk> StdinQueue = new Queue<StdinChunk>();
        private static readonly AutoResetEvent StdinSignal = new AutoResetEvent(false);
        private static readonly AutoResetEvent StopSignal = new AutoResetEvent(false);
        private static readonly AutoResetEvent ResumeSignal = new AutoResetEvent(false);
        private static IntPtr stdinWriteHandle = IntPtr.Zero;        private static readonly string TestHook = Environment.GetEnvironmentVariable("MUVIT_WEB_E2E_JOB_TEST") ?? "";
        private static readonly string TestDelay = Environment.GetEnvironmentVariable("MUVIT_WEB_E2E_JOB_TEST_DELAY_MS") ?? "";
        private sealed class StdinChunk
        {
            public byte[] Data;
            public bool IsEof;
        }

        public static int Run(string pipeIn, string pipeOut, string token)
        {
            try
            {
                return RunCore(pipeIn, pipeOut, token);
            }
            catch (Exception error)
            {
                SendError("sandbox", 0, error.Message);
                return 3;
            }
        }

        private static int RunCore(string pipeIn, string pipeOut, string token)
        {
            NamedPipeClientStream inputPipe = new NamedPipeClientStream(".", pipeIn, PipeDirection.InOut, PipeOptions.None);
            NamedPipeClientStream outputPipe = new NamedPipeClientStream(".", pipeOut, PipeDirection.Out, PipeOptions.None);
            try
            {
                if (TestHook == "connect-delay" && TestDelay.Length > 0)
                {
                    int connectDelay;
                    if (int.TryParse(TestDelay, out connectDelay) && connectDelay > 0) Thread.Sleep(connectDelay);
                }
                inputPipe.Connect(15000);
                outputPipe.Connect(15000);
            }
            catch (Exception)
            {
                return 4;
            }
            controlWriter = new StreamWriter(outputPipe, new UTF8Encoding(false));
            controlWriter.AutoFlush = true;
            inputWriter = new StreamWriter(inputPipe, new UTF8Encoding(false));
            inputWriter.AutoFlush = true;
            controlReader = new StreamReader(inputPipe, new UTF8Encoding(false));

            string challenge;
            if (!ReadControlLine(out challenge)) return 10;
            string[] challengeFields = challenge.Split(new char[] { ' ' });
            if (challengeFields.Length != 3 || challengeFields[0] != "challenge" || challengeFields[1].Length == 0 || challengeFields[2].Length == 0) return 11;
            inputWriter.WriteLine("auth " + ComputeProof(token, AuthContext, challengeFields[1]));
            controlWriter.WriteLine("auth " + ComputeProof(token, EventsContext, challengeFields[2]));

            string applicationName = null;
            string commandLine = null;
            string workingDirectory = null;
            string stdinMode = "closed";
            List<KeyValuePair<string, string>> environment = new List<KeyValuePair<string, string>>();
            while (true)
            {
                string line;
                if (!ReadControlLine(out line)) return 13;
                if (line == "end") break;
                int space = line.IndexOf(' ');
                if (space <= 0) return 14;
                string key = line.Substring(0, space);
                string value = line.Substring(space + 1);
                if (key == "app") applicationName = Decode(value);
                else if (key == "cmd") commandLine = Decode(value);
                else if (key == "cwd") workingDirectory = Decode(value);
                else if (key == "stdin") stdinMode = value;
                else if (key == "stop") stopTimeoutMs = int.Parse(value, System.Globalization.CultureInfo.InvariantCulture);
                else if (key == "env")
                {
                    int separator = value.IndexOf(' ');
                    if (separator <= 0) return 15;
                    environment.Add(new KeyValuePair<string, string>(
                        Decode(value.Substring(0, separator)),
                        Decode(value.Substring(separator + 1))));
                }
                else return 16;
            }
            if (applicationName == null || commandLine == null) return 17;

            int parentPid = GetParentProcessId();
            if (parentPid <= 0)
            {
                SendError("parent", 5, "não foi possível abrir a instância do Node pai");
                return 21;
            }
            parentProcess = OpenProcess(Synchronize | ProcessQueryLimitedInformation, false, parentPid);
            if (parentProcess == IntPtr.Zero)
            {
                SendError("parent", Marshal.GetLastWin32Error(), "OpenProcess do Node pai falhou");
                return 22;
            }
            long parentCreated;
            long ignored;
            if (!GetProcessTimes(parentProcess, out parentCreated, out ignored, out ignored, out ignored))
            {
                SendError("parent", Marshal.GetLastWin32Error(), "GetProcessTimes do Node pai falhou");
                return 23;
            }
            jobHandle = CreateJobObjectW(IntPtr.Zero, null);
            if (jobHandle == IntPtr.Zero)
            {
                SendError("create-job", Marshal.GetLastWin32Error(), "CreateJobObjectW falhou");
                return 24;
            }
            JobObjectExtendedLimitInformation limits = new JobObjectExtendedLimitInformation();
            limits.BasicLimitInformation.LimitFlags = JobObjectLimitKillOnJobClose;
            if (!SetInformationJobObject(jobHandle, ExtendedLimitInformationClass, ref limits, (uint)Marshal.SizeOf(typeof(JobObjectExtendedLimitInformation))))
            {
                SendError("job-limit", Marshal.GetLastWin32Error(), "SetInformationJobObject falhou");
                return 25;
            }

            IntPtr stdoutHandle = GetStdHandle(StdOutputHandle);
            IntPtr stderrHandle = GetStdHandle(StdErrorHandle);
            if (stdoutHandle == IntPtr.Zero || stdoutHandle == new IntPtr(-1) || stderrHandle == IntPtr.Zero || stderrHandle == new IntPtr(-1))
            {
                SendError("stdio", 6, "handles de stdout/stderr do supervisor inválidos");
                return 26;
            }
            if (!SetHandleInformation(stdoutHandle, HandleFlagInherit, HandleFlagInherit) ||
                !SetHandleInformation(stderrHandle, HandleFlagInherit, HandleFlagInherit))
            {
                SendError("stdio", Marshal.GetLastWin32Error(), "SetHandleInformation falhou");
                return 27;
            }

            IntPtr stdinReadHandle = IntPtr.Zero;
            if (stdinMode == "pipe")
            {
                SecurityAttributes attributes = new SecurityAttributes();
                attributes.nLength = Marshal.SizeOf(typeof(SecurityAttributes));
                attributes.bInheritHandle = 1;
                IntPtr readPipe;
                IntPtr writePipe;
                if (!CreatePipe(out readPipe, out writePipe, ref attributes, 0))
                {
                    SendError("stdin", Marshal.GetLastWin32Error(), "CreatePipe do stdin falhou");
                    return 28;
                }
                if (!SetHandleInformation(writePipe, HandleFlagInherit, 0))
                {
                    SendError("stdin", Marshal.GetLastWin32Error(), "SetHandleInformation do stdin falhou");
                    return 29;
                }
                stdinReadHandle = readPipe;
                stdinWriteHandle = writePipe;
            }
            else
            {
                stdinReadHandle = CreateFileW("NUL", GenericRead, FileShareRead | FileShareWrite, IntPtr.Zero, OpenExisting, 0, IntPtr.Zero);
                if (stdinReadHandle == IntPtr.Zero || stdinReadHandle == new IntPtr(-1))
                {
                    SendError("stdin", Marshal.GetLastWin32Error(), "abertura de NUL para stdin falhou");
                    return 30;
                }
                if (!SetHandleInformation(stdinReadHandle, HandleFlagInherit, HandleFlagInherit))
                {
                    SendError("stdin", Marshal.GetLastWin32Error(), "SetHandleInformation do stdin NUL falhou");
                    return 31;
                }
            }

            if (TestHook == "fail-create-process")
            {
                SendError("create-process", 5, "acesso negado simulado na criação do processo");
                CloseHandle(stdinReadHandle);
                return 32;
            }
            IntPtr attributeListSize = IntPtr.Zero;
            InitializeProcThreadAttributeList(IntPtr.Zero, 2, 0, ref attributeListSize);
            IntPtr attributeList = Marshal.AllocHGlobal(attributeListSize);
            if (!InitializeProcThreadAttributeList(attributeList, 2, 0, ref attributeListSize))
            {
                SendError("attributes", Marshal.GetLastWin32Error(), "InitializeProcThreadAttributeList falhou");
                Marshal.FreeHGlobal(attributeList);
                CloseHandle(stdinReadHandle);
                return 33;
            }

            IntPtr[] jobList = new IntPtr[] { jobHandle };
            GCHandle jobListPin = GCHandle.Alloc(jobList, GCHandleType.Pinned);
            IntPtr[] handleList = new IntPtr[] { stdinReadHandle, stdoutHandle, stderrHandle };
            GCHandle handleListPin = GCHandle.Alloc(handleList, GCHandleType.Pinned);            ProcessInformation processInformation = new ProcessInformation();
            try
            {
                if (!UpdateProcThreadAttribute(attributeList, 0, ProcThreadAttributeJobList, jobListPin.AddrOfPinnedObject(), new IntPtr(IntPtr.Size), IntPtr.Zero, IntPtr.Zero))
                {
                    SendError("attributes", Marshal.GetLastWin32Error(), "UpdateProcThreadAttribute JOB_LIST falhou");
                    return 34;
                }
                if (!UpdateProcThreadAttribute(attributeList, 0, ProcThreadAttributeHandleList, handleListPin.AddrOfPinnedObject(), new IntPtr(IntPtr.Size * 3), IntPtr.Zero, IntPtr.Zero))
                {
                    SendError("attributes", Marshal.GetLastWin32Error(), "UpdateProcThreadAttribute HANDLE_LIST falhou");
                    return 35;
                }
                StartupInfoExW startup = new StartupInfoExW();
                startup.StartupInfo.cb = Marshal.SizeOf(typeof(StartupInfoExW));
                startup.StartupInfo.dwFlags = (int)StartfUseStdHandles;
                startup.StartupInfo.hStdInput = stdinReadHandle;
                startup.StartupInfo.hStdOutput = stdoutHandle;
                startup.StartupInfo.hStdError = stderrHandle;
                startup.lpAttributeList = attributeList;

                byte[] environmentBlock = BuildEnvironmentBlock(environment);
                IntPtr environmentPointer = Marshal.AllocHGlobal(environmentBlock.Length);
                Marshal.Copy(environmentBlock, 0, environmentPointer, environmentBlock.Length);
                StringBuilder commandLineBuffer = new StringBuilder(commandLine, commandLine.Length + 1);
                try
                {
                    bool created = CreateProcessW(
                        applicationName,
                        commandLineBuffer,
                        IntPtr.Zero,
                        IntPtr.Zero,
                        true,
                        CreateSuspended | CreateUnicodeEnvironment | CreateNoWindow | ExtendedStartupInfoPresent,
                        environmentPointer,
                        workingDirectory,
                        ref startup,
                        out processInformation);
                    if (!created)
                    {
                        int code = Marshal.GetLastWin32Error();
                        SendError("create-process", code, "CreateProcessW falhou com " + code.ToString(System.Globalization.CultureInfo.InvariantCulture));
                        return 36;
                    }
                }
                finally
                {
                    Marshal.FreeHGlobal(environmentPointer);
                }
            }
            finally
            {
                DeleteProcThreadAttributeList(attributeList);
                Marshal.FreeHGlobal(attributeList);
                jobListPin.Free();
                handleListPin.Free();
                if (processInformation.hProcess == IntPtr.Zero)
                {
                    CloseHandle(stdinReadHandle);
                    if (stdinWriteHandle != IntPtr.Zero) CloseHandle(stdinWriteHandle);
                }
            }
            leaderProcess = processInformation.hProcess;
            leaderPid = processInformation.dwProcessId;
            IntPtr threadHandle = processInformation.hThread;
            CloseHandle(stdinReadHandle);
            try
            {
                int inJob;
                if (!IsProcessInJob(leaderProcess, jobHandle, out inJob) || inJob == 0)
                {
                    SendError("assignment", Marshal.GetLastWin32Error(), "processo não foi associado ao Job Object antes do resume");
                    TerminateJobObject(jobHandle, 1);
                    WaitForSingleObject(leaderProcess, 2000);
                    return 38;
                }
                if (TestHook == "ready-delay" && TestDelay.Length > 0)
                {
                    int readyDelay;
                    if (int.TryParse(TestDelay, out readyDelay) && readyDelay > 0) Thread.Sleep(readyDelay);
                }
                Send("ready " + NextSequence().ToString(System.Globalization.CultureInfo.InvariantCulture) + " " + leaderPid.ToString(System.Globalization.CultureInfo.InvariantCulture) + " " + parentPid.ToString(System.Globalization.CultureInfo.InvariantCulture) + " " + parentCreated.ToString(System.Globalization.CultureInfo.InvariantCulture) + " " + GetCurrentProcessId().ToString(System.Globalization.CultureInfo.InvariantCulture));

                Thread parentMonitor = new Thread(ParentMonitorLoop);
                parentMonitor.IsBackground = true;
                parentMonitor.Start();

                Thread readerThread = new Thread(ControlReaderLoop);
                readerThread.IsBackground = true;
                readerThread.Start();

                if (stdinMode == "pipe")
                {
                    Thread stdinWriter = new Thread(StdinWriterLoop);
                    stdinWriter.IsBackground = true;
                    stdinWriter.Start();
                }

                if (TestHook == "crash-before-resume")
                {
                    Thread.Sleep(400);
                    return 39;
                }
                if (TestHook == "break-protocol-before-resume")
                {
                    Send("garbage event");
                    Thread.Sleep(400);
                    return 40;
                }

                bool resumeAllowed;
                lock (StopLock)
                {
                    resumeAllowed = resumeConfirmed && !stopRequested;
                }
                if (!resumeAllowed)
                {
                    WaitHandle.WaitAny(new WaitHandle[] { ResumeSignal, StopSignal });
                    lock (StopLock)
                    {
                        resumeAllowed = resumeConfirmed && !stopRequested;
                    }
                }
                if (TestHook == "resume-delay" && TestDelay.Length > 0)
                {
                    int resumeDelay;
                    if (int.TryParse(TestDelay, out resumeDelay) && resumeDelay > 0) Thread.Sleep(resumeDelay);
                }
                bool attemptedResume = false;
                uint resumeResult = 1;
                lock (StopLock)
                {
                    if (resumeConfirmed && !stopRequested)
                    {
                        attemptedResume = true;
                        resumeResult = ResumeThread(threadHandle);
                        if (resumeResult != 0xFFFFFFFF) resumedLeader = true;
                    }
                }
                if (attemptedResume && resumeResult == 0xFFFFFFFF)
                {
                    SendError("resume", Marshal.GetLastWin32Error(), "ResumeThread falhou");
                    TerminateJobObject(jobHandle, 1);
                    WaitForSingleObject(leaderProcess, 2000);
                    return 41;
                }
                if (TestHook == "protocol-stopped-first")
                {
                    Send("stopped " + NextSequence().ToString(System.Globalization.CultureInfo.InvariantCulture) + " 0 0 1");
                }

                while (true)
                {
                    if (stopRequested) break;
                    if (WaitForSingleObject(leaderProcess, 50) == WaitObject0)
                    {
                        leaderExited = true;
                        RequestStop("leader-exit");
                        break;
                    }
                }

                if (leaderExited)
                {
                    GetExitCode(leaderProcess, out leaderExitCode);
                    SendLeaderExit();
                }

                if (stdinWriteHandle != IntPtr.Zero)
                {
                    StdinSignal.Set();
                }

                if (TestHook == "hang-stop")
                {
                    Thread.Sleep(60000);
                }
                if (TestHook == "stop-delay" && TestDelay.Length > 0)
                {
                    int delay;
                    if (int.TryParse(TestDelay, out delay) && delay > 0) Thread.Sleep(delay);
                }

                bool terminated = TerminateJobObject(jobHandle, 1);
                if (!terminated && GetActiveProcesses() > 0)
                {
                    SendError("terminate", Marshal.GetLastWin32Error(), "TerminateJobObject falhou");
                }

                Stopwatch clock = Stopwatch.StartNew();
                uint active = GetActiveProcesses();
                while (active > 0 && clock.ElapsedMilliseconds < stopTimeoutMs)
                {
                    Thread.Sleep(20);
                    active = GetActiveProcesses();
                }

                if (!leaderExited)
                {
                    WaitForSingleObject(leaderProcess, 2000);
                    GetExitCode(leaderProcess, out leaderExitCode);
                    leaderExited = true;
                    SendLeaderExit();
                }

                bool readerFinished = ControlReaderFinished.WaitOne(ControlTerminalWindowMs);
                if (!readerFinished)
                {
                    // Sem confirmação do thread leitor, o canal não está drenado: falha fechado.
                    lock (StopLock)
                    {
                        protocolBroken = true;
                    }
                }
                bool channelClosed = controlChannelClosed;

                if (TestHook == "skip-zero-proof") active = 1;
                bool proven;
                lock (StopLock)
                {
                    proven = active == 0 && !protocolBroken && readerFinished && channelClosed;
                }
                if (TestHook == "protocol-empty-stopped")
                {
                    Send("stopped " + NextSequence().ToString(System.Globalization.CultureInfo.InvariantCulture) + "  " + (proven ? "1" : "0"));
                }
                else
                {
                    Send("stopped " + NextSequence().ToString(System.Globalization.CultureInfo.InvariantCulture) + " " + active.ToString(System.Globalization.CultureInfo.InvariantCulture) + " " + (resumedLeader ? "1" : "0") + " " + (proven ? "1" : "0"));
                }

                if (!proven)
                {
                    return 42;
                }
                return 0;
            }
            finally
            {
                CloseLeaderThread(ref threadHandle);
            }
        }

        private static int NextSequence()
        {
            return Interlocked.Increment(ref eventSequence);
        }

        private static void CloseLeaderThread(ref IntPtr handle)
        {
            lock (ThreadHandleLock)
            {
                if (handle == IntPtr.Zero) return;
                CloseHandle(handle);
                handle = IntPtr.Zero;
            }
        }

        private static string ComputeProof(string token, string context, string nonce)
        {
            using (HMACSHA256 hmac = new HMACSHA256(Encoding.UTF8.GetBytes(token)))
            {
                byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(context + nonce));
                return Convert.ToBase64String(hash).TrimEnd('=').Replace('+', '-').Replace('/', '_');
            }
        }

        private static void SendLeaderExit()
        {
            if (leaderEventSent) return;
            leaderEventSent = true;
            if (TestHook == "protocol-empty-leader-exit")
            {
                Send("leader-exit " + NextSequence().ToString(System.Globalization.CultureInfo.InvariantCulture) + " ");
                return;
            }
            Send("leader-exit " + NextSequence().ToString(System.Globalization.CultureInfo.InvariantCulture) + " " + leaderExitCode.ToString(System.Globalization.CultureInfo.InvariantCulture));
            if (TestHook == "protocol-duplicate-leader-exit")
            {
                Send("leader-exit " + NextSequence().ToString(System.Globalization.CultureInfo.InvariantCulture) + " " + leaderExitCode.ToString(System.Globalization.CultureInfo.InvariantCulture));
            }
        }

        private static bool GetExitCode(IntPtr process, out uint code)
        {
            return GetExitCodeProcess(process, out code);
        }

        private static int GetParentProcessId()
        {
            ProcessBasicInformation information = new ProcessBasicInformation();
            int size;
            int status = NtQueryInformationProcess(GetCurrentProcess(), 0, ref information, Marshal.SizeOf(typeof(ProcessBasicInformation)), out size);
            if (status != 0) return 0;
            return information.InheritedFromUniqueProcessId.ToInt32();
        }

        private static uint GetActiveProcesses()
        {
            JobObjectBasicAccountingInformation information = new JobObjectBasicAccountingInformation();
            uint returned;
            if (!QueryInformationJobObject(jobHandle, BasicAccountingInformationClass, ref information, (uint)Marshal.SizeOf(typeof(JobObjectBasicAccountingInformation)), out returned))
            {
                return uint.MaxValue;
            }
            return information.ActiveProcesses;
        }

        private static void ParentMonitorLoop()
        {
            uint result = WaitForSingleObject(parentProcess, Infinite);
            if (result == WaitObject0)
            {
                RequestStop("parent-exit");
            }
        }

        private static void ControlReaderLoop()
        {
            try
            {
                bool sawEof = false;
                while (true)
                {
                    string line;
                    if (!ReadControlLine(out line))
                    {
                        if (line.Length > 0)
                        {
                            BreakProtocol();
                        }
                        else
                        {
                            controlChannelClosed = true;
                            RequestStop("control-eof");
                        }
                        return;
                    }
                    if (line == "stop")
                    {
                        RequestStop("control-stop");
                        DrainControlAfterStop();
                        return;
                    }
                    if (line == "resume")
                    {
                        bool accepted;
                        lock (StopLock)
                        {
                            accepted = !stopRequested && !resumeConfirmed;
                            if (accepted) resumeConfirmed = true;
                        }
                        if (!accepted)
                        {
                            BreakProtocol();
                            return;
                        }
                        ResumeSignal.Set();
                        if (TestHook == "suspend-reader" && TestDelay.Length > 0)
                        {
                            int suspendDelay;
                            if (int.TryParse(TestDelay, out suspendDelay) && suspendDelay > 0) Thread.Sleep(suspendDelay);
                        }
                        continue;
                    }
                    if (line == "stdin-eof")
                    {
                        bool afterResume;
                        lock (StopLock)
                        {
                            afterResume = resumeConfirmed && !stopRejectsInput;
                        }
                        if (!afterResume || sawEof)
                        {
                            BreakProtocol();
                            return;
                        }
                        sawEof = true;
                        EnqueueStdin(null, true);
                        continue;
                    }
                    if (line.StartsWith("stdin ", StringComparison.Ordinal))
                    {
                        bool afterResume;
                        lock (StopLock)
                        {
                            afterResume = resumeConfirmed && !stopRejectsInput;
                        }
                        if (!afterResume || sawEof)
                        {
                            BreakProtocol();
                            return;
                        }
                        byte[] data;
                        try
                        {
                            data = DecodeStdin(line.Substring(6));
                        }
                        catch (FormatException)
                        {
                            BreakProtocol();
                            return;
                        }
                        EnqueueStdin(data, false);
                        continue;
                    }
                    BreakProtocol();
                    return;
                }
            }
            catch (Exception)
            {
                lock (StopLock)
                {
                    protocolBroken = true;
                }
                RequestStop("control-error");
            }
            finally
            {
                ControlReaderFinished.Set();
            }
        }

        private static void DrainControlAfterStop()
        {
            if (TestHook == "drain-delay" && TestDelay.Length > 0)
            {
                int drainDelay;
                if (int.TryParse(TestDelay, out drainDelay) && drainDelay > 0) Thread.Sleep(drainDelay);
            }
            try
            {
                Task<string> pending = controlReader.ReadLineAsync();
                if (!pending.Wait(PostStopDrainMs))
                {
                    // Sem EOF após o stop, o canal não é confiável: não publique proven=1.
                    lock (StopLock)
                    {
                        protocolBroken = true;
                    }
                    return;
                }
                string extra = pending.Result;
                if (extra != null)
                {
                    // Qualquer linha ou sufixo parcial atrás do stop é protocolo inválido.
                    BreakProtocol();
                    return;
                }
                controlChannelClosed = true;
            }
            catch (Exception)
            {
                BreakProtocol();
            }
        }

        private static bool ReadControlLine(out string line)
        {
            StringBuilder builder = new StringBuilder();
            while (true)
            {
                int next = controlReader.Read();
                if (next < 0)
                {
                    line = builder.ToString();
                    return false;
                }
                if (next == '\n')
                {
                    line = builder.ToString();
                    if (line.EndsWith("\r", StringComparison.Ordinal))
                    {
                        line = line.Substring(0, line.Length - 1);
                    }
                    return true;
                }
                builder.Append((char)next);
            }
        }

        private static byte[] DecodeStdin(string value)
        {
            if (value.Length % 4 != 0) throw new FormatException("base64 incompleto");
            int paddingIndex = value.IndexOf('=');
            int dataLength = paddingIndex < 0 ? value.Length : paddingIndex;
            if (paddingIndex >= 0 && value.Length - paddingIndex > 2)
                throw new FormatException("padding base64 inválido");
            for (int i = 0; i < dataLength; i++)
            {
                char character = value[i];
                bool valid =
                    (character >= 'A' && character <= 'Z') ||
                    (character >= 'a' && character <= 'z') ||
                    (character >= '0' && character <= '9') ||
                    character == '+' ||
                    character == '/';
                if (!valid) throw new FormatException("caractere base64 inválido");
            }
            if (paddingIndex >= 0)
            {
                for (int i = paddingIndex; i < value.Length; i++)
                {
                    if (value[i] != '=') throw new FormatException("dado após padding base64");
                }
            }
            return Convert.FromBase64String(value);
        }

        private static void BreakProtocol()
        {
            lock (StopLock)
            {
                protocolBroken = true;
            }
            RequestStop("protocol");
        }

        private static void EnqueueStdin(byte[] data, bool eof)
        {
            lock (StdinQueue)
            {
                StdinChunk chunk = new StdinChunk();
                chunk.Data = data;
                chunk.IsEof = eof;
                StdinQueue.Enqueue(chunk);
            }
            StdinSignal.Set();
        }

        private static void StdinWriterLoop()
        {
            try
            {
                while (true)
                {
                    StdinChunk chunk = null;
                    lock (StdinQueue)
                    {
                        if (StdinQueue.Count > 0) chunk = StdinQueue.Dequeue();
                    }
                    if (chunk == null)
                    {
                        if (stopRequested) return;
                        StdinSignal.WaitOne(100);
                        continue;
                    }
                    if (chunk.IsEof)
                    {
                        CloseHandle(stdinWriteHandle);
                        stdinWriteHandle = IntPtr.Zero;
                        return;
                    }
                    int offset = 0;
                    while (offset < chunk.Data.Length && !stopRequested)
                    {
                        int length = chunk.Data.Length - offset;
                        byte[] slice = new byte[length];
                        Array.Copy(chunk.Data, offset, slice, 0, length);
                        int written;
                        if (!WriteFile(stdinWriteHandle, slice, slice.Length, out written, IntPtr.Zero) || written <= 0)
                        {
                            return;
                        }
                        offset += written;
                    }
                }
            }
            catch (Exception)
            {
            }
        }

        private static void RequestStop(string reason)
        {
            lock (StopLock)
            {
                // O término natural do líder não invalida frames stdin já
                // enfileirados; só um stop explícito fecha a aceitação.
                if (reason == "control-stop") stopRejectsInput = true;
                if (!stopRequested)
                {
                    stopRequested = true;
                }
            }
            StopSignal.Set();
        }
        private static void SendError(string stage, int code, string message)
        {
            if (protocolBroken) return;
            Send("error " + stage + " " + code.ToString(System.Globalization.CultureInfo.InvariantCulture) + " " + Convert.ToBase64String(Encoding.UTF8.GetBytes(message ?? "")));
        }

        private static void Send(string line)
        {
            lock (WriteLock)
            {
                if (controlWriter == null) return;
                try
                {
                    controlWriter.WriteLine(line);
                    controlWriter.Flush();
                }
                catch (Exception)
                {
                }
            }
        }

        private static string Decode(string value)
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(value));
        }

        private static byte[] BuildEnvironmentBlock(List<KeyValuePair<string, string>> values)
        {
            Dictionary<string, string> unique = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < values.Count; i++)
            {
                string key = values[i].Key;
                if (string.IsNullOrEmpty(key) || key.IndexOf('=') >= 0) continue;
                unique[key] = values[i].Value ?? "";
            }
            List<string> names = new List<string>(unique.Keys);
            names.Sort(StringComparer.OrdinalIgnoreCase);
            StringBuilder block = new StringBuilder();
            for (int i = 0; i < names.Count; i++)
            {
                block.Append(names[i]);
                block.Append('=');
                block.Append(unique[names[i]]);
                block.Append('\0');
            }
            block.Append('\0');
            return Encoding.Unicode.GetBytes(block.ToString());
        }
    }
}
'@

try {
  Add-Type -TypeDefinition $source -Language CSharp -ErrorAction Stop
} catch {
  [Console]::Error.WriteLine("Add-Type falhou: $($_.Exception.Message)")
  exit 3
}

$code = [Muvit.Windows.JobSupervisor]::Run($pipeIn, $pipeOut, $token)
exit $code
