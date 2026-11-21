import { spawn } from 'node:child_process';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const windowsJobScriptPath = join(root, 'scripts/web-e2e-windows-job.ps1');
// O runner hospedado do Windows tem admissão lenta: >20 s a frio e
// 10-12 s em regime; 40 s cobre o pior caso observado com margem.
export const DEFAULT_STARTUP_TIMEOUT_MS = 40000;
export function resolveStartupTimeoutMs(options = {}) {
  return options.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS;
}
const supervisorExecutable = join(
  process.env.SystemRoot ?? 'C:\\Windows',
  'System32',
  'WindowsPowerShell',
  'v1.0',
  'powershell.exe',
);

export class WindowsJobError extends Error {
  constructor(message, { stage, code, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'WindowsJobError';
    this.stage = stage;
    this.code = code;
    this.stopProven = false;
  }
}

export class WindowsJobStopError extends WindowsJobError {
  constructor(message, details = {}) {
    super(message, details);
    this.name = 'WindowsJobStopError';
    this.retainLock = true;
  }
}

export function quoteWindowsArgument(value) {
  if (value === '') return '""';
  if (!/[\s"]/.test(value)) return value;
  let result = '"';
  let backslashes = 0;
  for (const character of value) {
    if (character === '\\') {
      backslashes++;
      continue;
    }
    if (character === '"') {
      result += `${'\\'.repeat(backslashes * 2 + 1)}"`;
      backslashes = 0;
      continue;
    }
    result += `${'\\'.repeat(backslashes)}${character}`;
    backslashes = 0;
  }
  return `${result}${'\\'.repeat(backslashes * 2)}"`;
}

export function windowsCommandLine(command, args, { windowsVerbatimArguments = false } = {}) {
  const head = windowsVerbatimArguments ? command : quoteWindowsArgument(command);
  const tail = windowsVerbatimArguments
    ? args
    : args.map((argument) => quoteWindowsArgument(argument));
  return [head, ...tail].join(' ');
}

function encode(value) {
  return Buffer.from(String(value), 'utf8').toString('base64');
}

function decode(value) {
  return Buffer.from(value, 'base64').toString('utf8');
}

function withTimeout(promise, timeoutMs, createError) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, fail) => {
      timer = setTimeout(() => fail(createError()), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

const authContext = 'muvit-job-auth:';
const eventAuthContext = 'muvit-job-events:';
const fileTimeEpochOffset = 116444736000000000n;
const fileTimeTolerance = 50000000n;

function protocolFailure(message) {
  return new WindowsJobError(`protocolo de controle inválido: ${message}`, { stage: 'protocol' });
}

function parseUnsignedField(value, field, { max = 0xffffffff, allowZero = true } = {}) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value))
    throw protocolFailure(`campo ${field} ausente ou não decimal`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > max || (!allowZero && number === 0))
    throw protocolFailure(`campo ${field} fora do intervalo: ${value}`);
  return number;
}

function parseFileTimeField(value) {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,19}$/.test(value))
    throw protocolFailure('campo parentCreated ausente ou não decimal');
  return BigInt(value);
}

function supervisorEnvironment(options) {
  const keep = new Set([
    'path',
    'systemroot',
    'windir',
    'temp',
    'tmp',
    'userprofile',
    'localappdata',
    'appdata',
    'comspec',
    'pathext',
  ]);
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => keep.has(key.toLowerCase())),
  );
  environment.MUVIT_WEB_E2E_JOB_PIPE_IN = options.pipeIn;
  environment.MUVIT_WEB_E2E_JOB_PIPE_OUT = options.pipeOut;
  environment.MUVIT_WEB_E2E_JOB_TOKEN = options.token;
  if (options.testHook) environment.MUVIT_WEB_E2E_JOB_TEST = options.testHook;
  if (options.testDelayMs)
    environment.MUVIT_WEB_E2E_JOB_TEST_DELAY_MS = String(options.testDelayMs);
  return environment;
}

/**
 * Inicia um comando Windows sob um Job Object privado do supervisor PowerShell.
 * O comando só recebe handles de stdin/stdout/stderr; o canal de controle é
 * autenticado por token, separado dos streams e nunca passa pela linha de comando.
 */
export function startWindowsJob(command, args, options = {}) {
  if (process.platform !== 'win32')
    throw new WindowsJobError('Job Object do Next só é usado no Windows', { stage: 'platform' });
  const session = new WindowsJobSession(command, args, options);
  return session;
}

class WindowsJobSession extends EventEmitter {
  constructor(command, args, options) {
    super();
    this.isWindowsJob = true;
    this.command = command;
    this.args = args;
    this.options = options;
    this.stdout = null;
    this.stderr = null;
    this.exitCode = null;
    this.signalCode = null;
    this.pid = 0;
    this.supervisorPid = 0;
    this.spawnFailure = undefined;
    this._stdoutText = '';
    this._stderrText = '';
    this._stdoutEnded = false;
    this._stderrEnded = false;
    this._inputEnded = false;
    this._receivedReady = false;
    this._receivedLeaderExit = false;
    this._stopped = null;
    this._failure = null;
    this._closed = false;
    this._killed = false;
    this._serversClosed = false;
    this._stopPromise = null;
    this._buffer = '';
    this._inputBuffer = '';
    this._socket = null;
    this._server = null;
    this._supervisor = null;
    this._supervisorExitInfo = null;
    this._token = null;
    this._nonce = null;
    this._eventNonce = null;
    this.resumedLeader = null;
    this._inputState = 'auth';
    this._protocolState = 'auth';
    this._nextSequence = 1;
    this._controlEnded = false;
    this._supervisorExited = false;
    this._settlementTimer = null;
    this._settlementDeadline = null;
    this._settlementWindowMs = null;
    this._settlementTimeoutMs = Math.min(
      Math.max(1, options.settlementTimeoutMs ?? options.stopTimeoutMs ?? 5000),
      60000,
    );
    this._signal = options.signal ?? null;
    this._abortListener = null;
    this._readyPromise = new Promise((resolveReady, rejectReady) => {
      this._readyResolve = resolveReady;
      this._readyReject = rejectReady;
    });
    this._readyPromise.catch(() => {});
    this._inputAuthPromise = new Promise((resolveAuth, rejectAuth) => {
      this._inputAuthResolve = resolveAuth;
      this._inputAuthReject = rejectAuth;
    });
    this._inputAuthPromise.catch(() => {});
    this._eventAuthPromise = new Promise((resolveAuth, rejectAuth) => {
      this._eventAuthResolve = resolveAuth;
      this._eventAuthReject = rejectAuth;
    });
    this._eventAuthPromise.catch(() => {});
    this._authPromise = Promise.all([this._inputAuthPromise, this._eventAuthPromise]);
    this._authPromise.catch(() => {});
    this._abortPromise = new Promise((resolveAbort) => {
      this._abortResolve = resolveAbort;
    });
    this.ready = this._run().catch((error) => {
      this._fail(error, error?.stage ?? 'startup');
      throw error;
    });
    this.ready.catch(() => {});
    if (this._signal) {
      this._abortListener = () => this._cancelAdmission(this._signal.reason);
      if (this._signal.aborted) this._abortListener();
      else this._signal.addEventListener('abort', this._abortListener, { once: true });
    }
  }

  output() {
    return `${this._stdoutText}\n${this._stderrText}`;
  }

  get failure() {
    return this._failure;
  }

  result() {
    return { stdout: this._stdoutText, stderr: this._stderrText };
  }

  async _run() {
    const baseName = `muvit-web-e2e-job-${randomBytes(12).toString('hex')}`;
    const pipeIn = `${baseName}-in`;
    const pipeOut = `${baseName}-out`;
    const token = randomBytes(24).toString('base64url');
    const nonce = randomBytes(18).toString('base64url');
    const eventNonce = randomBytes(18).toString('base64url');
    this._token = token;
    this._nonce = nonce;
    this._eventNonce = eventNonce;
    const startupTimeoutMs = resolveStartupTimeoutMs(this.options);
    const authTimeoutMs = this.options.authTimeoutMs ?? startupTimeoutMs;
    const inputServer = createServer();
    const outputServer = createServer();
    this._server = inputServer;
    this._outputServer = outputServer;
    try {
      await this._listen(inputServer, `\\\\.\\pipe\\${pipeIn}`);
      this._assertStarting('listener de entrada');
      if (this.options.testHook === 'abort-before-output-listen') {
        const injected = new WindowsJobStopError('aborto injetado antes do listener de saída', {
          stage: 'pre-admission-stop',
        });
        this._fail(injected, 'pre-admission-stop');
        throw injected;
      }
      await this._listen(outputServer, `\\\\.\\pipe\\${pipeOut}`);
      this._assertStarting('listener de saída');
    } catch (error) {
      this._fail(error, error?.stage ?? 'startup');
      throw error;
    }
    const connectionIn = this._waitForConnection(inputServer);
    const connectionOut = this._waitForConnection(outputServer);
    this._assertStarting('conexão do supervisor');
    const supervisor = spawn(
      supervisorExecutable,
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        this.options.supervisorScript ?? windowsJobScriptPath,
      ],
      {
        env: supervisorEnvironment({ ...this.options, pipeIn, pipeOut, token }),
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    this._supervisor = supervisor;
    this.supervisorPid = supervisor.pid;
    this._supervisorExitPromise = new Promise((resolveExit) => {
      this._supervisorExitResolve = resolveExit;
    });
    this._supervisorExitPromise.catch(() => {});
    if (this._closed) {
      try {
        supervisor.kill('SIGKILL');
      } catch {}
    }
    this.stdout = supervisor.stdout;
    this.stderr = supervisor.stderr;
    for (const [stream, isStdout] of [
      [supervisor.stdout, true],
      [supervisor.stderr, false],
    ]) {
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        if (isStdout) this._stdoutText += chunk;
        else this._stderrText += chunk;
        this.options.onOutput?.(this._stdoutText, this._stderrText);
      });
      stream.on('end', () => {
        if (isStdout) this._stdoutEnded = true;
        else this._stderrEnded = true;
        this._maybeClose();
      });
      stream.on('error', (error) => this._fail(error, 'stdio'));
    }
    supervisor.once('error', (error) => {
      this.spawnFailure = error;
      this._fail(error, 'supervisor-spawn');
    });
    supervisor.once('exit', (code, signal) => {
      this._supervisorExited = true;
      this._supervisorExitInfo = { code, signal };
      this._supervisorExitResolve?.({ code, signal });
      if (this._enforceSettlementDeadline()) return;
      // O processo pode sair antes de o Node drenar eventos já gravados no
      // pipe de controle. Só falha se o EOF de controle chegar sem terminal.
      if (!this._closed && this._controlEnded && !this._stopped) {
        this._fail(
          new WindowsJobError(
            `supervisor encerrou com código ${code} antes de confirmar a parada`,
            { stage: 'supervisor-exit' },
          ),
          'supervisor-exit',
        );
        return;
      }
      this._maybeClose();
    });

    return withTimeout(
      (async () => {
        const startupFailure = this._supervisorExitPromise.then(async () => {
          await new Promise((done) => setTimeout(done, 250));
          await this._waitSupervisorDiagnostic();
          throw this._supervisorStartupFailure();
        });
        startupFailure.catch(() => {});
        const socket = await this._abortable(Promise.race([connectionIn, startupFailure]));
        this._socket = socket;
        socket.setEncoding('utf8');
        socket.on('data', (chunk) => this._onInputData(chunk));
        socket.on('error', (error) => {
          if (!this._closed) this._fail(error, 'input-error');
        });
        socket.on('end', () => this._onInputEnd());
        socket.on('close', () => this._onInputEnd());
        socket.write(`challenge ${nonce} ${eventNonce}\n`);
        this._assertStarting('handshake');

        const eventSocket = await this._abortable(Promise.race([connectionOut, startupFailure]));
        this._eventSocket = eventSocket;
        eventSocket.setEncoding('utf8');
        eventSocket.on('data', (chunk) => this._onData(chunk));
        eventSocket.on('error', (error) => {
          if (!this._closed) this._fail(error, 'control-error');
        });
        eventSocket.on('end', () => this._onControlEnd());
        eventSocket.on('close', () => this._onControlEnd());

        await withTimeout(
          this._authPromise,
          authTimeoutMs,
          () =>
            new WindowsJobStopError(
              `handshake não autenticou os dois transportes do supervisor em ${authTimeoutMs}ms: ${this._supervisorDiagnostic()}`,
              { stage: 'control-auth' },
            ),
        );
        this._assertStarting('configuração');

        const launch = [
          `app ${encode(this.command)}`,
          `cmd ${encode(
            windowsCommandLine(this.command, this.args, {
              windowsVerbatimArguments: this.options.windowsVerbatimArguments ?? false,
            }),
          )}`,
          `cwd ${encode(this.options.cwd ?? process.cwd())}`,
          `stdin ${this.options.stdin === undefined ? 'closed' : 'pipe'}`,
          `stop ${this.options.stopTimeoutMs ?? 5000}`,
        ];
        for (const [key, value] of Object.entries(this.options.env ?? {})) {
          if (value === undefined) continue;
          launch.push(`env ${encode(key)} ${encode(value)}`);
        }
        launch.push('end');
        socket.write(`${launch.join('\n')}\n`);
        this._assertStarting('envio da configuração');

        const ready = await withTimeout(this._readyPromise, startupTimeoutMs, () =>
          this._admissionTimeoutError(startupTimeoutMs),
        );
        this._receivedReady = true;
        this.pid = ready.pid;
        this._verifyParent(ready);
        this._assertStarting('identidade do Node pai');
        if (this.options.testHook !== 'skip-node-resume') socket.write('resume\n');
        if (this.options.stdin !== undefined) {
          this.writeStdin(this.options.stdin);
          this.endStdin();
        }
        return ready;
      })(),
      startupTimeoutMs,
      () => this._admissionTimeoutError(startupTimeoutMs),
    ).catch((error) => {
      this._fail(error, error.stage ?? 'admission');
      throw error;
    });
  }

  _admissionTimeoutError(timeoutMs) {
    return new WindowsJobStopError(
      `admissão do Job Object não confirmou em ${timeoutMs}ms: ${this._supervisorDiagnostic()}`,
      { stage: 'admission-timeout' },
    );
  }

  async _waitSupervisorDiagnostic(timeoutMs = 250) {
    const deadline = Date.now() + timeoutMs;
    while (!this._stderrEnded && Date.now() < deadline) {
      await new Promise((done) => setTimeout(done, 10));
    }
  }

  _supervisorStartupFailure() {
    const code = this._supervisorExitInfo?.code;
    const signal = this._supervisorExitInfo?.signal;
    const detail = signal ? `sinal ${signal}` : `código ${code ?? 'desconhecido'}`;
    return new WindowsJobError(
      `supervisor encerrou antes de abrir os canais de controle (${detail}): ${this._supervisorDiagnostic()}`,
      { stage: 'supervisor-startup' },
    );
  }

  _sanitizeSupervisorText(value) {
    let text = String(value ?? '');
    for (const secret of [this._token, this._nonce, this._eventNonce]) {
      if (secret) text = text.split(secret).join('[REDACTED]');
    }
    return text.replace(/MUVIT_WEB_E2E_JOB_[A-Z0-9_]+=[^\s\r\n]*/g, '[REDACTED_ENV]');
  }

  _supervisorDiagnostic() {
    const text = this._sanitizeSupervisorText(this._stderrText).trim();
    if (!text) return 'sem diagnóstico do supervisor';
    return text.length > 2000 ? `...${text.slice(-2000)}` : text;
  }

  diagnosticOutput() {
    const text = this._sanitizeSupervisorText(this.output()).trim();
    return text.length > 4000 ? `...${text.slice(-4000)}` : text;
  }

  _assertStarting(label) {
    if (this._failure) throw this._failure;
    if (this._closed)
      throw new WindowsJobStopError(`sessão encerrada durante ${label}`, {
        stage: 'pre-admission-stop',
      });
  }

  _cancelAdmission(reason) {
    if (this._receivedReady || this._closed || this._failure) return;
    const cause = reason instanceof Error ? reason : undefined;
    const detail = cause ? cause.message : String(reason ?? 'cancelamento');
    this._fail(
      new WindowsJobStopError(`admissão do Job Object cancelada antes do ready: ${detail}`, {
        stage: 'pre-admission-stop',
        cause,
      }),
      'pre-admission-stop',
    );
  }

  _detachAbort() {
    if (this._abortListener && this._signal)
      this._signal.removeEventListener('abort', this._abortListener);
    this._abortListener = null;
  }

  _listen(server, path) {
    const listening = new Promise((resolveListen, rejectListen) => {
      const onError = (error) => {
        server.off('error', onError);
        rejectListen(error);
      };
      server.once('error', onError);
      server.listen(path, () => {
        server.off('error', onError);
        server.on('error', () => {});
        if (this._closed) {
          try {
            server.close();
          } catch {}
          rejectListen(
            new WindowsJobStopError('sessão encerrada durante a abertura do listener', {
              stage: 'pre-admission-stop',
            }),
          );
          return;
        }
        resolveListen();
      });
    });
    listening.catch(() => {});
    return Promise.race([
      listening,
      this._abortPromise.then(() => {
        try {
          server.close();
        } catch {}
        throw (
          this._failure ??
          new WindowsJobStopError('sessão encerrada durante a inicialização', {
            stage: 'pre-admission-stop',
          })
        );
      }),
    ]);
  }

  _waitForConnection(server) {
    const connection = new Promise((resolveConnection, rejectConnection) => {
      const onConnection = (socket) => {
        server.off('error', onError);
        resolveConnection(socket);
      };
      const onError = (error) => {
        server.off('connection', onConnection);
        rejectConnection(error);
      };
      server.once('connection', onConnection);
      server.once('error', onError);
    });
    connection.catch(() => {});
    return connection;
  }

  _abortable(promise) {
    return Promise.race([
      promise,
      this._abortPromise.then(() => {
        throw (
          this._failure ??
          new WindowsJobStopError('sessão encerrada antes da conexão do supervisor', {
            stage: 'pre-admission-stop',
          })
        );
      }),
    ]);
  }

  _verifyParent(ready) {
    if (ready.parentPid !== process.pid)
      throw new WindowsJobError(
        `supervisor observa Node pai ${ready.parentPid}, esperado ${process.pid}`,
        { stage: 'parent-identity' },
      );
    const expected =
      BigInt(Math.round((Date.now() - process.uptime() * 1000) * 10000)) + fileTimeEpochOffset;
    const actual = ready.parentCreated;
    const delta = actual > expected ? actual - expected : expected - actual;
    if (delta > fileTimeTolerance)
      throw new WindowsJobError('instância do Node pai não corresponde à criação verificada', {
        stage: 'parent-identity',
      });
  }

  _onInputData(chunk) {
    if (this._failure || this._closed) return;
    this._inputBuffer += chunk;
    while (true) {
      const index = this._inputBuffer.indexOf('\n');
      if (index < 0) return;
      const line = this._inputBuffer.slice(0, index).replace(/\r$/, '');
      this._inputBuffer = this._inputBuffer.slice(index + 1);
      this._onInputLine(line);
      if (this._failure) return;
    }
  }

  _onInputLine(line) {
    if (this._inputState === 'auth') {
      const match = /^auth ([A-Za-z0-9_-]{43})$/.exec(line);
      if (!match) {
        this._fail(
          protocolFailure('prova HMAC ausente ou malformada no canal de entrada'),
          'control-auth',
        );
        return;
      }
      if (!this._verifyAuth(match[1])) {
        this._fail(
          new WindowsJobError('canal de entrada não autenticado pela prova HMAC da sessão', {
            stage: 'control-auth',
          }),
          'control-auth',
        );
        return;
      }
      this._inputState = 'ready';
      this._inputAuthResolve?.();
      return;
    }
    this._fail(
      protocolFailure('dados inesperados no canal de entrada após a autenticação'),
      'protocol',
    );
  }

  _onInputEnd() {
    if (this._inputEnded) return;
    this._inputEnded = true;
    if (this._failure || this._closed) return;
    if (this._enforceSettlementDeadline()) return;
    if (this._inputBuffer.length > 0) {
      this._inputBuffer = '';
      this._fail(
        protocolFailure('canal de entrada terminou com sufixo sem newline após a autenticação'),
        'protocol',
      );
      return;
    }
    if (this._inputState === 'auth') {
      this._fail(
        new WindowsJobError('canal de entrada fechou antes da prova HMAC', {
          stage: 'control-auth',
        }),
        'control-auth',
      );
      return;
    }
    this._maybeClose();
  }

  _onControlEnd() {
    if (this._failure || this._closed) return;
    this._controlEnded = true;
    if (this._enforceSettlementDeadline()) return;
    if (this._buffer.length > 0) {
      this._buffer = '';
      this._fail(protocolFailure('canal de controle terminou com sufixo sem newline'), 'protocol');
      return;
    }
    if (!this._stopped) {
      this._fail(
        new WindowsJobError('canal de controle fechou antes da prova de parada', {
          stage: 'control-eof',
        }),
        'control-eof',
      );
      return;
    }
    this._maybeClose();
  }

  _onData(chunk) {
    if (this._failure || this._closed) return;
    this._buffer += chunk;
    while (true) {
      const index = this._buffer.indexOf('\n');
      if (index < 0) return;
      const line = this._buffer.slice(0, index).replace(/\r$/, '');
      this._buffer = this._buffer.slice(index + 1);
      this._onLine(line);
      if (this._failure) return;
    }
  }

  _onLine(line) {
    const separator = line.indexOf(' ');
    const type = separator < 0 ? line : line.slice(0, separator);
    const rest = separator < 0 ? '' : line.slice(separator + 1);
    if (this._settlementDeadline !== null && performance.now() >= this._settlementDeadline) {
      // leader-exit/stopped já são evidência terminal; mesmo atrasados, o prazo
      // vencido é classificado como liquidação.
      const terminal = type === 'leader-exit' || type === 'stopped';
      this._failSettlementTimeout(
        this._settlementWindowMs ?? this._settlementTimeoutMs,
        terminal ? 'settlement-timeout' : undefined,
      );
      return;
    }
    if (this._protocolState === 'auth') {
      const match = /^auth ([A-Za-z0-9_-]{43})$/.exec(line);
      if (!match) {
        this._fail(
          new WindowsJobError('evento antes da autenticação do canal de controle', {
            stage: 'control-auth',
          }),
          'control-auth',
        );
        return;
      }
      if (!this._verifyEventAuth(match[1])) {
        this._fail(
          new WindowsJobError(
            'canal de controle não autenticado pela prova HMAC do transporte de eventos',
            { stage: 'control-auth' },
          ),
          'control-auth',
        );
        return;
      }
      this._protocolState = 'ready';
      this._eventAuthResolve?.();
      return;
    }
    if (type === 'ready') {
      if (this._protocolState !== 'ready')
        return this._fail(protocolFailure('ready fora de ordem'), 'protocol');
      const fields = rest.split(' ');
      if (fields.length !== 5)
        return this._fail(protocolFailure('ready com campos incompletos'), 'protocol');
      const [sequence, pid, parentPid, parentCreated, supervisorPid] = fields;
      try {
        this._expectSequence(sequence, 'ready');
        const readyPid = parseUnsignedField(pid, 'pid', { allowZero: false });
        const readyParentPid = parseUnsignedField(parentPid, 'parentPid', { allowZero: false });
        const created = parseFileTimeField(parentCreated);
        const supervisor = parseUnsignedField(supervisorPid, 'supervisorPid', {
          allowZero: false,
        });
        if (supervisor !== this._supervisor?.pid) {
          this._fail(
            new WindowsJobError('canal de controle veio de outro supervisor', {
              stage: 'control-identity',
            }),
            'control-identity',
          );
          return;
        }
        this._protocolState = 'leader-exit';
        this._readyResolve?.({ pid: readyPid, parentPid: readyParentPid, parentCreated: created });
      } catch (error) {
        this._fail(error, 'protocol');
      }
      return;
    }
    if (type === 'leader-exit') {
      if (this._protocolState !== 'leader-exit')
        return this._fail(protocolFailure('leader-exit fora de ordem'), 'protocol');
      const fields = rest.split(' ');
      if (fields.length !== 2)
        return this._fail(protocolFailure('leader-exit com campos incompletos'), 'protocol');
      try {
        this._expectSequence(fields[0], 'leader-exit');
        this.exitCode = parseUnsignedField(fields[1], 'exitCode');
        this._receivedLeaderExit = true;
        this._protocolState = 'stopped';
        this._armSettlementTimeout();
        // Depois do leader-exit nenhum comando novo é válido: fechar o lado de
        // escrita permite ao supervisor confirmar o EOF antes de publicar proven.
        if (this.options.testHook !== 'hold-control-after-leader-exit') this._endControlInput();
      } catch (error) {
        this._fail(error, 'protocol');
      }
      return;
    }
    if (type === 'stopped') {
      if (this._protocolState !== 'stopped')
        return this._fail(protocolFailure('stopped fora de ordem'), 'protocol');
      const fields = rest.split(' ');
      if (fields.length !== 4)
        return this._fail(protocolFailure('stopped com campos incompletos'), 'protocol');
      const [sequence, active, resumed, proven] = fields;
      try {
        this._expectSequence(sequence, 'stopped');
        const activeProcesses = parseUnsignedField(active, 'activeProcesses');
        if (resumed !== '0' && resumed !== '1') throw protocolFailure('campo resumed não é 0/1');
        if (proven !== '0' && proven !== '1') throw protocolFailure('campo proven não é 0/1');
        this._protocolState = 'done';
        this.resumedLeader = resumed === '1';
        this._stopped = { activeProcesses, proven: proven === '1' };
        this._stoppedResolve?.(this._stopped);
        if (!this._stopped.proven || activeProcesses !== 0)
          this._fail(
            new WindowsJobStopError(
              `supervisor não provou ActiveProcesses=0 (${activeProcesses})`,
              { stage: 'stop-unproven' },
            ),
            'stop-unproven',
          );
      } catch (error) {
        this._fail(error, 'protocol');
      }
      this._maybeClose();
      return;
    }
    if (type === 'error') {
      const fields = rest.split(' ');
      if (fields.length < 2 || fields.length > 3)
        return this._fail(protocolFailure('error com campos incompletos'), 'protocol');
      const [stage, code, message] = fields;
      if (!/^[a-z][a-z-]*$/.test(stage))
        return this._fail(protocolFailure('estágio inválido no evento error'), 'protocol');
      let parsedCode;
      let detail;
      try {
        parsedCode = parseUnsignedField(code, 'errorCode');
        detail = message ? decode(message) : 'sem detalhe';
      } catch (error) {
        this._fail(error, 'protocol');
        return;
      }
      this._fail(
        new WindowsJobError(`supervisor reportou falha em ${stage}: ${detail}`, {
          stage,
          code: parsedCode,
        }),
        stage,
      );
      return;
    }
    this._fail(protocolFailure(`evento de controle desconhecido: ${type}`), 'protocol');
  }

  _expectSequence(value, event) {
    const sequence = parseUnsignedField(value, `${event}.sequence`, { allowZero: false });
    if (sequence !== this._nextSequence)
      throw protocolFailure(`sequência ${sequence} em ${event}, esperada ${this._nextSequence}`);
    this._nextSequence = sequence + 1;
  }

  _verifyAuth(proof) {
    return this._verifyProof(proof, this._nonce, authContext);
  }

  _verifyEventAuth(proof) {
    return this._verifyProof(proof, this._eventNonce, eventAuthContext);
  }

  _verifyProof(proof, nonce, context) {
    if (typeof proof !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(proof)) return false;
    const expected = createHmac('sha256', this._token).update(`${context}${nonce}`).digest();
    let actual;
    try {
      actual = Buffer.from(proof, 'base64url');
    } catch {
      return false;
    }
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  _armSettlementTimeout(timeoutMs = this._settlementTimeoutMs) {
    if (this._failure || this._closed) return;
    // Um único deadline monotônico cobre o stop e a liquidação. leader-exit
    // posterior nunca cria nem prorroga a janela.
    if (this._settlementDeadline === null) {
      this._settlementWindowMs = Math.min(Math.max(1, timeoutMs), 60000);
      this._settlementDeadline = performance.now() + this._settlementWindowMs;
    }
    if (this._enforceSettlementDeadline()) return;
    if (this._settlementTimer) return;
    const remaining = Math.max(0, this._settlementDeadline - performance.now());
    this._settlementTimer = setTimeout(() => {
      this._settlementTimer = null;
      if (this._enforceSettlementDeadline()) return;
      // O timer do host pode disparar antes do prazo monotônico: rearma apenas
      // o restante, mantendo o mesmo deadline.
      this._armSettlementTimeout();
    }, remaining);
    this._settlementTimer.unref?.();
  }

  _clearSettlementTimeout() {
    this._settlementDeadline = null;
    this._settlementWindowMs = null;
    if (!this._settlementTimer) return;
    clearTimeout(this._settlementTimer);
    this._settlementTimer = null;
  }

  _failSettlementTimeout(windowMs, stage) {
    const settlement = stage === 'settlement-timeout' || this._receivedLeaderExit;
    this._fail(
      new WindowsJobStopError(
        settlement
          ? `liquidação após leader-exit não concluiu em ${windowMs}ms`
          : `confirmação de ActiveProcesses=0 não chegou em ${windowMs}ms`,
        { stage: settlement ? 'settlement-timeout' : 'stop-timeout' },
      ),
      settlement ? 'settlement-timeout' : 'stop-timeout',
    );
  }

  _enforceSettlementDeadline(stage) {
    if (this._settlementDeadline === null || this._failure || this._closed) return false;
    // O timer pode atrasar sob carga; o prazo monotônico vale no recebimento de
    // qualquer evidência terminal e imediatamente antes de concluir a sessão.
    if (performance.now() < this._settlementDeadline) return false;
    this._failSettlementTimeout(this._settlementWindowMs ?? this._settlementTimeoutMs, stage);
    return true;
  }

  _fail(error, stage) {
    if (this._failure || this._closed) return;
    this._clearSettlementTimeout();
    this._failure =
      error instanceof WindowsJobError
        ? error
        : new WindowsJobError(error.message, { stage, cause: error });
    this._protocolState = 'failed';
    this._readyReject?.(this._failure);
    this._inputAuthReject?.(this._failure);
    this._eventAuthReject?.(this._failure);
    this._stoppedReject?.(this._failure);
    this._completionReject?.(this._failure);
    this._killSupervisor();
    if (this.listenerCount('error') > 0) this.emit('error', this._failure);
    this._maybeClose();
  }

  writeStdin(value) {
    if (!this._socket || this._stopped || this._inputEnded || this._receivedLeaderExit) return;
    const chunks = Array.isArray(value) ? value : [value];
    for (const chunk of chunks) this._socket.write(`stdin ${encode(chunk)}\n`);
  }

  endStdin() {
    if (this._socket && !this._stopped && !this._inputEnded && !this._receivedLeaderExit)
      this._socket.write('stdin-eof\n');
  }

  _endControlInput() {
    if (!this._socket || this._socket.destroyed || this._socket.writableEnded) return;
    this._socket.end();
  }

  async stop({ timeoutMs = this.options.stopTimeoutMs ?? 5000 } = {}) {
    if (this._stopPromise) return this._stopPromise;
    this._stopPromise = (async () => {
      if (this._failure) throw this._failure;
      if (!this._receivedReady) {
        const failure = new WindowsJobStopError(
          'parada solicitada antes da admissão do Job Object ser confirmada',
          { stage: 'pre-admission-stop' },
        );
        this._fail(failure, 'pre-admission-stop');
        throw failure;
      }
      if (this._stopped) return this._finishStop(timeoutMs);
      this._armSettlementTimeout(timeoutMs);
      if (this._failure) throw this._failure;
      if (
        !this._receivedLeaderExit &&
        this._socket &&
        !this._socket.destroyed &&
        !this._socket.writableEnded
      ) {
        // Fecha o lado de escrita depois do stop para que o supervisor valide
        // o EOF do canal de controle e não aceite frames atrás do comando.
        this._socket.end('stop\n');
      }
      let stopped;
      try {
        stopped = await withTimeout(
          new Promise((resolveStopped, rejectStopped) => {
            this._stoppedResolve = resolveStopped;
            this._stoppedReject = rejectStopped;
          }),
          timeoutMs,
          () =>
            new WindowsJobStopError(
              `confirmação de ActiveProcesses=0 não chegou em ${timeoutMs}ms`,
              { stage: 'stop-timeout' },
            ),
        );
      } catch (error) {
        this._fail(error, error?.stage ?? 'stop-timeout');
        throw error;
      }
      this._stopped = stopped;
      return this._finishStop(timeoutMs);
    })();
    return this._stopPromise;
  }

  async _finishStop(timeoutMs) {
    if (!this._stopped.proven || this._stopped.activeProcesses !== 0)
      throw new WindowsJobStopError(
        `supervisor não provou ActiveProcesses=0 (${this._stopped.activeProcesses})`,
        { stage: 'stop-unproven' },
      );
    try {
      await this._drain(timeoutMs);
    } catch (error) {
      this._fail(error, error?.stage ?? 'drain-timeout');
      throw error;
    }
    if (this._failure) throw this._failure;
    return { proven: true, pid: this.pid };
  }

  _drain(timeoutMs) {
    if (this._closed) return Promise.resolve();
    const drained = new Promise((resolveDrain) => {
      this._drainResolve = resolveDrain;
    });
    this._maybeClose();
    return withTimeout(
      drained,
      timeoutMs,
      () =>
        new WindowsJobStopError(
          `drenagem de stdout/stderr/controle não concluiu em ${timeoutMs}ms`,
          { stage: 'drain-timeout' },
        ),
    );
  }

  _maybeClose() {
    if (this._closed || this._failure) return;
    if (this._enforceSettlementDeadline()) return;
    const stopped = this._stopped?.proven === true && this._stopped.activeProcesses === 0;
    if (!stopped) return;
    if (!this._controlEnded || !this._inputEnded || !this._stdoutEnded || !this._stderrEnded)
      return;
    if (!this._supervisorExited) return;
    this._clearSettlementTimeout();
    this._closed = true;
    this._detachAbort();
    this._drainResolve?.();
    if (!this._receivedLeaderExit) {
      this._failure ??= new WindowsJobError('supervisor não informou o código do líder', {
        stage: 'leader-exit-missing',
      });
    }
    try {
      this._socket?.end();
      this._eventSocket?.end();
    } catch {}
    this._closeServers();
    if (this._failure) {
      this._completionReject?.(this._failure);
      if (this.listenerCount('error') > 0) this.emit('error', this._failure);
    } else {
      this._completionValue = { code: this.exitCode ?? 1, ...this.result() };
      this.emit('close', this.exitCode ?? 1);
      this._completionResolve?.(this._completionValue);
    }
  }

  _closeServers() {
    if (this._serversClosed) return;
    this._serversClosed = true;
    try {
      this._server?.close();
    } catch {}
    try {
      this._outputServer?.close();
    } catch {}
  }

  _killSupervisor() {
    if (this._killed) return;
    this._killed = true;
    this._closed = true;
    this._clearSettlementTimeout();
    this._detachAbort();
    this._drainResolve?.();
    this._abortResolve?.();
    try {
      this._supervisor?.kill('SIGKILL');
    } catch {}
    try {
      this._socket?.destroy();
      this._eventSocket?.destroy();
    } catch {}
    this._closeServers();
  }

  completion() {
    if (this._completionPromise) return this._completionPromise;
    if (this._failure) return Promise.reject(this._failure);
    if (this._completionValue) return Promise.resolve(this._completionValue);
    this._completionPromise = new Promise((resolveCompletion, rejectCompletion) => {
      this._completionResolve = resolveCompletion;
      this._completionReject = rejectCompletion;
    });
    this._maybeClose();
    return this._completionPromise;
  }
}
