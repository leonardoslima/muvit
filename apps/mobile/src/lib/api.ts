export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export type ApiClientOptions = {
  baseUrl: string;
  getCookie: () => string;
  onUnauthorized: () => void | Promise<void>;
  fetcher?: Fetcher;
};

export type ApiRequestOptions = {
  allowAnonymous?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;
  private readonly getCookie: () => string;
  private readonly onUnauthorized: () => void | Promise<void>;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    this.getCookie = options.getCookie;
    this.onUnauthorized = options.onUnauthorized;
  }

  async request<T>(
    path: string,
    init: RequestInit = {},
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const cookie = this.getCookie().trim();

    if (!cookie && !options.allowAnonymous) {
      await this.notifyUnauthorized();
      throw new ApiError('unauthorized', 401);
    }

    const headers = new Headers(init.headers);
    if (cookie) headers.set('cookie', cookie);
    if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');

    const response = await this.fetcher(this.url(path), {
      ...init,
      credentials: 'omit',
      headers,
    });

    if (response.status === 401) {
      await this.notifyUnauthorized();
    }

    return parseResponse<T>(response);
  }

  private async notifyUnauthorized(): Promise<void> {
    try {
      await this.onUnauthorized();
    } catch {
      // A falha de limpeza local não deve ocultar o 401 original da API.
    }
  }

  private url(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }
}

export async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return body as T;
}
