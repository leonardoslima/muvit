import { headersFromConfig } from '../http/headers';

type UploadKind = 'assessment-photo' | 'avatar';
type SupportedContentType = 'image/jpeg' | 'image/png';

export type PresignUploadInput = {
  kind: UploadKind;
  contentType: SupportedContentType;
};

export type PresignedUpload = {
  uploadUrl: string;
  publicUrl: string;
  fields: Record<string, never>;
};

type ClientWithConfig = {
  getConfig: () => {
    baseUrl?: string;
    headers?: unknown;
  };
};

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export async function presignUpload({
  client,
  body,
  fetcher = fetch,
}: {
  client: ClientWithConfig;
  body: PresignUploadInput;
  fetcher?: Fetcher;
}): Promise<PresignedUpload> {
  const config = client.getConfig();
  const baseUrl = String(config.baseUrl ?? 'http://localhost:3333').replace(/\/$/, '');
  const headers = headersFromConfig(config.headers);
  headers.set('content-type', 'application/json');

  const response = await fetcher(`${baseUrl}/uploads/presign`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('presign failed');

  const payload: unknown = await response.json();
  if (!isPresignedUpload(payload)) throw new Error('invalid presign response');
  return payload;
}

function isPresignedUpload(value: unknown): value is PresignedUpload {
  return (
    value !== null &&
    typeof value === 'object' &&
    'uploadUrl' in value &&
    'publicUrl' in value &&
    typeof value.uploadUrl === 'string' &&
    typeof value.publicUrl === 'string'
  );
}
