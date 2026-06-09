export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

type TokenAccessors = {
  getAccessToken: () => string | undefined;
  getRefreshToken: () => string | undefined;
  setAccessToken: (accessToken: string) => void | Promise<void>;
  clearAuth: () => void | Promise<void>;
};

export type ApiClientOptions = TokenAccessors & {
  baseUrl: string;
  fetcher?: Fetcher;
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
  private readonly tokens: TokenAccessors;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    this.tokens = options;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    return this.requestWithAuth<T>(path, init, true);
  }

  private async requestWithAuth<T>(
    path: string,
    init: RequestInit,
    allowRefresh: boolean,
  ): Promise<T> {
    const response = await this.fetcher(this.url(path), this.withAuthHeaders(init));

    if (response.status === 401 && allowRefresh) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        return this.requestWithAuth<T>(path, init, false);
      }
    }

    return parseResponse<T>(response);
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.tokens.getRefreshToken();
    if (!refreshToken) {
      await this.tokens.clearAuth();
      return false;
    }

    const response = await this.fetcher(this.url('/auth/refresh'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await this.tokens.clearAuth();
      await parseResponse<unknown>(response);
      return false;
    }

    const body = await response.json();
    const accessToken = readStringField(body, 'accessToken');
    await this.tokens.setAccessToken(accessToken);
    return true;
  }

  private withAuthHeaders(init: RequestInit): RequestInit {
    const headers = new Headers(init.headers);
    const accessToken = this.tokens.getAccessToken();
    if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
    if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    return { ...init, headers };
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

function readStringField(value: unknown, field: string): string {
  if (value && typeof value === 'object' && field in value) {
    const fieldValue = value[field as keyof typeof value];
    if (typeof fieldValue === 'string') return fieldValue;
  }
  throw new Error(`invalid response: missing ${field}`);
}
